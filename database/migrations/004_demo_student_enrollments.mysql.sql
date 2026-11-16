INSERT INTO student_subject_enrollments (
  student_id,
  subject_group_offering_id,
  lab_group_id,
  default_lab_group_id
)
SELECT students.id, demo.offering_id, demo.lab_group_id, demo.lab_group_id
FROM (
  SELECT 'ani.sargsyan@polytechnic.am' AS email, 1 AS offering_id, 1 AS lab_group_id
  UNION ALL SELECT 'erik.hovsepyan@polytechnic.am', 1, 2
  UNION ALL SELECT 'lusine.grigoryan@polytechnic.am', 1, 3
  UNION ALL SELECT 'arsen.vardanyan@polytechnic.am', 1, 3
  UNION ALL SELECT 'ani.sargsyan@polytechnic.am', 2, 1
  UNION ALL SELECT 'erik.hovsepyan@polytechnic.am', 2, 2
  UNION ALL SELECT 'lusine.grigoryan@polytechnic.am', 2, 3
  UNION ALL SELECT 'arsen.vardanyan@polytechnic.am', 2, 3
  UNION ALL SELECT 'ani.sargsyan@polytechnic.am', 3, 1
  UNION ALL SELECT 'erik.hovsepyan@polytechnic.am', 3, 2
  UNION ALL SELECT 'lusine.grigoryan@polytechnic.am', 3, 3
  UNION ALL SELECT 'arsen.vardanyan@polytechnic.am', 3, 3
  UNION ALL SELECT 'mariam.hakobyan@polytechnic.am', 4, 4
  UNION ALL SELECT 'gor.petrosyan@polytechnic.am', 4, 5
  UNION ALL SELECT 'nune.mkrtchyan@polytechnic.am', 4, 5
  UNION ALL SELECT 'mariam.hakobyan@polytechnic.am', 7, 4
  UNION ALL SELECT 'gor.petrosyan@polytechnic.am', 7, 5
  UNION ALL SELECT 'nune.mkrtchyan@polytechnic.am', 7, 5
  UNION ALL SELECT 'hrayr.avetisyan@polytechnic.am', 6, 6
  UNION ALL SELECT 'eva.davtyan@polytechnic.am', 6, 6
  UNION ALL SELECT 'arman.sargsyan@polytechnic.am', 6, 7
  UNION ALL SELECT 'sona.khachatryan@polytechnic.am', 6, 7
  UNION ALL SELECT 'hrayr.avetisyan@polytechnic.am', 8, 7
  UNION ALL SELECT 'eva.davtyan@polytechnic.am', 8, 7
  UNION ALL SELECT 'arman.sargsyan@polytechnic.am', 8, 6
  UNION ALL SELECT 'sona.khachatryan@polytechnic.am', 8, 6
  UNION ALL SELECT 'david.manukyan@polytechnic.am', 5, 8
  UNION ALL SELECT 'lilit.harutyunyan@polytechnic.am', 5, 8
  UNION ALL SELECT 'david.manukyan@polytechnic.am', 9, 8
  UNION ALL SELECT 'lilit.harutyunyan@polytechnic.am', 9, 8
  UNION ALL SELECT 'samvel.hovhannisyan@polytechnic.am', 10, 9
  UNION ALL SELECT 'tatev.sahakyan@polytechnic.am', 10, 9
  UNION ALL SELECT 'edgar.abrahamyan@polytechnic.am', 10, 10
  UNION ALL SELECT 'elina.gevorgyan@polytechnic.am', 10, 10
  UNION ALL SELECT 'ruben.melikyan@polytechnic.am', 11, 11
  UNION ALL SELECT 'naira.petrosyan@polytechnic.am', 11, 11
  UNION ALL SELECT 'vrej.arakelyan@polytechnic.am', 11, 12
  UNION ALL SELECT 'gayane.karapetyan@polytechnic.am', 11, 12
  UNION ALL SELECT 'ruben.melikyan@polytechnic.am', 12, 12
  UNION ALL SELECT 'naira.petrosyan@polytechnic.am', 12, 12
  UNION ALL SELECT 'vrej.arakelyan@polytechnic.am', 12, 11
  UNION ALL SELECT 'gayane.karapetyan@polytechnic.am', 12, 11
) AS demo
JOIN user_accounts account
  ON account.email = demo.email AND account.account_type = 'STUDENT'
JOIN students ON students.user_account_id = account.id
LEFT JOIN student_subject_enrollments existing
  ON existing.student_id = students.id
  AND existing.subject_group_offering_id = demo.offering_id
WHERE existing.id IS NULL;
