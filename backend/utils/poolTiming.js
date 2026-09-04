export function isGameLocked(game, now = Date.now()) {
  const kickoff = game.startDate ? new Date(game.startDate).getTime() : NaN;
  return !Number.isFinite(kickoff) || kickoff <= now || game.homePoints != null || game.awayPoints != null;
}
export function laterPeriod(left, right) {
  if (!right || right.season == null || right.week == null) return left;
  if (!left || left.week == null || left.season == null) return right;
  return right.season > left.season || (right.season === left.season && right.week > left.week) ? right : left;
}
export function memberStart(pool, userId) {
  return pool.memberStarts?.get?.(String(userId)) || pool.memberStarts?.[String(userId)];
}
export function isEligible(pool, userId, season, week) {
  const start = laterPeriod({ season: pool.startSeason, week: pool.startWeek }, memberStart(pool, userId));
  return start?.season == null || start?.week == null || season > start.season || (season === start.season && week >= start.week);
}
export function validatePickChanges(games, submitted, existing, now = Date.now()) {
  const byId = new Map(games.map(game => [Number(game.id), game]));
  const changes = new Map();
  for (const item of submitted) {
    const game = byId.get(Number(item?.gameId));
    if (!game || !["home", "away"].includes(item.pick)) throw new Error("The lineup has changed. Refresh before saving your picks.");
    if (isGameLocked(game, now)) {
      if (existing.get(Number(game.id)) !== item.pick) throw new Error("A game has already started. Its pick is locked; refresh before saving.");
    } else changes.set(Number(game.id), item.pick);
  }
  return [...changes].map(([gameId, pick]) => ({ gameId, pick }));
}

export async function firstUnstartedPeriod(periods, loadLineup, now = () => Date.now()) {
  for (const candidates of periods) {
    const { season, week } = candidates[0];
    const lineup = await loadLineup(candidates, { season, week });
    if (lineup.length && lineup.every(game => !isGameLocked(game, now()))) return { season, week };
  }
  return null;
}
