// Regression check against the TT319 demo fixture. All writes are rolled back.
import "dotenv/config";
import assert from "node:assert/strict";
import express from "express";
import router from "../server/domain.js";
import { pool } from "../server/db.js";

const connection = await pool.getConnection();
let server;
// Route writes use this transaction too, so API checks cannot persist test results.
const routeConnection = new Proxy(connection, {
  get(target, key) {
    if (["beginTransaction", "commit", "rollback", "release"].includes(key)) return async () => {};
    return typeof target[key] === "function" ? target[key].bind(target) : target[key];
  },
});
pool.getConnection = async () => routeConnection;
pool.query = connection.query.bind(connection);
pool.execute = connection.execute.bind(connection);
try {
  await connection.beginTransaction();
  const [groups] = await connection.query(`
    SELECT tsa.subject_group_offering_id AS offeringId, tsa.lab_group_id AS groupId,
           tsa.teacher_id AS teacherId, lg.code
    FROM teacher_subject_assignments tsa
    JOIN lab_groups lg ON lg.id = tsa.lab_group_id
    JOIN subject_group_offerings o ON o.id = tsa.subject_group_offering_id
    JOIN subjects s ON s.id = o.subject_id
    WHERE s.name = 'Databases' AND lg.code IN ('319-1', '319-2', '319-3') ORDER BY lg.code`);
  assert.equal(groups.length, 3, "Expected the TT319 Databases demo groups");
  const [first, second, other] = groups;
  assert.equal(first.teacherId, second.teacherId);
  assert.notEqual(first.teacherId, other.teacherId);
  const lock = (g, teacherId = g.teacherId, midterm = 1) => connection.execute(
    `INSERT INTO lab_group_midterm_locks (subject_group_offering_id, lab_group_id, midterm_no, locked_by_teacher_id)
     VALUES (?, ?, ?, ?)`, [g.offeringId, g.groupId, midterm, teacherId]);
  const rejected = (operation, pattern) => assert.rejects(operation, (error) =>
    error.code === "ER_SIGNAL_EXCEPTION" && pattern.test(error.sqlMessage));
  await rejected(() => lock(other, first.teacherId), /assigned teacher/);
  await rejected(() => lock(other), /Complete grades/);
  await rejected(() => lock(first, first.teacherId, 2), /Midterm 1/);
  const app = express();
  app.use(express.json());
  app.use(async (request, response, next) => {
    const [[teacher]] = await connection.execute("SELECT user_account_id AS id FROM teachers WHERE id = ?", [Number(request.get("x-test-teacher"))]);
    request.user = { id: teacher.id, role: "teacher" };
    next();
  });
  app.use("/api", router);
  server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const api = (teacherId, path, method = "GET") => fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
    method, headers: { "x-test-teacher": String(teacherId), origin: process.env.APP_ORIGIN || "http://localhost:5173" },
  });
  const finishResponse = await api(first.teacherId, `/teacher/offerings/${first.offeringId}/midterms/1/lock`, "POST");
  assert.equal(finishResponse.status, 200, await finishResponse.text());
  const ownData = await (await api(first.teacherId, "/bootstrap")).json();
  const otherData = await (await api(other.teacherId, "/bootstrap")).json();
  assert.equal(ownData.midtermsByOffering[first.offeringId][1], "LOCKED");
  assert.equal(otherData.midtermsByOffering[first.offeringId][1], "OPEN");
  assert.equal(otherData.assignmentMidtermsByOffering[first.offeringId][1], "LOCKED");
  assert.equal(ownData.midtermsByLabGroup[first.offeringId]['319-1'][1], "LOCKED");
  assert.equal(ownData.midtermsByLabGroup[first.offeringId]['319-2'][1], "LOCKED");
  const otherFinish = await api(other.teacherId, `/teacher/offerings/${other.offeringId}/midterms/1/lock`, "POST");
  assert.equal(otherFinish.status, 409);
  const [[enrollment]] = await connection.execute(
    "SELECT id FROM student_subject_enrollments WHERE subject_group_offering_id = ? AND lab_group_id = ? LIMIT 1",
    [first.offeringId, first.groupId]);
  await rejected(() => connection.execute(
    "UPDATE student_lab_results SET grade = grade WHERE student_subject_enrollment_id = ?", [enrollment.id]), /finished/);
  await rejected(() => connection.execute(
    "UPDATE student_midterm_results SET exam_score = exam_score WHERE student_subject_enrollment_id = ? AND midterm_no = 1", [enrollment.id]), /finished/);
  await rejected(() => connection.execute(
    "UPDATE student_subject_enrollments SET lab_group_id = ? WHERE id = ?", [other.groupId, enrollment.id]), /lab group finishes/);
  await rejected(() => connection.execute(
    "UPDATE lab_assignments SET title = title WHERE subject_group_offering_id = ? AND midterm_no = 1", [first.offeringId]), /Shared lab/);
  const [[otherEnrollment]] = await connection.execute(
    "SELECT id FROM student_subject_enrollments WHERE subject_group_offering_id = ? AND lab_group_id = ? LIMIT 1",
    [other.offeringId, other.groupId]);
  await connection.execute(`INSERT INTO student_midterm_results (student_subject_enrollment_id, midterm_no, exam_score)
    VALUES (?, 1, 2) ON DUPLICATE KEY UPDATE exam_score = 2`, [otherEnrollment.id]);
  const [[lab]] = await connection.execute(
    "SELECT id FROM lab_assignments WHERE subject_group_offering_id = ? AND midterm_no = 1 LIMIT 1", [first.offeringId]);
  await connection.execute(`INSERT INTO student_lab_results (student_subject_enrollment_id, lab_assignment_id, attendance, grade)
    VALUES (?, ?, 'PRESENT', 0) ON DUPLICATE KEY UPDATE attendance = 'PRESENT', grade = 0`, [otherEnrollment.id, lab.id]);
  const [[last]] = await connection.execute(
    "SELECT MAX(lab_number) AS number FROM lab_assignments WHERE subject_group_offering_id = ?", [first.offeringId]);
  await connection.execute(`INSERT INTO lab_assignments (subject_group_offering_id, midterm_no, lab_number, title, max_grade)
    VALUES (?, 2, ?, 'Rollback-only Midterm 2 check', 4)`, [first.offeringId, last.number + 1]);
  const [[global]] = await connection.execute(
    "SELECT status FROM offering_midterms WHERE subject_group_offering_id = ? AND midterm_no = 1", [first.offeringId]);
  assert.equal(global.status, "OPEN", "Other teachers must not be globally locked");
  console.log("Passed: own groups finish independently; incomplete/unauthorized groups blocked; finalized grades and shared labs protected; other teacher can grade; Midterm 2 labs can start.");
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await connection.rollback();
  connection.release();
  await pool.end();
}
