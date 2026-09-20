export function favoriteGameDay(startDate, timeZone) {
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(date);
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
