import "dotenv/config";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "../server/db.js";

const root = new URL("../", import.meta.url);
const files = ["database-lab-01-brief.txt", "library-catalogue.csv", "lab-report-template.txt"];
const applicants = [
  ["demo.pending.anahit@polytechnic.am", "Anahit", "Martirosyan", "STUDENT", "TT319"],
  ["demo.pending.tigran@polytechnic.am", "Tigran", "Danielyan", "STUDENT", "TT320"],
  ["demo.pending.lusine@polytechnic.am", "Lusine", "Arakelyan", "STUDENT", "TT419"],
  ["demo.pending.hayk@polytechnic.am", "Hayk", "Simonyan", "STUDENT", "TT330"],
  ["demo.pending.hasmik@polytechnic.am", "Hasmik", "Melikyan", "TEACHER", null],
  ["demo.pending.vahe@polytechnic.am", "Vahe", "Karapetyan", "TEACHER", null],
];
const description = "Design and query a campus library database using MySQL. Create a books table with appropriate data types, a primary key and validation constraints, then import the 12-book catalogue. Practise filtering, sorting and grouping by finding available books, recent Computing titles, category totals and average prices. Submit your SQL script and completed report, and explain your queries during the lab session. Allow 90 minutes. Assessment: schema (1 point), data import (1), queries (1), and report/explanation (1). Start with the attached assignment brief; use the catalogue and report template to complete your work.";

let connection;
try {
  if (process.env.NODE_ENV === "production" || process.env.MYSQL_DATABASE !== "labcheck") {
    throw new Error("Demo content can only be seeded in the non-production labcheck database.");
  }
  connection = await pool.getConnection();
  const [labs] = await connection.query(`
    SELECT l.id, MIN(t.user_account_id) AS uploaderId
    FROM lab_assignments l
    JOIN subject_group_offerings o ON o.id = l.subject_group_offering_id
    JOIN subjects s ON s.id = o.subject_id
    JOIN teacher_subject_assignments a ON a.subject_group_offering_id = o.id
    JOIN teachers t ON t.id = a.teacher_id
    WHERE s.code = 'DB101' AND o.academic_year = '2025-2026'
      AND l.lab_number = 1 AND l.midterm_no = 1 AND l.max_grade = 4
      AND EXISTS (SELECT 1 FROM offering_midterms m WHERE m.subject_group_offering_id = o.id AND m.midterm_no = 1 AND m.status = 'OPEN')
      AND NOT EXISTS (SELECT 1 FROM lab_group_midterm_locks k WHERE k.subject_group_offering_id = o.id AND k.midterm_no = 1)
    GROUP BY l.id`);
  if (!labs.length) throw new Error("Load database/seed.mysql.sql before adding demo content.");
  await mkdir(new URL("server/storage/uploads/", root), { recursive: true });
  await connection.beginTransaction();
  for (const lab of labs) {
    // Preserve teacher-authored content on subsequent runs.
    await connection.execute(`UPDATE lab_assignments SET title = ?, description = ?
      WHERE id = ? AND title = 'Lab 1' AND COALESCE(description, '') = ''`,
    ["Design and Query a Campus Library Database", description, lab.id]);
    for (const name of files) {
      const [existing] = await connection.execute(
        "SELECT storage_name FROM lab_attachments WHERE lab_assignment_id = ? AND original_name = ?",
        [lab.id, name]);
      if (existing.length) continue;
      const storageName = randomUUID();
      const source = new URL(`database/demo-files/${name}`, root);
      await copyFile(source, new URL(`server/storage/uploads/${storageName}`, root));
      await connection.execute(`INSERT INTO lab_attachments
        (lab_assignment_id, uploaded_by_user_account_id, storage_name, original_name, file_size)
        VALUES (?, ?, ?, ?, ?)`, [lab.id, lab.uploaderId, storageName, name, (await stat(source)).size]);
    }
  }
  let added = 0;
  for (const [email, first, last, role, group] of applicants) {
    const [existing] = await connection.execute("SELECT id FROM user_accounts WHERE email = ?", [email]);
    if (existing.length) continue; // Never reset an administrator's decision.
    const [result] = await connection.execute(`INSERT INTO user_accounts
      (email, password_hash, account_type, approval_status, email_verified_at)
      VALUES (?, 'demo-account-disabled', ?, 'PENDING', UTC_TIMESTAMP())`, [email, role]);
    if (role === "STUDENT") {
      const [groups] = await connection.execute("SELECT id FROM academic_groups WHERE code = ?", [group]);
      if (!groups.length) throw new Error(`Missing demo academic group ${group}`);
      await connection.execute(`INSERT INTO students
        (user_account_id, academic_group_id, first_name, last_name) VALUES (?, ?, ?, ?)`,
      [result.insertId, groups[0].id, first, last]);
    } else {
      await connection.execute("INSERT INTO teachers (user_account_id, first_name, last_name) VALUES (?, ?, ?)",
        [result.insertId, first, last]);
    }
    added++;
  }
  await connection.commit();
  console.log(`Demo content ready: ${labs.length} Databases labs with 3 attachments each; ${added} new pending approvals.`);
  console.log(`Source files: ${fileURLToPath(new URL("database/demo-files/", root))}`);
} catch (error) {
  if (connection) await connection.rollback();
  console.error(error.message);
  process.exitCode = 1;
} finally {
  connection?.release();
  await pool.end();
}
