import "dotenv/config";
import { sqlStatements } from "./sql-statements.js";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "../server/db.js";

const migrationDirectory = join(process.cwd(), "database", "migrations");
const connection = await pool.getConnection();
try {
  let files = (await readdir(migrationDirectory))
    .filter((file) => file.endsWith(".mysql.sql"))
    .sort();
  if (process.argv[2]) {
    if (process.argv[2] !== "--file" || !files.includes(process.argv[3])) {
      throw new Error("Usage: npm run db:migrate -- --file <existing migration filename>");
    }
    files = [process.argv[3]];
  }
  for (const file of files) {
    const sql = await readFile(join(migrationDirectory, file), "utf8");
    const statements = sqlStatements(sql);
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log(`Applied ${file}`);
  }
} finally {
  connection.release();
  await pool.end();
}
