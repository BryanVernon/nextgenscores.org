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
