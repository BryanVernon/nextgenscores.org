function validInteger(value, minimum = 0) {
  if (typeof value === "number") return Number.isInteger(value) && value >= minimum;
  return typeof value === "string" && /^\d+$/.test(value) && Number(value) >= minimum;
}

export function latestApWeek(polls) {
  return polls
    .filter(poll => validInteger(poll.week))
    .reduce((latest, poll) => (
      !latest || Number(poll.week) > Number(latest.week) ? poll : latest
    ), null);
}

export function isUsableApPoll(poll) {
  return Array.isArray(poll?.ranks)
    && poll.ranks.length > 0
    && poll.ranks.every(rank => (
      typeof rank?.school === "string"
      && rank.school.trim().length > 0
      && validInteger(rank.rank, 1)
      && Number(rank.rank) <= 25
    ));
}

export function currentApRanks(game, ranks) {
  return {
    homeApRank: ranks.get(game.homeTeam) ?? null,
    awayApRank: ranks.get(game.awayTeam) ?? null,
  };
}

export function requireRankingSnapshot(documents) {
  if (!documents.length) throw new Error("CFBD AP Top 25 poll returned no usable rankings");
  return documents;
}

export function rankingSnapshotOperations(year, documents) {
  const schools = documents.map(rank => rank.school);
  return [
    { deleteMany: { filter: { year, school: { $nin: schools } } } },
    ...documents.map(rank => ({
      updateOne: {
        filter: { year: rank.year, school: rank.school },
        update: { $set: rank },
        upsert: true,
      },
    })),
  ];
}
