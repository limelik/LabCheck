import { test, expect } from "@playwright/test";

async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Browser-Only-Password-928!");
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test("student sees current subjects, eight dynamic labs, two midterms, attachment and home navigation", async ({
  page,
}) => {
  await login(page, "milena.simonyan@polytechnic.am");
  await expect(
    page.getByRole("heading", { name: "Your Subjects", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".student-subject-list button")).toHaveText([
    "Databases",
    "Web Development",
  ]);
  await expect(
    page.getByText(
      /2025-2026|Academic group:|Request Status|Current Lab Membership/,
    ),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Databases", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Midterm 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".lab-card").first().getByRole("heading"),
  ).toHaveText("Lab 1: Design a university course database");
  await expect(page.getByText("No attachments.", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText("TT319 ·")).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", {
      name: "Download lab-1-course-database-assignment.txt",
      exact: true,
    })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "lab-1-course-database-assignment.txt",
  );
  await page.screenshot({
    path: "outputs/verification/student-assignment-review.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "LabCheck", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Milena Simonyan!" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Progress Overview", exact: true })
    .click();
  const second = page.locator(".student-card").filter({
    has: page.getByRole("heading", {
      name: "Web Development — midterm 2",
      exact: true,
    }),
  });
  await expect(second.locator("tbody tr")).toHaveCount(8);
  await expect(second).toContainText(
    "Lab points: 14 / 16 · Exam: 3 / 4 · Overall: 17 / 20",
  );
  await page.screenshot({
    path: "outputs/verification/student-eight-labs-review.png",
    fullPage: true,
  });
});

test("teacher sees named groups, actionable lock readiness, contrast, and logo resets home", async ({
  page,
}) => {
  await login(page, "ani.hakobyan@polytechnic.am");
  await page
    .getByRole("button", { name: "Databases — TT319", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "TT319", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start Second Midterm" }),
  ).toBeDisabled();

  expect(
    await page
      .locator(".lab-card")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(233, 237, 242)");
  await page.screenshot({
    path: "outputs/verification/teacher-labs-review.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "319-1", exact: true }).click();
  await page
    .getByRole("button", { name: "Progress Overview", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "319-1 — Midterm 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /lab points assigned:|Grade: 0\.\.Difficulty|Progress Overview — offering/,
    ),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "LabCheck", exact: true }).click();
  await expect(
    page.getByText("Select a subject or open the request queue.", {
      exact: true,
    }),
  ).toBeVisible();
});
