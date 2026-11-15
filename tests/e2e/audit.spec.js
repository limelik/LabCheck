import { test, expect } from '@playwright/test';

async function admin(page) {
  await page.goto('/login');
  await page
    .getByLabel('Email', { exact: true })
    .fill('root.admin@polytechnic.am');
  await page
    .getByLabel('Password', { exact: true })
    .fill('Browser-Only-Password-928!');
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).toHaveURL(/\/admin/);
}

test('successful login survives an earlier anonymous session check finishing late', async ({
  page,
}) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/api/auth/me', async (route) => {
    const response = await route.fetch();
    if (response.status() === 401) await gate;
    await route.fulfill({ response });
  });
  await admin(page);
  const oldResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/me') && response.status() === 401,
  );
  release();
  await (await oldResponse).finished();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole('button', { name: /Log ?out/i })).toBeVisible();
});

test('catalog ignores a delayed response after the administrator changes record type', async ({
  page,
}) => {
  await admin(page);
  const subjects = await (
    await page.request.get('/api/admin/catalog/subjects')
  ).json();
  let release, arrived;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const fetched = new Promise((resolve) => {
    arrived = resolve;
  });
  await page.route('**/api/admin/catalog/units', async (route) => {
    const response = await route.fetch();
    arrived();
    await gate;
    await route.fulfill({ response });
  });
  await page.goto('/admin/catalog');
  await fetched;
  await page.getByLabel('Configuration type').selectOption('subjects');
  await expect(
    page.getByRole('cell', { name: subjects[0].name, exact: true }),
  ).toBeVisible();
  const oldResponse = page.waitForResponse('**/api/admin/catalog/units');
  release();
  await (await oldResponse).finished();
  // Allow React to paint the deliberately delayed real API response.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(
    page.getByRole('cell', { name: subjects[0].name, exact: true }),
  ).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(subjects.length);
});

test('logout stays logged out when an older authenticated session check arrives', async ({
  page,
}) => {
  await admin(page);
  await expect(page.getByRole('button', { name: /Log ?out/i })).toBeVisible();
  let release, arrived;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const fetched = new Promise((resolve) => {
    arrived = resolve;
  });
  await page.route('**/api/auth/me', async (route) => {
    const response = await route.fetch();
    arrived();
    await gate;
    await route.fulfill({ response });
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await fetched;
  await page.getByRole('button', { name: /Log ?out/i }).click();
  await expect(page).toHaveURL(/\/login/);
  const oldResponse = page.waitForResponse('**/api/auth/me');
  release();
  await (await oldResponse).finished();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(page.getByRole('button', { name: /Log ?out/i })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Log In', exact: true }),
  ).toBeVisible();
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
});

test('catalog hierarchy creation, identity-safe editing, protected deletion and unused-record deletion', async ({
  page,
}) => {
  await admin(page);
  await page.goto('/admin/catalog');
  const configurations = [
    { type: 'units', code: 'AUDUNIT', name: 'Audit department' },
    {
      type: 'specializations',
      code: 'AUDSPEC',
      name: 'Audit specialization',
      parentLabel: 'Academic unit',
      parentCode: 'AUDUNIT',
    },
    {
      type: 'groups',
      code: 'AUD901',
      name: 'Audit group',
      parentLabel: 'Specialization',
      parentCode: 'AUDSPEC',
    },
    {
      type: 'lab-groups',
      code: 'AUD901-1',
      parentLabel: 'Academic group',
      parentCode: 'AUD901',
    },
    { type: 'subjects', code: 'AUDSUBJECT', name: 'Audit subject' },
  ];
  for (const record of configurations) {
    await page.getByLabel('Configuration type').selectOption(record.type);
    await page
      .getByRole('button', { name: 'Create record', exact: true })
      .click();
    await page.getByLabel('Code', { exact: true }).fill(record.code);
    if (record.name)
      await page.getByLabel('Name', { exact: true }).fill(record.name);
    if (record.parentLabel) {
      const option = page
        .getByLabel(record.parentLabel, { exact: true })
        .locator('option')
        .filter({ hasText: record.parentCode });
      await page
        .getByLabel(record.parentLabel, { exact: true })
        .selectOption(await option.getAttribute('value'));
    }
    await page
      .getByRole('button', { name: 'Save record', exact: true })
      .click();
    await expect(
      page.getByRole('cell', { name: record.code, exact: true }),
    ).toBeVisible();
  }
  await page.getByLabel('Configuration type').selectOption('groups');
  await page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'AUD901', exact: true }) })
    .getByRole('button', { name: 'Edit', exact: true })
    .click();
  await page.getByLabel('Name', { exact: true }).fill('Audit group corrected');
  await page.getByRole('button', { name: 'Save record', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: 'Audit group corrected', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Configuration type').selectOption('units');
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'AUDUNIT', exact: true }) })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('referenced');
  for (const record of [...configurations].reverse()) {
    await page.getByLabel('Configuration type').selectOption(record.type);
    const row = page.getByRole('row').filter({
      has: page.getByRole('cell', { name: record.code, exact: true }),
    });
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(row).toHaveCount(0);
    const rows = await (
      await page.request.get(`/api/admin/catalog/${record.type}`)
    ).json();
    expect(rows.some((r) => r.code === record.code)).toBe(false);
  }
});
