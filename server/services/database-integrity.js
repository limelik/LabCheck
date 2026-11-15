import mysql from 'mysql2/promise';
import { ApiError } from '../http.js';

export function requireSafeForeignKeys(settings) {
  if (
    !settings.globalChecks ||
    !settings.sessionChecks ||
    settings.nativeForeignKeys === false
  )
    throw new ApiError(
      503,
      'UNSAFE_DATABASE_CONFIGURATION',
      'LabCheck requires foreign-key checks and native InnoDB foreign-key handling. See docs/database-integrity.md before starting the API.',
    );
}

export async function checkForeignKeyConfiguration(connection) {
  const [[settings]] = await connection.query(
    'SELECT VERSION() AS version, @@GLOBAL.foreign_key_checks AS globalChecks, @@SESSION.foreign_key_checks AS sessionChecks',
  );
  const [variables] = await connection.query(
    "SHOW GLOBAL VARIABLES LIKE 'innodb_native_foreign_keys'",
  );
  // Older MySQL releases use InnoDB handling without exposing this switch.
  settings.nativeForeignKeys = variables.length
    ? /^(ON|1)$/i.test(variables[0].Value)
    : null;
  requireSafeForeignKeys(settings);
  return settings;
}

// Read-only audit, including composite and nullable references. Never changes FK checks.
export async function auditForeignKeys(connection) {
  const [[{ database }]] = await connection.query(
    'SELECT DATABASE() AS `database`',
  );
  const [columns] = await connection.execute(
    `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_SCHEMA,
      REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION`,
    [database],
  );
  const constraints = Map.groupBy(
    columns,
    (r) => `${r.TABLE_NAME}.${r.CONSTRAINT_NAME}`,
  );
  const results = [];
  const quote = mysql.escapeId;
  for (const parts of constraints.values()) {
    const first = parts[0];
    const [[{ orphans }]] = await connection.query(
      `SELECT COUNT(*) AS orphans FROM ${quote(database)}.${quote(first.TABLE_NAME)} c
       WHERE ${parts.map((p) => `c.${quote(p.COLUMN_NAME)} IS NOT NULL`).join(' AND ')}
       AND NOT EXISTS (SELECT 1 FROM ${quote(first.REFERENCED_TABLE_SCHEMA)}.${quote(first.REFERENCED_TABLE_NAME)} p
         WHERE ${parts.map((p) => `p.${quote(p.REFERENCED_COLUMN_NAME)}=c.${quote(p.COLUMN_NAME)}`).join(' AND ')})`,
    );
    results.push({
      table: first.TABLE_NAME,
      constraint: first.CONSTRAINT_NAME,
      orphans,
    });
  }
  return results;
}
