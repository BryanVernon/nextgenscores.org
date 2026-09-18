import { isGameLocked } from "./poolTiming.js";

export function isGameComplete(game) {
  return game.completed !== false && game.homePoints != null && game.awayPoints != null
    && Number.isFinite(Number(game.homePoints)) && Number.isFinite(Number(game.awayPoints));
}

// The spread is expressed from the home team's perspective (negative = favorite).
export function getPickResult(game, pick, scoringType = "straight") {
  if (pick !== "home" && pick !== "away") return "unpicked";
  if (!isGameComplete(game)) return "pending";
  let margin = Number(game.homePoints) - Number(game.awayPoints);
  if (scoringType === "spread") {
    if (game.spread == null || game.spread === "" || !Number.isFinite(Number(game.spread))) return "pending";
    margin += Number(game.spread);
  }
  if (margin === 0) return "tie";
  return (pick === "home" ? margin > 0 : margin < 0) ? "correct" : "incorrect";
}

export function getPickResults(games, picks, scoringType = "straight", { hideUnlocked = false, now = Date.now() } = {}) {
  return games.map(game => {
    const pick = picks.get(Number(game.id)) ?? null;
    const pickHidden = hideUnlocked && !isGameLocked(game, now);
    return {
      gameId: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homePoints: game.homePoints ?? null,
      awayPoints: game.awayPoints ?? null,
      completed: game.completed ?? null,
      homeLogo: game.homeLogo || null,
      awayLogo: game.awayLogo || null,
      spread: game.spread ?? null,
      overUnder: game.overUnder ?? null,
      oddsSource: game.oddsSource || null,
      startDate: game.startDate,
      pick: pickHidden ? null : pick,
      pickHidden,
      result: pickHidden ? "hidden" : getPickResult(game, pick, scoringType),
    };
  });
}
