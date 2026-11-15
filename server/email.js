import nodemailer from "nodemailer";

function createTransporter() {
  const { MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, MAIL_FROM } = process.env;
  if (!MAIL_HOST || !MAIL_PORT || !MAIL_FROM) {
    throw new Error("Email delivery is not configured. Set MAIL_HOST, MAIL_PORT, and MAIL_FROM.");
  }
  if (Boolean(MAIL_USER) !== Boolean(MAIL_PASSWORD)) {
    throw new Error("Set both MAIL_USER and MAIL_PASSWORD, or leave both blank for unauthenticated SMTP.");
  }

  const transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: Number(MAIL_PORT),
    secure: Number(MAIL_PORT) === 465,
    requireTLS: process.env.MAIL_REQUIRE_TLS === "true",
    ...(MAIL_USER && MAIL_PASSWORD
      ? { auth: { user: MAIL_USER, pass: MAIL_PASSWORD } }
      : {}),
  });
  return transporter;
}

export async function sendVerificationCode(email, code) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: "Your LabCheck verification code",
    text: `Your LabCheck email verification code is ${code}. It expires in 15 minutes.`,
    html: `<p>Your LabCheck email verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>This code expires in 15 minutes. If you did not request it, you can ignore this email.</p>`,
  });
}

export async function sendPasswordResetCode(email, code) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: "Your LabCheck password reset code",
    text: `Your LabCheck password reset code is ${code}. It expires in 15 minutes.`,
    html: `<p>Your LabCheck password reset code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>This code expires in 15 minutes. If you did not request it, you can ignore this email.</p>`,
  });
}
