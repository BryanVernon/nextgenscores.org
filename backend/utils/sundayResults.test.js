import test from "node:test";
import assert from "node:assert/strict";
import { allLineupGamesFinal, hasTimelyCompletePicks, isSundayResultsTime, sundayResultsWeek } from "./sundayResults.js";

const lineup = [
  { id: 1, startDate: "2026-09-19T17:00:00Z" },
  { id: 2, startDate: "2026-09-19T20:00:00Z" },
];

test("Sunday results require explicit final status for every lineup game", () => {
  assert.equal(allLineupGamesFinal([{ completed: true, homePoints: 21, awayPoints: 17 }]), true);
  assert.equal(allLineupGamesFinal([{ completed: undefined, homePoints: 21, awayPoints: 17 }]), false);
  assert.equal(allLineupGamesFinal([{ completed: false, homePoints: 21, awayPoints: 17 }]), false);
});

test("Sunday results select the completed prior slate and support Monday recovery", () => {
  const weeks = [
    { week: 4, startDate: "2026-09-17T00:00:00Z" },
    { week: 5, startDate: "2026-09-24T00:00:00Z" },
  ];
  assert.equal(sundayResultsWeek(weeks, Date.parse("2026-09-20T14:30:00Z")), 4);
  assert.equal(sundayResultsWeek(weeks, Date.parse("2026-09-21T14:30:00Z")), 4);
});

test("Sunday results are due during the 9 AM Central hour", () => {
  assert.equal(isSundayResultsTime(Date.parse("2026-09-20T14:30:00Z")), true);
  assert.equal(isSundayResultsTime(Date.parse("2026-09-20T15:00:00Z")), false);
  assert.equal(isSundayResultsTime(Date.parse("2026-09-19T14:30:00Z")), false);
});

test("Sunday results go only to complete on-time entries", () => {
  const onTime = [
    { gameId: 1, pick: "home", createdAt: "2026-09-19T16:59:00Z" },
    { gameId: 2, pick: "away", createdAt: "2026-09-19T19:59:00Z" },
  ];
  assert.equal(hasTimelyCompletePicks(lineup, onTime), true);
  assert.equal(hasTimelyCompletePicks(lineup, onTime.slice(0, 1)), false);
  assert.equal(hasTimelyCompletePicks(lineup, [{ ...onTime[0], createdAt: "2026-09-19T17:00:00Z" }, onTime[1]]), false);
  assert.equal(hasTimelyCompletePicks(lineup, [...onTime, { gameId: 999, pick: "home", createdAt: "2026-09-19T10:00:00Z" }]), true);
});
