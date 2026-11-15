import express, { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "../config.js";
import { query, transaction } from "../db.js";
import {
  offeringAccess,
  requireRole,
  lockTeachingOffering,
} from "../access.js";
import { ApiError, asyncRoute, idParam, requireRecord } from "../http.js";
export const attachmentRouter = Router();
const types = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};
const select = `SELECT id,lab_assignment_id AS labId,original_filename AS filename,mime_type AS mimeType,file_size AS size,uploaded_at AS uploadedAt FROM lab_attachments`;
function storagePath(key) {
  if (!/^[a-f0-9]{64}$/.test(key))
    throw new ApiError(500, "STORAGE_ERROR", "Invalid storage reference.");
  return path.join(path.resolve(config.uploadDir), key);
}
async function labAccess(user, id) {
  const rows = await query(
    "SELECT subject_group_offering_id AS offeringId FROM lab_assignments WHERE id=?",
    [id],
  );
  await offeringAccess(
    user,
    requireRecord(rows[0], "Lab not found.").offeringId,
  );
  return rows[0].offeringId;
}
async function lockOpenLab(c, id) {
  const [rows] = await c.execute(
    `SELECT om.status FROM lab_assignments la JOIN offering_midterms om ON om.subject_group_offering_id=la.subject_group_offering_id AND om.midterm_no=la.midterm_no WHERE la.id=? FOR UPDATE`,
    [id],
  );
  if (requireRecord(rows[0], "Lab not found.").status !== "OPEN")
    throw new ApiError(
      409,
      "MIDTERM_LOCKED",
      "Attachments for a locked midterm are read-only.",
    );
}
function validateFile(name, bytes) {
  const type = types[path.extname(name).toLowerCase()];
  if (!type || !bytes?.length)
    throw new ApiError(
      400,
      "INVALID_FILE",
      "Upload a nonempty PDF, TXT, PNG, or JPEG file.",
    );
  const valid =
    type === "application/pdf"
      ? bytes.subarray(0, 5).toString() === "%PDF-"
      : type === "image/png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : type === "image/jpeg"
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : !bytes.includes(0);
  if (!valid)
    throw new ApiError(
      400,
      "INVALID_FILE",
      "File contents do not match the supported file type.",
    );
  return type;
}
export async function cleanupAttachmentFiles() {
  const rows = await query("SELECT storage_key FROM attachment_file_cleanup");
  for (const row of rows) {
    try {
      await fs.rm(storagePath(row.storage_key), { force: true });
      await query("DELETE FROM attachment_file_cleanup WHERE storage_key=?", [
        row.storage_key,
      ]);
    } catch {
      /* Durable queue is retried on subsequent operations/startup. */
    }
  }
}
attachmentRouter.get(
  "/labs/:id/attachments",
  asyncRoute(async (req, res) => {
    const id = idParam(req.params.id);
    await labAccess(req.user, id);
    res.json(
      await query(`${select} WHERE lab_assignment_id=? ORDER BY id`, [id]),
    );
  }),
);
attachmentRouter.post(
  "/labs/:id/attachments",
  requireRole("teacher"),
  express.raw({
    type: "application/octet-stream",
    limit: config.uploadMaxBytes,
  }),
  asyncRoute(async (req, res) => {
    const id = idParam(req.params.id);
    const offeringId = await labAccess(req.user, id);
    let name;
    try {
      name = decodeURIComponent(req.get("X-Filename") || "");
    } catch {
      throw new ApiError(400, "INVALID_FILE", "Filename encoding is invalid.");
    }
    if (
      !name ||
      name.length > 255 ||
      name.includes("/") ||
      name.includes("\\") ||
      [...name].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
      name === "." ||
      name === ".."
    )
      throw new ApiError(
        400,
        "INVALID_FILE",
        "Use a filename without path separators or control characters.",
      );
    if (!Buffer.isBuffer(req.body))
      throw new ApiError(
        400,
        "INVALID_FILE",
        "Send file bytes as application/octet-stream.",
      );
    const mime = validateFile(name, req.body),
      key = crypto.randomBytes(32).toString("hex");
    await fs.mkdir(path.resolve(config.uploadDir), {
      recursive: true,
      mode: 0o700,
    });
    let attachmentId;
    try {
      await fs.writeFile(storagePath(key), req.body, {
        flag: "wx",
        mode: 0o600,
      });
      attachmentId = await transaction(async (c) => {
        await lockTeachingOffering(c, req.user, offeringId);
        await lockOpenLab(c, id);
        const [insert] = await c.execute(
          "INSERT INTO lab_attachments(lab_assignment_id,original_filename,storage_key,mime_type,file_size) VALUES (?,?,?,?,?)",
          [id, name, key, mime, req.body.length],
        );
        return insert.insertId;
      });
    } catch (error) {
      await fs.rm(storagePath(key), { force: true });
      throw error;
    }
    res
      .status(201)
      .json((await query(`${select} WHERE id=?`, [attachmentId]))[0]);
  }),
);
attachmentRouter.get(
  ["/attachments/:id/download", "/attachments/:id/view"],
  asyncRoute(async (req, res, next) => {
    const rows = await query("SELECT * FROM lab_attachments WHERE id=?", [
      idParam(req.params.id),
    ]);
    const attachment = requireRecord(rows[0], "Attachment not found.");
    await labAccess(req.user, attachment.lab_assignment_id);
    res.setHeader(
      "Content-Security-Policy",
      "sandbox; default-src 'none'; img-src 'self' data: blob:",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.attachment(attachment.original_filename);
    if (req.path.endsWith("/view")) {
      res.setHeader(
        "Content-Disposition",
        res.getHeader("Content-Disposition").replace(/^attachment/, "inline"),
      );
    }
    res.sendFile(
      storagePath(attachment.storage_key),
      {
        // The authorized, database-selected file lives inside .private-uploads.
        dotfiles: "allow",
        headers: { "Content-Type": attachment.mime_type },
      },
      (error) => {
        if (error && !res.headersSent) {
          res.removeHeader("Content-Type");
          res.removeHeader("Content-Disposition");
          next(
            new ApiError(
              404,
              "FILE_UNAVAILABLE",
              "Attachment file is unavailable. Contact an administrator.",
            ),
          );
        }
      },
    );
  }),
);
attachmentRouter.delete(
  "/attachments/:id",
  requireRole("teacher"),
  asyncRoute(async (req, res) => {
    const id = idParam(req.params.id);
    const rows = await query("SELECT * FROM lab_attachments WHERE id=?", [id]);
    const attachment = requireRecord(rows[0], "Attachment not found.");
    const offeringId = await labAccess(req.user, attachment.lab_assignment_id);
    await transaction(async (c) => {
      await lockTeachingOffering(c, req.user, offeringId);
      await lockOpenLab(c, attachment.lab_assignment_id);
      await c.execute(
        "INSERT IGNORE INTO attachment_file_cleanup(storage_key) VALUES (?)",
        [attachment.storage_key],
      );
      await c.execute("DELETE FROM lab_attachments WHERE id=?", [id]);
    });
    await cleanupAttachmentFiles();
    res.status(204).end();
  }),
);
