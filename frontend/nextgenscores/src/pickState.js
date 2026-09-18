export function pickLocked(game, now = Date.now()) {
  const kickoff = game.startDate ? new Date(game.startDate).getTime() : NaN;
  return Boolean(game.locked || !Number.isFinite(kickoff) || kickoff <= now);
}

export function savedPickSummary(games, picks = {}, now = Date.now()) {
  const hasPick = game => picks[game.id] === "home" || picks[game.id] === "away";
  const saved = games.filter(hasPick).length;
  return {
    saved,
    missed: games.filter(game => pickLocked(game, now) && !hasPick(game)).length,
    ready: saved > 0 && games.every(game => pickLocked(game, now) || hasPick(game)),
  };
}
