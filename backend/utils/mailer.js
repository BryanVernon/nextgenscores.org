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

function appUrl() {
  return (process.env.FRONTEND_URL || "https://nextgenscores.org").replace(/\/$/, "");
}

export async function sendPickReminderEmail({ to, name, poolName, week, firstGameAt }) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || "NextGenScores <bryan@nextgenscores.org>";
  const kickoff = new Date(firstGameAt).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  const picksUrl = `${appUrl()}/pickem`;
  return transporter.sendMail({
    from, to,
    subject: `Reminder: make your Week ${week} picks for ${poolName}`,
    text: `Hi ${name},\n\nThe first game in ${poolName} starts ${kickoff}. Make your Week ${week} picks before kickoff: ${picksUrl}`,
    html: `<p>Hi ${name},</p><p>The first game in <strong>${poolName}</strong> starts ${kickoff}. Make your Week ${week} picks before kickoff.</p><p><a href="${picksUrl}">Make my picks</a></p>`,
  });
}

export async function sendLeaderboardEmail({ to, name, poolName, week, entries }) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || "NextGenScores <bryan@nextgenscores.org>";
  const rows = entries.map(entry => `<li>#${entry.rank} ${entry.name} — ${entry.correct} correct</li>`).join("");
  return transporter.sendMail({
    from, to,
    subject: `${poolName}: Week ${week} standings are in`,
    text: `Hi ${name},\n\nWeek ${week} is complete.\n${entries.map(entry => `#${entry.rank} ${entry.name} — ${entry.correct} correct`).join("\n")}\n\n${appUrl()}/pickem`,
    html: `<p>Hi ${name},</p><p>Week ${week} is complete in <strong>${poolName}</strong>.</p><ol>${rows}</ol><p><a href="${appUrl()}/pickem">View Pick 'Em</a></p>`,
  });
}
