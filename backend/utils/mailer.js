import nodemailer from "nodemailer";
import { reminderEmail } from "./reminderEmail.js";

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

export async function sendPickReminderEmail({ to, ...details }) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || "NextGenScores <bryan@nextgenscores.org>";
  return transporter.sendMail({
    from, to,
    ...reminderEmail({ ...details, baseUrl: appUrl() }),
  });
}

export function leaderboardEmail({ name, poolName, week, entries, games = [], baseUrl = appUrl() }) {
  const escape = value => String(value ?? "").replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[character]));
  const standings = entries.map(entry => `#${entry.rank} ${entry.name} — ${entry.correct} correct`);
  const scores = games.map(game => `${game.awayTeam} ${game.awayPoints} at ${game.homeTeam} ${game.homePoints}`);
  const rows = entries.map(entry => `<li>#${entry.rank} ${escape(entry.name)} — ${entry.correct} correct</li>`).join("");
  const scoreRows = games.map(game => `<li>${escape(game.awayTeam)} ${game.awayPoints} at ${escape(game.homeTeam)} ${game.homePoints}</li>`).join("");
  return {
    subject: `${poolName}: Week ${week} results and standings`,
    text: `Hi ${name},\n\nWeek ${week} results:\n${scores.join("\n")}\n\nStandings:\n${standings.join("\n")}\n\n${baseUrl}/pickem`,
    html: `<p>Hi ${escape(name)},</p><p>Week ${week} is complete in <strong>${escape(poolName)}</strong>.</p><h2>Final scores</h2><ul>${scoreRows}</ul><h2>Standings</h2><ol>${rows}</ol><p><a href="${escape(baseUrl)}/pickem">View Pick 'Em</a></p>`,
  };
}

export async function sendLeaderboardEmail({ to, name, poolName, week, entries, games }) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || "NextGenScores <bryan@nextgenscores.org>";
  return transporter.sendMail({ from, to, ...leaderboardEmail({ name, poolName, week, entries, games }) });
}
