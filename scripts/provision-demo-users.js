import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

if (process.env.NODE_ENV === "production") {
  throw new Error("Demo credentials may only be provisioned outside production.");
}
if (process.env.MYSQL_DATABASE !== "labcheck") {
  throw new Error("Demo credentials can only be provisioned in the labcheck database.");
}

const resetSeededAccounts = process.argv.includes("--reset-seeded");
const additionalDemoEmails = [
  "ani.sargsyan@polytechnic.am",
  "erik.hovsepyan@polytechnic.am",
  "lusine.grigoryan@polytechnic.am",
  "arsen.vardanyan@polytechnic.am",
  "mariam.hakobyan@polytechnic.am",
  "gor.petrosyan@polytechnic.am",
  "nune.mkrtchyan@polytechnic.am",
  "hrayr.avetisyan@polytechnic.am",
  "eva.davtyan@polytechnic.am",
  "arman.sargsyan@polytechnic.am",
  "sona.khachatryan@polytechnic.am",
  "david.manukyan@polytechnic.am",
  "lilit.harutyunyan@polytechnic.am",
  "samvel.hovhannisyan@polytechnic.am",
  "tatev.sahakyan@polytechnic.am",
  "edgar.abrahamyan@polytechnic.am",
  "elina.gevorgyan@polytechnic.am",
  "ruben.melikyan@polytechnic.am",
  "naira.petrosyan@polytechnic.am",
  "vrej.arakelyan@polytechnic.am",
  "gayane.karapetyan@polytechnic.am",
];
const sharedPassword = process.env.DEMO_PASSWORD;
if (sharedPassword !== undefined &&
    (sharedPassword.length < 8 || Buffer.byteLength(sharedPassword, "utf8") > 72)) {
  throw new Error("DEMO_PASSWORD must be at least 8 and no more than 72 bytes.");
}

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE,
});

try {
  const [accounts] = resetSeededAccounts
    ? await connection.execute(
      `SELECT id, email, account_type
       FROM user_accounts
       WHERE id BETWEEN 1 AND 24
         OR email IN (${additionalDemoEmails.map(() => "?").join(", ")})
         OR email LIKE 'demo.tt%.__@polytechnic.am'
       ORDER BY account_type, email`,
      additionalDemoEmails
    )
    : await connection.execute(
      `SELECT id, email, account_type
       FROM user_accounts
       WHERE password_hash = 'demo-hash'
       ORDER BY account_type, email`
    );
  if (!accounts.length) {
    throw new Error("No demo accounts found to provision.");
  }
  if (resetSeededAccounts) {
    const roleCounts = accounts.reduce((counts, account) => {
      counts[account.account_type] = (counts[account.account_type] || 0) + 1;
      return counts;
    }, {});
    if (accounts.length !== 129 || accounts.some((account) => !account.email.endsWith("@polytechnic.am")) ||
        roleCounts.ADMIN !== 4 || roleCounts.TEACHER !== 5 || roleCounts.STUDENT !== 120) {
      throw new Error("Refusing to reset passwords: seeded demo accounts do not match the expected 4 admins, 5 teachers, and 120 students.");
    }
  }

  const credentials = [];
  for (const account of accounts) {
    const password = sharedPassword ?? `${randomBytes(18).toString("base64url")}A7!`;
    const passwordHash = await bcrypt.hash(password, 12);
    await connection.execute(
      `UPDATE user_accounts SET password_hash = ?
       WHERE id = ?${resetSeededAccounts ? "" : " AND password_hash = 'demo-hash'"}`,
      [passwordHash, account.id]
    );
    credentials.push({ role: account.account_type, email: account.email, password });
  }

  if (sharedPassword) {
    console.log(`Set the shared demo password for ${credentials.length} account(s): ${sharedPassword}`);
    console.table(credentials.map(({ role, email }) => ({ role, email })));
  } else {
    console.log("Save these local demo credentials now; their passwords are not stored in the repository:");
    console.table(credentials);
  }
} finally {
  await connection.end();
}
