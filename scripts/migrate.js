import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "../server/db.js";

const migrationDirectory = join(process.cwd(), "database", "migrations");
const connection = await pool.getConnection();
try {
  const files = (await readdir(migrationDirectory))
    .filter((file) => file.endsWith(".mysql.sql"))
    .sort();
  for (const file of files) {
    const sql = await readFile(join(migrationDirectory, file), "utf8");
    const statements = sql.split(";").map((statement) => statement.trim()).filter(Boolean);
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log(`Applied ${file}`);
  }
} finally {
  connection.release();
  await pool.end();
}
