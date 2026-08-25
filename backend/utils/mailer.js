import nodemailer from "nodemailer";

function createTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP_USER and SMTP_PASS must be configured to send email");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || "NextGenScores <bryan@nextgenscores.org>";

  return transporter.sendMail({
    from,
    to,
    subject: "Reset your NextGenScores password",
    text: `We received a request to reset your password. Use this link within one hour: ${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <p>We received a request to reset your NextGenScores password.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#16803c;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p>
      <p>This link expires in one hour. If you did not request it, you can safely ignore this email.</p>
    `,
  });
}
