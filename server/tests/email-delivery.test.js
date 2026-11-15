import test from "node:test";
import assert from "node:assert/strict";
import { config } from "../config.js";
import { sendMail } from "../services/otp.js";

test("real delivery rejects missing SMTP even when a test mailbox is configured", async () => {
  const previous = { smtp: config.smtp, mode: config.emailDelivery };
  try {
    config.emailDelivery = "smtp";
    config.smtp = {};
    await assert.rejects(
      sendMail("test@example.com", "Test", "Test"),
      (e) => e.code === "EMAIL_UNAVAILABLE" && /not configured/.test(e.message),
    );
    config.smtp = { host: "127.0.0.1", from: "sender@example.com", port: 2525 };
    await assert.rejects(
      sendMail("test@example.com", "Test", "Test"),
      (e) => e.code === "EMAIL_UNAVAILABLE",
    );
  } finally {
    config.smtp = previous.smtp;
    config.emailDelivery = previous.mode;
  }
});
