function present(value) {
  return value !== undefined && value !== null;
}

function invalid() {
  throw new Error("Invalid scoreboard payload");
}

function validNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateTeam(team) {
  if (!present(team)) return;
  if (typeof team !== "object" || Array.isArray(team)) invalid();
  for (const key of ["points", "winProbability"]) {
    if (present(team[key]) && !validNumber(team[key])) invalid();
  }
  if (present(team.lineScores) && (!Array.isArray(team.lineScores) || !team.lineScores.every(validNumber))) invalid();
}

function validateScoreboardGame(game) {
  if (!game || typeof game !== "object" || Array.isArray(game) || !Number.isSafeInteger(game.id) || game.id <= 0) invalid();
  if (present(game.status) && typeof game.status !== "string") invalid();
  for (const key of ["startDate", "clock", "situation", "possession", "lastPlay"]) {
    if (present(game[key]) && typeof game[key] !== "string") invalid();
  }
  if (present(game.period) && !validNumber(game.period)) invalid();
  validateTeam(game.homeTeam);
  validateTeam(game.awayTeam);
  if (present(game.weather)) {
    if (typeof game.weather !== "object" || Array.isArray(game.weather)) invalid();
    for (const key of ["temperature", "windSpeed", "windDirection"]) {
      if (present(game.weather[key]) && !validNumber(game.weather[key])) invalid();
    }
    if (present(game.weather.description) && typeof game.weather.description !== "string") invalid();
  }
}

export function scoreboardUpdate(game, updatedAt = new Date().toISOString()) {
  validateScoreboardGame(game);
  const status = typeof game.status === "string" ? game.status.toLowerCase() : null;
  const update = { id: game.id, updatedAt: new Date(updatedAt) };
  if (status) {
    update.liveStatus = status;
    update.completed = status === "final" || status === "completed";
  }

  for (const [field, value] of Object.entries({
    homePoints: game.homeTeam?.points,
    awayPoints: game.awayTeam?.points,
    startDate: game.startDate,
    period: game.period,
    clock: game.clock,
    situation: game.situation,
    possession: game.possession,
    lastPlay: game.lastPlay,
    homeWinProbability: game.homeTeam?.winProbability,
    awayWinProbability: game.awayTeam?.winProbability,
    homeLineScores: game.homeTeam?.lineScores,
    awayLineScores: game.awayTeam?.lineScores,
    "weather.temperature": game.weather?.temperature,
    "weather.windSpeed": game.weather?.windSpeed,
    "weather.windDirection": game.weather?.windDirection,
    "weather.description": game.weather?.description,
  })) {
    if (present(value)) update[field] = value;
  }
  return update;
}

export function scoreboardUpdates(payload, updatedAt = new Date().toISOString()) {
  if (!Array.isArray(payload)) invalid();
  payload.forEach(validateScoreboardGame);
  return payload.map(game => scoreboardUpdate(game, updatedAt));
}
