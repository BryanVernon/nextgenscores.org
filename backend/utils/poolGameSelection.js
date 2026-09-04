import PoolWeek from "../models/poolWeek.js";
import { selectFeaturedMatchups } from "./featuredMatchups.js";

export function filterGamesForPool(games, pool) {
  if (!pool.conference || pool.conference === "All") return games;
  if (pool.conference === "AP Top 25") return games.filter(game => game.homeApRank != null || game.awayApRank != null);
  return games.filter(game => game.homeConference === pool.conference || game.awayConference === pool.conference);
}

export async function selectGamesForPool({ pool, games, season, week }) {
  const eligibleGames = filterGamesForPool(games, pool);

  const existing = await PoolWeek.findOne({ poolId: pool._id, season, week }).lean();
  if (existing) {
    const byId = new Map(games.map(game => [Number(game.id), game]));
    return existing.gameIds.map(id => byId.get(Number(id))).filter(Boolean);
  }

  const selected = pool.gameSelection === "competitive-ten" ? selectFeaturedMatchups(eligibleGames) : eligibleGames;
  if (!selected.length) return []; // Do not freeze an empty, not-yet-imported week.

  try {
    await PoolWeek.create({ poolId: pool._id, season, week, gameIds: selected.map(game => Number(game.id)) });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return selectGamesForPool({ pool, games, season, week });
  }
  return selected;
}
