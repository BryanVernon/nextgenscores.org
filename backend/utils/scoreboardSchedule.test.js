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
