import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { config } from "../config.js";
import { query, transaction } from "../db.js";
import { ApiError, asyncRoute, validate } from "../http.js";
import {
  universityEmail as email,
  passwordInput as password,
  detectedGroup,
  extractGroup,
  activateRegistration,
  assertEmailRole,
} from "../services/identity.js";
import {
  needSecret,
  sessionHash,
  issueOtp,
  consumeOtp,
} from "../services/otp.js";
export const authRouter = Router();
const limit = (count) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: count,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Too many attempts. Please try again later.",
      },
    },
  });
const signupLimit = limit(15),
  loginLimit = limit(30),
  verifyLimit = limit(60),
  resendLimit = limit(15),
  resetLimit = limit(15);
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: config.cookieSecure,
  path: "/",
};
const code = z.string().regex(/^\d{6}$/, "Enter the six-digit email code.");
export async function userForAccount(accountId) {
  const rows = await query(
    `SELECT ua.id,ua.email,ua.password_hash AS passwordHash,ua.account_type AS accountType,
    ua.approval_status AS approvalStatus,ua.email_verified_at AS emailVerifiedAt,ua.is_active AS isActive,
    COALESCE(s.id,t.id,a.id) AS profileId,a.admin_level AS adminLevel,a.academic_unit_id AS academicUnitId,
    COALESCE(s.first_name,t.first_name,a.first_name) AS firstName,COALESCE(s.last_name,t.last_name,a.last_name) AS lastName,
    s.academic_group_id AS academicGroupId,ag.code AS academicGroupCode
    FROM user_accounts ua LEFT JOIN students s ON s.user_account_id=ua.id AND ua.account_type='STUDENT'
    LEFT JOIN academic_groups ag ON ag.id=s.academic_group_id
    LEFT JOIN teachers t ON t.user_account_id=ua.id AND ua.account_type='TEACHER'
    LEFT JOIN admins a ON a.user_account_id=ua.id AND ua.account_type='ADMIN' WHERE ua.id=?`,
    [accountId],
  );
  return rows[0];
}
const publicUser = (row) => ({
  id: row.id,
  email: row.email,
  role: row.accountType.toLowerCase(),
  profileId: row.profileId,
  adminLevel: row.adminLevel,
  academicUnitId: row.academicUnitId,
  firstName: row.firstName,
  lastName: row.lastName,
  academicGroupId: row.academicGroupId,
  academicGroupCode: row.academicGroupCode,
});
const eligible = (account) =>
  account?.profileId &&
  account.isActive &&
  account.emailVerifiedAt &&
  account.approvalStatus === "APPROVED";
