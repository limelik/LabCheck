import "dotenv/config";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";
import domainRouter from "./domain.js";
import { sendPasswordResetCode, sendVerificationCode } from "./email.js";

const app = express();
const port = Number(process.env.API_PORT || 3001);
const sessionCookie = "labcheck_session";
const sessionDurationMs = 8 * 60 * 60 * 1000;
const jwtSecret = process.env.JWT_SECRET;
const appOrigin = process.env.APP_ORIGIN || "http://localhost:5173";
const autoApproveVerifiedStudents = process.env.AUTO_APPROVE_VERIFIED_STUDENTS === "true";

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be set to a random value of at least 32 characters.");
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validEmail(email) {
  return email.length <= 255 && /^[^\s@]+@polytechnic\.am$/.test(email);
}

function generateCode() {
  return String(randomInt(100000, 1000000));
}

function hashCode(code) {
  return createHash("sha256").update(code).digest("hex");
}

function validCode(code, storedHash) {
  const submittedHash = Buffer.from(hashCode(code), "hex");
  const expectedHash = Buffer.from(storedHash, "hex");
  return submittedHash.length === expectedHash.length &&
    timingSafeEqual(submittedHash, expectedHash);
}

function publicUser(account) {
  return { id: account.id, email: account.email, role: account.account_type.toLowerCase() };
}

function setSessionCookie(response, account) {
  const token = jwt.sign(
    { sub: String(account.id) },
    jwtSecret,
    { expiresIn: "8h" }
  );
  response.cookie(sessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: sessionDurationMs,
    path: "/",
  });
}

function clearSessionCookie(response) {
  response.clearCookie(sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}

async function authenticate(request, response, next) {
  const token = request.cookies?.[sessionCookie];
  if (!token) return response.status(401).json({ error: "Please log in." });

  try {
    const payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
    const [rows] = await pool.execute(
      `SELECT id, email, account_type
       FROM user_accounts
       WHERE id = ? AND is_active = TRUE
         AND email_verified_at IS NOT NULL AND approval_status = 'APPROVED'`,
      [payload.sub]
    );
    if (!rows.length) {
      clearSessionCookie(response);
      return response.status(401).json({ error: "Please log in." });
    }

    request.user = publicUser(rows[0]);
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      clearSessionCookie(response);
      return response.status(401).json({ error: "Please log in." });
    }
    return next(error);
  }
}

function checkOrigin(request, response, next) {
  const origin = request.get("origin");
  if (origin && origin !== appOrigin) {
    return response.status(403).json({ error: "Request origin is not allowed." });
  }
  return next();
}

