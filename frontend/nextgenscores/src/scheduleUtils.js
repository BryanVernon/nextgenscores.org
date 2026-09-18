export function gameStatus(game, now = Date.now()) {
  if (game.completed === true) return { label: "Final", kind: "final" };
  const hasScore = game.homePoints != null && game.awayPoints != null;
  if (hasScore) return game.completed === false
    ? { label: "In progress", kind: "progress" }
    : { label: "Score reported", kind: "reported" };
  if (game.startTimeTBD || !game.startDate || !Number.isFinite(Date.parse(game.startDate))) {
    return { label: "Time TBD", kind: "scheduled" };
  }
  return Date.parse(game.startDate) <= now
    ? { label: "Awaiting update", kind: "pending" }
    : { label: "Upcoming", kind: "scheduled" };
}

export function spreadLabel(game) {
  if (typeof game.spread !== "number" || !Number.isFinite(game.spread)) return null;
  if (game.spread === 0) return "Even (pick 'em)";
  return `${game.spread < 0 ? game.homeTeam : game.awayTeam} −${Math.abs(game.spread)}`;
}

export function groupGamesByDate(games, timeZone) {
  const groups = new Map();
  const ordered = [...games].sort((a, b) =>
    (Date.parse(a.startDate) || Infinity) - (Date.parse(b.startDate) || Infinity)
  );
  for (const game of ordered) {
    const date = game.startDate ? new Date(game.startDate) : null;
    const label = date && Number.isFinite(date.getTime())
      ? date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone })
      : "Date to be announced";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(game);
  }
  return [...groups].map(([label, games]) => ({ label, games }));
}

export function latestUpdate(games) {
  const dates = games.map(game => Date.parse(game.updatedAt)).filter(Number.isFinite);
  return dates.length ? new Date(Math.max(...dates)) : null;
}
