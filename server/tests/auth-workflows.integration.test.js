import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import bcrypt from "bcryptjs";
import { SMTPServer } from "smtp-server";

test(
  "OTP SMTP, trusted registration, sessions, account management, attachments, placement and catalog",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async (t) => {
    assert.equal(process.env.LABCHECK_ISOLATED_TEST, "1");
    const { config } = await import("../config.js");
    const { query, pool, transaction } = await import("../db.js");
    const { reconcilePlacement } = await import("../services/placement.js");
    const messages = [];
    let rejectMail = false;
    const smtp = new SMTPServer({
      authOptional: true,
      disabledCommands: ["AUTH", "STARTTLS"],
      onData(stream, session, callback) {
        let raw = "";
        stream.on("data", (chunk) => {
          raw += chunk;
        });
        stream.on("end", () => {
          if (rejectMail)
            return callback(new Error("Test SMTP delivery failure"));
          messages.push({ to: session.envelope.rcptTo[0].address, raw });
          callback();
        });
      },
    });
    await new Promise((resolve) => smtp.listen(0, "127.0.0.1", resolve));
    config.smtp = {
      host: "127.0.0.1",
      port: smtp.server.address().port,
      from: "labcheck@polytechnic.am",
    };
    config.uploadDir = await fs.mkdtemp("/private/tmp/labcheck-upload-tests-");
    const { app } = await import("../app.js");
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    t.after(async () => {
      await new Promise((resolve) => server.close(resolve));
      await new Promise((resolve) => smtp.close(resolve));
      await pool.end();
      await fs.rm(config.uploadDir, { recursive: true, force: true });
    });
    const base = `http://127.0.0.1:${server.address().port}/api`,
      password = crypto.randomBytes(18).toString("hex");
    const hash = await bcrypt.hash(password, 12);
    let checks = 0;
    async function call(method, url, body, client = {}, expected = 200) {
      const response = await fetch(base + url, {
        method,
        headers: {
          "X-LabCheck-Request": "1",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(client.cookie ? { Cookie: client.cookie } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (response.headers.get("set-cookie"))
        client.cookie = response.headers.get("set-cookie").split(";")[0];
      const value = response.status === 204 ? null : await response.json();
      assert.equal(
        response.status,
        expected,
        `${method} ${url}: ${JSON.stringify(value)}`,
      );
      checks++;
      return value;
    }
    const otp = (email) => {
      const message = messages.findLast((m) => m.to === email);
      assert.ok(message, `SMTP delivered to ${email}`);
      return message.raw.match(/code is: (\d{6})/)[1];
    };
    const cooldown = (email) =>
      query(
        "UPDATE email_otp_challenges SET created_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 61 SECOND) WHERE email=?",
        [email],
      );
    async function roster(email, role = "STUDENT", lastName = "Zeta", groupId) {
      const a = await query(
        "INSERT INTO user_accounts(email,password_hash,account_type,approval_status) VALUES (?,'demo-hash',?,'APPROVED')",
        [email, role],
      );
      const table = role === "STUDENT" ? "students" : "teachers";
      const p = await query(
        `INSERT INTO ${table}(user_account_id,first_name,last_name${role === "STUDENT" ? ",academic_group_id" : ""}) VALUES (?,'Trusted',?${role === "STUDENT" ? ",?" : ""})`,
        role === "STUDENT"
          ? [a.insertId, lastName, groupId]
          : [a.insertId, lastName],
      );
      return { id: a.insertId, profileId: p.insertId, email };
    }
    const admin = {};
    await query("UPDATE user_accounts SET password_hash=? WHERE id=1", [hash]);
    await call(
      "POST",
      "/auth/login",
      { email: "root.admin@polytechnic.am", password },
      admin,
    );
    const group = await call(
      "POST",
      "/admin/catalog/groups",
      { code: "QA319", name: "Disposable cohort", specializationId: 1 },
      admin,
      201,
    );
    const studentIdentity = await roster(
      "trusted.qa319@polytechnic.am",
      "STUDENT",
      "Zeta",
      group.id,
    );
    await roster("other.qa319@polytechnic.am", "STUDENT", "Alpha", group.id);
    const offering = await call(
      "POST",
      "/offerings",
      {
        subjectId: 1,
        academicGroupId: group.id,
        academicYear: "2093-2094",
        semester: "Fall",
      },
      admin,
      201,
    );
    const teacherIdentity = await roster(
      "trusted.teacher@polytechnic.am",
      "TEACHER",
    );
    await call(
      "PUT",
      `/offerings/${offering.id}/coverage`,
      { teacherId: teacherIdentity.profileId, mode: "all" },
      admin,
    );
    const signup = {
      firstName: "Trusted",
      lastName: "Zeta",
      email: studentIdentity.email,
      password,
      role: "student",
    };
    rejectMail = true;
    const failedEmail = "smtp.failure319@polytechnic.am";
    await call(
      "POST",
      "/auth/signup",
      { ...signup, email: failedEmail },
      {},
      503,
    );
    rejectMail = false;
    assert.equal(
      (
        await query("SELECT COUNT(*) AS n FROM registrations WHERE email=?", [
          failedEmail,
        ])
      )[0].n,
      0,
    );
    assert.equal(
      (
        await query(
          "SELECT COUNT(*) AS n FROM email_otp_challenges WHERE email=?",
          [failedEmail],
        )
      )[0].n,
      0,
    );
    for (const [address, code] of [
      ["lianamelikyan.tt319@polytechnic.am", "TT319"],
      ["name.TT319@polytechnic.am", "TT319"],
      ["name.tt320-2@polytechnic.am", "TT320"],
      ["name.ab123@polytechnic.am", "AB123"],
      ["example.xy456-1@polytechnic.am", "XY456"],
    ])
      assert.equal(
        (await call("GET", `/auth/detect-group?email=${address}`)).code,
        code,
      );
    await call(
      "POST",
      "/auth/signup",
      { ...signup, email: "wrong@example.com" },
      {},
      400,
    );
    await call(
      "POST",
      "/auth/signup",
      { ...signup, academicGroupId: 1 },
      {},
      400,
    );
    await call("POST", "/auth/signup", { ...signup, role: "admin" }, {}, 400);
    await call("POST", "/auth/signup", signup, {}, 202);
    await call("POST", "/auth/signup", signup, {}, 409);
    await call(
      "POST",
      "/auth/login",
      { email: signup.email, password },
      {},
      401,
    );
    const first = otp(signup.email);
    assert.match(first, /^\d{6}$/);
    const stored = (
      await query("SELECT * FROM email_otp_challenges WHERE email=?", [
        signup.email,
      ])
    )[0];
    assert.notEqual(stored.code_hash, first);
    assert.equal(stored.code_hash.length, 64);
    await call(
      "POST",
      "/auth/resend-verification",
      { email: signup.email },
      {},
      429,
    );
    const wrong = String((Number(first) + 1) % 1000000).padStart(6, "0");
    for (let i = 0; i < 5; i++)
      await call(
        "POST",
        "/auth/verify-email",
        { email: signup.email, code: wrong },
        {},
        400,
      );
    await call(
      "POST",
      "/auth/verify-email",
      { email: signup.email, code: first },
      {},
      429,
    );
    await cooldown(signup.email);
    await call("POST", "/auth/resend-verification", { email: signup.email });
    let next = otp(signup.email);
    assert.notEqual(
      next,
      first,
      "Resending must not reissue the previous code.",
    );
    await call(
      "POST",
      "/auth/verify-email",
      { email: signup.email, code: first },
      {},
      400,
    );
    assert.notEqual(
      (
        await query("SELECT id FROM email_otp_challenges WHERE email=?", [
          signup.email,
        ])
      )[0].id,
      stored.id,
    );
    await query(
      "UPDATE email_otp_challenges SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE email=?",
      [signup.email],
    );
    await call(
      "POST",
      "/auth/verify-email",
      { email: signup.email, code: next },
      {},
      400,
    );
    await cooldown(signup.email);
    await call("POST", "/auth/resend-verification", { email: signup.email });
    next = otp(signup.email);
    const verified = await call("POST", "/auth/verify-email", {
      email: signup.email,
      code: next,
    });
    assert.equal(verified.status, "APPROVED");
    await call(
      "POST",
      "/auth/verify-email",
      { email: signup.email, code: next },
      {},
      409,
    );
    const student = {};
    const logged = await call(
      "POST",
      "/auth/login",
      { email: signup.email, password, role: "admin" },
      student,
    );
    assert.equal(logged.user.role, "student");
    assert.equal(
      (await call("GET", "/auth/me", undefined, student)).user
        .academicGroupCode,
      "QA319",
    );
    await call(
      "POST",
      "/auth/login",
      { email: signup.email, password: "wrong-password" },
      {},
      401,
    );
    const enrollments = await call(
      "GET",
      "/students/me/enrollments",
      undefined,
      student,
    );
    assert.equal(enrollments.length, 1);
    await Promise.all([
      transaction((c) => reconcilePlacement(c, group.id)),
      transaction((c) => reconcilePlacement(c, group.id)),
    ]);
    assert.equal(
      (await call("GET", "/students/me/enrollments", undefined, student))
        .length,
      1,
    );
    const before = await query(
      "SELECT id,lab_group_id,default_lab_group_id FROM student_subject_enrollments WHERE student_id=?",
      [studentIdentity.profileId],
    );
    await call(
      "POST",
      "/auth/login",
      { email: signup.email, password },
      student,
    );
    assert.deepEqual(
      await query(
        "SELECT id,lab_group_id,default_lab_group_id FROM student_subject_enrollments WHERE student_id=?",
        [studentIdentity.profileId],
      ),
      before,
    );
    await call("GET", "/admin/accounts", undefined, student, 403);
    await call(
      "DELETE",
      `/admin/accounts/${teacherIdentity.id}`,
      { confirmEmail: teacherIdentity.email },
      student,
      403,
    );
    const stolen = student.cookie;
    await call("POST", "/auth/logout", undefined, student, 204);
    await call("GET", "/auth/me", undefined, { cookie: stolen }, 401);
    await call(
      "POST",
      "/auth/login",
      { email: signup.email, password },
      student,
    );
    await query(
      "UPDATE auth_sessions SET expires_at=UTC_TIMESTAMP() WHERE user_account_id=?",
      [studentIdentity.id],
    );
    await call("GET", "/auth/me", undefined, student, 401);
    const teacherSignup = {
      ...signup,
      email: teacherIdentity.email,
      role: "teacher",
    };
    await call("POST", "/auth/signup", teacherSignup, {}, 202);
    await call("POST", "/auth/verify-email", {
      email: teacherIdentity.email,
      code: otp(teacherIdentity.email),
    });
    const teacher = {};
    await call(
      "POST",
      "/auth/login",
      { email: teacherIdentity.email, password },
      teacher,
    );
    assert.equal(
      (await call("GET", "/teachers/me/assignments", undefined, teacher))
        .length,
      1,
    );
    const resetCookie = teacher.cookie;
    await call("POST", "/auth/password-reset/request", {
      email: teacherIdentity.email,
    });
    await call(
      "POST",
      "/auth/password-reset/request",
      { email: teacherIdentity.email },
      {},
      429,
    );
    let resetCode = otp(teacherIdentity.email);
    await query(
      "UPDATE email_otp_challenges SET expires_at=UTC_TIMESTAMP() WHERE email=? AND purpose='RESET'",
      [teacherIdentity.email],
    );
    await call(
      "POST",
      "/auth/password-reset/confirm",
      { email: teacherIdentity.email, code: resetCode, newPassword: password },
      {},
      400,
    );
    await cooldown(teacherIdentity.email);
    await call("POST", "/auth/password-reset/request", {
      email: teacherIdentity.email,
    });
    resetCode = otp(teacherIdentity.email);
    await call("POST", "/auth/password-reset/confirm", {
      email: teacherIdentity.email,
      code: resetCode,
      newPassword: password + "x",
    });
    await call(
      "POST",
      "/auth/password-reset/confirm",
      { email: teacherIdentity.email, code: resetCode, newPassword: password },
      {},
      409,
    );
    await call("GET", "/auth/me", undefined, { cookie: resetCookie }, 401);
    await call(
      "POST",
      "/auth/login",
      { email: teacherIdentity.email, password: password + "x" },
      teacher,
    );
    await call("POST", "/auth/password-reset/request", {
      email: "unknown.reset@polytechnic.am",
    });
    const pendingEmail = "unlisted.qa319@polytechnic.am";
    await call(
      "POST",
      "/auth/signup",
      { ...signup, email: pendingEmail },
      {},
      202,
    );
    assert.equal(
      (
        await call("POST", "/auth/verify-email", {
          email: pendingEmail,
          code: otp(pendingEmail),
        })
      ).status,
      "APPROVED",
    );
    const provisioned = (
      await query("SELECT id FROM user_accounts WHERE email=?", [pendingEmail])
    )[0];
    let pending;
    const pendingClient = {};
    assert.equal(
      (
        await call(
          "POST",
          "/auth/login",
          { email: pendingEmail, password },
          pendingClient,
        )
      ).user.firstName,
      signup.firstName,
    );
    const newTeacher = "new.teacher@polytechnic.am";
    await call(
      "POST",
      "/auth/signup",
      { ...signup, email: newTeacher, role: "teacher" },
      {},
      202,
    );
    await call("POST", "/auth/login", { email: newTeacher, password }, {}, 401);
    assert.equal(
      (
        await call("POST", "/auth/verify-email", {
          email: newTeacher,
          code: otp(newTeacher),
        })
      ).status,
      "APPROVED",
    );
    const teacherLogin = await call("POST", "/auth/login", {
      email: newTeacher,
      password,
      role: "teacher",
    });
    assert.equal(teacherLogin.user.role, "teacher");
    const unknown = "unknown.zz999@polytechnic.am";
    await call("POST", "/auth/signup", { ...signup, email: unknown }, {}, 202);
    assert.equal(
      (
        await call("POST", "/auth/verify-email", {
          email: unknown,
          code: otp(unknown),
        })
      ).status,
      "PENDING",
    );
    pending = (
      await call("GET", "/admin/registrations", undefined, admin)
    ).find((r) => r.email === unknown);
    await call(
      "PATCH",
      `/admin/registrations/${pending.id}`,
      { decision: "REJECTED" },
      admin,
    );
    await call(
      "PATCH",
      `/admin/registrations/${pending.id}`,
      { decision: "APPROVED" },
      admin,
      409,
    );
    assert.equal(
      (
        await call(
          "GET",
          "/admin/accounts?role=STUDENT&search=unlisted",
          undefined,
          admin,
        )
      )[0].id,
      provisioned.id,
    );
    await call(
      "PATCH",
      `/admin/accounts/${provisioned.id}`,
      { isActive: false },
      admin,
    );
    await call("GET", "/auth/me", undefined, pendingClient, 401);
    await call(
      "POST",
      "/auth/login",
      { email: pendingEmail, password },
      {},
      401,
    );
    await call(
      "PATCH",
      `/admin/accounts/${provisioned.id}`,
      { isActive: true },
      admin,
    );
    await call(
      "POST",
      "/auth/login",
      { email: pendingEmail, password },
      pendingClient,
    );
    const protectedCount = (
      await query(
        "SELECT COUNT(*) AS n FROM student_subject_enrollments WHERE student_id=?",
        [studentIdentity.profileId],
      )
    )[0].n;
    await call(
      "DELETE",
      `/admin/accounts/${studentIdentity.id}`,
      { confirmEmail: studentIdentity.email },
      admin,
      409,
    );
    assert.equal(
      (
        await query(
          "SELECT COUNT(*) AS n FROM student_subject_enrollments WHERE student_id=?",
          [studentIdentity.profileId],
        )
      )[0].n,
      protectedCount,
    );
    const empty = await roster("delete.teacher@polytechnic.am", "TEACHER");
    await query(
      "UPDATE user_accounts SET password_hash=?,email_verified_at=UTC_TIMESTAMP() WHERE id=?",
      [hash, empty.id],
    );
    const emptyClient = {};
    await call(
      "POST",
      "/auth/login",
      { email: empty.email, password },
      emptyClient,
    );
    await call(
      "DELETE",
      `/admin/accounts/${empty.id}`,
      { confirmEmail: "wrong@polytechnic.am" },
      admin,
      400,
    );
    await call(
      "DELETE",
      `/admin/accounts/${empty.id}`,
      { confirmEmail: empty.email },
      admin,
    );
    await call("GET", "/auth/me", undefined, emptyClient, 401);
    await call(
      "POST",
      "/auth/login",
      { email: empty.email, password },
      {},
      401,
    );
    await call(
      "DELETE",
      `/admin/accounts/${empty.id}`,
      { confirmEmail: empty.email },
      admin,
      404,
    );
    await call(
      "DELETE",
      "/admin/accounts/1",
      { confirmEmail: "root.admin@polytechnic.am" },
      admin,
      409,
    );
    await call("PATCH", "/admin/accounts/1", { isActive: false }, admin, 409);
    // Historic administrator deletion remains blocked by protected audit dependencies.
    const second = await query(
      "INSERT INTO user_accounts(email,password_hash,account_type,approval_status,email_verified_at) VALUES ('second.admin@polytechnic.am',?,'ADMIN','APPROVED',UTC_TIMESTAMP())",
      [hash],
    );
    await query(
      "INSERT INTO admins(user_account_id,first_name,last_name,admin_level) VALUES (?,'Second','Admin','SUPER_ADMIN')",
      [second.insertId],
    );
    const secondAdmin = {};
    await call(
      "POST",
      "/auth/login",
      { email: "second.admin@polytechnic.am", password },
      secondAdmin,
    );
    await query("UPDATE user_accounts SET is_active=FALSE WHERE id=1");
    await call(
      "DELETE",
      "/admin/accounts/1",
      { confirmEmail: "root.admin@polytechnic.am" },
      secondAdmin,
      409,
    );
    await query("UPDATE user_accounts SET is_active=TRUE WHERE id=1");
    const lab = await call(
      "POST",
      `/offerings/${offering.id}/midterms/1/labs`,
      { title: "Attachment lab", difficulty: 5 },
      teacher,
      201,
    );
    async function upload(client, name, bytes, expected = 201) {
      const response = await fetch(`${base}/labs/${lab.id}/attachments`, {
        method: "POST",
        headers: {
          Cookie: client.cookie,
          "Content-Type": "application/octet-stream",
          "X-Filename": encodeURIComponent(name),
          "X-LabCheck-Request": "1",
        },
        body: bytes,
      });
      const value = await response.json();
      assert.equal(response.status, expected, JSON.stringify(value));
      checks++;
      return value;
    }
    await call(
      "POST",
      "/auth/login",
      { email: signup.email, password },
      student,
    );
    await upload(student, "notes.txt", "content", 403);
    await upload(teacher, "../notes.txt", "content", 400);
    await upload(teacher, "execute.html", "<script/>", 400);
    await upload(teacher, "fake.pdf", "not a pdf", 400);
    await upload(
      teacher,
      "large.txt",
      Buffer.alloc(config.uploadMaxBytes + 1, 65),
      413,
    );
    const file = await upload(teacher, "notes.txt", "Private lab notes");
    for (const role of ["STUDENT", "TEACHER"]) {
      const [outsiderIdentity] = await query(
        "SELECT id,email FROM user_accounts WHERE account_type=? ORDER BY id LIMIT 1",
        [role],
      );
      await query("UPDATE user_accounts SET password_hash=? WHERE id=?", [
        hash,
        outsiderIdentity.id,
      ]);
      const outsider = {};
      await call(
        "POST",
        "/auth/login",
        { email: outsiderIdentity.email, password },
        outsider,
      );
      await call(
        "GET",
        `/attachments/${file.id}/download`,
        undefined,
        outsider,
        403,
      );
      await call(
        "GET",
        `/labs/${lab.id}/attachments`,
        undefined,
        outsider,
        403,
      );
      if (role === "TEACHER")
        await upload(outsider, "unauthorized.txt", "Cannot upload here", 403);
    }
    assert.equal(
      (await call("GET", `/labs/${lab.id}/attachments`, undefined, student))
        .length,
      1,
    );
    const download = await fetch(`${base}/attachments/${file.id}/download`, {
      headers: { Cookie: student.cookie },
    });
    assert.equal(download.status, 200);
    assert.equal(await download.text(), "Private lab notes");
    assert.match(download.headers.get("content-disposition"), /attachment/);
    const [{ storage_key: storageKey }] = await query(
      "SELECT storage_key FROM lab_attachments WHERE id=?",
      [file.id],
    );
    await fs.unlink(`${config.uploadDir}/${storageKey}`);
    const missingFile = await call(
      "GET",
      `/attachments/${file.id}/download`,
      undefined,
      student,
      404,
    );
    assert.equal(missingFile.error.code, "FILE_UNAVAILABLE");
    await fs.writeFile(
      `${config.uploadDir}/${storageKey}`,
      "Private lab notes",
      { mode: 0o600 },
    );
    await call("GET", `/attachments/${file.id}/download`, undefined, {}, 401);
    await call("DELETE", `/attachments/${file.id}`, undefined, student, 403);
    await call("DELETE", `/labs/${lab.id}`, undefined, teacher, 409);
    await call("DELETE", `/attachments/${file.id}`, undefined, teacher, 204);
    assert.deepEqual(await fs.readdir(config.uploadDir), []);
    await call(
      "GET",
      `/attachments/${file.id}/download`,
      undefined,
      student,
      404,
    );
    await call(
      "DELETE",
      `/admin/catalog/groups/${group.id}`,
      undefined,
      admin,
      409,
    );
    const unconfigured = await call(
      "POST",
      "/admin/catalog/groups",
      { code: "QA999", name: "Missing config", specializationId: 1 },
      admin,
      201,
    );
    await roster(
      "missing.qa999@polytechnic.am",
      "STUDENT",
      "Zeta",
      unconfigured.id,
    );
    await call(
      "POST",
      "/auth/signup",
      { ...signup, email: "missing.qa999@polytechnic.am" },
      {},
      202,
    );
    const missing = await call("POST", "/auth/verify-email", {
      email: "missing.qa999@polytechnic.am",
      code: otp("missing.qa999@polytechnic.am"),
    });
    assert.equal(missing.status, "APPROVED");
    await call("POST", "/auth/login", {
      email: "missing.qa999@polytechnic.am",
      password,
    });
    // Additional negative identity, recovery, scope and configuration checks.
    const mismatch = "other.qa319@polytechnic.am";
    await call(
      "POST",
      "/auth/signup",
      { ...signup, email: mismatch, role: "teacher" },
      {},
      202,
    );
    assert.equal(
      (
        await call("POST", "/auth/verify-email", {
          email: mismatch,
          code: otp(mismatch),
        })
      ).status,
      "PENDING",
    );
    assert.equal(
      (
        await query("SELECT account_type FROM user_accounts WHERE email=?", [
          mismatch,
        ])
      )[0].account_type,
      "STUDENT",
    );
    await call("POST", "/auth/login", { email: mismatch, password }, {}, 401);
    const named = await roster(
      "names.qa319@polytechnic.am",
      "STUDENT",
      "RosterSurname",
      group.id,
    );
    await call(
      "POST",
      "/auth/signup",
      { ...signup, email: named.email, lastName: "Untrusted Name" },
      {},
      202,
    );
    assert.equal(
      (
        await call("POST", "/auth/verify-email", {
          email: named.email,
          code: otp(named.email),
        })
      ).status,
      "APPROVED",
    );
    assert.equal(
      (
        await query("SELECT last_name FROM students WHERE id=?", [
          named.profileId,
        ])
      )[0].last_name,
      "RosterSurname",
    );
    const unverified = "reject.qa319@polytechnic.am";
    await call(
      "POST",
      "/auth/signup",
      { ...signup, email: unverified },
      {},
      202,
    );
    const rejected = (
      await call("GET", "/admin/registrations", undefined, admin)
    ).find((r) => r.email === unverified);
    await call(
      "PATCH",
      `/admin/registrations/${rejected.id}`,
      { decision: "APPROVED" },
      admin,
      409,
    );
    const rejectedCode = otp(unverified);
    await call(
      "PATCH",
      `/admin/registrations/${rejected.id}`,
      { decision: "REJECTED" },
      admin,
    );
    await call(
      "POST",
      "/auth/verify-email",
      { email: unverified, code: rejectedCode },
      {},
      403,
    );
    await cooldown(teacherIdentity.email);
    await call("POST", "/auth/password-reset/request", {
      email: teacherIdentity.email,
    });
    const correctReset = otp(teacherIdentity.email),
      badReset = String((Number(correctReset) + 1) % 1000000).padStart(6, "0");
    await cooldown(teacherIdentity.email);
    const oldChallenge = await query(
      "SELECT * FROM email_otp_challenges WHERE email=? AND purpose='RESET'",
      [teacherIdentity.email],
    );
    const deliveredBeforeFailure = messages.length;
    rejectMail = true;
    await call(
      "POST",
      "/auth/password-reset/request",
      { email: teacherIdentity.email },
      {},
      503,
    );
    rejectMail = false;
    assert.deepEqual(
      await query(
        "SELECT * FROM email_otp_challenges WHERE email=? AND purpose='RESET'",
        [teacherIdentity.email],
      ),
      oldChallenge,
    );
    assert.equal(messages.length, deliveredBeforeFailure);
    for (let i = 0; i < 5; i++)
      await call(
        "POST",
        "/auth/password-reset/confirm",
        { email: teacherIdentity.email, code: badReset, newPassword: password },
        {},
        400,
      );
    await call(
      "POST",
      "/auth/password-reset/confirm",
      {
        email: teacherIdentity.email,
        code: correctReset,
        newPassword: password,
      },
      {},
      429,
    );
    await query("UPDATE user_accounts SET password_hash=? WHERE id=2", [hash]);
    const scopedAdmin = {};
    await call(
      "POST",
      "/auth/login",
      { email: "se.admin@polytechnic.am", password },
      scopedAdmin,
    );
    await call("GET", "/admin/registrations", undefined, scopedAdmin, 403);
    await call(
      "PATCH",
      `/admin/accounts/${teacherIdentity.id}`,
      { isActive: false },
      scopedAdmin,
      403,
    );
    assert.ok(
      (await call("GET", "/admin/accounts", undefined, scopedAdmin)).every(
        (a) => a.role === "STUDENT" && a.academicUnitId === 1,
      ),
    );
    for (const unknownType of ["constructor", "toString", "unknown"])
      await call("GET", `/admin/catalog/${unknownType}`, undefined, admin, 404);
    const unit = await call(
      "POST",
      "/admin/catalog/units",
      { code: "TESTUNIT", name: "Disposable unit", unitType: "FACULTY" },
      admin,
      201,
    );
    const specialization = await call(
      "POST",
      "/admin/catalog/specializations",
      {
        code: "TESTSPEC",
        name: "Disposable specialization",
        academicUnitId: unit.id,
      },
      admin,
      201,
    );
    await call(
      "DELETE",
      `/admin/catalog/units/${unit.id}`,
      undefined,
      admin,
      409,
    );
    await call(
      "PATCH",
      `/admin/catalog/specializations/${specialization.id}`,
      {
        code: "TESTSPEC",
        name: "Updated specialization",
        academicUnitId: unit.id,
      },
      admin,
    );
    await call(
      "DELETE",
      `/admin/catalog/specializations/${specialization.id}`,
      undefined,
      admin,
      204,
    );
    await call(
      "DELETE",
      `/admin/catalog/units/${unit.id}`,
      undefined,
      admin,
      204,
    );
    const subject = await call(
      "POST",
      "/admin/catalog/subjects",
      { code: "QASUB", name: "Disposable subject" },
      admin,
      201,
    );
    await call(
      "PATCH",
      `/admin/catalog/subjects/${subject.id}`,
      { code: "QASUB", name: "Updated subject" },
      admin,
    );
    await call(
      "DELETE",
      `/admin/catalog/subjects/${subject.id}`,
      undefined,
      admin,
      204,
    );
    const large = await call(
      "POST",
      "/admin/catalog/groups",
      { code: "LARGE333", name: "Capacity cohort", specializationId: 1 },
      admin,
      201,
    );
    for (let i = 32; i >= 0; i--)
      await roster(
        `student${i}.large333@polytechnic.am`,
        "STUDENT",
        String(i).padStart(3, "0"),
        large.id,
      );
    const largeOfferings = [];
    for (const subjectId of [1, 2])
      largeOfferings.push(
        await call(
          "POST",
          "/offerings",
          {
            subjectId,
            academicGroupId: large.id,
            academicYear: "2090-2091",
            semester: "Fall",
          },
          admin,
          201,
        ),
      );
    const largeGroups = await call(
      "GET",
      `/academic-groups/${large.id}/lab-groups`,
      undefined,
      admin,
    );
    assert.equal(largeGroups.length, 2);
    for (const o of largeOfferings) {
      const placed = await call(
        "GET",
        `/offerings/${o.id}/enrollments`,
        undefined,
        admin,
      );
      assert.equal(placed.length, 33);
      for (let i = 0; i < placed.length; i++)
        assert.equal(placed[i].labGroupId, largeGroups[i % 2].id);
      assert.deepEqual(
        largeGroups.map(
          (g) => placed.filter((p) => p.labGroupId === g.id).length,
        ),
        [17, 16],
      );
    }
    await Promise.all([
      transaction((c) => reconcilePlacement(c, large.id)),
      transaction((c) => reconcilePlacement(c, large.id)),
    ]);
    for (const o of largeOfferings)
      assert.equal(
        (
          await query(
            "SELECT COUNT(*) AS n FROM student_subject_enrollments WHERE subject_group_offering_id=?",
            [o.id],
          )
        )[0].n,
        33,
      );
    const historyBefore = await query(
      "SELECT * FROM student_subject_enrollments WHERE student_id=?",
      [studentIdentity.profileId],
    );
    await call(
      "POST",
      `/admin/accounts/${studentIdentity.id}/archive`,
      { confirmEmail: studentIdentity.email },
      student,
      403,
    );
    await call(
      "POST",
      `/admin/accounts/${studentIdentity.id}/archive`,
      { confirmEmail: "wrong@polytechnic.am" },
      admin,
      400,
    );
    await call(
      "POST",
      `/admin/accounts/${studentIdentity.id}/archive`,
      { confirmEmail: studentIdentity.email },
      admin,
    );
    assert.deepEqual(
      await query(
        "SELECT * FROM student_subject_enrollments WHERE student_id=?",
        [studentIdentity.profileId],
      ),
      historyBefore,
    );
    const archived = (
      await query(
        "SELECT email,is_active,password_hash,archived_at FROM user_accounts WHERE id=?",
        [studentIdentity.id],
      )
    )[0];
    assert.equal(archived.email, null);
    assert.equal(archived.is_active, 0);
    assert.equal(archived.password_hash, "");
    assert.ok(archived.archived_at);
    await call(
      "PATCH",
      `/admin/accounts/${studentIdentity.id}`,
      { isActive: true },
      admin,
      409,
    );
    await call("POST", "/auth/signup", signup, {}, 202);
    assert.equal(
      (
        await call("POST", "/auth/verify-email", {
          email: signup.email,
          code: otp(signup.email),
        })
      ).status,
      "APPROVED",
    );
    const fresh = await call("POST", "/auth/login", {
      email: signup.email,
      password,
    });
    assert.notEqual(fresh.user.id, studentIdentity.id);
    const csrf = await fetch(`${base}/auth/logout`, {
      method: "POST",
      headers: { Cookie: student.cookie, Origin: "https://evil.example" },
    });
    assert.equal(csrf.status, 403);
    for (let i = 0; i < 31; i++) {
      const response = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: {
          "X-LabCheck-Request": "1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "unknown@polytechnic.am",
          password: "wrong",
        }),
      });
      if (response.status === 429) {
        checks++;
        break;
      }
      if (i === 30) assert.fail("Login rate limit missing.");
    }
    t.diagnostic(
      `${checks} new API assertions; ${messages.length} messages delivered over real local SMTP. OTP secrets are absent from API responses.`,
    );
  },
);
