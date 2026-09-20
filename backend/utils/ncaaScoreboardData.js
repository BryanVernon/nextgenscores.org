function invalid() {
  throw new Error("Invalid NCAA scoreboard payload");
}

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

const TEAM_ALIASES = new Map([
  ["ohiost", "ohiostate"],
  ["iowast", "iowastate"],
  ["michst", "michiganstate"],
  ["pennst", "pennstate"],
  ["wisconsin", "wisconsin"],
  ["boisest", "boisestate"],
  ["coloradost", "coloradostate"],
  ["fresnost", "fresnostate"],
  ["kentst", "kentstate"],
  ["ballst", "ballstate"],
  ["northernill", "northernillinois"],
  ["westernmich", "westernmichigan"],
  ["centralmich", "centralmichigan"],
  ["easternmich", "easternmichigan"],
  ["miamioh", "miamiohio"],
  ["northwestern", "northwestern"],
  ["texastech", "texastech"],
  ["texasam", "texasam"],
  ["olemiss", "mississippi"],
  ["missst", "mississippistate"],
  ["ncstate", "northcarolinastate"],
  ["southcarolina", "southcarolina"],
  ["southerncalifornia", "usc"],
  ["washingtonst", "washingtonstate"],
  ["oregonst", "oregonstate"],
  ["san-diego-st", "sandiegostate"],
  ["sandiegost", "sandiegostate"],
  ["appstate", "appalachianstate"],
  ["westernky", "westernkentucky"],
  ["middletenn", "middletennessee"],
  ["newmexicost", "newmexicostate"],
]);

function comparableName(name) {
  const normalized = normalizeName(name);
  return TEAM_ALIASES.get(normalized) || normalized;
}

function score(value) {
  if (value === "" || value == null) return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  invalid();
}

function period(value) {
  if (value == null || value === "" || /^final$/i.test(value)) return null;
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function validateGame(game) {
  if (!game || typeof game !== "object" || Array.isArray(game) || !/^\d+$/.test(String(game.gameID))) invalid();
  if (typeof game.gameState !== "string") invalid();
  for (const team of [game.home, game.away]) {
    if (!team || typeof team !== "object" || typeof team.names?.short !== "string") invalid();
    score(team.score);
  }
  if (game.currentPeriod != null && typeof game.currentPeriod !== "string") invalid();
  if (game.contestClock != null && typeof game.contestClock !== "string") invalid();
  if (game.startTimeEpoch != null && !/^\d+$/.test(String(game.startTimeEpoch))) invalid();
}

function statusUpdate(game) {
  const state = game.gameState.toLowerCase();
  const update = { liveStatus: state };
  if (["final", "completed"].includes(state)) update.completed = true;
  if (["pre", "live", "in_progress", "in-progress"].includes(state)) update.completed = false;
  return update;
}

function matchingScheduledGames(game, scheduledGames) {
  const home = comparableName(game.home.names.short);
  const away = comparableName(game.away.names.short);
  const kickoff = game.startTimeEpoch == null ? null : Number(game.startTimeEpoch) * 1000;
  return scheduledGames.filter(scheduled => {
    if (comparableName(scheduled.homeTeam) !== home || comparableName(scheduled.awayTeam) !== away) return false;
    if (kickoff == null || !scheduled.startDate) return true;
    const scheduledKickoff = new Date(scheduled.startDate).getTime();
    return Number.isFinite(scheduledKickoff) && Math.abs(scheduledKickoff - kickoff) <= 36 * 60 * 60 * 1000;
  });
}

export function ncaaScoreboardUpdates(payload, scheduledGames, updatedAt = new Date().toISOString()) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.games) || !Array.isArray(scheduledGames)) invalid();
  const timestamp = new Date(updatedAt);
  if (Number.isNaN(timestamp.getTime())) invalid();

  const updates = [];
  for (const entry of payload.games) {
    const game = entry?.game;
    validateGame(game);
    const matches = matchingScheduledGames(game, scheduledGames);
    if (matches.length !== 1) continue;
    const update = {
      id: matches[0].id,
      ...statusUpdate(game),
      updatedAt: timestamp,
    };
    const homePoints = score(game.home.score);
    const awayPoints = score(game.away.score);
    const currentPeriod = period(game.currentPeriod);
    if (homePoints != null) update.homePoints = homePoints;
    if (awayPoints != null) update.awayPoints = awayPoints;
    if (currentPeriod != null) update.period = currentPeriod;
    if (game.contestClock) update.clock = game.contestClock;
    updates.push(update);
  }
  return updates;
}
