import { archiveAccount } from "../services/archive-account.js";
import { Router } from "express";
import { assertRemovalAllowed } from "../services/account-policy.js";
import { z } from "zod";
import { query, transaction } from "../db.js";
import { requireRole, adminScope } from "../access.js";
import {
  ApiError,
  asyncRoute,
  idParam,
  requireRecord,
  validate,
} from "../http.js";
import {
  activateRegistration,
  universityEmail,
  detectedGroup,
} from "../services/identity.js";
export const accountRouter = Router();
accountRouter.use("/admin/accounts", requireRole("admin"));
accountRouter.use("/admin/registrations", requireRole("admin"));
const accountSelect = `SELECT ua.id,ua.email,ua.archived_at AS archivedAt,ua.account_type AS role,ua.approval_status AS status,ua.is_active AS isActive,
  ua.email_verified_at AS emailVerifiedAt,ua.last_login_at AS lastLoginAt,
  COALESCE(s.first_name,t.first_name,a.first_name) AS firstName,COALESCE(s.last_name,t.last_name,a.last_name) AS lastName,
  s.id AS studentId,t.id AS teacherId,s.academic_group_id AS academicGroupId,ag.code AS academicGroupCode,
  COALESCE(sp.academic_unit_id,a.academic_unit_id) AS academicUnitId,a.admin_level AS adminLevel
  FROM user_accounts ua LEFT JOIN students s ON s.user_account_id=ua.id LEFT JOIN teachers t ON t.user_account_id=ua.id
  LEFT JOIN admins a ON a.user_account_id=ua.id LEFT JOIN academic_groups ag ON ag.id=s.academic_group_id
  LEFT JOIN specializations sp ON sp.id=ag.specialization_id`;
