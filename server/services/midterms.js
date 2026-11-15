// Shared by the dashboard and lock action so an enabled button matches the rules.
export async function midtermReadiness(connection, offeringId) {
  const [midterms] = await connection.execute(
    `SELECT om.midterm_no AS midtermNo, om.status,
      COALESCE(SUM(la.max_grade), 0) AS assignedPoints
     FROM offering_midterms om
     LEFT JOIN lab_assignments la ON la.subject_group_offering_id = om.subject_group_offering_id
       AND la.midterm_no = om.midterm_no
     WHERE om.subject_group_offering_id = ? GROUP BY om.midterm_no, om.status`,
    [offeringId],
  );
  const [missing] = await connection.execute(
    `SELECT om.midterm_no AS midtermNo, lg.code AS labGroupCode,
      COUNT(DISTINCT CASE WHEN smr.exam_score IS NULL THEN sse.id END) AS exams,
      SUM(CASE WHEN la.id IS NOT NULL AND slr.grade IS NULL THEN 1 ELSE 0 END) AS grades,
      SUM(CASE WHEN la.id IS NOT NULL AND (slr.id IS NULL OR slr.attendance = 'UNMARKED') THEN 1 ELSE 0 END) AS attendance
     FROM offering_midterms om
     JOIN student_subject_enrollments sse ON sse.subject_group_offering_id = om.subject_group_offering_id
     JOIN lab_groups lg ON lg.id = sse.lab_group_id
     LEFT JOIN lab_assignments la ON la.subject_group_offering_id = om.subject_group_offering_id AND la.midterm_no = om.midterm_no
     LEFT JOIN student_lab_results slr ON slr.lab_assignment_id = la.id AND slr.student_subject_enrollment_id = sse.id
     LEFT JOIN student_midterm_results smr ON smr.student_subject_enrollment_id = sse.id AND smr.midterm_no = om.midterm_no
     WHERE om.subject_group_offering_id = ?
     GROUP BY om.midterm_no, lg.id, lg.code ORDER BY lg.code`,
    [offeringId],
  );
  return midterms.map((midterm) => {
    const lockIssues = [];
    if (midterm.status === "OPEN") {
      if (Number(midterm.assignedPoints) !== 16)
        lockIssues.push("Assign exactly 16 lab points before locking.");
      if (
        midterm.midtermNo === 2 &&
        midterms.find((m) => m.midtermNo === 1)?.status !== "LOCKED"
      )
        lockIssues.push("Lock the first midterm first.");
      for (const row of missing.filter(
        (r) => r.midtermNo === midterm.midtermNo,
      )) {
        const items = [
          Number(row.grades) &&
            `${row.grades} lab grade${Number(row.grades) === 1 ? "" : "s"}`,
          Number(row.attendance) &&
            `${row.attendance} attendance mark${Number(row.attendance) === 1 ? "" : "s"}`,
          Number(row.exams) &&
            `${row.exams} exam score${Number(row.exams) === 1 ? "" : "s"}`,
        ].filter(Boolean);
        if (items.length)
          lockIssues.push(`${row.labGroupCode}: complete ${items.join(", ")}.`);
      }
    }
    return {
      midtermNo: midterm.midtermNo,
      canLock: midterm.status === "OPEN" && !lockIssues.length,
      lockIssues,
    };
  });
}
