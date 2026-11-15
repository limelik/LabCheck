import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { query, pool } from '../db.js';
import { cleanupAttachmentFiles } from '../routes/attachments.js';
try {
  await cleanupAttachmentFiles();
  const retained = new Set(
    (await query('SELECT storage_key FROM lab_attachments')).map(
      (row) => row.storage_key,
    ),
  );
  const directory = path.resolve(config.uploadDir);
  const entries = await fs.readdir(directory).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  let removed = 0;
  for (const name of entries) {
    if (!/^[a-f0-9]{64}$/.test(name) || retained.has(name)) continue;
    const file = path.join(directory, name),
      stat = await fs.lstat(file);
    // An hour grace period excludes active uploads; only generated, unreferenced files qualify.
    if (stat.isFile() && Date.now() - stat.mtimeMs > 3600000) {
      await fs.unlink(file);
      removed++;
    }
  }
  await query('DELETE FROM auth_sessions WHERE expires_at<=UTC_TIMESTAMP()');
  console.log(
    `Storage maintenance completed; removed ${removed} unreferenced files older than one hour.`,
  );
} finally {
  await pool.end();
}
