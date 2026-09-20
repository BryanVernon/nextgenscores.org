const PREFERRED_CONFERENCES = new Set(["SEC", "Big Ten", "ACC", "Big 12", "Pac-12"]);
const COMPETITIVE_SPREAD_LIMIT = 11;

function localDateKey(value, timeZone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function featuredWeekIndex(weeks, now = new Date(), timeZone) {
  const today = localDateKey(now, timeZone);
  if (!today || !weeks.length) return -1;
  const sunday = addDays(today, -new Date(`${today}T12:00:00Z`).getUTCDay());
  const nextSunday = addDays(sunday, 7);
  const currentIndex = weeks.findIndex(item => {
    const start = localDateKey(item.startDate, timeZone);
    return start && start >= sunday && start < nextSunday;
  });
  if (currentIndex !== -1) return currentIndex;
  return weeks.findIndex(item => (localDateKey(item.startDate, timeZone) || "") >= sunday);
}

function profile(game) {
  let preferredTeams = 0;
  let rankedTeams = 0;
  for (const side of ["home", "away"]) {
    const rank = Number(game[`${side}ApRank`]);
    const ranked = Number.isInteger(rank) && rank >= 1 && rank <= 25;
    if (ranked) rankedTeams += 1;
    if (ranked || PREFERRED_CONFERENCES.has(game[`${side}Conference`])) preferredTeams += 1;
  }
  const hasSpread = game.spread != null && String(game.spread).trim() !== "" && Number.isFinite(Number(game.spread));
  const spread = hasSpread ? Math.abs(Number(game.spread)) : Infinity;
  return {
    hasSpread,
    preferred: preferredTeams > 0 && spread <= COMPETITIVE_SPREAD_LIMIT,
    score: spread - preferredTeams * 4 - rankedTeams * 3,
    rankedTeams,
    spread,
  };
}

export function featuredGames(games) {
  return [...games]
    .map(game => ({ game, ...profile(game) }))
    .sort((left, right) => Number(right.hasSpread) - Number(left.hasSpread)
      || Number(right.preferred) - Number(left.preferred)
      || left.score - right.score
      || right.rankedTeams - left.rankedTeams
      || left.spread - right.spread
      || (new Date(left.game.startDate).getTime() || 0) - (new Date(right.game.startDate).getTime() || 0)
      || Number(left.game.id) - Number(right.game.id))
    .slice(0, 10)
    .map(item => item.game)
    .sort((left, right) => {
      const leftTime = left.startDate ? new Date(left.startDate).getTime() : Number.POSITIVE_INFINITY;
      const rightTime = right.startDate ? new Date(right.startDate).getTime() : Number.POSITIVE_INFINITY;
      return (Number.isFinite(leftTime) ? leftTime : Number.POSITIVE_INFINITY) - (Number.isFinite(rightTime) ? rightTime : Number.POSITIVE_INFINITY);
    });
}
