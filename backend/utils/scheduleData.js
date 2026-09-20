export function currentScheduleWeek(weeks, now = Date.now(), timeZone = "America/Chicago") {
  const date = new Date(now);
  if (!Array.isArray(weeks) || Number.isNaN(date.getTime())) return null;
  const dateKey = calendarDateKey(date, timeZone);
  if (!dateKey) return null;
  const sunday = addDays(dateKey, -new Date(`${dateKey}T12:00:00Z`).getUTCDay());
  const nextSunday = addDays(sunday, 7);
  const validWeeks = weeks.filter(item => Number.isInteger(item?.week) && calendarDateKey(item.startDate, timeZone));
  const inCurrentWeek = validWeeks.find(item => {
    const start = calendarDateKey(item.startDate, timeZone);
    return start >= sunday && start < nextSunday;
  });
  if (inCurrentWeek) return inCurrentWeek.week;
  const nextWeek = validWeeks.find(item => calendarDateKey(item.startDate, timeZone) >= sunday);
  return nextWeek?.week ?? validWeeks.at(-1)?.week ?? null;
}

function calendarDateKey(value, timeZone) {
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

export function requestedScheduleWeek(value, currentWeek) {
  if (value === "all") return null;
  if (value == null || value === "") return currentWeek;
  const week = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(week)) throw new Error("week must be a nonnegative integer or all");
  return week;
}

export async function readProviderArray(response, feed) {
  if (!response.ok) throw new Error(`${feed} request failed: ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error(`${feed} returned an invalid response`);
  return data;
}

// Validate the full batch before writing. Refresh by stable game ID so an empty
// feed, provider failure, or interrupted refresh never deletes the season.
export async function storeImportedGames(Game, games, season) {
  if (!Array.isArray(games) || games.length === 0) throw new Error("The provider returned no games; the existing schedule was preserved");
  const ids = new Set();
  for (const game of games) {
    if (!Number.isSafeInteger(game.id) || game.season !== season || !game.homeTeam || !game.awayTeam || ids.has(game.id)) {
      throw new Error("The provider returned invalid games; the existing schedule was preserved");
    }
    ids.add(game.id);
  }
  return Game.bulkWrite(games.map(game => ({
    updateOne: { filter: { id: game.id }, update: { $set: game }, upsert: true },
  })), { ordered: false });
}
