import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { config } from "../../server/config.js";
const password = "Browser-Only-Password-928!",
  studentEmail = "disposable.browser319@polytechnic.am",
  teacherEmail = "browserteacher@polytechnic.am";
test.describe.configure({ mode: "serial" });
async function capture(page, name) {
  await fs.mkdir("outputs/verification", { recursive: true });
  await page.screenshot({
    path: `outputs/verification/${name}.png`,
    fullPage: true,
  });
}

async function codeFor(email) {
  let code;
  await expect
    .poll(async () => {
      const files = (await fs.readdir(process.env.DEV_MAILBOX_DIR))
        .filter((f) => f.endsWith(".json"))
        .sort()
        .reverse();
      for (const file of files) {
        const message = JSON.parse(
          await fs.readFile(
            path.join(process.env.DEV_MAILBOX_DIR, file),
            "utf8",
          ),
        );
        if (message.to.includes(email)) {
          code = message.body.match(/code is: (\d{6})/)?.[1];
          return Boolean(code);
        }
      }
      return false;
    })
    .toBeTruthy();
  return code;
}
async function login(page, email, pass = password) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(pass);
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
async function signup(page, email, surname, role = "Student") {
  await page.goto("/signup");
  await page.getByRole("button", { name: role, exact: true }).click();
  await page.getByLabel("First Name", { exact: true }).fill("Browser");
  await page.getByLabel("Surname", { exact: true }).fill(surname);
  await page.getByLabel("University Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/verify-email/);
  await page.getByLabel("Verification Code").fill(await codeFor(email));
  await page.getByRole("button", { name: "Verify Email", exact: true }).click();
}
async function db(sql, params = []) {
  const c = await mysql.createConnection(config.db);
  try {
    return (await c.execute(sql, params))[0];
  } finally {
    await c.end();
  }
}
test("student signup, automatic group, SMTP OTP, placement, refresh and protected routes", async ({
  page,
  context,
}) => {
  await page.goto("/signup");
  await page
    .getByLabel("University Email")
    .fill("disposable.tt319@polytechnic.am");
  await expect(page.getByText("Detected group: TT319")).toBeVisible();
  await expect(page.locator("select")).toHaveCount(0);
  await signup(page, studentEmail, "Student");
  await expect(page.getByRole("status")).toContainText("account activated");
  await page
    .getByRole("button", { name: "Recover password", exact: true })
    .click();
  await expect(page.getByLabel("New Password", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Send code", exact: true }),
  ).toBeVisible();
  await login(page, studentEmail);
  await expect(page).toHaveURL(/\/student/);
  await expect(
    page.getByText("Academic group: BROWSER319", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("cell", { name: "BROWSER319-1", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome, Browser Student!" }),
  ).toBeVisible();
  await capture(page, "student-dashboard");
  const other = await context.newPage();
  await other.goto("/student");
  await expect(
    other.getByRole("heading", { name: "Welcome, Browser Student!" }),
  ).toBeVisible();
  await other.close();
  await page.goto("/admin/accounts");
  await expect(page).toHaveURL(/\/student/);
  await page
    .getByRole("button", { name: "Lab Change Requests", exact: true })
    .click();
  await page.getByRole("combobox").selectOption({ label: "BROWSER319-2" });
  await page.getByRole("button", { name: "Request Change" }).click();
  await expect(page.getByText("PENDING", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Log ?out/i }).click();
  await page.goto("/student");
  await expect(page).toHaveURL(/\/login/);
});
test("teacher signup, authorized roster, grades, attendance, exam, attachments and locking", async ({
  page,
  browser,
}) => {
  await signup(page, teacherEmail, "Teacher", "Teacher");
  await expect(page.getByRole("status")).toContainText("account activated");
  await login(page, teacherEmail);
  await expect(page).toHaveURL(/\/teacher/);
  await page
    .getByRole("button", { name: /BROWSER319/ })
    .first()
    .click();
  for (const [i, difficulty] of [5, 5, 5, 1].entries()) {
    await page.getByRole("button", { name: "+ Add Lab", exact: true }).click();
    await page
      .getByLabel("Title", { exact: true })
      .fill(`Browser lab ${i + 1}`);
    await page.getByLabel("Maximum points").selectOption(String(difficulty));
    if (i === 0) {
      await page
        .getByLabel("Attachments (PDF, TXT, PNG, JPEG)", { exact: true })
        .setInputFiles([
          {
            name: "browser-notes.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("Browser attachment content"),
          },
          {
            name: "invalid.png",
            mimeType: "image/png",
            buffer: Buffer.from("Not a PNG"),
          },
        ]);
      await page.getByRole("button", { name: "Save Lab" }).click();
      await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
        "File contents do not match",
      );
      await page
        .getByRole("button", { name: "Remove invalid.png", exact: true })
        .click();
    }
    await page.getByRole("button", { name: "Save Lab" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".lab-card")).toHaveCount(i + 1);
  }
  const firstLab = page.locator(".lab-card").first();
  await expect(
    firstLab.getByRole("link", { name: "browser-notes.txt", exact: true }),
  ).toBeVisible();
  const studentContext = await browser.newContext(),
    student = await studentContext.newPage();
  await login(student, studentEmail);
  await student.locator(".student-subject-list button").first().click();
  const previewPromise = student.waitForEvent("popup");
  await student
    .getByRole("link", { name: "browser-notes.txt", exact: true })
    .click();
  const preview = await previewPromise;
  await expect(preview.locator("body")).toContainText(
    "Browser attachment content",
  );
  await preview.close();
  const download = student.waitForEvent("download");
  await student
    .getByRole("link", { name: "Download browser-notes.txt", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("browser-notes.txt");
  await studentContext.close();
  page.once("dialog", (d) => d.accept());
  await firstLab.getByRole("button", { name: "Delete attachment" }).click();
  await expect(
    firstLab.getByRole("link", { name: "browser-notes.txt", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Lab Change Queue/ }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("APPROVED", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: /BROWSER319/ })
    .first()
    .click();
  await page.getByRole("button", { name: "BROWSER319-2", exact: true }).click();
  await page
    .getByRole("button", { name: "Progress Overview", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: "Browser Student" });
  await expect(row).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await row
      .locator("select")
      .nth(i)
      .selectOption(String([5, 5, 5, 1][i]));
    await expect(row.locator("select").nth(i)).toHaveValue(
      String([5, 5, 5, 1][i]),
    );
    await row.locator('button[title^="Attendance:"]').nth(i).click();
    await expect(
      row.locator('button[title^="Attendance:"]').nth(i),
    ).toHaveAttribute("title", /PRESENT/);
  }
  await row.locator("select").nth(4).selectOption("4");
  await expect(row).toContainText("20");
  await page.reload();
  await page
    .getByRole("button", { name: /BROWSER319/ })
    .first()
    .click();
  await page.getByRole("button", { name: "BROWSER319-2", exact: true }).click();
  await page
    .getByRole("button", { name: "Progress Overview", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Browser Student" }),
  ).toContainText("20");
  const updatedRow = page
    .getByRole("row")
    .filter({ hasText: "Browser Student" });
  for (let i = 0; i < 3; i++) {
    await updatedRow.locator('button[title^="Attendance:"]').nth(i).click();
    await expect(
      updatedRow.locator('button[title^="Attendance:"]').nth(i),
    ).toHaveAttribute("title", /ABSENT/);
  }
  const exportDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export Not allowed/ }).click();
  const exported = await exportDownload;
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(await exported.path());
  expect(workbook.worksheets[0].getCell("A2").value).toBe("Browser Student");
  expect(workbook.worksheets[0].getCell("B2").value).toBe(3);
  await page
    .getByRole("button", { name: "Lock first midterm", exact: true })
    .click();
  await page.getByRole("button", { name: /First midterm/ }).click();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Browser Student" })
      .locator("select")
      .first(),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Unlock first midterm", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lock first midterm", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Lock first midterm", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Databases — BROWSER319", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start Second Midterm", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "BROWSER319-1", exact: true }).click();
  await page
    .getByRole("button", { name: "Progress Overview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lock first midterm", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Databases — BROWSER319", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "First midterm (open)", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/partially locked/i)).toHaveCount(0);
  await page
    .getByRole("button", { name: "Start Second Midterm", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Second midterm/ }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "First midterm (locked)", exact: true }),
  ).toBeVisible();
  for (const [i, points] of [6, 5, 5].entries()) {
    await page.getByRole("button", { name: "+ Add Lab", exact: true }).click();
    await page
      .getByLabel("Title", { exact: true })
      .fill(`Second midterm lab ${i + 1}`);
    await page
      .getByRole("combobox", { name: "Maximum points", exact: true })
      .selectOption(String(points));
    await page.getByRole("button", { name: "Save Lab", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(page.locator(".lab-card")).toHaveCount(3);
  await page.getByRole("button", { name: "BROWSER319-2", exact: true }).click();
  await page
    .getByRole("button", { name: "Progress Overview", exact: true })
    .click();
  await page.getByRole("button", { name: /Second midterm/ }).click();
  const secondRow = page
    .getByRole("row")
    .filter({ hasText: "Browser Student" });
  for (const [i, points] of [6, 5, 5].entries()) {
    await secondRow.locator("select").nth(i).selectOption(String(points));
    await expect(secondRow.locator("select").nth(i)).toHaveValue(
      String(points),
    );
    await secondRow.locator('button[title^="Attendance:"]').nth(i).click();
    await expect(
      secondRow.locator('button[title^="Attendance:"]').nth(i),
    ).toHaveAttribute("title", /PRESENT/);
  }
  await secondRow.locator("select").nth(3).selectOption("4");
  await expect(secondRow).toContainText("20");
  await page
    .getByRole("button", { name: "Lock second midterm", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unlock second midterm", exact: true }),
  ).toBeEnabled();

  await capture(page, "teacher-locked-results");
  const saved = await db(
    `SELECT slr.grade,slr.attendance,la.midterm_no AS midtermNo FROM student_lab_results slr JOIN lab_assignments la ON la.id=slr.lab_assignment_id JOIN student_subject_enrollments e ON e.id=slr.student_subject_enrollment_id JOIN students s ON s.id=e.student_id JOIN user_accounts u ON u.id=s.user_account_id WHERE u.email=?`,
    [studentEmail],
  );
  const firstSaved = saved.filter((r) => r.midtermNo === 1);
  expect(saved).toHaveLength(7);
  expect(firstSaved).toHaveLength(4);
  expect(firstSaved.map((r) => r.grade).sort()).toEqual([1, 5, 5, 5]);
  expect(firstSaved.filter((r) => r.attendance === "ABSENT")).toHaveLength(3);
  expect(firstSaved.filter((r) => r.attendance === "PRESENT")).toHaveLength(1);
});
test("admin manages automatically activated student, deactivates and safely deletes", async ({
  page,
}) => {
  const email = "pending.review319@polytechnic.am";
  await signup(page, email, "Pending");
  await expect(page.getByRole("status")).toContainText("You can log in now");
  await login(page, "root.admin@polytechnic.am");
  await page
    .getByRole("link", { name: "Accounts & Registration Review" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Account Management" }),
  ).toBeVisible();
  const firstAccount = page
    .locator(".admin-table")
    .first()
    .locator("tbody tr")
    .first();
  await firstAccount
    .getByRole("button", { name: "Details", exact: true })
    .click();
  await expect(
    firstAccount
      .locator("xpath=following-sibling::tr[1]")
      .getByRole("region", { name: "Account details" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await page.getByLabel("Search accounts").fill(email);
  await page
    .getByRole("row")
    .filter({ hasText: email })
    .getByRole("button", { name: "Details", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Deactivate account", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: email }).first(),
  ).toContainText("INACTIVE");
  const result = await page.request.post("/api/auth/login", {
    headers: { "X-LabCheck-Request": "1" },
    data: { email, password },
  });
  expect(result.status()).toBe(401);
  await page
    .getByRole("row")
    .filter({ hasText: email })
    .getByRole("button", { name: "Details", exact: true })
    .click();
  page.once("dialog", (d) => d.accept(email));
  await page
    .getByRole("button", { name: "Delete login, keep history", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("History retained");

  await page
    .getByRole("button", { name: "Provision trusted identity", exact: true })
    .click();
  await page.getByLabel("First name", { exact: true }).fill("Disposable");
  await page.getByLabel("Surname", { exact: true }).fill("Teacher");
  await page
    .getByLabel("University email", { exact: true })
    .fill("delete.browser@polytechnic.am");
  await page.getByLabel("Institutional role").selectOption("TEACHER");
  await page.getByRole("button", { name: "Save trusted identity" }).click();
  await page.getByLabel("Search accounts").fill("delete.browser");
  await page
    .getByRole("row")
    .filter({ hasText: "delete.browser@polytechnic.am" })
    .getByRole("button", { name: "Details", exact: true })
    .click();
  page.once("dialog", (d) => d.accept("delete.browser@polytechnic.am"));
  await page
    .getByRole("button", { name: "Permanently delete account" })
    .click();
  await expect(page.getByText("No matching accounts.")).toBeVisible();
  await page.getByLabel("Search accounts").fill(studentEmail);
  await page
    .getByRole("row")
    .filter({ hasText: studentEmail })
    .getByRole("button", { name: "Details", exact: true })
    .click();
  page.once("dialog", (d) => d.accept(studentEmail));
  await page
    .getByRole("button", { name: "Permanently delete account" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Permanent deletion blocked",
  );
  await capture(page, "admin-protected-deletion");
  expect(
    (await db("SELECT COUNT(*) AS n FROM student_lab_results"))[0].n,
  ).toBeGreaterThan(0);
});
test("password recovery through SMTP, invalid code, mobile layout, server errors and session expiry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/reset-password");
  await page.getByLabel("University Email").fill(studentEmail);
  await page.getByRole("button", { name: "Send code", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "reset code has been sent",
  );
  const code = await codeFor(studentEmail);
  await page
    .getByLabel("Verification Code")
    .fill(code === "000000" ? "111111" : "000000");
  await expect(page.getByLabel("New Password", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Incorrect code");
  await page.getByLabel("Verification Code").fill(code);
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await expect(page.getByLabel("Verification Code")).toHaveCount(0);
  await page.getByLabel("New Password", { exact: true }).fill(password + "new");
  await page.getByLabel("Confirm Password").fill(password + "new");
  await page
    .getByRole("button", { name: "Reset Password", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Password changed");
  await login(page, studentEmail, password + "new");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await capture(page, "student-mobile");
  await db(
    "UPDATE auth_sessions SET expires_at=UTC_TIMESTAMP() WHERE user_account_id=(SELECT id FROM user_accounts WHERE email=?)",
    [studentEmail],
  );
  await page.reload();
  await expect(page).toHaveURL(/\/login/);
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Database is unavailable or incomplete.",
        },
      }),
    }),
  );
  await page.getByLabel("Email", { exact: true }).fill(studentEmail);
  await page.getByLabel("Password", { exact: true }).fill(password + "new");
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await expect(
    page.getByText("Database is unavailable or incomplete."),
  ).toBeVisible();
});
test("academic catalog, offering creation, teacher coverage and placement controls", async ({
  page,
}) => {
  await login(page, "root.admin@polytechnic.am");
  await page
    .getByRole("link", { name: "Academic Configuration", exact: true })
    .click();
  await page.getByLabel("Configuration type").selectOption("subjects");
  await page.getByRole("button", { name: "Create record" }).click();
  await page.getByLabel("Code", { exact: true }).fill("BROWSERNEW");
  await page.getByLabel("Name", { exact: true }).fill("Browser elective");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(
    page.getByRole("cell", { name: "Browser elective", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Course Offerings", exact: true })
    .click();
  await page
    .getByLabel("Subject", { exact: true })
    .selectOption({ label: "BROWSERNEW - Browser elective" });
  await page
    .getByLabel("Academic group", { exact: true })
    .selectOption({ label: "REVIEW319" });
  await page.getByLabel("Academic year", { exact: true }).fill("2091-2092");
  await page
    .getByRole("button", { name: "Create Offering", exact: true })
    .click();
  await expect(
    page.getByText(
      "Offering created. Students auto-enrolled and auto-placed into labs.",
    ),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Teacher Coverage", exact: true })
    .click();
  await page
    .getByLabel("Teacher", { exact: true })
    .selectOption({ label: "Browser Teacher" });
  await page
    .getByLabel("Offering", { exact: true })
    .selectOption({ label: "Browser elective - REVIEW319 - 2091-2092 - Fall" });
  await page
    .getByRole("button", { name: "Save Coverage", exact: true })
    .click();
  await expect(
    page.getByText("Teacher now covers all labs in selected offering."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("row").filter({ hasText: "Browser elective" }),
  ).toContainText("Browser Teacher covers all labs");
  await page
    .getByRole("link", { name: "Student Placement", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reconcile REVIEW319", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Existing placements");
  await expect(
    page.getByText("Browser Pending", { exact: true }).first(),
  ).toBeVisible();
});

for (const [role, email] of [
  ["teacher", "ani.hakobyan@polytechnic.am"],
  ["student", "milena.simonyan@polytechnic.am"],
]) {
  test(`${role} can reset their password from the signed-in header`, async ({
    page,
  }) => {
    await login(page, email);
    await page
      .getByRole("button", { name: "Reset Password", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${role}`));
    await expect(
      page.getByRole("dialog", { name: "Reset Password" }),
    ).toBeVisible();
    await expect(page.getByLabel("University Email")).toHaveValue(email);
    await page.getByRole("button", { name: "Send code", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(
      "reset code has been sent",
    );
    await page.getByLabel("Verification Code").fill(await codeFor(email));
    await page
      .getByRole("button", { name: "Verify code", exact: true })
      .click();
    await page
      .getByLabel("New Password", { exact: true })
      .fill(password + "-reset");
    await page
      .getByLabel("Confirm Password", { exact: true })
      .fill(password + "-reset");
    await page
      .locator("form")
      .getByRole("button", { name: "Reset Password", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Password changed");
    await expect(
      page.getByRole("button", { name: "Logout", exact: true }),
    ).toHaveCount(0);
    const oldLogin = await page.request.post("/api/auth/login", {
      headers: { "X-LabCheck-Request": "1" },
      data: { email, password },
    });
    expect(oldLogin.status()).toBe(401);
    await login(page, email, password + "-reset");
    await expect(page).toHaveURL(new RegExp(`/${role}`));
  });
}
