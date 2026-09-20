export const DEFAULT_SCHEDULE_CONFERENCES = ["ACC", "Big Ten", "Big 12", "Pac-12", "SEC"];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function effectiveScheduleConferences(savedConferences, favoriteTeams, teams) {
  const selected = Array.isArray(savedConferences) && savedConferences.length
    ? savedConferences
    : DEFAULT_SCHEDULE_CONFERENCES;
  const favoriteConferences = (teams || [])
    .filter(team => favoriteTeams?.includes(team.name))
    .map(team => team.conference);
  return unique([...selected, ...favoriteConferences]);
}

export function filterScheduleGames(games, conferences) {
  const selected = new Set(conferences);
  return games.filter(game => selected.has(game.homeConference) || selected.has(game.awayConference));
}

export function visibleScheduleConferences(conferences, expanded, limit = 9) {
  return expanded ? conferences : conferences.slice(0, limit);
}
