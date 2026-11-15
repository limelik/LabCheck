import assert from 'node:assert/strict';
import { query, pool } from '../db.js';
assert.equal(process.env.LABCHECK_ISOLATED_TEST, '1');
try {
  console.log(
    await query(
      "SHOW VARIABLES WHERE Variable_name IN ('version','version_comment','foreign_key_checks','innodb_native_foreign_keys')",
    ),
  );
  for (const composite of [false, true])
    for (const children of [1, 2, 3]) {
      await query('CREATE TABLE cascade_p(id INT PRIMARY KEY) ENGINE=InnoDB');
      await query(
        `CREATE TABLE cascade_m(p INT,n INT,PRIMARY KEY(p,n),FOREIGN KEY(p) REFERENCES cascade_p(id) ON DELETE CASCADE) ENGINE=InnoDB`,
      );
      await query(
        composite
          ? 'CREATE TABLE cascade_c(id INT PRIMARY KEY,p INT,n INT,FOREIGN KEY(p,n) REFERENCES cascade_m(p,n) ON DELETE CASCADE) ENGINE=InnoDB'
          : 'CREATE TABLE cascade_c(id INT PRIMARY KEY,p INT,FOREIGN KEY(p) REFERENCES cascade_p(id) ON DELETE CASCADE) ENGINE=InnoDB',
      );
      await query('INSERT INTO cascade_p VALUES (1)');
      for (let n = 1; n <= children; n++) {
        await query('INSERT INTO cascade_m VALUES (1,?)', [n]);
        await query(
          composite
            ? 'INSERT INTO cascade_c VALUES (?,1,?)'
            : 'INSERT INTO cascade_c VALUES (?,1)',
          composite ? [n, n] : [n],
        );
      }
      await query('DELETE FROM cascade_p WHERE id=1');
      console.log({
        composite,
        children,
        remaining: await query('SELECT * FROM cascade_c'),
      });
      for (const table of ['cascade_c', 'cascade_m', 'cascade_p'])
        await query(`DROP TABLE ${table}`);
    }
} finally {
  await pool.end();
}
