import test from "node:test";
import assert from "node:assert/strict";
import { isGameLocked, laterPeriod, isEligible, validatePickChanges, firstUnstartedPeriod } from "./poolTiming.js";

const now = Date.parse("2026-09-05T18:00:00Z");
const started = { id: 1, startDate: "2026-09-05T18:00:00Z" };
const upcoming = { id: 2, startDate: "2026-09-05T18:00:01Z" };

test("locks exactly at kickoff, but not before", () => {
  assert.equal(isGameLocked(started, now), true);
  assert.equal(isGameLocked(upcoming, now), false);
});
test("unknown kickoff and existing scores fail closed", () => {
  for (const game of [{}, { startDate: "invalid" }, { ...upcoming, homePoints: 0 }]) assert.equal(isGameLocked(game, now), true);
});
test("started games cannot receive new picks or changed picks", () => {
  assert.throws(() => validatePickChanges([started], [{ gameId: 1, pick: "home" }], new Map(), now), /locked/);
  assert.throws(() => validatePickChanges([started], [{ gameId: 1, pick: "away" }], new Map([[1, "home"]]), now), /locked/);
});
test("unchanged locked picks are no-ops while unstarted picks remain editable", () => {
  assert.deepEqual(validatePickChanges([started, upcoming], [{ gameId: 1, pick: "home" }, { gameId: 2, pick: "away" }], new Map([[1, "home"]]), now), [{ gameId: 2, pick: "away" }]);
});
test("rejects invalid selections and stale game IDs", () => {
  assert.throws(() => validatePickChanges([upcoming], [{ gameId: 99, pick: "home" }], new Map(), now));
  assert.throws(() => validatePickChanges([upcoming], [{ gameId: 2, pick: "other" }], new Map(), now));
});
test("start periods handle week zero, year boundaries and legacy pools", () => {
  assert.deepEqual(laterPeriod({ season: 2026, week: 0 }, { season: 2026, week: 1 }), { season: 2026, week: 1 });
  assert.deepEqual(laterPeriod({ season: 2026, week: 15 }, { season: 2027, week: 0 }), { season: 2027, week: 0 });
  assert.equal(isEligible({}, "user", 2026, 0), true);
});
test("new pool and late members do not compete before their assigned week", () => {
  const pool = { startSeason: 2026, startWeek: 2, memberStarts: new Map([["late", { season: 2026, week: 3 }]]) };
  assert.equal(isEligible(pool, "owner", 2026, 1), false);
  assert.equal(isEligible(pool, "owner", 2026, 2), true);
  assert.equal(isEligible(pool, "late", 2026, 2), false);
  assert.equal(isEligible(pool, "late", 2026, 3), true);
});
test("opening week skips a lineup with even one started game", async () => {
  const weeks = [[{ ...started, season: 2026, week: 1 }, { ...upcoming, season: 2026, week: 1 }], [{ ...upcoming, season: 2026, week: 2 }]];
  assert.deepEqual(await firstUnstartedPeriod(weeks, async games => games, () => now), { season: 2026, week: 2 });
});
test("only selected lineup games determine whether a pool can start this week", async () => {
  const weeks = [[{ ...started, season: 2026, week: 1 }, { ...upcoming, season: 2026, week: 1 }]];
  assert.deepEqual(await firstUnstartedPeriod(weeks, async games => games.filter(game => game.id === 2), () => now), { season: 2026, week: 1 });
});
test("no future lineup returns no period, rather than inventing a week", async () => {
  assert.equal(await firstUnstartedPeriod([[{ ...started, season: 2026, week: 15 }]], async games => games, () => now), null);
  assert.equal(await firstUnstartedPeriod([[{ ...upcoming, season: 2026, week: 1 }]], async () => [], () => now), null);
});
