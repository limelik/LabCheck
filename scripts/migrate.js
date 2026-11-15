import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "../server/db.js";

const migrationDirectory = join(process.cwd(), "database", "migrations");
try {
  const files = (await readdir(migrationDirectory))
    .filter((file) => file.endsWith(".mysql.sql"))
    .sort();
  for (const file of files) {
    await pool.query(await readFile(join(migrationDirectory, file), "utf8"));
    console.log(`Applied ${file}`);
  }
} finally {
  await pool.end();
}
