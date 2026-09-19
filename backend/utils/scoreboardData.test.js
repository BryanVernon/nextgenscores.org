import test from "node:test";
import assert from "node:assert/strict";
import { scoreboardUpdate, scoreboardUpdates } from "./scoreboardData.js";

test("scoreboard updates retain live score and advanced game-state metrics", () => {
  assert.deepEqual(scoreboardUpdate({
    id: 101,
    status: "in_progress",
    period: 3,
    clock: "04:21",
    situation: "3rd & 4",
    possession: "Away Team",
    lastPlay: "Pass complete for 12 yards",
    startDate: "2026-09-19T18:00:00Z",
    homeTeam: { points: 24, winProbability: 0.73, lineScores: [7, 10, 7] },
    awayTeam: { points: 17, winProbability: 0.27, lineScores: [0, 10, 7] },
    weather: { temperature: 74, windSpeed: 8, windDirection: 220, description: "Clear" },
  }, "2026-09-19T18:00:00.000Z"), {
    id: 101,
    homePoints: 24,
    awayPoints: 17,
    completed: false,
    startDate: "2026-09-19T18:00:00Z",
    liveStatus: "in_progress",
    period: 3,
    clock: "04:21",
    situation: "3rd & 4",
    possession: "Away Team",
    lastPlay: "Pass complete for 12 yards",
    homeWinProbability: 0.73,
    awayWinProbability: 0.27,
    homeLineScores: [7, 10, 7],
    awayLineScores: [0, 10, 7],
    "weather.temperature": 74,
    "weather.windSpeed": 8,
    "weather.windDirection": 220,
    "weather.description": "Clear",
    updatedAt: new Date("2026-09-19T18:00:00.000Z"),
  });
});

test("scoreboard final status marks a game complete without overwriting absent metrics", () => {
  assert.deepEqual(scoreboardUpdate({ id: 102, status: "final", homeTeam: { points: 30 }, awayTeam: { points: 20 } }, "2026-09-19T18:00:00.000Z"), {
    id: 102,
    homePoints: 30,
    awayPoints: 20,
    completed: true,
    liveStatus: "final",
    updatedAt: new Date("2026-09-19T18:00:00.000Z"),
  });
});

test("missing scoreboard status preserves completion and partial weather fields", () => {
  assert.deepEqual(scoreboardUpdate({ id: 103, weather: { temperature: 61 } }, "2026-09-19T18:00:00.000Z"), {
    id: 103,
    "weather.temperature": 61,
    updatedAt: new Date("2026-09-19T18:00:00.000Z"),
  });
});

test("scoreboard payload validation rejects malformed entries before updates are returned", () => {
  assert.throws(() => scoreboardUpdates([{ id: 104, status: "in_progress", homeTeam: { points: 0 } }, { id: "bad" }]), /invalid scoreboard/i);
  assert.throws(() => scoreboardUpdates([{ id: 105, homeTeam: { lineScores: [7, "bad"] } }]), /invalid scoreboard/i);
});
