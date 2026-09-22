import { pickLocked } from "./pickState.js";

export function poolPickStatus(games, picks = {}, now = Date.now()) {
  const unlocked = games.filter(game => !pickLocked(game, now));
  const hasPick = game => picks[game.id] === "home" || picks[game.id] === "away";
  const selected = unlocked.filter(hasPick).length;
  const remaining = unlocked.length - selected;
  const missedLockedPicks = games.some(game => pickLocked(game, now) && !hasPick(game));
  if (remaining > 0) {
    return {
      complete: false,
      message: `${remaining} ${remaining === 1 ? "pick" : "picks"} left this week`,
      action: "Make picks",
    };
  }
  if (missedLockedPicks) {
    return { complete: false, message: "Picks are locked for this week", action: "View pool" };
  }
  return { complete: true, message: "All picks saved", action: "Review picks" };
}

export function shouldShowPickPrompt(poolIds, statuses) {
  return poolIds.length > 0
    && poolIds.every(id => statuses[id])
    && poolIds.some(id => !statuses[id].complete);
}
