import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { config } from '../config.js';
import {
  auditForeignKeys,
  checkForeignKeyConfiguration,
} from '../services/database-integrity.js';

test(
  'converging cascades delete every branch, preserve RESTRICT, and leave no orphans',
  { skip: process.env.RUN_DB_TESTS !== '1' },
  async (t) => {
    assert.equal(
      process.env.LABCHECK_ISOLATED_TEST,
      '1',
      'Use npm run test:db.',
    );
    const c = await mysql.createConnection(config.db);
    t.after(() => c.end());
    await checkForeignKeyConfiguration(c);
    await c.query('CREATE TABLE cascade_p(id INT PRIMARY KEY) ENGINE=InnoDB');
    await c.query(
      'CREATE TABLE cascade_m(p INT,n INT,PRIMARY KEY(p,n),FOREIGN KEY(p) REFERENCES cascade_p(id) ON DELETE CASCADE) ENGINE=InnoDB',
    );
    await c.query(
      'CREATE TABLE cascade_c(id INT PRIMARY KEY,p INT,n INT,FOREIGN KEY(p,n) REFERENCES cascade_m(p,n) ON DELETE CASCADE) ENGINE=InnoDB',
    );
    await c.query(
      'CREATE TABLE cascade_e(id INT PRIMARY KEY,p INT,FOREIGN KEY(p) REFERENCES cascade_p(id) ON DELETE CASCADE) ENGINE=InnoDB',
    );
    await c.query(
      'CREATE TABLE cascade_r(id INT PRIMARY KEY,c INT,e INT,FOREIGN KEY(c) REFERENCES cascade_c(id) ON DELETE CASCADE,FOREIGN KEY(e) REFERENCES cascade_e(id) ON DELETE CASCADE) ENGINE=InnoDB',
    );
    await c.query(
      'CREATE TABLE cascade_guard(id INT PRIMARY KEY,e INT,FOREIGN KEY(e) REFERENCES cascade_e(id) ON DELETE RESTRICT) ENGINE=InnoDB',
    );
    let scenarios = 0;
    for (const populated of [false, true]) {
      for (const distribution of [
        [1, 1],
        [4, 1],
        [1, 4],
        [4, 4],
      ]) {
        await c.query('INSERT INTO cascade_p VALUES(1)');
        if (populated) await c.query('INSERT INTO cascade_e VALUES(1,1)');
        let id = 0;
        for (let n = 1; n <= 2; n++) {
          await c.query('INSERT INTO cascade_m VALUES(1,?)', [n]);
          for (let k = 0; k < distribution[n - 1]; k++) {
            id++;
            await c.query('INSERT INTO cascade_c VALUES(?,1,?)', [id, n]);
            if (populated)
              await c.query('INSERT INTO cascade_r VALUES(?,?,1)', [id, id]);
          }
        }
        if (populated) {
          await c.query('INSERT INTO cascade_guard VALUES(1,1)');
          await assert.rejects(
            c.query('DELETE FROM cascade_p WHERE id=1'),
            (e) => e.code === 'ER_ROW_IS_REFERENCED_2',
          );
          const [[remaining]] = await c.query(
            'SELECT (SELECT COUNT(*) FROM cascade_p) AS parents,(SELECT COUNT(*) FROM cascade_c) AS labs,(SELECT COUNT(*) FROM cascade_r) AS results',
          );
          assert.deepEqual(
            { ...remaining },
            { parents: 1, labs: id, results: id },
            'A restricted delete rolls back all cascading branches.',
          );
          await c.query('DELETE FROM cascade_guard WHERE id=1');
        }
        await c.query('DELETE FROM cascade_p WHERE id=1');
        for (const table of [
          'cascade_p',
          'cascade_m',
          'cascade_c',
          'cascade_e',
          'cascade_r',
        ]) {
          const [[{ n }]] = await c.query(`SELECT COUNT(*) AS n FROM ${table}`);
          assert.equal(
            n,
            0,
            `${table}: populated=${populated}, distribution=${distribution}`,
          );
        }
        scenarios++;
      }
    }
    for (const table of [
      'cascade_guard',
      'cascade_r',
      'cascade_e',
      'cascade_c',
      'cascade_m',
      'cascade_p',
    ])
      await c.query(`DROP TABLE ${table}`);
    const audit = await auditForeignKeys(c);
    assert.equal(audit.length, 40);
    assert.ok(audit.every((r) => Number(r.orphans) === 0));
    t.diagnostic(
      `${scenarios} converging-cascade scenarios passed (empty and populated branches); all ${audit.length} application foreign keys are orphan-free.`,
    );
  },
);
