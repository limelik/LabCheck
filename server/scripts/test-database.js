import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import mysql from 'mysql2/promise';
import { config } from '../config.js';
import { migrate } from './migrate.js';
const testArgs = process.argv.slice(2);
const empty = testArgs[0] === '--empty';
if (empty) testArgs.shift();
const name = `labcheck_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
const connection = await mysql.createConnection({
  ...config.db,
  database: undefined,
});
const dir = await fs.mkdtemp('/private/tmp/labcheck-tests-');
async function runSql(file) {
  let delimiter = ';',
    buffer = '';
  const content = (await fs.readFile(file, 'utf8'))
    .replace(/CREATE DATABASE IF NOT EXISTS labcheck[\s\S]*?;/, '')
    .replace(/USE labcheck;/, `USE ${name};`);
  for (const line of content.split('\n')) {
    if (line.startsWith('DELIMITER ')) {
      delimiter = line.slice(10).trim();
      continue;
    }
    buffer += line + '\n';
    if (buffer.trimEnd().endsWith(delimiter)) {
      await connection.query(buffer.trimEnd().slice(0, -delimiter.length));
      buffer = '';
    }
  }
}
try {
  await connection.query(
    `CREATE DATABASE ${name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await runSql('database/schema.mysql.sql');
  if (!empty) await runSql('database/seed.mysql.sql');
  await migrate(connection);
  const env = {
    ...process.env,
    DB_NAME: name,
    AUTH_SECRET: crypto.randomBytes(32).toString('hex'),
    DEV_MAILBOX_DIR: dir,
    UPLOAD_DIR: dir + '/.private-uploads',
    SMTP_HOST: '',
    SMTP_REQUIRE_TLS: 'false',
    EMAIL_DELIVERY: 'capture',
    RUN_DB_TESTS: '1',
    LABCHECK_ISOLATED_TEST: '1',
  };
  const args = testArgs;
  const child = spawn(
    args[0] || 'node',
    args.length
      ? args.slice(1)
      : ['--test', '--test-concurrency=1', 'server/tests/*.test.js'],
    { stdio: 'inherit', env },
  );
  process.exitCode = await new Promise((resolve) =>
    child.once('exit', (code) => resolve(code ?? 1)),
  );
} finally {
  await connection.query(`DROP DATABASE ${name}`);
  await connection.end();
  await fs.rm(dir, { recursive: true, force: true });
}
