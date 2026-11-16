// Isolated fixtures; every database write is rolled back.
import "dotenv/config";
import assert from "node:assert/strict";
import express from "express";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import router from "../server/domain.js";
import { randomUUID } from "node:crypto";
import { pool } from "../server/db.js";
import { placeAcademicGroup } from "../server/placement.js";
import { classifyInstitutionalEmail } from "../shared/institutionalEmail.js";
import { labGroupLabel } from "../src/data/groupLabels.js";

assert.deepEqual(classifyInstitutionalEmail("LianaMelikyan.tt319-2@polytechnic.am"), { role: "STUDENT", groupCode: "TT319" });
assert.deepEqual(classifyInstitutionalEmail("name.surname@polytechnic.am"), { role: "TEACHER", groupCode: null });
assert.equal(classifyInstitutionalEmail("name.tt319@example.com"), null);
assert.equal(labGroupLabel("TT319", "319-2"), "TT319-2");
assert.equal(labGroupLabel("TT319", "TT319-2"), "TT319-2");
const connection = await pool.getConnection();
let httpServer;
let previewPath;
try {
  await connection.beginTransaction();
  const suffix = randomUUID().slice(0, 8);
  const [[specialization]] = await connection.query("SELECT id FROM specializations LIMIT 1");
  const [[subject]] = await connection.query("SELECT id FROM subjects LIMIT 1");
  const [group] = await connection.execute(
    "INSERT INTO academic_groups (specialization_id, code, name) VALUES (?, ?, ?)",
    [specialization.id, `QA${suffix}`, "Rollback-only signup regression"]);
  const [offering] = await connection.execute(
    "INSERT INTO subject_group_offerings (subject_id, academic_group_id, academic_year, semester) VALUES (?, ?, '2026-2027', 'Fall')", [subject.id, group.insertId]);
  await connection.execute("INSERT INTO offering_midterms (subject_group_offering_id, midterm_no) VALUES (?, 1), (?, 2)", [offering.insertId, offering.insertId]);
  async function addStudent(lastName) {
    const [account] = await connection.execute(
      "INSERT INTO user_accounts (email, password_hash, account_type) VALUES (?, 'test-only', 'STUDENT')", [`qa-${suffix}-${lastName}@polytechnic.am`]);
    await connection.execute("INSERT INTO students (user_account_id, academic_group_id, first_name, last_name) VALUES (?, ?, 'QA', ?)", [account.insertId, group.insertId, lastName]);
  }
  // Insert out of order, then check contiguous alphabetic blocks, including overflow.
  for (let i = 32; i >= 0; i--) await addStudent(`Surname${String(i).padStart(2, "0")}`);
  await placeAcademicGroup(connection, group.insertId);
  const roster = async () => (await connection.execute(
    `SELECT e.id, s.last_name AS surname, e.lab_group_id AS groupId FROM student_subject_enrollments e
     JOIN students s ON s.id = e.student_id WHERE e.subject_group_offering_id = ? ORDER BY s.last_name`, [offering.insertId]))[0];
  let rows = await roster();
  assert.equal(rows.length, 33);
  const groupIds = [...new Set(rows.map((r) => r.groupId))];
  assert.equal(groupIds.length, 3);
  rows.forEach((r, i) => assert.equal(r.groupId, groupIds[Math.floor(i / 16)]));
  await addStudent("Aardvark");
  await placeAcademicGroup(connection, group.insertId);
  rows = await roster();
  assert.equal(rows[0].surname, "Aardvark");
  rows.forEach((r, i) => assert.equal(r.groupId, groupIds[Math.floor(i / 16)]));
  // A saved result must prevent moving or recreating existing enrollments.
  await connection.execute("INSERT INTO student_midterm_results (student_subject_enrollment_id, midterm_no, exam_score) VALUES (?, 1, 3)", [rows[0].id]);
  await addStudent("Aaron");
  await placeAcademicGroup(connection, group.insertId);
  const stableRows = await roster();
  for (const row of rows) assert.deepEqual(stableRows.find((r) => r.id === row.id), row);
  assert.equal(stableRows.length, 35);
  for (const id of new Set(stableRows.map((r) => r.groupId))) {
    assert.ok(stableRows.filter((r) => r.groupId === id).length <= 16);
  }
  const [[teacher]] = await connection.query("SELECT id, user_account_id AS accountId FROM teachers LIMIT 1");
  await connection.execute("INSERT INTO teacher_subject_assignments (teacher_id, subject_group_offering_id, lab_group_id) VALUES (?, ?, ?)", [teacher.id, offering.insertId, groupIds[0]]);
  const [lab] = await connection.execute("INSERT INTO lab_assignments (subject_group_offering_id, midterm_no, lab_number, title, max_grade) VALUES (?, 1, 1, 'Preview test', 1)", [offering.insertId]);
  const storageName = randomUUID();
  previewPath = join(process.cwd(), "server/storage/uploads", storageName);
  await writeFile(previewPath, "Preview regression fixture");
  const [attachment] = await connection.execute("INSERT INTO lab_attachments (lab_assignment_id, uploaded_by_user_account_id, storage_name, original_name, file_size) VALUES (?, ?, ?, 'notes.txt', 26)", [lab.insertId, teacher.accountId, storageName]);
  const [[student]] = await connection.execute("SELECT user_account_id AS accountId FROM students WHERE academic_group_id = ? LIMIT 1", [group.insertId]);
  pool.execute = connection.execute.bind(connection);
  const app = express();
  app.use((request, response, next) => {
    request.user = { role: request.get("x-test-role"), id: Number(request.get("x-test-user")) };
    next();
  });
  app.use("/api", router);
  httpServer = await new Promise((resolve) => { const server = app.listen(0, "127.0.0.1", () => resolve(server)); });
  const url = `http://127.0.0.1:${httpServer.address().port}/api/labs/attachments/${attachment.insertId}`;
  for (const [role, id] of [["teacher", teacher.accountId], ["student", student.accountId]]) {
    const response = await fetch(`${url}/view`, { headers: { "x-test-role": role, "x-test-user": String(id) } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-disposition"), /^inline/);
    assert.equal(await response.text(), "Preview regression fixture");
  }
  const denied = await fetch(`${url}/view`, { headers: { "x-test-role": "student", "x-test-user": "0" } });
  assert.equal(denied.status, 404);
  const download = await fetch(`${url}/download`, { headers: { "x-test-role": "teacher", "x-test-user": String(teacher.accountId) } });
  assert.match(download.headers.get("content-disposition"), /^attachment/);
  await download.text();
  console.log("PASS: email detection, group labels, surname ordering, automatic enrollment, overflow capacity, preservation of graded rosters, authorized teacher/student previews, download headers, and unauthorized-file rejection.");
} finally {
  if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  if (previewPath) await unlink(previewPath);
  await connection.rollback();
  connection.release();
  await pool.end();
}
