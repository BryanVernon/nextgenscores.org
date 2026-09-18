import { isGameLocked } from "./poolTiming.js";
import { userTimeZone } from "./timeZone.js";

export function isFridayReminderTime(now, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: userTimeZone(timeZone), weekday: "short", hour: "numeric", hourCycle: "h23",
  }).formatToParts(new Date(now)).map(part => [part.type, part.value]));
  // GitHub runs hourly; each recipient is eligible only in their local 9 AM hour.
  return parts.weekday === "Fri" && Number(parts.hour) === 9;
}

export function missingOpenPicks(games, picks, now = Date.now()) {
  const selected = new Map(picks.map(pick => [Number(pick.gameId), pick.pick]));
  return games.filter(game => !isGameLocked(game, now)
    && Date.parse(game.startDate) < now + 7 * 24 * 60 * 60 * 1000
    && !["home", "away"].includes(selected.get(Number(game.id))));
}

export async function deliverReminder({ key, notifications, send }) {
  let record;
  try {
    record = await notifications.create({ ...key, status: "sending", sentAt: null });
  } catch (error) {
    if (error.code !== 11000) throw error;
    // Only retry a definite SMTP rejection. A crashed/uncertain delivery needs
    // inspection, since repeating it could send the same email twice.
    record = await notifications.findOneAndUpdate({ ...key, status: "failed" }, { $set: { status: "sending" } }, { new: true });
    if (!record) return false;
  }
  try {
    await send();
  } catch (error) {
    const status = Number(error.responseCode) >= 400 ? "failed" : "unknown";
    await notifications.updateOne({ _id: record._id }, { $set: { status } });
    throw error;
  }
  await notifications.updateOne({ _id: record._id }, { $set: { status: "sent", sentAt: new Date() } });
  return true;
}
