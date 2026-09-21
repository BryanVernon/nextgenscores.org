const CENTRAL_TIME_ZONE = "America/Chicago";

function centralDate(now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: CENTRAL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(new Date(now)).map(part => [part.type, part.value]));
  return { key: `${parts.year}-${parts.month}-${parts.day}`, weekday: parts.weekday };
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function sundayResultsWeek(weeks, now = Date.now()) {
  const { key, weekday } = centralDate(now);
  const daysSinceSunday = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday];
  if (daysSinceSunday == null) return null;
  const sunday = addDays(key, -daysSinceSunday);
  return [...(weeks || [])].filter(item => {
    const start = new Date(item.startDate);
    return !Number.isNaN(start.getTime()) && centralDate(start).key < sunday;
  }).at(-1)?.week ?? null;
}

export function isSundayResultsTime(now = Date.now()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIME_ZONE,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(now)).map(part => [part.type, part.value]));
  return parts.weekday === "Sun" && Number(parts.hour) === 9;
}

export function allLineupGamesFinal(lineup) {
  return Array.isArray(lineup) && lineup.length > 0 && lineup.every(game => game?.completed === true
    && Number.isFinite(Number(game.homePoints)) && Number.isFinite(Number(game.awayPoints)));
}

export function hasTimelyCompletePicks(lineup, picks) {
  const byGame = new Map((picks || []).map(pick => [Number(pick.gameId), pick]));
  return Array.isArray(lineup) && lineup.length > 0 && lineup.every(game => {
    const pick = byGame.get(Number(game.id));
    const kickoff = Date.parse(game.startDate);
    const pickedAt = Date.parse(pick?.createdAt);
    return ["home", "away"].includes(pick?.pick)
      && Number.isFinite(kickoff)
      && Number.isFinite(pickedAt)
      && pickedAt < kickoff;
  });
}
