import assert from 'node:assert/strict';
import { query, pool } from '../db.js';
assert.equal(process.env.LABCHECK_ISOLATED_TEST, '1');
try {
  for (const extra of [false, true])
    for (const distribution of [
      [1, 1],
      [4, 1],
      [1, 4],
      [4, 4],
    ]) {
      await query(
        'CREATE TABLE cascade_p(id INT UNSIGNED PRIMARY KEY) ENGINE=InnoDB',
      );
      await query(
        'CREATE TABLE cascade_m(p INT UNSIGNED,n TINYINT UNSIGNED,PRIMARY KEY(p,n),FOREIGN KEY(p) REFERENCES cascade_p(id) ON DELETE CASCADE) ENGINE=InnoDB',
      );
      await query(
        `CREATE TABLE cascade_c(id INT UNSIGNED PRIMARY KEY,p INT UNSIGNED,n TINYINT UNSIGNED,lab INT UNSIGNED,${extra ? 'UNIQUE KEY number_ux(p,lab),' : ''}KEY midterm_idx(p,n),FOREIGN KEY(p,n) REFERENCES cascade_m(p,n) ON DELETE CASCADE) ENGINE=InnoDB`,
      );
      if (extra) {
        await query(
          'CREATE TABLE cascade_e(id INT PRIMARY KEY,p INT UNSIGNED,FOREIGN KEY(p) REFERENCES cascade_p(id) ON DELETE CASCADE) ENGINE=InnoDB',
        );
        await query(
          'CREATE TABLE cascade_r(id INT PRIMARY KEY,c INT UNSIGNED,e INT,FOREIGN KEY(c) REFERENCES cascade_c(id) ON DELETE CASCADE,FOREIGN KEY(e) REFERENCES cascade_e(id) ON DELETE CASCADE) ENGINE=InnoDB',
        );
      }
      await query('INSERT INTO cascade_p VALUES (1)');
      let id = 0;
      for (let n = 1; n <= 2; n++) {
        await query('INSERT INTO cascade_m VALUES (1,?)', [n]);
        for (let k = 0; k < distribution[n - 1]; k++) {
          id++;
          await query('INSERT INTO cascade_c VALUES (?,1,?,?)', [id, n, id]);
        }
      }
      await query('DELETE FROM cascade_p WHERE id=1');
      console.log({
        extra,
        distribution,
        remaining: await query('SELECT * FROM cascade_c'),
      });
      if (extra) {
        await query('DROP TABLE cascade_r');
        await query('DROP TABLE cascade_e');
      }
      for (const table of ['cascade_c', 'cascade_m', 'cascade_p'])
        await query(`DROP TABLE ${table}`);
    }
} finally {
  await pool.end();
}
