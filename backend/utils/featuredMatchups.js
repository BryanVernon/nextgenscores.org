const PREFERRED_CONFERENCES = new Set(["SEC", "Big Ten", "ACC", "Big 12", "Pac-12"]);
const COMPETITIVE_SPREAD_LIMIT = 11;

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
    // Accept a moderately larger spread for major-conference and ranked teams,
    // but don't let a marquee name automatically promote a likely blowout.
    score: spread - preferredTeams * 4 - rankedTeams * 3,
    rankedTeams,
    spread,
  };
}

export function selectFeaturedMatchups(games) {
  return games
    .map(game => ({ game, ...profile(game) }))
    // Fill ten whenever ten eligible games exist. Missing lines are a last resort.
    .sort((left, right) => Number(right.hasSpread) - Number(left.hasSpread)
      || Number(right.preferred) - Number(left.preferred)
      || left.score - right.score
      || right.rankedTeams - left.rankedTeams
      || left.spread - right.spread
      || (new Date(left.game.startDate).getTime() || 0) - (new Date(right.game.startDate).getTime() || 0)
      || Number(left.game.id) - Number(right.game.id))
    .slice(0, 10)
    .map(item => item.game);
}