export const authenticate = asyncRoute(async (req, _res, next) => {
  needSecret();
  const token = req.cookies?.labcheck_session;
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new ApiError(401, "UNAUTHENTICATED", "Please log in.");
  const sessions = await query(
    "SELECT user_account_id FROM auth_sessions WHERE token_hash=? AND expires_at>UTC_TIMESTAMP()",
    [sessionHash(token)],
  );
  const account = sessions[0]
    ? await userForAccount(sessions[0].user_account_id)
    : null;
  if (!eligible(account))
    throw new ApiError(
      401,
      "UNAUTHENTICATED",
      "Session expired, revoked, or account unavailable.",
    );
  req.user = publicUser(account);
  next();
});
authRouter.get(
  "/detect-group",
  asyncRoute(async (req, res) => {
    const address = validate(email, req.query.email);
    const detection = await transaction((c) => detectedGroup(c, address));
    res.json({
      code: detection.code,
      recognized: Boolean(detection.group),
      message: detection.group
        ? `Detected academic group: ${detection.group.code}`
        : "Group is not recognized. Registration will require administrator review.",
    });
  }),
);
authRouter.get(
  "/academic-groups",
  asyncRoute(async (_req, res) =>
    res.json(
      await query("SELECT id,code,name FROM academic_groups ORDER BY code"),
    ),
  ),
);
authRouter.post(
  "/signup",
  signupLimit,
  asyncRoute(async (req, res) => {
    const data = validate(
      z.strictObject({
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        email,
        password,
        role: z.enum(["student", "teacher"]),
      }),
      req.body,
    );
    needSecret();
    assertEmailRole(data.email, data.role.toUpperCase());
    const hash = await bcrypt.hash(data.password, 12);
    await transaction(async (c) => {
      const [accounts] = await c.execute(
        "SELECT * FROM user_accounts WHERE email=? FOR UPDATE",
        [data.email],
      );
      if (
        accounts[0] &&
        accounts[0].password_hash !== "demo-hash" &&
        accounts[0].approval_status !== "PENDING"
      )
        throw new ApiError(
          409,
          "ACCOUNT_EXISTS",
          "An account already exists. Log in or recover your password.",
        );
      const [existing] = await c.execute(
        "SELECT * FROM registrations WHERE email=? FOR UPDATE",
        [data.email],
      );
      if (existing.length)
        throw new ApiError(
          409,
          "REGISTRATION_EXISTS",
          "Registration already exists. Continue email verification, resend the code, or recover your password.",
        );
      await c.execute(
        "INSERT INTO registrations(email,first_name,last_name,requested_role,password_hash,detected_group_code) VALUES (?,?,?,?,?,?)",
        [
          data.email,
          data.firstName,
          data.lastName,
          data.role.toUpperCase(),
          hash,
          data.role === "student" ? extractGroup(data.email) : null,
        ],
      );
      await issueOtp(c, data.email, "REGISTER");
    });
    res.status(202).json({
      email: data.email,
      message:
        "Check your university email for a six-digit verification code to activate your account.",
    });
  }),
);
authRouter.post(
  "/resend-verification",
  resendLimit,
  asyncRoute(async (req, res) => {
    const { email: address } = validate(z.strictObject({ email }), req.body);
    await transaction(async (c) => {
      const [rows] = await c.execute(
        "SELECT id,email_verified_at,status FROM registrations WHERE email=? FOR UPDATE",
        [address],
      );
      if (rows[0]?.status === "PENDING" && !rows[0].email_verified_at)
        await issueOtp(c, address, "REGISTER");
    });
    res.json({
      message:
        "If verification is required, a new code has been sent. Check your email.",
    });
  }),
);
authRouter.post(
  "/verify-email",
  verifyLimit,
  asyncRoute(async (req, res) => {
    const data = validate(z.strictObject({ email, code }), req.body);
    const result = await transaction(async (c) => {
      const [rows] = await c.execute(
        "SELECT * FROM registrations WHERE email=? FOR UPDATE",
        [data.email],
      );
      if (!rows[0])
        return {
          error: new ApiError(
            400,
            "OTP_INVALID",
            "Code is invalid. Request a new code.",
          ),
        };
      if (rows[0].status === "REJECTED")
        return {
          error: new ApiError(
            403,
            "REGISTRATION_REJECTED",
            "Registration was rejected. Contact an administrator.",
          ),
        };
      const error = await consumeOtp(c, data.email, "REGISTER", data.code);
      if (error) return { error };
      await c.execute(
        "UPDATE registrations SET email_verified_at=UTC_TIMESTAMP() WHERE id=?",
        [rows[0].id],
      );
      await c.query("SAVEPOINT activation");
      try {
        await activateRegistration(c, rows[0]);
        return {
          verified: true,
          status: "APPROVED",
          message: "Email verified and account activated. You can log in now.",
        };
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 409) throw err;
        await c.query("ROLLBACK TO SAVEPOINT activation");
        await c.execute("UPDATE registrations SET review_reason=? WHERE id=?", [
          err.message,
          rows[0].id,
        ]);
        return {
          verified: true,
          status: "PENDING",
          message: `Email verified. Pending administrator review: ${err.message}`,
        };
      }
    });
    if (result.error) throw result.error;
    res.json(result);
  }),
);
authRouter.post(
  "/login",
  loginLimit,
  asyncRoute(async (req, res) => {
    needSecret();
    const data = validate(
      z.strictObject({
        email,
        password: z.string().min(1).max(128),
        role: z.enum(["student", "teacher", "admin"]).optional(),
      }),
      req.body,
    );
    const rows = await query("SELECT id FROM user_accounts WHERE email=?", [
      data.email,
    ]);
    const account = rows[0] ? await userForAccount(rows[0].id) : null;
    const valid =
      account?.passwordHash.startsWith("$2") &&
      (await bcrypt.compare(data.password, account.passwordHash));
    if (!valid || !eligible(account))
      throw new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid credentials or account not activated. Verify your email or contact an administrator.",
      );
    const token = crypto.randomBytes(32).toString("hex");
    await transaction(async (c) => {
      const [current] = await c.execute(
        "SELECT is_active,approval_status,password_hash FROM user_accounts WHERE id=? FOR UPDATE",
        [account.id],
      );
      if (
        !current[0]?.is_active ||
        current[0].approval_status !== "APPROVED" ||
        current[0].password_hash !== account.passwordHash
      )
        throw new ApiError(
          401,
          "INVALID_CREDENTIALS",
          "Account changed. Please try again.",
        );
      if (req.cookies?.labcheck_session)
        await c.execute("DELETE FROM auth_sessions WHERE token_hash=?", [
          sessionHash(req.cookies.labcheck_session),
        ]);
      await c.execute(
        "INSERT INTO auth_sessions(token_hash,user_account_id,expires_at) VALUES (?,?,TIMESTAMPADD(HOUR,?,UTC_TIMESTAMP()))",
        [sessionHash(token), account.id, config.sessionHours],
      );
      await c.execute(
        "UPDATE user_accounts SET last_login_at=UTC_TIMESTAMP() WHERE id=?",
        [account.id],
      );
    });
    res.cookie("labcheck_session", token, {
      ...cookieOptions,
      maxAge: config.sessionHours * 3600000,
    });
    res.json({ user: publicUser(account) });
  }),
);
authRouter.get("/me", authenticate, (req, res) => res.json({ user: req.user }));
authRouter.post(
  "/logout",
  asyncRoute(async (req, res) => {
    if (req.cookies?.labcheck_session)
      await query("DELETE FROM auth_sessions WHERE token_hash=?", [
        sessionHash(req.cookies.labcheck_session),
      ]);
    res.clearCookie("labcheck_session", cookieOptions);
    res.status(204).end();
  }),
);
authRouter.post(
  "/password-reset/request",
  resetLimit,
  asyncRoute(async (req, res) => {
    const { email: address } = validate(z.strictObject({ email }), req.body);
    await transaction(async (c) => {
      const [accounts] = await c.execute(
        "SELECT id FROM user_accounts WHERE email=? FOR UPDATE",
        [address],
      );
      const [registrations] = await c.execute(
        "SELECT id FROM registrations WHERE email=? FOR UPDATE",
        [address],
      );
      if (accounts.length || registrations.length)
        await issueOtp(c, address, "RESET");
    });
    res.json({
      message: "If the account exists, a six-digit reset code has been sent.",
    });
  }),
);
authRouter.post(
  "/password-reset/verify",
  verifyLimit,
  asyncRoute(async (req, res) => {
    const data = validate(z.strictObject({ email, code }), req.body);
    const error = await transaction((c) =>
      consumeOtp(c, data.email, "RESET", data.code, false),
    );
    if (error) throw error;
    res.json({ verified: true });
  }),
);
authRouter.post(
  "/password-reset/confirm",
  verifyLimit,
  asyncRoute(async (req, res) => {
    const data = validate(
      z.strictObject({ email, code, newPassword: password }),
      req.body,
    );
    const hash = await bcrypt.hash(data.newPassword, 12);
    const result = await transaction(async (c) => {
      const [accounts] = await c.execute(
        "SELECT * FROM user_accounts WHERE email=? FOR UPDATE",
        [data.email],
      );
      const [registrations] = await c.execute(
        "SELECT * FROM registrations WHERE email=? FOR UPDATE",
        [data.email],
      );
      if (!accounts.length && !registrations.length)
        return new ApiError(400, "OTP_INVALID", "Code is invalid.");
      const error = await consumeOtp(c, data.email, "RESET", data.code);
      if (error) return error;
      // Recovery changes credentials, never grants a role or approves a pending identity.
      if (accounts.length) {
        await c.execute(
          "UPDATE user_accounts SET password_hash=?, email_verified_at=COALESCE(email_verified_at,UTC_TIMESTAMP()) WHERE id=?",
          [hash, accounts[0].id],
        );
        await c.execute("DELETE FROM auth_sessions WHERE user_account_id=?", [
          accounts[0].id,
        ]);
      }
      if (registrations[0]?.status === "PENDING")
        await c.execute("UPDATE registrations SET password_hash=? WHERE id=?", [
          hash,
          registrations[0].id,
        ]);
      await c.execute(
        "DELETE FROM email_otp_challenges WHERE email=? AND purpose='REGISTER'",
        [data.email],
      );
      return null;
    });
    if (result) throw result;
    res.json({
      reset: true,
      message: "Password changed. You can log in now.",
    });
  }),
);
