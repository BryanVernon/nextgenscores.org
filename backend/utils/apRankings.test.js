import test from "node:test";
import assert from "node:assert/strict";
import { currentApRanks, isUsableApPoll, latestApWeek, rankingSnapshotOperations, requireRankingSnapshot } from "./apRankings.js";

test("latest AP poll selects the highest week when the provider response is unordered", () => {
  const polls = [
    { week: 1, ranks: ["week 1"] },
    { week: 4, ranks: ["week 4"] },
    { week: 2, ranks: ["week 2"] },
    { week: 3, ranks: ["week 3"] },
  ];
  assert.deepEqual(latestApWeek(polls), { week: 4, ranks: ["week 4"] });
});

test("latest AP poll ignores malformed weeks and requires a valid week", () => {
  const polls = [
    { week: undefined, ranks: ["invalid"] },
    { week: null, ranks: ["invalid"] },
    { week: " ", ranks: ["invalid"] },
    { week: false, ranks: ["invalid"] },
    { week: [], ranks: ["invalid"] },
    { week: "not-a-week", ranks: ["invalid"] },
    { week: 2.5, ranks: ["invalid"] },
    { week: "4", ranks: ["week 4"] },
    { week: 3, ranks: ["week 3"] },
  ];
  assert.deepEqual(latestApWeek(polls), { week: "4", ranks: ["week 4"] });
  assert.equal(latestApWeek(polls.slice(0, 3)), null);
});

test("AP poll must contain an array of valid ranked schools", () => {
  assert.equal(isUsableApPoll({ ranks: [{ school: "Ole Miss", rank: 4 }] }), true);
  assert.equal(isUsableApPoll({ ranks: [] }), false);
  assert.equal(isUsableApPoll({ ranks: "not-an-array" }), false);
  assert.equal(isUsableApPoll({ ranks: [{ school: "", rank: 4 }] }), false);
  assert.equal(isUsableApPoll({ ranks: [{ school: "Ole Miss", rank: null }] }), false);
});

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
