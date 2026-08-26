import PoolWeek from "../models/poolWeek.js";

export function filterGamesForPool(games, pool) {
  if (!pool.conference || pool.conference === "All") return games;
  if (pool.conference === "AP Top 25") return games.filter(game => game.homeApRank != null || game.awayApRank != null);
  return games.filter(game => game.homeConference === pool.conference || game.awayConference === pool.conference);
}

export async function selectGamesForPool({ pool, games, season, week }) {
  const eligibleGames = filterGamesForPool(games, pool);
  if (pool.gameSelection !== "competitive-ten") return eligibleGames;

  const existing = await PoolWeek.findOne({ poolId: pool._id, season, week }).lean();
  if (existing) {
    const byId = new Map(eligibleGames.map(game => [Number(game.id), game]));
    return existing.gameIds.map(id => byId.get(Number(id))).filter(Boolean);
  }

  const selected = eligibleGames
    .filter(game => game.spread != null && Number.isFinite(Number(game.spread)))
    .sort((left, right) => Math.abs(Number(left.spread)) - Math.abs(Number(right.spread))
      || (Number(right.homeApRank != null) + Number(right.awayApRank != null)) - (Number(left.homeApRank != null) + Number(left.awayApRank != null))
      || new Date(left.startDate) - new Date(right.startDate))
    .slice(0, 10);

  try {
    await PoolWeek.create({ poolId: pool._id, season, week, gameIds: selected.map(game => Number(game.id)) });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return selectGamesForPool({ pool, games, season, week });
  }
  return selected;
}
