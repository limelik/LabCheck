// Exercise real account routes and SQL with isolated fixtures; roll back all writes.
import "dotenv/config";
import assert from "node:assert/strict";
import express from "express";
import { randomUUID } from "node:crypto";
import router from "../server/domain.js";
import { pool } from "../server/db.js";

const connection = await pool.getConnection();
let server;
try {
  await connection.beginTransaction();
  const suffix = randomUUID();
  const [[admin]] = await connection.query("SELECT id FROM user_accounts WHERE account_type = 'ADMIN' LIMIT 1");
  assert.ok(admin, "An admin fixture is required");
  const [insert] = await connection.execute(
    "INSERT INTO user_accounts (email, password_hash, account_type) VALUES (?, 'test-only', 'TEACHER')",
    [`qa-${suffix}@polytechnic.am`]
  );
  const id = insert.insertId;
  await connection.execute("INSERT INTO teachers (user_account_id, first_name, last_name) VALUES (?, 'Before', 'Test')", [id]);
  pool.query = connection.query.bind(connection);
  pool.getConnection = async () => ({
    execute: connection.execute.bind(connection),
    beginTransaction: () => connection.query("SAVEPOINT account_edit"),
    commit: () => connection.query("RELEASE SAVEPOINT account_edit"),
    rollback: () => connection.query("ROLLBACK TO SAVEPOINT account_edit"),
    release() {},
  });
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => { request.user = { role: request.get("x-role") || "admin", id: admin.id }; next(); });
  app.use("/api", router);
  server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  const base = `http://127.0.0.1:${server.address().port}/api/admin/accounts`;
  const patch = (body, target = id, role = "admin") => fetch(`${base}/${target}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Origin: process.env.APP_ORIGIN || "http://localhost:5173", "x-role": role },
    body: JSON.stringify(body),
  });
  const draft = { firstName: "After", lastName: "Test", isActive: true, approvalStatus: "PENDING" };
  assert.equal((await fetch(base, { headers: { "x-role": "student" } })).status, 403);
  const list = await (await fetch(base)).json();
  assert.ok(list.users.find((user) => user.id === id && !user.emailVerifiedAt), "Lists unverified accounts");
  assert.ok(list.users.some((user) => user.role === "ADMIN"), "Lists admins");
  assert.equal((await patch(draft, id, "teacher")).status, 403);
  assert.equal((await patch({ ...draft, firstName: " " })).status, 400);
  assert.equal((await patch({ ...draft, approvalStatus: "APPROVED" })).status, 409);
  assert.equal((await patch({ ...draft, isActive: false }, admin.id)).status, 409);
  assert.equal((await patch(draft)).status, 200);
  const [[profile]] = await connection.execute("SELECT first_name FROM teachers WHERE user_account_id = ?", [id]);
  assert.equal(profile.first_name, "After");
  await connection.execute("UPDATE user_accounts SET email_verified_at = UTC_TIMESTAMP() WHERE id = ?", [id]);
  const [[profileBefore]] = await connection.execute("SELECT * FROM teachers WHERE user_account_id = ?", [id]);
  const [[accountBefore]] = await connection.execute("SELECT password_hash, email, email_verified_at FROM user_accounts WHERE id = ?", [id]);
  assert.equal((await patch({ ...draft, approvalStatus: "APPROVED", isActive: false })).status, 200);
  const [[saved]] = await connection.execute("SELECT is_active, approval_status, reviewed_by_user_account_id FROM user_accounts WHERE id = ?", [id]);
  assert.equal(saved.is_active, 0);
  assert.equal(saved.approval_status, "APPROVED");
  assert.equal(saved.reviewed_by_user_account_id, admin.id);
  const [[profileAfter]] = await connection.execute("SELECT * FROM teachers WHERE user_account_id = ?", [id]);
  const [[accountAfter]] = await connection.execute("SELECT password_hash, email, email_verified_at FROM user_accounts WHERE id = ?", [id]);
  assert.deepEqual(profileAfter, profileBefore, "Deactivation preserves the profile and its identity");
  assert.deepEqual(accountAfter, accountBefore, "Deactivation preserves account credentials and verification");
  assert.equal((await patch({ ...draft, approvalStatus: "APPROVED", isActive: true })).status, 200);
  const [[reactivated]] = await connection.execute("SELECT is_active FROM user_accounts WHERE id = ?", [id]);
  assert.equal(reactivated.is_active, 1);
  console.log("Admin account listing, edits, validation, access controls, and verification guards passed.");
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await connection.rollback();
  connection.release();
  await pool.end();
}
