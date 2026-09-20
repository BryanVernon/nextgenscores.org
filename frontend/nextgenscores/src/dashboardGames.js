export function favoriteGameDay(startDate, timeZone) {
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return null;
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(date);
  const monthDay = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric", timeZone }).format(date);
  return `${weekday} ${monthDay}`;
}

export function favoriteTeamNextGame(team, nextGame) {
  if (!nextGame) return null;
  return {
    homeTeam: nextGame.isHome ? team : nextGame.opponent,
    awayTeam: nextGame.isHome ? nextGame.opponent : team,
    homeLogo: nextGame.isHome ? nextGame.teamLogo : nextGame.opponentLogo,
    awayLogo: nextGame.isHome ? nextGame.opponentLogo : nextGame.teamLogo,
    startDate: nextGame.startDate,
    outlet: nextGame.outlet,
    spread: nextGame.spread,
    overUnder: nextGame.overUnder,
  };
}
