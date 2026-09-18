import test from "node:test";
import assert from "node:assert/strict";
import { pickLocked, savedPickSummary } from "../src/pickState.js";

const now = Date.parse("2026-09-19T18:00:00Z");
const games = [
  { id: 1, startDate: "2026-09-19T17:00:00Z" },
  { id: 2, startDate: "2026-09-19T19:00:00Z" },
];

test("kickoff alone never makes an empty entry count as saved", () => {
  assert.deepEqual(savedPickSummary(games, {}, now + 7200000), { saved: 0, missed: 2, ready: false });
  assert.deepEqual(savedPickSummary([], {}, now), { saved: 0, missed: 0, ready: false });
});

test("saved entries separately report locked games with no submission", () => {
  assert.deepEqual(savedPickSummary(games, { 2: "away" }, now), { saved: 1, missed: 1, ready: true });
  assert.deepEqual(savedPickSummary(games, { 1: "home" }, now), { saved: 1, missed: 0, ready: false });
  assert.deepEqual(savedPickSummary(games, { 1: "home", 2: "away" }, now), { saved: 2, missed: 0, ready: true });
});

test("unrelated or invalid picks cannot mark this week's entry as saved", () => {
  assert.equal(savedPickSummary(games, { 2: "", 3: "home" }, now).ready, false);
});

test("picks close exactly at kickoff and honor server locks and unknown kickoff times", () => {
  assert.equal(pickLocked(games[1], now), false);
  assert.equal(pickLocked(games[1], now + 3600000), true);
  assert.equal(pickLocked({ ...games[1], locked: true }, now), true);
  assert.equal(pickLocked({ id: 3, startDate: null }, now), true);
  assert.equal(pickLocked({ id: 3, startDate: "invalid" }, now), true);
});
