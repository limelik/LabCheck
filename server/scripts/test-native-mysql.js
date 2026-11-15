import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';
import mysql from 'mysql2/promise';
const dir = await fs.mkdtemp('/private/tmp/labcheck-mysql-');
const executable = process.env.MYSQLD_BINARY || 'mysqld';
const probe = net.createServer();
await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
let server;
async function run(command, args, env = process.env) {
  const child = spawn(command, args, { stdio: 'inherit', env });
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
}
try {
  if (
    await run(executable, [
      '--no-defaults',
      '--initialize-insecure',
      `--datadir=${dir}`,
      `--log-error=${path.join(dir, 'server.log')}`,
    ])
  )
    throw new Error('Temporary MySQL initialization failed.');
  server = spawn(
    executable,
    [
      '--no-defaults',
      `--datadir=${dir}`,
      `--socket=${path.join(dir, 'mysql.sock')}`,
      `--port=${port}`,
      '--bind-address=127.0.0.1',
      '--mysqlx=OFF',
      '--innodb-native-foreign-keys=ON',
      `--log-error=${path.join(dir, 'server.log')}`,
    ],
    { stdio: 'ignore' },
  );
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const c = await mysql.createConnection({
        host: '127.0.0.1',
        port,
        user: 'root',
        password: '',
      });
      await c.end();
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  if (!ready) throw new Error('Temporary MySQL did not start.');
  console.log(
    'Running tests on a separate MySQL instance with native foreign keys enabled.',
  );
  const args = process.argv.slice(2);
  process.exitCode = await run(
    'node',
    ['server/scripts/test-database.js', ...args],
    {
      ...process.env,
      DB_HOST: '127.0.0.1',
      DB_PORT: String(port),
      DB_USER: 'root',
      DB_PASSWORD: '',
    },
  );
} finally {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise((resolve) => server.once('exit', resolve));
  }
  await fs.rm(dir, { recursive: true, force: true });
}
