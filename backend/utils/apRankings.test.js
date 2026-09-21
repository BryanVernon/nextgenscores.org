import test from "node:test";
import assert from "node:assert/strict";
import { currentApRanks, rankingSnapshotOperations, requireRankingSnapshot } from "./apRankings.js";

test("AP rank updates replace stale ranks and clear teams no longer ranked", () => {
  const ranks = new Map([["New Number One", 1]]);
  assert.deepEqual(currentApRanks({ homeTeam: "New Number One", awayTeam: "Formerly Ranked" }, ranks), {
    homeApRank: 1,
    awayApRank: null,
  });
});

test("ranking snapshot removes poll entries that are no longer ranked", () => {
  assert.deepEqual(rankingSnapshotOperations(2026, [
    { year: 2026, school: "New Number One", rank: 1 },
  ]), [
    { deleteMany: { filter: { year: 2026, school: { $nin: ["New Number One"] } } } },
    { updateOne: { filter: { year: 2026, school: "New Number One" }, update: { $set: { year: 2026, school: "New Number One", rank: 1 } }, upsert: true } },
  ]);
});

test("ranking refresh rejects an empty AP poll instead of treating it as fresh", () => {
  assert.throws(() => requireRankingSnapshot([]), /AP Top 25 poll/);
});
