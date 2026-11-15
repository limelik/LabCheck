import { SMTPServer } from 'smtp-server';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
export async function startMailbox({
  port = 2525,
  directory = process.env.DEV_MAILBOX_DIR || '.local-mailbox',
} = {}) {
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ['AUTH', 'STARTTLS'],
    onData(stream, session, callback) {
      let body = '';
      stream.on('data', (chunk) => {
        body += chunk;
      });
      stream.on('end', async () => {
        try {
          await fs.writeFile(
            path.join(
              directory,
              `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.json`,
            ),
            JSON.stringify({
              to: session.envelope.rcptTo.map((r) => r.address),
              body,
            }),
            { mode: 0o600 },
          );
          callback();
        } catch (error) {
          callback(error);
        }
      });
    },
  });
  await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
}
if (process.argv[1]?.endsWith('/dev-mail.js')) {
  await startMailbox({ port: Number(process.env.DEV_SMTP_PORT || 2525) });
  console.log(
    'Local SMTP mailbox listening on 127.0.0.1; messages are saved privately in DEV_MAILBOX_DIR.',
  );
}
