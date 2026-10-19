import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config.js';
import { query, transaction } from '../db.js';
import { ApiError, asyncRoute, requireRecord, validate } from '../http.js';

export const authRouter = Router();
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15,
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Please try again later.' } },
});
const email = z.email().max(255).refine((value) => value.toLowerCase().endsWith('@polytechnic.am'), 'Use a @polytechnic.am email.');
const password = z.string().min(8).max(128);
const signupInput = z.strictObject({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email,
  password,
  role: z.enum(['student', 'teacher']),
  academicGroupId: z.number().int().positive().optional(),
});
const loginInput = z.strictObject({ email, password: z.string().min(1), role: z.enum(['student', 'teacher', 'admin']).optional() });
const hashToken = (token) => {
  needSecret();
  return crypto.createHmac('sha256', config.authSecret).update(token).digest('hex');
};
const newToken = () => crypto.randomBytes(32).toString('hex');
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, path: '/' };

async function sendMail(to, subject, body) {
  if (config.smtp.host && config.smtp.from) {
    const transporter = nodemailer.createTransport({
      host: config.smtp.host, port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.password } : undefined,
    });
    await transporter.sendMail({ from: config.smtp.from, to, subject, text: body });
    return;
  }
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_MAILBOX_DIR) {
    const directory = path.resolve(process.env.DEV_MAILBOX_DIR);
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.txt`;
    await fs.writeFile(path.join(directory, filename), `To: ${to}\nSubject: ${subject}\n\n${body}\n`, { mode: 0o600 });
    return;
  }
  throw new ApiError(503, 'EMAIL_UNAVAILABLE', 'Email delivery is not configured.');
}

function needMailer() {
  if (!((config.smtp.host && config.smtp.from) ||
    (process.env.NODE_ENV !== 'production' && process.env.DEV_MAILBOX_DIR))) {
    throw new ApiError(503, 'EMAIL_UNAVAILABLE', 'Email delivery is not configured.');
  }
}

function needSecret() {
  if (!config.authSecret || config.authSecret.length < 32) {
    throw new ApiError(503, 'AUTH_NOT_CONFIGURED', 'Authentication secret is not configured.');
  }
}

async function userForAccount(accountId) {
  const rows = await query(`SELECT ua.id, ua.email, ua.password_hash AS passwordHash,
    ua.account_type AS accountType, ua.approval_status AS approvalStatus,
    ua.email_verified_at AS emailVerifiedAt, ua.is_active AS isActive,
    COALESCE(s.id, t.id, a.id) AS profileId,
    a.admin_level AS adminLevel, a.academic_unit_id AS academicUnitId,
    COALESCE(s.first_name, t.first_name, a.first_name) AS firstName,
    COALESCE(s.last_name, t.last_name, a.last_name) AS lastName
    FROM user_accounts ua LEFT JOIN students s ON s.user_account_id = ua.id AND ua.account_type = 'STUDENT'
    LEFT JOIN teachers t ON t.user_account_id = ua.id AND ua.account_type = 'TEACHER'
    LEFT JOIN admins a ON a.user_account_id = ua.id AND ua.account_type = 'ADMIN'
    WHERE ua.id = ?`, [accountId]);
  return rows[0];
}

function publicUser(row) {
  return { id: row.id, email: row.email, role: row.accountType.toLowerCase(),
    profileId: row.profileId, adminLevel: row.adminLevel,
    academicUnitId: row.academicUnitId, firstName: row.firstName, lastName: row.lastName };
}

export const authenticate = asyncRoute(async (req, _res, next) => {
  needSecret();
  const token = req.cookies?.labcheck_session;
  if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Please log in.');
  let payload;
  try { payload = jwt.verify(token, config.authSecret, { algorithms: ['HS256'] }); }
  catch { throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired or invalid.'); }
  const account = await userForAccount(payload.sub);
  if (!account?.profileId || !account.isActive || !account.emailVerifiedAt || account.approvalStatus !== 'APPROVED') {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Account is unavailable.');
  }
  req.user = publicUser(account);
  next();
});

authRouter.post('/signup', authLimit, asyncRoute(async (req, res) => {
  const data = validate(signupInput, req.body);
  needMailer();
  if (data.role === 'student' && !data.academicGroupId) throw new ApiError(400, 'GROUP_REQUIRED', 'Choose an academic group.');
  if (data.role === 'teacher' && data.academicGroupId) throw new ApiError(400, 'INVALID_GROUP', 'Teachers do not select an academic group.');
  const normalizedEmail = data.email.toLowerCase();
  const token = newToken();
  const tokenHash = hashToken(token);
  const passwordHash = await bcrypt.hash(data.password, 12);
  await transaction(async (connection) => {
    const [accounts] = await connection.execute('SELECT id, account_type AS accountType, password_hash AS passwordHash, email_verified_at AS emailVerifiedAt FROM user_accounts WHERE email = ? FOR UPDATE', [normalizedEmail]);
    const account = requireRecord(accounts[0], 'This identity is not in the institutional roster.');
    if (account.accountType !== data.role.toUpperCase()) throw new ApiError(403, 'ROSTER_MISMATCH', 'Role does not match the institutional roster.');
    const table = data.role === 'student' ? 'students' : 'teachers';
    const [profiles] = await connection.execute(`SELECT first_name AS firstName, last_name AS lastName${data.role === 'student' ? ', academic_group_id AS academicGroupId' : ''} FROM ${table} WHERE user_account_id = ?`, [account.id]);
    const profile = requireRecord(profiles[0], 'Identity profile is missing.');
    if (profile.firstName.toLowerCase() !== data.firstName.toLowerCase() ||
        profile.lastName.toLowerCase() !== data.lastName.toLowerCase() ||
        (data.role === 'student' && profile.academicGroupId !== data.academicGroupId)) {
      throw new ApiError(403, 'ROSTER_MISMATCH', 'Details do not match the institutional roster.');
    }
    if (account.emailVerifiedAt && account.passwordHash !== 'demo-hash') {
      throw new ApiError(409, 'ACCOUNT_EXISTS', 'Account already activated. Use password reset.');
    }
    await connection.execute(`UPDATE user_accounts SET password_hash = ?, email_verified_at = NULL,
      approval_status = 'PENDING' WHERE id = ?`, [passwordHash, account.id]);
    await connection.execute('DELETE FROM email_verification_tokens WHERE user_account_id = ? AND used_at IS NULL', [account.id]);
    await connection.execute(`INSERT INTO email_verification_tokens
      (user_account_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))`,
    [account.id, tokenHash]);
  });
  await sendMail(normalizedEmail, 'Verify your LabCheck account',
    `Open this link to verify your account:\n${config.publicUrl}/verify-email?token=${token}`);
  res.status(202).json({ message: 'Check your email to verify your account.' });
}));

authRouter.get('/academic-groups', asyncRoute(async (_req, res) => {
  res.json(await query('SELECT id, code, name FROM academic_groups ORDER BY code'));
}));

authRouter.post('/verify-email', authLimit, asyncRoute(async (req, res) => {
  const { token } = validate(z.strictObject({ token: z.string().min(32).max(128) }), req.body);
  await transaction(async (connection) => {
    const [rows] = await connection.execute(`SELECT id, user_account_id AS accountId FROM email_verification_tokens
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP() FOR UPDATE`, [hashToken(token)]);
    const row = requireRecord(rows[0], 'Verification link is invalid or expired.');
    await connection.execute('UPDATE email_verification_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ?', [row.id]);
    await connection.execute(`UPDATE user_accounts SET email_verified_at = UTC_TIMESTAMP(),
      approval_status = 'APPROVED' WHERE id = ?`, [row.accountId]);
  });
  res.json({ verified: true });
}));

authRouter.post('/login', authLimit, asyncRoute(async (req, res) => {
  needSecret();
  const data = validate(loginInput, req.body);
  const rows = await query('SELECT id FROM user_accounts WHERE email = ?', [data.email.toLowerCase()]);
  const account = rows[0] ? await userForAccount(rows[0].id) : null;
  const validPassword = account && account.passwordHash !== 'demo-hash' &&
    await bcrypt.compare(data.password, account.passwordHash);
  if (!account || !validPassword || !account.profileId || !account.isActive ||
      !account.emailVerifiedAt || account.approvalStatus !== 'APPROVED' ||
      (data.role && data.role !== account.accountType.toLowerCase())) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials or account not activated.');
  }
  const user = publicUser(account);
  const session = jwt.sign({}, config.authSecret, { algorithm: 'HS256', subject: String(account.id), expiresIn: '8h' });
  res.cookie('labcheck_session', session, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
  await query('UPDATE user_accounts SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [account.id]);
  res.json({ user });
}));

authRouter.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('labcheck_session', cookieOptions);
  res.status(204).end();
});

authRouter.post('/password-reset/request', authLimit, asyncRoute(async (req, res) => {
  const { email: address } = validate(z.strictObject({ email }), req.body);
  needMailer();
  const rows = await query('SELECT id FROM user_accounts WHERE email = ?', [address.toLowerCase()]);
  if (rows.length) {
    const code = String(crypto.randomInt(10000000, 100000000));
    const tokenHash = hashToken(code);
    await transaction(async (connection) => {
      await connection.execute('DELETE FROM password_reset_tokens WHERE user_account_id = ?', [rows[0].id]);
      await connection.execute(`INSERT INTO password_reset_tokens (user_account_id, token_hash, expires_at)
        VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 20 MINUTE))`, [rows[0].id, tokenHash]);
    });
    await sendMail(address.toLowerCase(), 'LabCheck password reset code', `Your reset code is: ${code}\nIt expires in 20 minutes.`);
  }
  res.json({ message: 'If the account exists, a reset code has been sent.' });
}));

authRouter.post('/password-reset/confirm', authLimit, asyncRoute(async (req, res) => {
  const data = validate(z.strictObject({ email, code: z.string().length(8).regex(/^\d+$/), newPassword: password }), req.body);
  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await transaction(async (connection) => {
    const [accounts] = await connection.execute('SELECT id FROM user_accounts WHERE email = ? FOR UPDATE', [data.email.toLowerCase()]);
    const account = requireRecord(accounts[0], 'Reset code is invalid or expired.');
    const [tokens] = await connection.execute(`SELECT id FROM password_reset_tokens WHERE user_account_id = ?
      AND token_hash = ? AND expires_at > UTC_TIMESTAMP() FOR UPDATE`, [account.id, hashToken(data.code)]);
    requireRecord(tokens[0], 'Reset code is invalid or expired.');
    await connection.execute('UPDATE user_accounts SET password_hash = ? WHERE id = ?', [passwordHash, account.id]);
    await connection.execute('DELETE FROM password_reset_tokens WHERE user_account_id = ?', [account.id]);
  });
  res.json({ reset: true });
}));
