import { userTimeZone } from "./timeZone.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

export function reminderEmail({ name, poolName, poolId, week, firstGameAt, timeZone, baseUrl = "https://nextgenscores.org" }) {
  const kickoff = new Date(firstGameAt).toLocaleString("en-US", { timeZone: userTimeZone(timeZone), weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  const picksUrl = `${baseUrl.replace(/\/$/, "")}/pickem?pool=${encodeURIComponent(String(poolId))}`;
  const safeName = escapeHtml(name);
  const safePool = escapeHtml(poolName);
  const safeKickoff = escapeHtml(kickoff);
  const safeUrl = escapeHtml(picksUrl);

  return {
    subject: `Week ${week} picks are waiting`,
    text: `Hi ${name},\n\nWeek ${week} is here and your entry in ${poolName} is not finished. Make your picks before the next game kicks off ${kickoff}. Each game locks at kickoff.\n\nMake your picks: ${picksUrl}\n\nNextGenScores`,
    html: `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#eef2ef;font-family:Arial,Helvetica,sans-serif;color:#17312b">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2ef"><tr><td align="center" style="padding:28px 16px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden">
      <tr><td style="padding:28px 32px;background:#17312b;color:#ffffff">
        <div style="font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8fe0bd">NextGenScores</div>
        <div style="margin-top:13px;font-size:30px;font-weight:800;line-height:1.15">Your picks are waiting.</div>
      </td></tr>
      <tr><td style="padding:32px">
        <div style="display:inline-block;padding:7px 11px;border-radius:999px;background:#e7f7ef;color:#16704f;font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase">Week ${escapeHtml(week)} · Pick 'Em</div>
        <p style="margin:24px 0 10px;font-size:18px;line-height:1.55">Hi ${safeName},</p>
        <p style="margin:0;font-size:16px;line-height:1.65;color:#486057">Your entry in <strong style="color:#17312b">${safePool}</strong> is not finished yet. Get your calls in before the next kickoff.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:#f5f7f2;border-left:4px solid #1ea675;border-radius:8px"><tr><td style="padding:16px 18px"><div style="font-size:12px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#6b7f78">Next pick locks</div><div style="margin-top:5px;font-size:16px;font-weight:700;color:#17312b">${safeKickoff}</div></td></tr></table>
        <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:8px;background:#1ea675"><a href="${safeUrl}" style="display:inline-block;padding:14px 20px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none">Make my picks →</a></td></tr></table>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:#6b7f78">Each game locks at kickoff. If you have already submitted your entry, you are all set.</p>
      </td></tr>
      <tr><td style="padding:18px 32px;background:#f5f7f2;color:#6b7f78;font-size:12px">NextGenScores · College football, your way</td></tr>
    </table>
  </td></tr></table>
</body></html>`,
  };
}
