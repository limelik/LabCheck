import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { pool } from "../db.js";
import { config } from "../config.js";

const exercises = [
  [
    "Semantic HTML and accessible forms",
    "Build a course registration page using semantic sections, explicit form labels, required fields, and keyboard navigation. Submit your HTML and a short accessibility checklist.",
  ],
  [
    "Responsive layouts with CSS Grid",
    "Create a responsive subject dashboard with CSS Grid. Support mobile, tablet, and desktop widths without horizontal overflow. Submit the HTML, CSS, and screenshots at three widths.",
  ],
  [
    "JavaScript form validation",
    "Validate registration fields, show field-specific errors, and preserve user input after invalid submissions. Include boundary cases for empty and malformed values.",
  ],
  [
    "Fetching and displaying API data",
    "Fetch a JSON subject catalog, display loading and empty states, and handle a failed request with a retry action. Submit the source and a short explanation of error handling.",
  ],
  [
    "Reusable React components",
    "Split the dashboard into SubjectCard, SubjectList, and FilterBar components. Pass data through props and add stable keys for rendered lists.",
  ],
  [
    "State and subject filtering",
    "Add a search field and status filter to the subject list. Derive the visible subjects from state and display a useful empty result message.",
  ],
  [
    "Routing and protected pages",
    "Add home, subject, and progress routes. Preserve navigation history and redirect signed-out users to a login page. Document the expected route behavior.",
  ],
  [
    "Testing and final dashboard review",
    "Test the dashboard on desktop and mobile. Verify keyboard navigation, validation, loading, and error states. Submit the final source with a concise test report.",
  ],
];
const brief = `LAB 1: DESIGN A UNIVERSITY COURSE DATABASE

Goal
Model students, subjects, and enrollments in a relational database.

Assignments
1. Draw an entity-relationship diagram for Student, Subject, and Enrollment.
2. Choose primary keys and add a unique institutional email constraint.
3. Create the tables in MySQL. Enrollment must reference a valid student and subject.
4. Insert five students, three subjects, and at least eight enrollments.
5. Write a JOIN query showing each student's subjects and a GROUP BY query counting enrollments per subject.
6. Demonstrate that an enrollment with a nonexistent student is rejected.

Submission
Upload your SQL script, ER diagram, and a short README explaining how to run the queries.

Assessment (4 points)
Schema and keys: 1; referential integrity: 1; sample data: 1; correct queries: 1.
`;

