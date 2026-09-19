function kickoffTime(game) {
  if (!game.startDate) return Number.POSITIVE_INFINITY;
  const time = new Date(game.startDate).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

export function chronologicalResults(results = []) {
  return [...results].sort((left, right) => kickoffTime(left) - kickoffTime(right));
}
