import test from "node:test";
import assert from "node:assert/strict";
import { isScoreboardRefreshTime } from "./scoreboardSchedule.js";

const central = "America/Chicago";

test("scoreboard refresh is due at 7 AM and 7 PM Central across daylight saving time", () => {
  assert.equal(isScoreboardRefreshTime(Date.parse("2026-09-18T12:17:00Z"), central), true);
  assert.equal(isScoreboardRefreshTime(Date.parse("2026-09-19T00:17:00Z"), central), true);
  assert.equal(isScoreboardRefreshTime(Date.parse("2026-09-18T13:17:00Z"), central), false);
  assert.equal(isScoreboardRefreshTime(Date.parse("2027-01-15T13:17:00Z"), central), true);
});

test("scoreboard refresh runs hourly from 11 AM through 11 PM Central on Saturdays", () => {
  assert.equal(isScoreboardRefreshTime(Date.parse("2026-09-19T16:17:00Z"), central), true);
  assert.equal(isScoreboardRefreshTime(Date.parse("2026-09-20T04:17:00Z"), central), true);
  assert.equal(isScoreboardRefreshTime(Date.parse("2027-01-16T17:17:00Z"), central), true);
  assert.equal(isScoreboardRefreshTime(Date.parse("2026-09-19T15:17:00Z"), central), false);
  assert.equal(isScoreboardRefreshTime(Date.parse("2026-09-20T16:17:00Z"), central), false);
});

test("daily 7 AM refresh remains correct across Central daylight-saving transitions", () => {
  assert.equal(isScoreboardRefreshTime(Date.parse("2027-03-14T12:17:00Z"), central), true);
  assert.equal(isScoreboardRefreshTime(Date.parse("2027-11-07T13:17:00Z"), central), true);
});
