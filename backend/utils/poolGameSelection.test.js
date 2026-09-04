import test from "node:test";
import assert from "node:assert/strict";
import PoolWeek from "../models/poolWeek.js";
import { selectGamesForPool } from "./poolGameSelection.js";

test("saved lineups remain fixed even if rankings change", async t => {
  t.mock.method(PoolWeek, "findOne", () => ({ lean: async () => ({ gameIds: [2, 1] }) }));
  const games = [{ id: 1 }, { id: 2 }, { id: 3, homeApRank: 1 }];
  const selected = await selectGamesForPool({ pool: { _id: "pool", conference: "AP Top 25", gameSelection: "all" }, games, season: 2026, week: 1 });
  assert.deepEqual(selected.map(game => game.id), [2, 1]);
});
test("all-game lineups are frozen too, but empty schedules are not", async t => {
  t.mock.method(PoolWeek, "findOne", () => ({ lean: async () => null }));
  const create = t.mock.method(PoolWeek, "create", async () => ({}));
  const context = { pool: { _id: "pool", conference: "SEC", gameSelection: "all" }, season: 2026, week: 1 };
  await selectGamesForPool({ ...context, games: [] });
  assert.equal(create.mock.callCount(), 0);
  await selectGamesForPool({ ...context, games: [{ id: 1, homeConference: "SEC" }, { id: 2, homeConference: "ACC" }] });
  assert.deepEqual(create.mock.calls[0].arguments[0].gameIds, [1]);
});