async function saveVerificationCode(connection, accountId) {
  const code = generateCode();
  await connection.execute(
    "DELETE FROM email_verification_tokens WHERE user_account_id = ? AND used_at IS NULL",
    [accountId]
  );
  await connection.execute(
    `INSERT INTO email_verification_tokens (user_account_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [accountId, hashCode(code), new Date(Date.now() + 15 * 60 * 1000)]
  );
  return code;
}

async function savePasswordResetCode(connection, accountId) {
  const code = generateCode();
  await connection.execute(
    "DELETE FROM password_reset_tokens WHERE user_account_id = ?",
    [accountId]
  );
  await connection.execute(
    `INSERT INTO password_reset_tokens (user_account_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [accountId, hashCode(code), new Date(Date.now() + 15 * 60 * 1000)]
  );
  return code;
}

async function deliverCode(email, code, response) {
  try {
    await sendVerificationCode(email, code);
    return response.json({ message: "We sent a 6-digit verification code to your email." });
  } catch (error) {
    console.error("Verification email delivery failed:", error.message);
    return response.status(503).json({
      error: "Your account is saved, but the verification email could not be sent. Check the SMTP setup and request a new code.",
      accountCreated: true,
    });
  }
}

async function deliverPasswordResetCode(email, code, response) {
  try {
    await sendPasswordResetCode(email, code);
    return response.json({ message: "If an account exists for that email, a reset code has been sent." });
  } catch (error) {
    console.error("Password reset email delivery failed:", error.message);
    return response.status(503).json({
      error: "The reset email could not be sent. Check the SMTP setup and try again.",
    });
  }
}

app.get("/api/academic-groups", async (request, response) => {
  const [groups] = await pool.execute(
    "SELECT code, name FROM academic_groups ORDER BY code"
  );
  return response.json({ groups });
});

app.post("/api/auth/register", checkOrigin, registrationLimiter, async (request, response) => {
  const firstName = typeof request.body.firstName === "string" ? request.body.firstName.trim() : "";
  const lastName = typeof request.body.lastName === "string" ? request.body.lastName.trim() : "";
  const email = normalizeEmail(request.body.email);
  const password = request.body.password;
  const role = typeof request.body.role === "string" ? request.body.role.toUpperCase() : "";

  if (!firstName || firstName.length > 100 || !lastName || lastName.length > 100) {
    return response.status(400).json({ error: "Enter a valid first and last name." });
  }
  if (!validEmail(email)) {
    return response.status(400).json({ error: "Use a valid @polytechnic.am email address." });
  }
  if (typeof password !== "string" || password.length < 10 || Buffer.byteLength(password, "utf8") > 72) {
    return response.status(400).json({ error: "Password must be at least 10 characters and no more than 72 bytes." });
  }
  if (!["STUDENT", "TEACHER"].includes(role)) {
    return response.status(400).json({ error: "Choose student or teacher signup." });
  }

  let academicGroupId;
  if (role === "STUDENT") {
    const groupCode = typeof request.body.groupCode === "string" ? request.body.groupCode.trim() : "";
    const [groups] = await pool.execute("SELECT id FROM academic_groups WHERE code = ?", [groupCode]);
    if (!groups.length) {
      return response.status(400).json({ error: "Choose an academic group from the list." });
    }
    academicGroupId = groups[0].id;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const connection = await pool.getConnection();
  let accountId;
  let code;
  try {
    await connection.beginTransaction();
    const [accountResult] = await connection.execute(
      `INSERT INTO user_accounts (email, password_hash, account_type, approval_status)
       VALUES (?, ?, ?, 'PENDING')`,
      [email, passwordHash, role]
    );
    accountId = accountResult.insertId;
    if (role === "STUDENT") {
      await connection.execute(
        `INSERT INTO students (user_account_id, academic_group_id, first_name, last_name)
         VALUES (?, ?, ?, ?)`,
        [accountId, academicGroupId, firstName, lastName]
      );
    } else {
      await connection.execute(
        "INSERT INTO teachers (user_account_id, first_name, last_name) VALUES (?, ?, ?)",
        [accountId, firstName, lastName]
      );
    }
    code = await saveVerificationCode(connection, accountId);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return response.status(409).json({ error: "An account with this email already exists." });
    }
    throw error;
  } finally {
    connection.release();
  }

  return deliverCode(email, code, response);
});

app.post("/api/auth/resend-verification", checkOrigin, verificationLimiter, async (request, response) => {
  const email = normalizeEmail(request.body.email);
  if (!validEmail(email)) {
    return response.status(400).json({ error: "Use a valid @polytechnic.am email address." });
  }

  const connection = await pool.getConnection();
  let code;
  let accountId;
  try {
    await connection.beginTransaction();
    const [accounts] = await connection.execute(
      "SELECT id FROM user_accounts WHERE email = ? AND email_verified_at IS NULL FOR UPDATE",
      [email]
    );
    if (accounts.length) {
      accountId = accounts[0].id;
      code = await saveVerificationCode(connection, accountId);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  if (!accountId) {
    return response.json({ message: "If the account needs verification, a new code will be sent." });
  }
  return deliverCode(email, code, response);
});

app.post("/api/auth/verify-email", checkOrigin, verificationLimiter, async (request, response) => {
  const email = normalizeEmail(request.body.email);
  const code = typeof request.body.code === "string" ? request.body.code.trim() : "";
  if (!validEmail(email) || !/^\d{6}$/.test(code)) {
    return response.status(400).json({ error: "Enter a valid email address and 6-digit code." });
  }

  const connection = await pool.getConnection();
  let account;
  try {
    await connection.beginTransaction();
    const [tokens] = await connection.execute(
      `SELECT evt.id AS token_id, evt.token_hash, ua.id, ua.email, ua.account_type
       FROM email_verification_tokens evt
       JOIN user_accounts ua ON ua.id = evt.user_account_id
       WHERE ua.email = ? AND evt.used_at IS NULL AND evt.expires_at > UTC_TIMESTAMP()
       ORDER BY evt.id DESC LIMIT 1 FOR UPDATE`,
      [email]
    );
    if (!tokens.length || !validCode(code, tokens[0].token_hash)) {
      await connection.rollback();
      return response.status(400).json({ error: "That code is invalid or expired. Request a new code and try again." });
    }

    account = tokens[0];
    await connection.execute(
      "UPDATE email_verification_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ?",
      [account.token_id]
    );
    await connection.execute(
      `UPDATE user_accounts
       SET email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()),
           approval_status = CASE
             WHEN account_type = 'STUDENT' AND ? = TRUE THEN 'APPROVED'
             ELSE approval_status
           END
       WHERE id = ?`,
      [autoApproveVerifiedStudents, account.id]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return response.json({
    message: account.account_type === "TEACHER"
      ? "Email verified. Your teacher account is awaiting administrator approval."
      : autoApproveVerifiedStudents
        ? "Email verified. You can now log in."
        : "Email verified. Your account is awaiting approval until your institutional enrollment is confirmed.",
    approved: account.account_type === "STUDENT" && autoApproveVerifiedStudents,
  });
});

app.post("/api/auth/password-reset/request", checkOrigin, verificationLimiter, async (request, response) => {
  const email = normalizeEmail(request.body.email);
  if (!validEmail(email)) {
    return response.status(400).json({ error: "Use a valid @polytechnic.am email address." });
  }

  const connection = await pool.getConnection();
  let accountId;
  let code;
  try {
    await connection.beginTransaction();
    const [accounts] = await connection.execute(
      `SELECT id FROM user_accounts
       WHERE email = ? AND email_verified_at IS NOT NULL AND is_active = TRUE FOR UPDATE`,
      [email]
    );
    if (accounts.length) {
      accountId = accounts[0].id;
      code = await savePasswordResetCode(connection, accountId);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  if (!accountId) {
    return response.json({ message: "If an account exists for that email, a reset code has been sent." });
  }
  return deliverPasswordResetCode(email, code, response);
});

app.post("/api/auth/password-reset/confirm", checkOrigin, verificationLimiter, async (request, response) => {
  const email = normalizeEmail(request.body.email);
  const code = typeof request.body.code === "string" ? request.body.code.trim() : "";
  const password = request.body.password;
  if (!validEmail(email) || !/^\d{6}$/.test(code)) {
    return response.status(400).json({ error: "Enter a valid email address and 6-digit code." });
  }
  if (typeof password !== "string" || password.length < 10 || Buffer.byteLength(password, "utf8") > 72) {
    return response.status(400).json({ error: "Password must be at least 10 characters and no more than 72 bytes." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [tokens] = await connection.execute(
      `SELECT prt.id, prt.token_hash, ua.id AS accountId
       FROM password_reset_tokens prt
       JOIN user_accounts ua ON ua.id = prt.user_account_id
       WHERE ua.email = ? AND prt.expires_at > UTC_TIMESTAMP()
       ORDER BY prt.id DESC LIMIT 1 FOR UPDATE`,
      [email]
    );
    if (!tokens.length || !validCode(code, tokens[0].token_hash)) {
      await connection.rollback();
      return response.status(400).json({ error: "That code is invalid or expired. Request a new code and try again." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await connection.execute(
      "UPDATE user_accounts SET password_hash = ? WHERE id = ?",
      [passwordHash, tokens[0].accountId]
    );
    await connection.execute(
      "DELETE FROM password_reset_tokens WHERE user_account_id = ?",
      [tokens[0].accountId]
    );
    await connection.commit();
    return response.json({ message: "Password updated. You can now log in." });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

app.post("/api/auth/login", checkOrigin, loginLimiter, async (request, response) => {
  const email = normalizeEmail(request.body.email);
  const password = request.body.password;
  const requestedRole = typeof request.body.role === "string" ? request.body.role.toUpperCase() : "";
  if (!validEmail(email) || typeof password !== "string" || !password) {
    return response.status(400).json({ error: "Enter your institutional email and password." });
  }

  const [accounts] = await pool.execute(
    `SELECT id, email, password_hash, account_type, approval_status,
            email_verified_at, is_active
     FROM user_accounts WHERE email = ? LIMIT 1`,
    [email]
  );
  const account = accounts[0];
  const passwordMatches = account && await bcrypt.compare(password, account.password_hash);
  if (!passwordMatches) {
    return response.status(401).json({ error: "Email or password is incorrect." });
  }
  if (account.account_type !== requestedRole) {
    return response.status(403).json({ error: "Choose the correct account type to log in." });
  }
  if (!account.is_active || !account.email_verified_at) {
    return response.status(403).json({ error: "Verify your email before logging in." });
  }
  if (account.approval_status !== "APPROVED") {
    return response.status(403).json({ error: "Your account is awaiting administrator approval." });
  }

  await pool.execute("UPDATE user_accounts SET last_login_at = UTC_TIMESTAMP() WHERE id = ?", [account.id]);
  setSessionCookie(response, account);
  return response.json({ user: publicUser(account) });
});

app.get("/api/auth/me", authenticate, (request, response) => {
  return response.json({ user: request.user });
});

app.post("/api/auth/logout", checkOrigin, (request, response) => {
  clearSessionCookie(response);
  return response.json({ success: true });
});

app.use("/api", authenticate, domainRouter);
app.use((request, response) => response.status(404).json({ error: "API route not found." }));
app.use((error, request, response, next) => {
  console.error("API request failed:", error);
  if (response.headersSent) return next(error);
  if (error.name === "MulterError") {
    return response.status(400).json({
      error: error.code === "LIMIT_FILE_SIZE"
        ? "Files must be 10 MB or smaller."
        : "The uploaded file could not be accepted.",
    });
  }
  return response.status(500).json({ error: "An unexpected server error occurred." });
});

await pool.execute("SELECT 1");
app.listen(port, () => {
  console.log(`LabCheck API listening on http://localhost:${port}`);
});
