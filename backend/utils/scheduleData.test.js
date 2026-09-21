import test from "node:test";
import assert from "node:assert/strict";
import { currentScheduleWeek, requestedScheduleWeek, readProviderArray, seasonTeamRecords, storeImportedGames } from "./scheduleData.js";

test("schedule current week rolls over on Sunday", () => {
  const weeks = [
    { week: 3, startDate: "2026-09-17T00:00:00Z" },
    { week: 4, startDate: "2026-09-24T00:00:00Z" },
  ];
  assert.equal(currentScheduleWeek(weeks, Date.parse("2026-09-19T18:00:00Z")), 3);
  assert.equal(currentScheduleWeek(weeks, Date.parse("2026-09-20T18:00:00Z")), 4);
});

test("season team records count only completed decisive games", () => {
  const records = seasonTeamRecords([
    { homeTeam: "Team A", awayTeam: "Team B", homePoints: 24, awayPoints: 10, completed: true },
    { homeTeam: "Team C", awayTeam: "Team A", homePoints: 17, awayPoints: 21, completed: true },
    { homeTeam: "Team A", awayTeam: "Team C", homePoints: 7, awayPoints: 7, completed: true },
    { homeTeam: "Team B", awayTeam: "Team C", homePoints: 14, awayPoints: 3, completed: false },
  ]);
  assert.equal(records.get("Team A"), "2-0");
  assert.equal(records.get("Team B"), "0-1");
  assert.equal(records.get("Team C"), "0-1");
});

test("week zero remains selectable after the season advances", () => {
  assert.equal(requestedScheduleWeek("0", 4), 0);
  assert.equal(requestedScheduleWeek("all", 4), null);
  assert.equal(requestedScheduleWeek(undefined, 4), 4);
  for (const value of ["-1", "1.5", "abc", ["0"], {}, "Infinity"]) {
    assert.throws(() => requestedScheduleWeek(value, 4));
  }
});

test("upstream errors and malformed feeds fail before import", async () => {
  await assert.rejects(readProviderArray({ ok: false, status: 503 }, "Games"), /503/);
  await assert.rejects(readProviderArray({ ok: true, json: async () => ({ message: "Quota reached" }) }, "Games"), /invalid response/);
  assert.deepEqual(await readProviderArray({ ok: true, json: async () => [] }, "Games"), []);
});

test("empty, invalid or mixed-season imports cannot write to the database", async t => {
  const Game = { bulkWrite: t.mock.fn() };
  const valid = { id: 1, season: 2026, homeTeam: "Home", awayTeam: "Away" };
  for (const games of [[], {}, [valid, { ...valid, id: 2, season: 2025 }], [valid, valid], [{ ...valid, id: null }]]) {
    await assert.rejects(storeImportedGames(Game, games, 2026));
  }
  assert.equal(Game.bulkWrite.mock.callCount(), 0);
});

test("refresh upserts game identities without deleting existing records", async t => {
  const Game = { bulkWrite: t.mock.fn(async () => ({ modifiedCount: 1 })) };
  const game = { id: 1, season: 2026, homeTeam: "Home", awayTeam: "Away", completed: false, startTimeTBD: true };
  await storeImportedGames(Game, [game], 2026);
  assert.deepEqual(Game.bulkWrite.mock.calls[0].arguments, [[{
    updateOne: { filter: { id: 1 }, update: { $set: game }, upsert: true },
  }], { ordered: false }]);
});
