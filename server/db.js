import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool(config.db);
// Driver timezone controls parsing; the session timezone also controls SQL defaults.
// Keep CURRENT_TIMESTAMP defaults aligned with explicit UTC_TIMESTAMP writes.
pool.on('connection', (connection) => {
  connection.query('SET time_zone = ?', ['+00:00'], (error) => {
    if (error) connection.destroy();
  });
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function transaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
