import test from "node:test";
import assert from "node:assert/strict";
import { defaultScheduleConference } from "../src/scheduleFilters.js";

test("the public schedule defaults to the complete slate", () => {
  assert.equal(defaultScheduleConference, "All");
});