function scope(user, account) {
  if (user.adminLevel === "SUPER_ADMIN") return;
  if (account.role !== "STUDENT")
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Only a super administrator can manage teacher and administrator accounts.",
    );
  adminScope(user, account.academicUnitId);
}
function superAdmin(user) {
  if (user.adminLevel !== "SUPER_ADMIN")
    throw new ApiError(
      403,
      "FORBIDDEN",
      "A super administrator is required for identity review and provisioning.",
    );
}
async function audit(c, user, target, action, details) {
  await c.execute(
    "INSERT INTO account_audit(actor_id,target_id,action,details) VALUES (?,?,?,?)",
    [user.id, target, action, details],
  );
}
async function dependencies(c, account) {
  const checks = [
    [
      "enrollments",
      "SELECT COUNT(*) AS n FROM student_subject_enrollments WHERE student_id=?",
      account.studentId,
    ],
    [
      "lab grades / attendance",
      "SELECT COUNT(*) AS n FROM student_lab_results r JOIN student_subject_enrollments e ON e.id=r.student_subject_enrollment_id WHERE e.student_id=?",
      account.studentId,
    ],
    [
      "exam results",
      "SELECT COUNT(*) AS n FROM student_midterm_results r JOIN student_subject_enrollments e ON e.id=r.student_subject_enrollment_id WHERE e.student_id=?",
      account.studentId,
    ],
    [
      "lab change requests",
      "SELECT COUNT(*) AS n FROM lab_change_requests r JOIN student_subject_enrollments e ON e.id=r.student_subject_enrollment_id WHERE e.student_id=?",
      account.studentId,
    ],
    [
      "teaching coverage",
      "SELECT COUNT(*) AS n FROM teacher_subject_assignments WHERE teacher_id=?",
      account.teacherId,
    ],
    [
      "locked midterms",
      "SELECT COUNT(*) AS n FROM offering_midterms WHERE locked_by_teacher_id=?",
      account.teacherId,
    ],
    [
      "request decisions",
      "SELECT COUNT(*) AS n FROM lab_change_requests WHERE decided_by_teacher_id=?",
      account.teacherId,
    ],
    [
      "account audit history",
      "SELECT COUNT(*) AS n FROM account_audit WHERE actor_id=? OR target_id=?",
      account.id,
    ],
    [
      "identity reviews",
      "SELECT COUNT(*) AS n FROM registrations WHERE reviewed_by=?",
      account.id,
    ],
    [
      "account reviews",
      "SELECT COUNT(*) AS n FROM user_accounts WHERE reviewed_by_user_account_id=?",
      account.id,
    ],
  ];
  const result = [];
  for (const [label, sql, id] of checks) {
    if (!id) continue;
    const [rows] = await c.execute(
      sql,
      label === "account audit history" ? [id, id] : [id],
    );
    if (rows[0].n) result.push({ type: label, count: rows[0].n });
  }
  return result;
}
async function lockAccount(c, user, id, destructive = false) {
  // Stable lock order serializes admin deactivation/deletion and protects the last admin.
  const [admins] = await c.execute(
    "SELECT ua.id,a.admin_level FROM user_accounts ua JOIN admins a ON a.user_account_id=ua.id WHERE ua.is_active=TRUE AND ua.approval_status='APPROVED' ORDER BY ua.id FOR UPDATE",
  );
  const [rows] = await c.execute(`${accountSelect} WHERE ua.id=? FOR UPDATE`, [
    id,
  ]);
  const account = requireRecord(rows[0], "Account not found.");
  scope(user, account);
  if (destructive) assertRemovalAllowed(user.id, account, admins);
  return account;
}
accountRouter.get(
  "/admin/accounts",
  asyncRoute(async (req, res) => {
    const data = validate(
      z.strictObject({
        search: z.string().max(255).optional(),
        role: z.enum(["STUDENT", "TEACHER", "ADMIN"]).optional(),
        status: z
          .enum(["PENDING", "APPROVED", "REJECTED", "INACTIVE"])
          .optional(),
      }),
      req.query,
    );
    const clauses = [],
      params = [];
    if (req.user.adminLevel !== "SUPER_ADMIN") {
      clauses.push("ua.account_type='STUDENT' AND sp.academic_unit_id=?");
      params.push(req.user.academicUnitId);
    }
    if (data.search) {
      clauses.push(
        "(ua.email LIKE ? OR CONCAT_WS(' ',s.first_name,s.last_name,t.first_name,t.last_name,a.first_name,a.last_name) LIKE ?)",
      );
      params.push(`%${data.search}%`, `%${data.search}%`);
    }
    if (data.role) {
      clauses.push("ua.account_type=?");
      params.push(data.role);
    }
    if (data.status === "INACTIVE") clauses.push("ua.is_active=FALSE");
    else if (data.status) {
      clauses.push("ua.approval_status=?");
      params.push(data.status);
    }
    res.json(
      await query(
        `${accountSelect}${clauses.length ? " WHERE " + clauses.join(" AND ") : ""} ORDER BY ua.id DESC`,
        params,
      ),
    );
  }),
);
accountRouter.get(
  "/admin/accounts/:id",
  asyncRoute(async (req, res) => {
    const result = await transaction(async (c) => {
      const [rows] = await c.execute(`${accountSelect} WHERE ua.id=?`, [
        idParam(req.params.id),
      ]);
      const account = requireRecord(rows[0]);
      scope(req.user, account);
      return { ...account, dependencies: await dependencies(c, account) };
    });
    res.json(result);
  }),
);
const profileInput = {
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
};
accountRouter.post(
  "/admin/accounts",
  asyncRoute(async (req, res) => {
    superAdmin(req.user);
    const data = validate(
      z.strictObject({
        ...profileInput,
        email: universityEmail,
        role: z.enum(["STUDENT", "TEACHER", "ADMIN"]),
        academicGroupId: z.number().int().positive().optional(),
        adminLevel: z.enum(["SUPER_ADMIN", "ACADEMIC_UNIT_ADMIN"]).optional(),
        academicUnitId: z.number().int().positive().optional(),
      }),
      req.body,
    );
    const id = await transaction(async (c) => {
      if (data.role === "STUDENT") {
        const detection = await detectedGroup(c, data.email);
        if (!detection.group || detection.group.id !== data.academicGroupId)
          throw new ApiError(
            400,
            "GROUP_MISMATCH",
            "Student email must identify the selected existing academic group.",
          );
      } else if (data.academicGroupId)
        throw new ApiError(
          400,
          "INVALID_GROUP",
          "Only students have an academic group.",
        );
      if (
        data.role === "ADMIN" &&
        (!data.adminLevel ||
          (data.adminLevel === "ACADEMIC_UNIT_ADMIN" && !data.academicUnitId))
      )
        throw new ApiError(
          400,
          "ADMIN_SCOPE",
          "Choose an administrator level and its academic unit.",
        );
      const [insert] = await c.execute(
        "INSERT INTO user_accounts(email,password_hash,account_type,approval_status) VALUES (?,'demo-hash',?,?)",
        [data.email, data.role, data.role === "ADMIN" ? "APPROVED" : "PENDING"],
      );
      if (data.role === "STUDENT")
        await c.execute(
          "INSERT INTO students(user_account_id,academic_group_id,first_name,last_name) VALUES (?,?,?,?)",
          [
            insert.insertId,
            data.academicGroupId,
            data.firstName,
            data.lastName,
          ],
        );
      if (data.role === "TEACHER")
        await c.execute(
          "INSERT INTO teachers(user_account_id,first_name,last_name) VALUES (?,?,?)",
          [insert.insertId, data.firstName, data.lastName],
        );
      if (data.role === "ADMIN")
        await c.execute(
          "INSERT INTO admins(user_account_id,academic_unit_id,first_name,last_name,admin_level) VALUES (?,?,?,?,?)",
          [
            insert.insertId,
            data.adminLevel === "SUPER_ADMIN" ? null : data.academicUnitId,
            data.firstName,
            data.lastName,
            data.adminLevel,
          ],
        );
      await audit(
        c,
        req.user,
        null,
        "PROVISION",
        `Provisioned trusted ${data.role} account ${insert.insertId}; email verification and password setup required.`,
      );
      return insert.insertId;
    });
    res.status(201).json({
      id,
      message:
        "Trusted identity provisioned. Student/teacher uses signup; administrator uses email OTP password setup.",
    });
  }),
);
accountRouter.patch(
  "/admin/accounts/:id",
  asyncRoute(async (req, res) => {
    const id = idParam(req.params.id);
    const data = validate(
      z
        .strictObject({
          isActive: z.boolean().optional(),
          ...Object.fromEntries(
            Object.entries(profileInput).map(([key, value]) => [
              key,
              value.optional(),
            ]),
          ),
          academicGroupId: z.number().int().positive().optional(),
        })
        .refine((v) => Object.keys(v).length > 0, "Supply a change."),
      req.body,
    );
    await transaction(async (c) => {
      const account = await lockAccount(
        c,
        req.user,
        id,
        data.isActive === false,
      );
      if (account.archivedAt)
        throw new ApiError(
          409,
          "ARCHIVED_ACCOUNT",
          "This login has been deleted; its history is read-only.",
        );
      if (data.academicGroupId && account.role !== "STUDENT")
        throw new ApiError(
          400,
          "INVALID_GROUP",
          "Only students have academic groups.",
        );
      if (
        data.academicGroupId &&
        data.academicGroupId !== account.academicGroupId
      ) {
        const deps = await dependencies(c, account);
        if (deps.some((d) => d.type === "enrollments"))
          throw new ApiError(
            409,
            "ACADEMIC_HISTORY",
            "Group changes require a formal transfer of existing enrollments; history cannot be rewritten.",
          );
        const detection = await detectedGroup(c, account.email);
        if (detection.group?.id !== data.academicGroupId)
          throw new ApiError(
            409,
            "GROUP_MISMATCH",
            "Group must match the institutional email suffix.",
          );
        await c.execute(
          "UPDATE students SET academic_group_id=? WHERE user_account_id=?",
          [data.academicGroupId, id],
        );
      }
      const table = {
        STUDENT: "students",
        TEACHER: "teachers",
        ADMIN: "admins",
      }[account.role];
      if (data.firstName || data.lastName)
        await c.execute(
          `UPDATE ${table} SET first_name=?,last_name=? WHERE user_account_id=?`,
          [
            data.firstName || account.firstName,
            data.lastName || account.lastName,
            id,
          ],
        );
      if (data.isActive !== undefined)
        await c.execute("UPDATE user_accounts SET is_active=? WHERE id=?", [
          data.isActive,
          id,
        ]);
      if (data.isActive === false) {
        await c.execute("DELETE FROM auth_sessions WHERE user_account_id=?", [
          id,
        ]);
        await c.execute("DELETE FROM email_otp_challenges WHERE email=?", [
          account.email,
        ]);
      }
      await audit(c, req.user, id, "UPDATE", JSON.stringify(data));
    });
    res.json({
      updated: true,
      message:
        data.isActive === false
          ? "Account deactivated; sessions revoked. Academic history retained."
          : "Account updated. Email verification and approval are still required for login.",
    });
  }),
);
accountRouter.post(
  "/admin/accounts/:id/archive",
  asyncRoute(async (req, res) => {
    const id = idParam(req.params.id);
    const { confirmEmail } = validate(
      z.strictObject({ confirmEmail: universityEmail }),
      req.body,
    );
    await transaction(async (c) => {
      const account = await lockAccount(c, req.user, id, true);
      if (account.email !== confirmEmail)
        throw new ApiError(
          400,
          "CONFIRMATION_REQUIRED",
          "Confirmation email does not match this account.",
        );
      await archiveAccount(c, account, req.user.id);
    });
    res.json({
      archived: true,
      message:
        "Login deleted. History retained. The email can be used to sign up again.",
    });
  }),
);
accountRouter.delete(
  "/admin/accounts/:id",
  asyncRoute(async (req, res) => {
    const id = idParam(req.params.id);
    const { confirmEmail } = validate(
      z.strictObject({ confirmEmail: universityEmail }),
      req.body,
    );
    await transaction(async (c) => {
      const account = await lockAccount(c, req.user, id, true);
      if (account.email !== confirmEmail)
        throw new ApiError(
          400,
          "CONFIRMATION_REQUIRED",
          "Confirmation email does not match this account.",
        );
      const deps = await dependencies(c, account);
      if (deps.length)
        throw new ApiError(
          409,
          "PROTECTED_HISTORY",
          `Permanent deletion blocked: ${deps.map((d) => `${d.count} ${d.type}`).join(", ")}. Deactivate this account to revoke access and retain its history.`,
        );
      await c.execute("DELETE FROM auth_sessions WHERE user_account_id=?", [
        id,
      ]);
      await c.execute("DELETE FROM email_otp_challenges WHERE email=?", [
        account.email,
      ]);
      await c.execute("DELETE FROM registrations WHERE email=?", [
        account.email,
      ]);
      await c.execute("DELETE FROM user_accounts WHERE id=?", [id]);
      await audit(
        c,
        req.user,
        null,
        "DELETE",
        `Permanently deleted account ${id} with no protected dependencies.`,
      );
    });
    res.json({
      deleted: true,
      message:
        "Account permanently deleted. Sessions and pending credentials removed.",
    });
  }),
);
accountRouter.get(
  "/admin/registrations",
  asyncRoute(async (req, res) => {
    superAdmin(req.user);
    res.json(
      await query(
        `SELECT id,email,first_name AS firstName,last_name AS lastName,requested_role AS role,detected_group_code AS groupCode,email_verified_at AS emailVerifiedAt,status,review_reason AS reason,created_at AS createdAt,account_id AS accountId FROM registrations ORDER BY id DESC`,
      ),
    );
  }),
);
accountRouter.patch(
  "/admin/registrations/:id",
  asyncRoute(async (req, res) => {
    superAdmin(req.user);
    const { decision } = validate(
      z.strictObject({ decision: z.enum(["APPROVED", "REJECTED"]) }),
      req.body,
    );
    const result = await transaction(async (c) => {
      const [rows] = await c.execute(
        "SELECT * FROM registrations WHERE id=? FOR UPDATE",
        [idParam(req.params.id)],
      );
      const registration = requireRecord(rows[0]);
      if (registration.status !== "PENDING")
        throw new ApiError(
          409,
          "ALREADY_REVIEWED",
          "Registration already reviewed.",
        );
      if (decision === "APPROVED") {
        if (!registration.email_verified_at)
          throw new ApiError(
            409,
            "EMAIL_UNVERIFIED",
            "Email verification must complete before approval.",
          );
        const accountId = await activateRegistration(
          c,
          registration,
          req.user.id,
        );
        await audit(
          c,
          req.user,
          accountId,
          "APPROVE",
          `Approved verified registration ${registration.id}; trusted identity preserved.`,
        );
      } else {
        await c.execute(
          "UPDATE registrations SET status='REJECTED',password_hash='',reviewed_by=?,reviewed_at=UTC_TIMESTAMP(),review_reason='Registration rejected by administrator.' WHERE id=?",
          [req.user.id, registration.id],
        );
        await c.execute("DELETE FROM email_otp_challenges WHERE email=?", [
          registration.email,
        ]);
        await audit(
          c,
          req.user,
          null,
          "REJECT",
          `Rejected registration ${registration.id}.`,
        );
      }
      return { status: decision };
    });
    res.json(result);
  }),
);
