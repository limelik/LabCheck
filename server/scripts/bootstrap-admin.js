import { z } from 'zod';
import { pool } from '../db.js';
import { universityEmail } from '../services/identity.js';
import { ApiError, validate } from '../http.js';
export async function bootstrapAdmin(connection, input) {
  const data = validate(
    z.strictObject({
      email: universityEmail,
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
    }),
    input,
  );
  const [[lock]] = await connection.query(
    "SELECT GET_LOCK(CONCAT(DATABASE(), ':bootstrap-admin'),10) AS acquired",
  );
  if (!lock.acquired)
    throw new ApiError(
      409,
      'BUSY',
      'Another administrator provisioning operation is running.',
    );
  try {
    await connection.beginTransaction();
    const [[count]] = await connection.query(
      'SELECT COUNT(*) AS n FROM admins',
    );
    if (count.n)
      throw new ApiError(
        409,
        'ADMIN_EXISTS',
        'An administrator already exists. Use authenticated account management.',
      );
    const [result] = await connection.execute(
      "INSERT INTO user_accounts(email,password_hash,account_type,approval_status) VALUES (?,'demo-hash','ADMIN','APPROVED')",
      [data.email],
    );
    await connection.execute(
      "INSERT INTO admins(user_account_id,first_name,last_name,admin_level) VALUES (?,?,?,'SUPER_ADMIN')",
      [result.insertId, data.firstName, data.lastName],
    );
    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.query(
      "SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':bootstrap-admin'))",
    );
  }
}
if (process.argv[1]?.endsWith('/bootstrap-admin.js')) {
  const [email, firstName, lastName] = process.argv.slice(2);
  const connection = await pool.getConnection();
  try {
    await bootstrapAdmin(connection, { email, firstName, lastName });
    console.log(
      'Administrator provisioned. Use email OTP password recovery to verify ownership and set a password.',
    );
  } catch (error) {
    console.error(
      error instanceof ApiError
        ? error.message
        : 'Administrator provisioning failed. Check the configuration.',
    );
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}
