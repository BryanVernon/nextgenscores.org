export const CONFERENCES = ["AP Top 25", "SEC", "Big Ten", "ACC", "Big 12", "Pac-12", "American", "Mountain West", "Sun Belt", "Conference USA", "MAC", "Independent", "FBS Independents", "Pioneer", "UAC", "Ivy League"];

export function getTeamGroups(games) {
  const teams = new Map();
  const conferenceOrder = CONFERENCES.slice(1);

  games.forEach(game => {
    if (game.name) {
      const current = teams.get(game.name);
      teams.set(game.name, {
        name: game.name,
        conference: game.conference || current?.conference || "Other teams",
        rank: game.rank != null ? Math.min(Number(game.rank), current?.rank ?? Infinity) : current?.rank,
      });
      return;
    }
    [[game.homeTeam, game.homeConference, game.homeApRank], [game.awayTeam, game.awayConference, game.awayApRank]].forEach(([name, conference, rank]) => {
      if (!name) return;
      const current = teams.get(name);
      teams.set(name, {
        name,
        conference: conference || current?.conference || "Other teams",
        rank: rank != null ? Math.min(Number(rank), current?.rank ?? Infinity) : current?.rank,
      });
    });
  });

  const values = [...teams.values()];
  const top25 = values.filter(item => Number.isFinite(item.rank)).sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  const rankedNames = new Set(top25.map(item => item.name));
  const remaining = values.filter(item => !rankedNames.has(item.name));
  const groupNames = [...conferenceOrder, ...[...new Set(remaining.map(item => item.conference))].filter(item => !conferenceOrder.includes(item)).sort()];

  return {
    top25,
    remaining: groupNames.map(name => ({ name, teams: remaining.filter(item => item.conference === name).sort((a, b) => a.name.localeCompare(b.name)) })).filter(group => group.teams.length),
  };
}
