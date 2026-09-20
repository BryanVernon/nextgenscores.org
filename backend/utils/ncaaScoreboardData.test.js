import test from "node:test";
import assert from "node:assert/strict";
import { ncaaScoreboardUpdates } from "./ncaaScoreboardData.js";

const scheduledGames = [
  { id: 401, homeTeam: "Ohio State", awayTeam: "Illinois", startDate: "2026-09-26T16:00:00.000Z" },
  { id: 402, homeTeam: "Texas Tech", awayTeam: "Houston", startDate: "2026-09-26T16:00:00.000Z" },
];

test("NCAA scoreboard data updates a uniquely matched scheduled game", () => {
  const updates = ncaaScoreboardUpdates({ games: [{ game: {
    gameID: "6604083",
    gameState: "live",
    currentPeriod: "3rd",
    contestClock: "04:21",
    home: { names: { short: "Ohio St." }, score: "24" },
    away: { names: { short: "Illinois" }, score: "17" },
  } }] }, scheduledGames, "2026-09-26T17:00:00.000Z");

  assert.deepEqual(updates, [{
    id: 401,
    homePoints: 24,
    awayPoints: 17,
    liveStatus: "live",
    completed: false,
    period: 3,
    clock: "04:21",
    updatedAt: new Date("2026-09-26T17:00:00.000Z"),
  }]);
});

test("NCAA scoreboard data ignores unmatched games instead of updating the wrong game", () => {
  const updates = ncaaScoreboardUpdates({ games: [{ game: {
    gameID: "999",
    gameState: "final",
    home: { names: { short: "Unknown Home" }, score: "20" },
    away: { names: { short: "Unknown Away" }, score: "10" },
  } }] }, scheduledGames);

  assert.deepEqual(updates, []);
});

test("NCAA scoreboard data rejects malformed scoreboard payloads", () => {
  assert.throws(() => ncaaScoreboardUpdates({ games: [{ game: { gameID: "abc" } }] }, scheduledGames), /invalid NCAA scoreboard payload/i);
  assert.throws(() => ncaaScoreboardUpdates({ games: "invalid" }, scheduledGames), /invalid NCAA scoreboard payload/i);
});
