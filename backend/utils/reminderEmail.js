import { userTimeZone } from "./timeZone.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

export function reminderEmail({ name, poolName, poolId, week, firstGameAt, missingCount, timeZone, baseUrl = "https://nextgenscores.org" }) {
  const kickoff = new Date(firstGameAt).toLocaleString("en-US", { timeZone: userTimeZone(timeZone), weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  const picksUrl = `${baseUrl.replace(/\/$/, "")}/pickem?pool=${encodeURIComponent(String(poolId))}`;
  const count = `${missingCount} ${missingCount === 1 ? "pick" : "picks"}`;
  return {
    subject: `Friday reminder: Week ${week} picks for ${poolName}`,
    text: `Hi ${name},\n\nYou still have ${count} to make in ${poolName} for Week ${week}. Your next missing pick locks ${kickoff}. Each game locks at its own kickoff.\n\nMake your picks: ${picksUrl}\n\nIf you just saved your picks, you're all set.`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>You still have <strong>${escapeHtml(count)}</strong> to make in <strong>${escapeHtml(poolName)}</strong> for Week ${week}.</p><p>Your next missing pick locks <strong>${escapeHtml(kickoff)}</strong>. Each game locks at its own kickoff.</p><p><a href="${escapeHtml(picksUrl)}" style="display:inline-block;padding:12px 18px;background:#17312b;color:#fff;text-decoration:none;border-radius:6px">Make my picks</a></p><p>If you just saved your picks, you're all set.</p>`,
  };
}
