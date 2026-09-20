function kickoffTime(game) {
  if (!game.startDate) return Number.POSITIVE_INFINITY;
  const time = new Date(game.startDate).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

export function chronologicalResults(results = []) {
  return [...results].sort((left, right) => kickoffTime(left) - kickoffTime(right));
}

export function weeklyCorrectness(correct, total) {
  const safeCorrect = Number.isFinite(Number(correct)) ? Number(correct) : 0;
  const safeTotal = Number.isFinite(Number(total)) && Number(total) > 0 ? Number(total) : 0;
  const percentage = safeTotal ? Math.round((safeCorrect / safeTotal) * 100) : 0;
  return `${safeCorrect}/${safeTotal} correct ${percentage}%`;
}
