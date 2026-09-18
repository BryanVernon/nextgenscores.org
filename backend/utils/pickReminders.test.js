import test from "node:test";
import assert from "node:assert/strict";
import { isFridayReminderTime } from "./pickReminders.js";

const chicago = "America/Chicago";

test("Friday pick reminders are due during the user's 9 AM local hour only", () => {
  assert.equal(isFridayReminderTime(Date.parse("2026-09-18T14:17:00Z"), chicago), true);
  assert.equal(isFridayReminderTime(Date.parse("2026-09-18T15:17:00Z"), chicago), false);
  assert.equal(isFridayReminderTime(Date.parse("2026-09-19T14:17:00Z"), chicago), false);
});
