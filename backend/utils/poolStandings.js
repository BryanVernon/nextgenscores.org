import { getPickResults, isGameComplete } from "./leaderboardResults.js";
import { isEligible } from "./poolTiming.js";
import { filterGamesForPool } from "./poolGameSelection.js";
import { selectFeaturedMatchups } from "./featuredMatchups.js";

export function rankEntries(entries) {
  const sorted = [...entries].sort((a, b) => b.correct - a.correct || a.name.localeCompare(b.name));
  sorted.forEach((entry, index) => {
    entry.rank = index && entry.correct === sorted[index - 1].correct ? sorted[index - 1].rank : index + 1;
  });
  return sorted;
}

export function historicalLineup(pool, games, snapshot, picks) {
  const byId = new Map(games.map(game => [Number(game.id), game]));
  if (snapshot) return snapshot.gameIds.map(id => byId.get(Number(id))).filter(Boolean);
  // Older pools may predate saved lineups. Their recorded picks are the best
  // evidence of what actually competed; don't reselect those weeks by today's ranks.
  if (picks.length) return [...new Set(picks.map(pick => Number(pick.gameId)))].map(id => byId.get(id)).filter(Boolean);
  const eligible = filterGamesForPool(games, pool);
  return pool.gameSelection === "competitive-ten" ? selectFeaturedMatchups(eligible) : eligible;
}

export function weeklyStandings({ pool, games, picks, users, season, week, viewerId, now = Date.now() }) {
  const names = new Map(users.map(user => [String(user._id), user.name]));
  const byUser = new Map();
  for (const pick of picks) {
    if (!byUser.has(String(pick.userId))) byUser.set(String(pick.userId), new Map());
    byUser.get(String(pick.userId)).set(Number(pick.gameId), pick.pick);
  }
  const entries = pool.participants.filter(id => isEligible(pool, id, season, week)).map(id => {
    const userPicks = byUser.get(String(id)) || new Map();
    const results = getPickResults(games, userPicks, pool.scoringType, { hideUnlocked: String(id) !== String(viewerId), now });
    return {
      userId: String(id), name: names.get(String(id)) || "Player",
      correct: results.filter(result => result.result === "correct").length,
      picks: games.filter(game => ["home", "away"].includes(userPicks.get(Number(game.id)))).length,
      results,
    };
  });
  return { season, week, completedGames: games.filter(isGameComplete).length, totalGames: games.length, leaderboard: rankEntries(entries) };
}

export function seasonStandings(weeks) {
  const entries = new Map();
  for (const board of weeks) {
    for (const entry of board.leaderboard) {
      if (!entries.has(entry.userId)) entries.set(entry.userId, { userId: entry.userId, name: entry.name, correct: 0, picks: 0, weeks: [] });
      const total = entries.get(entry.userId);
      total.correct += entry.correct;
      total.picks += entry.picks;
      total.weeks.push({ week: board.week, correct: entry.correct, picks: entry.picks });
    }
  }
  return {
    completedGames: weeks.reduce((total, board) => total + board.completedGames, 0),
    totalGames: weeks.reduce((total, board) => total + board.totalGames, 0),
    leaderboard: rankEntries([...entries.values()]),
  };
}
