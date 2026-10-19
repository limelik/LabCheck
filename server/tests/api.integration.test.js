import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Opt-in: use only a local database loaded from this repository's schema and seed.
// The suite restores the seed accounts it activates and removes its own offering.
test('all core API routes against MySQL', { skip: process.env.RUN_DB_TESTS !== '1' }, async (t) => {
  const { app } = await import('../app.js');
  const { query, pool } = await import('../db.js');
  const { config } = await import('../config.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pool.end();
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const secret = crypto.randomBytes(24).toString('base64url');
  const admin = {}, unitAdmin = {}, teacher = {}, otherTeacher = {}, student = {};
  const accountIds = [1, 2, 4, 5, 10];
  const snapshots = await query('SELECT * FROM user_accounts WHERE id IN (?, ?, ?, ?, ?)', accountIds);
  let offeringId;
  const capacityAccounts = [];
  let checks = 0;
  const mailFiles = new Set();
  const mailbox = process.env.DEV_MAILBOX_DIR;
  assert.ok(mailbox && !process.env.SMTP_HOST, 'Use a development mailbox, not SMTP, for these tests.');
  async function call(method, route, body, client = {}, expected = 200) {
    const response = await fetch(`${base}${route}`, {
      method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(client.cookie ? { Cookie: client.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const cookie = response.headers.get('set-cookie');
    if (cookie) client.cookie = cookie.split(';')[0];
    const value = response.status === 204 ? null : await response.json();
    assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(value)}`);
    checks++;
    return value;
  }
  async function mailFor(address, pattern) {
    const files = await fs.readdir(mailbox);
    for (const file of files.sort().reverse()) {
      if (!file.endsWith('.txt')) continue;
      const filename = path.join(mailbox, file);
      const body = await fs.readFile(filename, 'utf8');
      if (body.startsWith(`To: ${address}\n`) && pattern.test(body)) {
        mailFiles.add(filename);
        return body.match(pattern)[1];
      }
    }
    assert.fail(`No development email for ${address}`);
  }
  try {
    assert.equal(snapshots.length, 5, 'Expected the repository seed accounts.');
    assert.equal((await query("SELECT COUNT(*) AS n FROM subject_group_offerings WHERE academic_year = ?", ['2098-2099']))[0].n, 0,
      'Reserved test offering already exists; refuse to alter it.');
    const schema = await fs.readFile('database/schema.mysql.sql', 'utf8');
    const objects = await query("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()");
    const triggers = await query("SELECT TRIGGER_NAME AS name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE()");
    for (const match of schema.matchAll(/CREATE (?:TABLE|OR REPLACE VIEW) (\w+)/g)) assert.ok(objects.some((row) => row.name === match[1]), match[1]);
    for (const match of schema.matchAll(/CREATE TRIGGER (\w+)/g)) assert.ok(triggers.some((row) => row.name === match[1]), match[1]);
    assert.equal(objects.length, 20);
    assert.equal(triggers.length, 19);
    const constraints = await query('SELECT CONSTRAINT_NAME AS name FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE()');
    for (const match of schema.matchAll(/CONSTRAINT (\w+)/g)) assert.ok(constraints.some((row) => row.name === match[1]), match[1]);
    const indexes = await query('SELECT DISTINCT INDEX_NAME AS name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE()');
    for (const match of schema.matchAll(/\bKEY (\w+)/g)) assert.ok(indexes.some((row) => row.name === match[1]), match[1]);
    assert.equal(constraints.filter((row) => row.name === 'PRIMARY').length, 19);
    assert.equal((await query('SELECT @@session.time_zone AS zone'))[0].zone, '+00:00');
    assert.equal((await query("SELECT DELETE_RULE AS rule FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?", ['lab_change_requests_enrollment_fk']))[0].rule, 'RESTRICT');
    t.diagnostic('All schema tables, view, triggers, and approved FK action exist.');

    await call('GET', '/health');
    assert.equal((await call('GET', '/auth/academic-groups')).length, 6);
    await call('GET', '/auth/me', undefined, {}, 401);
    await call('GET', '/offerings', undefined, {}, 401);
    await call('GET', '/auth/me', undefined, { cookie: 'labcheck_session=forged' }, 401);
    const expired = jwt.sign({}, config.authSecret, { subject: '1', expiresIn: -1 });
    await call('GET', '/auth/me', undefined, { cookie: `labcheck_session=${expired}` }, 401);
    const malformed = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).error.code, 'INVALID_JSON');
    checks++;
    await query('UPDATE user_accounts SET password_hash = ? WHERE id IN (?, ?)', ['demo-hash', 1, 10]);
    await call('POST', '/auth/login', { email: 'root.admin@polytechnic.am', password: 'demo-hash' }, {}, 401);
    const signup = { firstName: 'Milena', lastName: 'Simonyan', email: 'milena.simonyan@polytechnic.am', password: secret, role: 'student', academicGroupId: 1 };
    await call('POST', '/auth/signup', { ...signup, email: 'unknown.qa@polytechnic.am' }, {}, 404);
    await call('POST', '/auth/signup', { ...signup, role: 'teacher', academicGroupId: undefined }, {}, 403);
    await call('POST', '/auth/signup', { ...signup, role: 'admin' }, {}, 400);
    await call('POST', '/auth/signup', signup, {}, 202);
    await call('POST', '/auth/login', { email: signup.email, password: secret }, {}, 401);
    const token = await mailFor(signup.email, /verify-email\?token=([a-f0-9]+)/);
    await call('POST', '/auth/verify-email', { token });
    await call('POST', '/auth/login', { email: signup.email, password: secret, role: 'student' }, student);
    assert.equal((await call('GET', '/auth/me', undefined, student)).user.profileId, 1);

    await call('POST', '/auth/password-reset/request', { email: 'ani.hakobyan@polytechnic.am' });
    const code = await mailFor('ani.hakobyan@polytechnic.am', /Your reset code is: (\d{8})/);
    await call('POST', '/auth/password-reset/confirm', { email: 'ani.hakobyan@polytechnic.am', code, newPassword: secret });
    await call('POST', '/auth/login', { email: 'ani.hakobyan@polytechnic.am', password: secret, role: 'teacher' }, teacher);
    // Other role fixtures are activated with a random hash; every session still uses login.
    const hash = await bcrypt.hash(secret, 12);
    for (const id of [1, 2, 5]) await query('UPDATE user_accounts SET password_hash = ? WHERE id = ?', [hash, id]);
    await call('POST', '/auth/login', { email: 'root.admin@polytechnic.am', password: secret, role: 'admin' }, admin);
    await call('POST', '/auth/login', { email: 'se.admin@polytechnic.am', password: secret, role: 'admin' }, unitAdmin);
    await call('POST', '/auth/login', { email: 'marine.avetisyan@polytechnic.am', password: secret, role: 'teacher' }, otherTeacher);
    await call('POST', '/auth/login', { email: signup.email, password: secret, role: 'admin' }, {}, 401);
    await call('POST', '/auth/login', { email: signup.email, password: secret }, {}, 429);
    for (const changes of [ ['is_active', 0], ['approval_status', 'REJECTED'], ['email_verified_at', null] ]) {
      const [field, value] = changes;
      await query(`UPDATE user_accounts SET ${field} = ? WHERE id = ?`, [value, 10]);
      await call('GET', '/auth/me', undefined, student, 401);
      await query("UPDATE user_accounts SET is_active = TRUE, approval_status = 'APPROVED', email_verified_at = UTC_TIMESTAMP() WHERE id = ?", [10]);
    }
    t.diagnostic('Signup, email ownership, password reset, login, account status, role matching, and auth throttling passed.');

    const structure = await call('GET', '/academic-structure', undefined, admin);
    assert.equal(structure.units.length, 6);
    const scoped = await call('GET', '/academic-structure', undefined, unitAdmin);
    assert.deepEqual(scoped.units.map((row) => row.id), [1]);
    assert.equal((await call('GET', '/subjects', undefined, admin)).length, 8);
    assert.equal((await call('GET', '/teachers', undefined, admin)).length, 5);
    assert.equal((await call('GET', '/offerings', undefined, admin)).length,
      (await query('SELECT COUNT(*) AS n FROM subject_group_offerings'))[0].n);
    assert.ok((await call('GET', '/offerings', undefined, unitAdmin)).every((row) => row.academicUnitId === 1));
    assert.ok((await call('GET', '/offerings', undefined, student)).every((row) => row.academicGroupId === 1));
    assert.ok((await call('GET', '/offerings', undefined, teacher)).length > 0);
    await call('GET', '/offerings/10/enrollments', undefined, unitAdmin, 403);
    await call('GET', '/offerings/4/midterms', undefined, student, 403);
    await call('GET', '/offerings/2/midterms', undefined, teacher, 403);
    await call('POST', '/offerings', { subjectId: 8, academicGroupId: 5, academicYear: '2098-2099', semester: 'Fall' }, unitAdmin, 403);
    const input = { subjectId: 8, academicGroupId: 1, academicYear: '2098-2099', semester: 'Fall' };
    await call('POST', '/offerings', { ...input, unexpected: true }, unitAdmin, 400);
    await call('GET', '/offerings/not-an-id/enrollments', undefined, student, 400);
    const offering = await call('POST', '/offerings', input, unitAdmin, 201);
    offeringId = offering.id;
    await call('POST', '/offerings', input, admin, 409);
    await call('PATCH', `/offerings/${offeringId}`, { isActive: false }, admin);
    assert.equal((await call('GET', '/offerings', undefined, admin)).find((row) => row.id === offeringId).isActive, 0);
    await call('PATCH', `/offerings/${offeringId}`, { isActive: true }, admin);
    const enrollments = await call('GET', `/offerings/${offeringId}/enrollments`, undefined, admin);
    assert.equal(enrollments.length, 5);
    assert.ok(enrollments.every((row) => row.labGroupId === 1 && row.defaultLabGroupId === 1));
    const enrollment = enrollments.find((row) => row.studentId === 1);
    assert.equal((await call('GET', `/offerings/${offeringId}/enrollments`, undefined, student)).length, 1);
    assert.equal((await call('GET', '/academic-groups/1/lab-groups', undefined, admin)).length, 3);
    await call('PUT', `/offerings/${offeringId}/coverage`, { teacherId: 1, mode: 'split', labGroupIds: [4] }, admin, 400);
    await call('PUT', `/offerings/${offeringId}/coverage`, { teacherId: 1, mode: 'all' }, admin);
    assert.equal((await call('GET', `/offerings/${offeringId}/coverage`, undefined, admin)).length, 3);
    await call('PUT', `/offerings/${offeringId}/coverage`, { teacherId: 2, mode: 'split', labGroupIds: [2] }, admin);
    assert.ok((await call('GET', '/teachers/me/assignments', undefined, teacher)).some((row) => row.offeringId === offeringId));
    assert.ok((await call('GET', '/students/me/enrollments', undefined, student)).some((row) => row.id === enrollment.id));
    const dashboard = await call('GET', '/admin/dashboard', undefined, unitAdmin);
    assert.equal(dashboard.units, 1);
    assert.ok(dashboard.offeringSummaries.some((row) => row.id === offeringId && row.enrollmentCount === 5));

    const forbidden = [
      ['GET', '/teachers'], ['GET', '/admin/dashboard'], ['GET', '/teachers/me/assignments'],
      ['POST', '/offerings', input], ['PATCH', `/offerings/${offeringId}`, { isActive: false }],
      ['PUT', `/offerings/${offeringId}/coverage`, { teacherId: 1, mode: 'all' }],
      ['GET', `/offerings/${offeringId}/midterms/1/progress`],
      ['POST', `/offerings/${offeringId}/midterms/1/labs`, { title: 'denied', difficulty: 1 }],
      ['PATCH', '/labs/1', { title: 'denied', difficulty: 1 }], ['DELETE', '/labs/1'],
      ['PUT', `/labs/1/results/${enrollment.id}`, { grade: 1, attendance: 'PRESENT' }],
      ['PUT', `/offerings/${offeringId}/midterms/1/exam-results/${enrollment.id}`, { examScore: 1 }],
      ['POST', `/offerings/${offeringId}/midterms/1/lock`],
    ];
    for (const [method, route, body] of forbidden) await call(method, route, body, student, 403);
    await call('GET', '/students/me/progress', undefined, teacher, 403);
    await call('POST', `/enrollments/${enrollment.id}/lab-change-requests`, { requestedLabGroupId: 2 }, teacher, 403);
    t.diagnostic('Admin creation/activation/coverage and student, teacher, unit-admin scope restrictions passed.');

    await call('POST', `/enrollments/${enrollment.id}/lab-change-requests`, { requestedLabGroupId: 1 }, student, 400);
    await call('POST', `/enrollments/${enrollment.id}/lab-change-requests`, { requestedLabGroupId: 4 }, student, 409);
    await call('POST', `/enrollments/${enrollments.find((row) => row.studentId !== 1).id}/lab-change-requests`, { requestedLabGroupId: 2 }, student, 404);
    const request = await call('POST', `/enrollments/${enrollment.id}/lab-change-requests`, { requestedLabGroupId: 2 }, student, 201);
    await call('POST', `/enrollments/${enrollment.id}/lab-change-requests`, { requestedLabGroupId: 3 }, student, 409);
    assert.equal((await call('GET', `/lab-change-requests?status=PENDING&offeringId=${offeringId}`, undefined, teacher)).length, 1);
    await call('PATCH', `/lab-change-requests/${request.id}`, { decision: 'APPROVED' }, student, 403);
    const approved = await call('PATCH', `/lab-change-requests/${request.id}`, { decision: 'APPROVED' }, teacher);
    const decisionDelay = new Date(approved.decidedAt) - new Date(approved.requestedAt);
    assert.ok(decisionDelay >= 0 && decisionDelay < 60_000, 'Request and decision timestamps must share UTC.');
    let placement = (await call('GET', '/students/me/enrollments', undefined, student)).find((row) => row.id === enrollment.id);
    assert.equal(placement.labGroupId, 2);
    assert.equal(placement.defaultLabGroupId, 1);
    await assert.rejects(query('DELETE FROM student_subject_enrollments WHERE id = ?', [enrollment.id]), { code: 'ER_ROW_IS_REFERENCED_2' });
    const rejected = await call('POST', `/enrollments/${enrollment.id}/lab-change-requests`, { requestedLabGroupId: 1 }, student, 201);
    await call('PATCH', `/lab-change-requests/${rejected.id}`, { decision: 'REJECTED' }, teacher);
    await call('PATCH', `/lab-change-requests/${request.id}`, { decision: 'REJECTED' }, teacher, 409);
    placement = (await call('GET', '/students/me/enrollments', undefined, student)).find((row) => row.id === enrollment.id);
    assert.equal(placement.labGroupId, 2);
    assert.equal((await call('GET', `/lab-change-requests?offeringId=${offeringId}`, undefined, student)).length, 2);
    await call('GET', '/lab-change-requests?status=INVALID', undefined, student, 400);
    t.diagnostic('Request creation, duplicate prevention, approval, rejection, history, placement persistence, and RESTRICT behavior passed.');

    // Populate a target lab with disposable identities to exercise the real capacity boundary.
    const fixtureTag = crypto.randomBytes(8).toString('hex');
    for (let index = 0; index < 16; index++) {
      const account = await query('INSERT INTO user_accounts (email, password_hash, account_type) VALUES (?, ?, ?)',
        [`qa.capacity.${fixtureTag}.${index}@polytechnic.am`, hash, 'STUDENT']);
      capacityAccounts.push(account.insertId);
      const profile = await query('INSERT INTO students (user_account_id, academic_group_id, first_name, last_name) VALUES (?, ?, ?, ?)',
        [account.insertId, 1, 'Capacity', `Fixture ${index}`]);
      await query('INSERT INTO student_subject_enrollments (student_id, subject_group_offering_id, lab_group_id, default_lab_group_id) VALUES (?, ?, ?, ?)',
        [profile.insertId, offeringId, 3, 3]);
    }
    const fullRequest = await call('POST', `/enrollments/${enrollment.id}/lab-change-requests`, { requestedLabGroupId: 3 }, student, 201);
    await call('PATCH', `/lab-change-requests/${fullRequest.id}`, { decision: 'APPROVED' }, teacher, 409);
    assert.equal((await query('SELECT lab_group_id AS lab FROM student_subject_enrollments WHERE id = ?', [enrollment.id]))[0].lab, 2);
    await call('PATCH', `/lab-change-requests/${fullRequest.id}`, { decision: 'REJECTED' }, teacher);
    for (const id of capacityAccounts) await query('DELETE FROM user_accounts WHERE id = ?', [id]);

    const limitLabs = [];
    for (let index = 0; index < 14; index++) limitLabs.push(await call('POST', `/offerings/${offeringId}/midterms/1/labs`, { title: `Limit fixture ${index}`, difficulty: 1 }, teacher, 201));
    await call('POST', `/offerings/${offeringId}/midterms/1/labs`, { title: 'Fifteenth lab', difficulty: 1 }, teacher, 409);
    for (const lab of limitLabs) await call('DELETE', `/labs/${lab.id}`, undefined, teacher, 204);
    t.diagnostic('A full 16-student target lab rejects approval without moving the student; the 14-lab maximum is enforced.');

    const temp = await call('POST', `/offerings/${offeringId}/midterms/1/labs`, { title: 'Temporary', difficulty: 2 }, teacher, 201);
    await call('PATCH', `/labs/${temp.id}`, { title: 'Edited temporary', description: 'Persisted description', difficulty: 3 }, teacher);
    let terms = await call('GET', `/offerings/${offeringId}/midterms`, undefined, teacher);
    assert.equal(terms[0].labs[0].title, 'Edited temporary');
    await call('PUT', `/labs/${temp.id}/results/${enrollment.id}`, { grade: 2, attendance: 'PRESENT' }, teacher, 403);
    await call('PUT', `/labs/${temp.id}/results/${enrollment.id}`, { grade: 2, attendance: 'PRESENT' }, otherTeacher);
    await call('DELETE', `/labs/${temp.id}`, undefined, teacher, 204);
    assert.equal((await query('SELECT COUNT(*) AS n FROM student_lab_results WHERE lab_assignment_id = ?', [temp.id]))[0].n, 0);
    await call('PUT', `/offerings/${offeringId}/coverage`, { teacherId: 1, mode: 'all' }, admin);
    await call('GET', `/offerings/${offeringId}/midterms`, undefined, otherTeacher, 403);
    const labs = [];
    for (const difficulty of [5, 5, 5, 1]) labs.push(await call('POST', `/offerings/${offeringId}/midterms/1/labs`, { title: `Verified lab ${labs.length + 1}`, description: 'MySQL integration test', difficulty }, teacher, 201));
    assert.deepEqual(labs.map((row) => row.labNumber), [1, 2, 3, 4]);
    await call('POST', `/offerings/${offeringId}/midterms/1/labs`, { title: 'Exceeds points', difficulty: 1 }, teacher, 409);
    await call('POST', `/offerings/${offeringId}/midterms/2/labs`, { title: 'Too early', difficulty: 1 }, teacher, 409);
    await call('POST', `/offerings/${offeringId}/midterms/1/lock`, undefined, teacher, 409);
    await call('PUT', `/labs/${labs[3].id}/results/${enrollment.id}`, { grade: 2, attendance: 'PRESENT' }, teacher, 409);
    await call('PUT', `/labs/${labs[0].id}/results/${enrollment.id}`, { grade: 1.5, attendance: 'PRESENT' }, teacher, 400);
    await call('PUT', `/offerings/${offeringId}/midterms/1/exam-results/${enrollment.id}`, { examScore: 5 }, teacher, 400);
    for (const row of enrollments) {
      for (const [index, lab] of labs.entries()) await call('PUT', `/labs/${lab.id}/results/${row.id}`,
        { grade: lab.difficulty, attendance: row.id === enrollment.id && index < 3 ? 'ABSENT' : 'PRESENT' }, teacher);
      await call('PUT', `/offerings/${offeringId}/midterms/1/exam-results/${row.id}`, { examScore: 4 }, teacher);
    }
    const progress = await call('GET', `/offerings/${offeringId}/midterms/1/progress?labGroupId=2`, undefined, teacher);
    assert.equal(progress.length, 1);
    assert.equal(progress[0].labPoints, 16);
    assert.equal(progress[0].overallPoints, 20);
    assert.equal(progress[0].absences, 3);
    assert.equal(progress[0].eligibility, 'NOT_ALLOWED');
    const ownProgress = await call('GET', '/students/me/progress', undefined, student);
    assert.equal(ownProgress.find((row) => row.offeringId === offeringId && row.midtermNo === 1).labs.length, 4);
    await call('POST', `/offerings/${offeringId}/midterms/1/lock`, undefined, teacher);
    await call('PUT', `/labs/${labs[0].id}/results/${enrollment.id}`, { grade: 0, attendance: 'PRESENT' }, teacher, 409);
    await call('PUT', `/offerings/${offeringId}/midterms/1/exam-results/${enrollment.id}`, { examScore: 0 }, teacher, 409);
    await call('PATCH', `/labs/${labs[0].id}`, { title: 'Locked edit', difficulty: 5 }, teacher, 409);
    await call('DELETE', `/labs/${labs[0].id}`, undefined, teacher, 409);
    const second = [];
    for (const difficulty of [5, 5, 5, 1]) second.push(await call('POST', `/offerings/${offeringId}/midterms/2/labs`, { title: `Second lab ${second.length + 1}`, difficulty }, teacher, 201));
    assert.deepEqual(second.map((row) => row.labNumber), [5, 6, 7, 8]);
    for (const row of enrollments) {
      for (const lab of second) await call('PUT', `/labs/${lab.id}/results/${row.id}`, { grade: lab.difficulty, attendance: 'PRESENT' }, teacher);
      await call('PUT', `/offerings/${offeringId}/midterms/2/exam-results/${row.id}`, { examScore: 3 }, teacher);
    }
    await call('POST', `/offerings/${offeringId}/midterms/2/lock`, undefined, teacher);
    terms = await call('GET', `/offerings/${offeringId}/midterms`, undefined, student);
    assert.ok(terms.every((row) => row.status === 'LOCKED' && row.assignedPoints === 16));
    t.diagnostic('Lab CRUD/cascade, grade/attendance/exam writes, derived progress, both midterm locks, and locked-write rejection passed.');

    await call('POST', '/auth/logout', undefined, student, 204);
    await call('GET', '/auth/me', undefined, student, 401);
    t.diagnostic(`${checks} HTTP status assertions passed across all 34 implemented method/path combinations.`);
  } finally {
    if (offeringId) {
      await query('DELETE lcr FROM lab_change_requests lcr JOIN student_subject_enrollments sse ON sse.id = lcr.student_subject_enrollment_id WHERE sse.subject_group_offering_id = ?', [offeringId]);
      await query('DELETE FROM subject_group_offerings WHERE id = ?', [offeringId]);
      // A separate integrity test checks nested cascade behavior on the local server.
      // Explicitly clean any remaining fixture rows so repeated API tests stay isolated.
      await query('DELETE FROM lab_assignments WHERE subject_group_offering_id = ?', [offeringId]);
    }
    for (const id of capacityAccounts) await query('DELETE FROM user_accounts WHERE id = ?', [id]);
    for (const row of snapshots) {
      await query('DELETE FROM email_verification_tokens WHERE user_account_id = ?', [row.id]);
      await query('DELETE FROM password_reset_tokens WHERE user_account_id = ?', [row.id]);
      await query('UPDATE user_accounts SET password_hash = ?, approval_status = ?, email_verified_at = ?, is_active = ?, last_login_at = ? WHERE id = ?',
        [row.password_hash, row.approval_status, row.email_verified_at, row.is_active, row.last_login_at, row.id]);
    }
    await Promise.all([...mailFiles].map((filename) => fs.unlink(filename)));
  }
});
