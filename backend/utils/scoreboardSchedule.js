import { userTimeZone } from "./timeZone.js";

export function isScoreboardRefreshTime(now, timeZone = "America/Chicago") {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: userTimeZone(timeZone), hour: "numeric", hourCycle: "h23",
  }).formatToParts(new Date(now)).map(part => [part.type, part.value]));
  return [7, 19].includes(Number(parts.hour));
}
