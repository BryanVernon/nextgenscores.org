// Keep the breakdown and leaderboard totals on the same existing straight-up rules.
export function getPickResult(game, pick) {
  if (pick !== "home" && pick !== "away") return "unpicked";
  if (game.homePoints == null || game.awayPoints == null) return "pending";
  const margin = Number(game.homePoints) - Number(game.awayPoints);
  if (margin === 0) return "tie";
  return (pick === "home" ? margin > 0 : margin < 0) ? "correct" : "incorrect";
}

export function getPickResults(games, picks) {
  return games.map(game => {
    const pick = picks.get(Number(game.id)) ?? null;
    return {
      gameId: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homePoints: game.homePoints ?? null,
      awayPoints: game.awayPoints ?? null,
      homeLogo: game.homeLogo || null,
      awayLogo: game.awayLogo || null,
      spread: game.spread ?? null,
      overUnder: game.overUnder ?? null,
      oddsSource: game.oddsSource || null,
      startDate: game.startDate,
      pick,
      result: getPickResult(game, pick),
    };
  });
}
