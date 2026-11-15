import mysql from 'mysql2/promise';
import { config } from '../config.js';
import {
  checkForeignKeyConfiguration,
  auditForeignKeys,
} from '../services/database-integrity.js';

const connection = await mysql.createConnection(config.db);
try {
  const settings = await checkForeignKeyConfiguration(connection);
  await connection.query(
    'START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY',
  );
  const foreignKeys = await auditForeignKeys(connection);
  const [restriction] = await connection.execute(
    `SELECT DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA=? AND CONSTRAINT_NAME='lab_change_requests_enrollment_fk'`,
    [config.db.database],
  );
  await connection.commit();
  const orphanCount = foreignKeys.reduce(
    (n, row) => n + Number(row.orphans),
    0,
  );
  const requestHistoryProtected = restriction[0]?.DELETE_RULE === 'RESTRICT';
  const report = {
    settings,
    foreignKeyCount: foreignKeys.length,
    orphanCount,
    requestHistoryProtected,
    foreignKeys,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!foreignKeys.length || orphanCount || !requestHistoryProtected)
    process.exitCode = 1;
} finally {
  await connection.end();
}
