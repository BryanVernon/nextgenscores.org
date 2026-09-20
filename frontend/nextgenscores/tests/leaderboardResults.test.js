import test from "node:test";
import assert from "node:assert/strict";
import { chronologicalResults, weeklyCorrectness } from "../src/leaderboardResults.js";

test("leaderboard pick cards are ordered by kickoff, with unknown times last", () => {
  const results = [
    { gameId: 3, startDate: null },
    { gameId: 2, startDate: "2026-09-19T20:30:00Z" },
    { gameId: 1, startDate: "2026-09-19T16:00:00Z" },
  ];

  assert.deepEqual(chronologicalResults(results).map(game => game.gameId), [1, 2, 3]);
  assert.deepEqual(results.map(game => game.gameId), [3, 2, 1]);
});

test("weekly leaderboard correctness includes the lineup total and percentage", () => {
  assert.equal(weeklyCorrectness(5, 10), "5/10 correct 50%");
  assert.equal(weeklyCorrectness(0, 0), "0/0 correct 0%");
});
