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
