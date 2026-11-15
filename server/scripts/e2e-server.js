import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { startMailbox } from './dev-mail.js';
assert.equal(process.env.LABCHECK_ISOLATED_TEST, '1');
const smtp = await startMailbox({ port: 2526 });
const children = [
  spawn('node', ['server/index.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      API_PORT: '3101',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '2526',
      SMTP_FROM: 'labcheck@polytechnic.am',
      PUBLIC_URL: 'http://127.0.0.1:5178',
    },
  }),
  spawn(
    'npx',
    ['vite', '--host', '127.0.0.1', '--port', '5178', '--strictPort'],
    {
      stdio: 'inherit',
      env: { ...process.env, VITE_API_TARGET: 'http://127.0.0.1:3101' },
    },
  ),
];
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    for (const child of children) child.kill('SIGTERM');
    smtp.close(() => process.exit());
  });
