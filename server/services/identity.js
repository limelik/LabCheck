import { z } from "zod";
import { config } from "../config.js";
import { ApiError } from "../http.js";
import { reconcilePlacement } from "./placement.js";
export const universityEmail = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(255))
  .refine(
    (value) => config.universityDomains.includes(value.split("@")[1]),
    "Use an email from the configured university domain.",
  );
export const passwordInput = z
  .string()
  .min(8)
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must fit within 72 UTF-8 bytes.",
  );
export function extractGroup(email) {
  const local = email.split("@")[0];
  const dot = local.lastIndexOf(".");
  if (dot < 1) return null;
  // Everything from the first hyphen onward is an address suffix, not part of the group.
  const code = local.slice(dot + 1).split("-")[0];
  return code ? code.toUpperCase() : null;
}
export async function detectedGroup(connection, email) {
  const code = extractGroup(email);
  const [groups] = await connection.execute(
    "SELECT id, code, name FROM academic_groups WHERE UPPER(code) = ?",
    [code],
  );
  return { code, group: groups[0] || null };
}
export async function activateRegistration(
  connection,
  registration,
  reviewerId = null,
) {
  const [accounts] = await connection.execute(
    "SELECT * FROM user_accounts WHERE email = ? FOR UPDATE",
    [registration.email],
  );
  let account = accounts[0];
  if (!["STUDENT", "TEACHER"].includes(registration.requested_role))
    throw new ApiError(
      409,
      "IDENTITY_REVIEW",
      "Public administrator signup is unavailable.",
    );
  if (!account) {
    const detection =
      registration.requested_role === "STUDENT"
        ? await detectedGroup(connection, registration.email)
        : null;
    if (detection && !detection.group)
      throw new ApiError(
        409,
        "IDENTITY_REVIEW",
        "The academic group in this email is not configured.",
      );
    const [created] = await connection.execute(
      "INSERT INTO user_accounts(email,password_hash,account_type,approval_status) VALUES (?,?,?,'PENDING')",
      [
        registration.email,
        registration.password_hash,
        registration.requested_role,
      ],
    );
    account = {
      id: created.insertId,
      account_type: registration.requested_role,
      is_active: true,
    };
    if (detection) {
      await connection.execute(
        "INSERT INTO students(user_account_id,academic_group_id,first_name,last_name) VALUES (?,?,?,?)",
        [
          account.id,
          detection.group.id,
          registration.first_name,
          registration.last_name,
        ],
      );
    } else {
      await connection.execute(
        "INSERT INTO teachers(user_account_id,first_name,last_name) VALUES (?,?,?)",
        [account.id, registration.first_name, registration.last_name],
      );
    }
  }
  if (
    account.account_type !== registration.requested_role ||
    account.account_type === "ADMIN"
  )
    throw new ApiError(
      409,
      "IDENTITY_REVIEW",
      "Requested role differs from the trusted institutional role.",
    );
  if (!account.is_active || account.approval_status === "REJECTED")
    throw new ApiError(
      409,
      "IDENTITY_REVIEW",
      "This institutional account is disabled or rejected.",
    );
  const table = account.account_type === "STUDENT" ? "students" : "teachers";
  const [profiles] = await connection.execute(
    `SELECT * FROM ${table} WHERE user_account_id = ? FOR UPDATE`,
    [account.id],
  );
  const profile = profiles[0];
  if (!profile)
    throw new ApiError(
      409,
      "IDENTITY_REVIEW",
      "Trusted identity profile is missing.",
    );
  if (account.account_type === "STUDENT") {
    const detection = await detectedGroup(connection, registration.email);
    if (!detection.group || detection.group.id !== profile.academic_group_id)
      throw new ApiError(
        409,
        "IDENTITY_REVIEW",
        "Email group is unknown or differs from the trusted roster. Correct the institutional email or roster before approval.",
      );
    // Course configuration must not prevent an email-verified account from logging in.
    await connection.query("SAVEPOINT signup_placement");
    try {
      await reconcilePlacement(connection, profile.academic_group_id);
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== "PLACEMENT_CONFIG")
        throw error;
      await connection.query("ROLLBACK TO SAVEPOINT signup_placement");
    }
    await connection.query("RELEASE SAVEPOINT signup_placement");
  }
  await connection.execute(
    `UPDATE user_accounts SET password_hash = ?, email_verified_at = UTC_TIMESTAMP(), approval_status = 'APPROVED', reviewed_by_user_account_id = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?`,
    [registration.password_hash, reviewerId, account.id],
  );
  await connection.execute(
    "DELETE FROM auth_sessions WHERE user_account_id = ?",
    [account.id],
  );
  await connection.execute(
    `UPDATE registrations SET status = 'APPROVED', account_id = ?, password_hash = '', review_reason = NULL, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?`,
    [account.id, reviewerId, registration.id],
  );
  return account.id;
}
