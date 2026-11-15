import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
import { checkForeignKeyConfiguration } from './services/database-integrity.js';

try {
  await checkForeignKeyConfiguration(pool);
  app.listen(config.port, () => {
    console.log(`LabCheck API listening on http://localhost:${config.port}`);
  });
} catch (error) {
  console.error(
    'LabCheck API startup refused:',
    error.code === 'UNSAFE_DATABASE_CONFIGURATION'
      ? error.message
      : 'Database connection/configuration could not be verified.',
  );
  await pool.end();
  process.exitCode = 1;
}
