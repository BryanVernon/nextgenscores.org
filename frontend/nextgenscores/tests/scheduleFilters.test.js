import test from "node:test";
import assert from "node:assert/strict";
import { defaultScheduleConference } from "../src/scheduleFilters.js";

test("the schedule starts in the saved conference selection view", () => {
  assert.equal(defaultScheduleConference, "All");
});