// Explicit optional demo data only; never runs at API startup or in migrations.
export async function prepareDemoCoursework(connection, uploadDir) {
  const [offerings] =
    await connection.execute(`SELECT o.id, s.code AS subjectCode, g.code AS groupCode
    FROM subject_group_offerings o JOIN subjects s ON s.id=o.subject_id
    JOIN academic_groups g ON g.id=o.academic_group_id WHERE o.id IN (1,2)`);
  if (
    offerings.length !== 2 ||
    !offerings.some(
      (o) => o.id === 1 && o.subjectCode === "DB101" && o.groupCode === "TT319",
    ) ||
    !offerings.some(
      (o) =>
        o.id === 2 && o.subjectCode === "WEB201" && o.groupCode === "TT319",
    )
  )
    throw new Error(
      "This command requires the original LabCheck demonstration roster.",
    );
  let newFile;
  await connection.beginTransaction();
  try {
    const [midterms] = await connection.execute(
      "SELECT * FROM offering_midterms WHERE subject_group_offering_id IN (1,2) FOR UPDATE",
    );
    const [dbLabs] = await connection.execute(
      "SELECT id FROM lab_assignments WHERE subject_group_offering_id=1 AND midterm_no=1 ORDER BY lab_number LIMIT 1",
    );
    const dbLab = dbLabs[0];
    if (
      dbLab &&
      midterms.find(
        (m) => m.subject_group_offering_id === 1 && m.midterm_no === 1,
      )?.status === "OPEN"
    ) {
      await connection.execute(
        "UPDATE lab_assignments SET title=?, description=? WHERE id=?",
        [
          "Design a university course database",
          "Design a relational schema for students, subjects, and enrollments. Define primary and foreign keys, populate realistic sample data, and write JOIN and aggregation queries.\nSubmit your SQL script, ER diagram, and a short README. The attached brief includes the tasks and the 4-point rubric.",
          dbLab.id,
        ],
      );
      const filename = "lab-1-course-database-assignment.txt";
      const [existing] = await connection.execute(
        "SELECT id FROM lab_attachments WHERE lab_assignment_id=? AND original_filename=?",
        [dbLab.id, filename],
      );
      if (!existing.length) {
        const key = crypto.randomBytes(32).toString("hex");
        await fs.mkdir(uploadDir, { recursive: true, mode: 0o700 });
        newFile = path.join(uploadDir, key);
        await fs.writeFile(newFile, brief, { flag: "wx", mode: 0o600 });
        await connection.execute(
          "INSERT INTO lab_attachments(lab_assignment_id, original_filename, storage_key, mime_type, file_size) VALUES (?,?,?,?,?)",
          [dbLab.id, filename, key, "text/plain", Buffer.byteLength(brief)],
        );
      }
    }
    const first = midterms.find(
      (m) => m.subject_group_offering_id === 2 && m.midterm_no === 1,
    );
    const [groupLocks] = await connection.execute('SELECT 1 FROM lab_group_midterms WHERE offering_id=2 AND midterm_no=1 AND is_locked=TRUE LIMIT 1');
    if (first?.status === "OPEN" && !groupLocks.length) {
      // Complete only missing demo results; preserve previously entered grades.
      await connection.execute(`INSERT INTO student_lab_results(lab_assignment_id, student_subject_enrollment_id, attendance, grade)
        SELECT la.id, e.id, 'PRESENT', la.max_grade FROM lab_assignments la
        JOIN student_subject_enrollments e ON e.subject_group_offering_id=la.subject_group_offering_id
        WHERE la.subject_group_offering_id=2 AND la.midterm_no=1
        ON DUPLICATE KEY UPDATE grade=COALESCE(student_lab_results.grade, VALUES(grade)),
          attendance=IF(student_lab_results.attendance='UNMARKED', VALUES(attendance), student_lab_results.attendance)`);
      await connection.execute(`INSERT INTO student_midterm_results(student_subject_enrollment_id,midterm_no,exam_score)
        SELECT id,1,3 FROM student_subject_enrollments WHERE subject_group_offering_id=2
        ON DUPLICATE KEY UPDATE exam_score=COALESCE(student_midterm_results.exam_score,VALUES(exam_score))`);
      const [[teacher]] = await connection.execute(
        "SELECT teacher_id AS id FROM teacher_subject_assignments WHERE subject_group_offering_id=2 ORDER BY id LIMIT 1",
      );
      await connection.execute(
        "UPDATE offering_midterms SET status='LOCKED', locked_at=UTC_TIMESTAMP(), locked_by_teacher_id=? WHERE subject_group_offering_id=2 AND midterm_no=1",
        [teacher.id],
      );
    }
    const [existingLabs] = await connection.execute(
      "SELECT id,title FROM lab_assignments WHERE subject_group_offering_id=2 AND midterm_no=2 ORDER BY lab_number",
    );
    if (
      existingLabs.length &&
      (existingLabs.length !== exercises.length ||
        existingLabs.some((lab, i) => lab.title !== exercises[i][0]))
    )
      throw new Error(
        "Second-midterm coursework already exists; leaving it unchanged.",
      );
    if (!existingLabs.length) {
      const [[{ number }]] = await connection.execute(
        "SELECT MAX(lab_number) AS number FROM lab_assignments WHERE subject_group_offering_id=2",
      );
      const [[student]] =
        await connection.execute(`SELECT e.id FROM student_subject_enrollments e JOIN students s ON s.id=e.student_id
        JOIN user_accounts u ON u.id=s.user_account_id WHERE e.subject_group_offering_id=2 AND u.email='milena.simonyan@polytechnic.am'`);
      const grades = [2, 2, 1, 2, 2, 1, 2, 2];
      for (const [i, [title, description]] of exercises.entries()) {
        const [lab] = await connection.execute(
          "INSERT INTO lab_assignments(subject_group_offering_id,midterm_no,lab_number,title,description,max_grade) VALUES (2,2,?,?,?,2)",
          [number + i + 1, title, description],
        );
        if (student)
          await connection.execute(
            "INSERT INTO student_lab_results(lab_assignment_id,student_subject_enrollment_id,attendance,grade) VALUES (?,?,'PRESENT',?)",
            [lab.insertId, student.id, grades[i]],
          );
      }
      if (student)
        await connection.execute(
          "INSERT INTO student_midterm_results(student_subject_enrollment_id,midterm_no,exam_score) VALUES (?,2,3)",
          [student.id],
        );
    }
    // This demonstration is in its Fall term. Administrators control active subjects.
    await connection.execute(
      "UPDATE subject_group_offerings SET is_active=FALSE WHERE id=3 AND subject_id=3 AND academic_group_id=1 AND academic_year='2025-2026' AND semester='Spring'",
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (newFile) await fs.rm(newFile, { force: true });
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1", "::1"].includes(config.db.host)
  )
    throw new Error(
      "Demo coursework is only available for a local development database.",
    );
  const connection = await pool.getConnection();
  try {
    const backup = {};
    for (const [name, sql] of Object.entries({
      labs: "SELECT * FROM lab_assignments WHERE subject_group_offering_id IN (1,2)",
      results:
        "SELECT r.* FROM student_lab_results r JOIN student_subject_enrollments e ON e.id=r.student_subject_enrollment_id WHERE e.subject_group_offering_id IN (1,2)",
      exams:
        "SELECT r.* FROM student_midterm_results r JOIN student_subject_enrollments e ON e.id=r.student_subject_enrollment_id WHERE e.subject_group_offering_id IN (1,2)",
      midterms:
        "SELECT * FROM offering_midterms WHERE subject_group_offering_id IN (1,2)",
      offerings: "SELECT * FROM subject_group_offerings WHERE id IN (1,2,3)",
    }))
      backup[name] = (await connection.execute(sql))[0];
    const backupDir = await fs.mkdtemp("/private/tmp/labcheck-demo-backup-");
    await fs.writeFile(
      path.join(backupDir, "coursework.json"),
      JSON.stringify(backup, null, 2),
      { mode: 0o600 },
    );
    await prepareDemoCoursework(connection, path.resolve(config.uploadDir));
    console.log(
      `Demo ready: Web Development midterm 2 has eight labs (14/16 lab points, 17/20 overall for Milena). Original coursework snapshot: ${backupDir}`,
    );
  } finally {
    connection.release();
    await pool.end();
  }
}
