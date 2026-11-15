import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { config } from "../config.js";
import { ApiError } from "../http.js";
export function needSecret() {
  if (!config.authSecret || config.authSecret.length < 32)
    throw new ApiError(
      503,
      "AUTH_NOT_CONFIGURED",
      "Authentication secret must contain at least 32 characters.",
    );
  if (process.env.NODE_ENV === "production" && !config.cookieSecure)
    throw new ApiError(
      503,
      "AUTH_NOT_CONFIGURED",
      "Production sessions require Secure cookies and HTTPS.",
    );
}
export const sessionHash = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
function codeHash(id, email, purpose, code) {
  needSecret();
  return crypto
    .createHmac("sha256", config.authSecret)
    .update(`${id}:${email}:${purpose}:${code}`)
    .digest("hex");
}
export async function sendMail(to, subject, text) {
  const capture = config.emailDelivery === "capture";
  if (
    !["smtp", "capture"].includes(config.emailDelivery) ||
    (capture && process.env.NODE_ENV === "production")
  ) {
    throw new ApiError(
      503,
      "EMAIL_UNAVAILABLE",
      "Email delivery configuration is invalid.",
    );
  }
  if (
    !capture &&
    (!config.smtp.host ||
      !config.smtp.from ||
      ["localhost", "127.0.0.1", "::1"].includes(config.smtp.host))
  ) {
    throw new ApiError(
      503,
      "EMAIL_UNAVAILABLE",
      "Email delivery is not configured. Please contact the administrator.",
    );
  }
  if (config.smtp.host && config.smtp.from) {
    const transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      requireTLS: !capture || process.env.SMTP_REQUIRE_TLS === "true",
      connectionTimeout: 10000,
      socketTimeout: 15000,
      auth: config.smtp.user
        ? { user: config.smtp.user, pass: config.smtp.password }
        : undefined,
    });
    try {
      await transport.sendMail({ from: config.smtp.from, to, subject, text });
    } catch {
      throw new ApiError(
        503,
        "EMAIL_UNAVAILABLE",
        "Email could not be delivered. Please retry.",
      );
    }
    return;
  }
  if (capture && process.env.DEV_MAILBOX_DIR) {
    const dir = path.resolve(process.env.DEV_MAILBOX_DIR);
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    await fs.writeFile(
      path.join(
        dir,
        `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.txt`,
      ),
      `To: ${to}\nSubject: ${subject}\n\n${text}\n`,
      { mode: 0o600 },
    );
    return;
  }
  throw new ApiError(
    503,
    "EMAIL_UNAVAILABLE",
    "Email delivery is not configured.",
  );
}
// Caller locks the associated registration/account first. Sending inside the transaction
// leaves the previous challenge valid if SMTP fails and serializes concurrent resends.
export async function issueOtp(connection, email, purpose) {
  needSecret();
  const [rows] = await connection.execute(
    "SELECT id, code_hash, created_at FROM email_otp_challenges WHERE email = ? AND purpose = ? FOR UPDATE",
    [email, purpose],
  );
  if (rows[0] && Date.now() - new Date(rows[0].created_at).getTime() < 60000)
    throw new ApiError(
      429,
      "RESEND_COOLDOWN",
      "Wait 60 seconds before requesting another code.",
    );
  let code;
  do {
    code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  } while (
    rows[0] &&
    codeHash(rows[0].id, email, purpose, code) === rows[0].code_hash
  );
  const id = crypto.randomBytes(32).toString("hex");
  await connection.execute(
    "DELETE FROM email_otp_challenges WHERE email = ? AND purpose = ?",
    [email, purpose],
  );
  await connection.execute(
    `INSERT INTO email_otp_challenges (id,email,purpose,code_hash,expires_at) VALUES (?,?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE))`,
    [id, email, purpose, codeHash(id, email, purpose, code)],
  );
  await sendMail(
    email,
    purpose === "REGISTER"
      ? "Verify your LabCheck email"
      : "LabCheck password reset code",
    `Your ${purpose === "REGISTER" ? "verification" : "reset"} code is: ${code}\nIt expires in 10 minutes. Never share this code.\n${config.publicUrl}/${purpose === "REGISTER" ? "verify-email" : "reset-password"}?email=${encodeURIComponent(email)}`,
  );
}
// Return errors instead of throwing so attempts/consumption commit, including failed attempts.
export async function consumeOtp(
  connection,
  email,
  purpose,
  code,
  consume = true,
) {
  const [rows] = await connection.execute(
    "SELECT *, expires_at <= UTC_TIMESTAMP() AS expired FROM email_otp_challenges WHERE email = ? AND purpose = ? FOR UPDATE",
    [email, purpose],
  );
  const row = rows[0];
  if (!row)
    return new ApiError(
      400,
      "OTP_INVALID",
      "Code is invalid. Request a new code.",
    );
  if (row.used_at)
    return new ApiError(409, "OTP_USED", "This code has already been used.");
  if (row.expired)
    return new ApiError(
      400,
      "OTP_EXPIRED",
      "Code expired. Request a new code.",
    );
  if (row.attempts >= 5)
    return new ApiError(
      429,
      "OTP_ATTEMPTS",
      "Five incorrect attempts. Request a new code after the cooldown.",
    );
  const hash = codeHash(row.id, email, purpose, code);
  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(row.code_hash))) {
    await connection.execute(
      "UPDATE email_otp_challenges SET attempts = attempts + 1 WHERE id = ?",
      [row.id],
    );
    return new ApiError(
      400,
      "OTP_INCORRECT",
      `Incorrect code. ${4 - row.attempts} attempts remain.`,
    );
  }
  if (consume)
    await connection.execute(
      "UPDATE email_otp_challenges SET used_at = UTC_TIMESTAMP() WHERE id = ?",
      [row.id],
    );
  return null;
}
