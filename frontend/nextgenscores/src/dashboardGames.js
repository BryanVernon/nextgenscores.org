export function favoriteTeamNextGame(team, nextGame) {
  if (!nextGame) return null;
  return {
    homeTeam: nextGame.isHome ? team : nextGame.opponent,
    awayTeam: nextGame.isHome ? nextGame.opponent : team,
    homeLogo: nextGame.isHome ? nextGame.teamLogo : nextGame.opponentLogo,
    awayLogo: nextGame.isHome ? nextGame.opponentLogo : nextGame.teamLogo,
    startDate: nextGame.startDate,
    outlet: nextGame.outlet,
  };
}
