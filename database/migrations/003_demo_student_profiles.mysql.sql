INSERT INTO students (
  user_account_id,
  academic_group_id,
  first_name,
  last_name
)
SELECT account.id, academic_group.id, demo.first_name, demo.last_name
FROM (
  SELECT 'ani.sargsyan@polytechnic.am' AS email, 'TT319' AS group_code, 'Ani' AS first_name, 'Sargsyan' AS last_name
  UNION ALL SELECT 'erik.hovsepyan@polytechnic.am', 'TT319', 'Erik', 'Hovsepyan'
  UNION ALL SELECT 'lusine.grigoryan@polytechnic.am', 'TT319', 'Lusine', 'Grigoryan'
  UNION ALL SELECT 'arsen.vardanyan@polytechnic.am', 'TT319', 'Arsen', 'Vardanyan'
  UNION ALL SELECT 'mariam.hakobyan@polytechnic.am', 'TT320', 'Mariam', 'Hakobyan'
  UNION ALL SELECT 'gor.petrosyan@polytechnic.am', 'TT320', 'Gor', 'Petrosyan'
  UNION ALL SELECT 'nune.mkrtchyan@polytechnic.am', 'TT320', 'Nune', 'Mkrtchyan'
  UNION ALL SELECT 'hrayr.avetisyan@polytechnic.am', 'TT419', 'Hrayr', 'Avetisyan'
  UNION ALL SELECT 'eva.davtyan@polytechnic.am', 'TT419', 'Eva', 'Davtyan'
  UNION ALL SELECT 'arman.sargsyan@polytechnic.am', 'TT419', 'Arman', 'Sargsyan'
  UNION ALL SELECT 'sona.khachatryan@polytechnic.am', 'TT419', 'Sona', 'Khachatryan'
  UNION ALL SELECT 'david.manukyan@polytechnic.am', 'TT330', 'David', 'Manukyan'
  UNION ALL SELECT 'lilit.harutyunyan@polytechnic.am', 'TT330', 'Lilit', 'Harutyunyan'
  UNION ALL SELECT 'samvel.hovhannisyan@polytechnic.am', 'TT321', 'Samvel', 'Hovhannisyan'
  UNION ALL SELECT 'tatev.sahakyan@polytechnic.am', 'TT321', 'Tatev', 'Sahakyan'
  UNION ALL SELECT 'edgar.abrahamyan@polytechnic.am', 'TT321', 'Edgar', 'Abrahamyan'
  UNION ALL SELECT 'elina.gevorgyan@polytechnic.am', 'TT321', 'Elina', 'Gevorgyan'
  UNION ALL SELECT 'ruben.melikyan@polytechnic.am', 'TT420', 'Ruben', 'Melikyan'
  UNION ALL SELECT 'naira.petrosyan@polytechnic.am', 'TT420', 'Naira', 'Petrosyan'
  UNION ALL SELECT 'vrej.arakelyan@polytechnic.am', 'TT420', 'Vrej', 'Arakelyan'
  UNION ALL SELECT 'gayane.karapetyan@polytechnic.am', 'TT420', 'Gayane', 'Karapetyan'
) AS demo
JOIN user_accounts account
  ON account.email = demo.email AND account.account_type = 'STUDENT'
JOIN academic_groups academic_group ON academic_group.code = demo.group_code
LEFT JOIN students existing ON existing.user_account_id = account.id
WHERE existing.id IS NULL;
