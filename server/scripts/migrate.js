import fs from "node:fs/promises";
import { pool } from "../db.js";
export async function migrate(connection) {
  await connection.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  );
  for (const name of (await fs.readdir("database/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    const [applied] = await connection.execute(
      "SELECT name FROM schema_migrations WHERE name = ?",
      [name],
    );
    if (applied.length) continue;
    const sql = await fs.readFile(`database/migrations/${name}`, "utf8");
    let delimiter = ";";
    let buffer = "";
    for (const line of sql.split("\n")) {
      if (line.startsWith("DELIMITER ")) {
        delimiter = line.slice(10).trim();
        continue;
      }
      buffer += line + "\n";
      if (buffer.trimEnd().endsWith(delimiter)) {
        await connection.query(buffer.trimEnd().slice(0, -delimiter.length));
        buffer = "";
      }
    }
    if (buffer.trim() && !buffer.trim().startsWith("--"))
      throw new Error(`Unterminated SQL in ${name}`);
    await connection.execute("INSERT INTO schema_migrations(name) VALUES (?)", [
      name,
    ]);
    console.log(`Applied ${name}`);
  }
}
if (process.argv[1]?.endsWith("/migrate.js")) {
  const connection = await pool.getConnection();
  try {
    await migrate(connection);
  } finally {
    connection.release();
    await pool.end();
  }
}
