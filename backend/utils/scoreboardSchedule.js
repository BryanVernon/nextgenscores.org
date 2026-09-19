import { userTimeZone } from "./timeZone.js";

export function isScoreboardRefreshTime(now, timeZone = "America/Chicago") {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: userTimeZone(timeZone), weekday: "short", hour: "numeric", hourCycle: "h23",
  }).formatToParts(new Date(now)).map(part => [part.type, part.value]));
  const hour = Number(parts.hour);
  return [7, 19].includes(hour) || (parts.weekday === "Sat" && hour >= 11 && hour <= 23);
}
