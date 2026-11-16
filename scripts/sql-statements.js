// Supports the DELIMITER directives used by MySQL trigger migrations.
export function sqlStatements(sql) {
  let delimiter = ";";
  let buffer = "";
  const statements = [];
  for (const line of sql.split(/\r?\n/)) {
    const directive = /^\s*DELIMITER\s+(\S+)\s*$/i.exec(line);
    if (directive) {
      if (buffer.trim()) throw new Error("Unterminated SQL before DELIMITER");
      delimiter = directive[1];
      continue;
    }
    buffer += `${line}\n`;
    if (line.trimEnd().endsWith(delimiter)) {
      statements.push(buffer.trimEnd().slice(0, -delimiter.length).trim());
      buffer = "";
    }
  }
  if (buffer.trim()) throw new Error("Unterminated SQL statement");
  return statements.filter(Boolean);
}
