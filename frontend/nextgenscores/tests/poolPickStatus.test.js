import test from "node:test";
import assert from "node:assert/strict";
import { poolPickStatus } from "../src/poolPickStatus.js";

const now = Date.parse("2026-09-18T12:00:00Z");
const games = [
  { id: 1, startDate: "2026-09-19T17:00:00Z" },
  { id: 2, startDate: "2026-09-19T20:00:00Z" },
  { id: 3, startDate: "2026-09-19T23:00:00Z" },
];

test("an unfinished pool clearly tells a player how many picks remain", () => {
  assert.deepEqual(poolPickStatus(games, { 1: "home" }, now), {
    complete: false,
    message: "2 picks left this week",
    action: "Make picks",
  });
});

test("a completed pool invites a player to review picks", () => {
  assert.deepEqual(poolPickStatus(games, { 1: "home", 2: "away", 3: "home" }, now), {
    complete: true,
    message: "All picks saved",
    action: "Review picks",
  });
});

test("locked games with missing picks are never presented as complete", () => {
  assert.deepEqual(poolPickStatus([{ id: 1, startDate: "2026-09-17T12:00:00Z" }], {}, now), {
    complete: false,
    message: "Picks are locked for this week",
    action: "View pool",
  });
});
