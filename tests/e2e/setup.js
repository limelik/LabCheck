import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { query, pool } from "../../server/db.js";
import { prepareDemoCoursework } from "../../server/scripts/prepare-demo-coursework.js";
export default async function setup() {
  assert.equal(process.env.LABCHECK_ISOLATED_TEST, "1");
  try {
    const hash = await bcrypt.hash("Browser-Only-Password-928!", 12);
    await query(
      "UPDATE user_accounts SET password_hash=? WHERE id IN (1,4,10)",
      [hash],
    );
    const connection = await pool.getConnection();
    try {
      await prepareDemoCoursework(connection, process.env.UPLOAD_DIR);
    } finally {
      connection.release();
    }
    for (const code of ["BROWSER319", "REVIEW319"]) {
      const group = await query(
        "INSERT INTO academic_groups(specialization_id,code,name) VALUES (1,?,?)",
        [code, `${code} browser fixture`],
      );
      const lab = await query(
        "INSERT INTO lab_groups(academic_group_id,code) VALUES (?,?)",
        [group.insertId, `${code}-1`],
      );
      await query(
        "INSERT INTO lab_groups(academic_group_id,code) VALUES (?,?)",
        [group.insertId, `${code}-2`],
      );
      const offering = await query(
        "INSERT INTO subject_group_offerings(subject_id,academic_group_id,academic_year,semester) VALUES (1,?,'2092-2093','Fall')",
        [group.insertId],
      );
      await query(
        "INSERT INTO offering_midterms(subject_group_offering_id,midterm_no) VALUES (?,1),(?,2)",
        [offering.insertId, offering.insertId],
      );
      if (code === "BROWSER319") {
        const account = await query(
          "INSERT INTO user_accounts(email,password_hash,account_type,approval_status) VALUES ('disposable.browser319@polytechnic.am','demo-hash','STUDENT','APPROVED')",
        );
        const student = await query(
          "INSERT INTO students(user_account_id,academic_group_id,first_name,last_name) VALUES (?,?,'Browser','Student')",
          [account.insertId, group.insertId],
        );
        await query(
          "INSERT INTO student_subject_enrollments(student_id,subject_group_offering_id,lab_group_id,default_lab_group_id) VALUES (?,?,?,?)",
          [student.insertId, offering.insertId, lab.insertId, lab.insertId],
        );
        const teacherAccount = await query(
          "INSERT INTO user_accounts(email,password_hash,account_type,approval_status) VALUES ('browserteacher@polytechnic.am','demo-hash','TEACHER','APPROVED')",
        );
        const teacher = await query(
          "INSERT INTO teachers(user_account_id,first_name,last_name) VALUES (?,'Browser','Teacher')",
          [teacherAccount.insertId],
        );
        await query(
          "INSERT INTO teacher_subject_assignments(teacher_id,subject_group_offering_id,lab_group_id) VALUES (?,?,?)",
          [teacher.insertId, offering.insertId, lab.insertId],
        );
        await query(
          "INSERT INTO teacher_subject_assignments(teacher_id,subject_group_offering_id,lab_group_id) SELECT ?,?,id FROM lab_groups WHERE academic_group_id=? AND id<>?",
          [teacher.insertId, offering.insertId, group.insertId, lab.insertId],
        );
      }
    }
  } finally {
    await pool.end();
  }
}
