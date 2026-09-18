import test from "node:test";
import assert from "node:assert/strict";
import { reminderEmail } from "./reminderEmail.js";

test("reminder email uses a concise subject and pool-focused copy", () => {
  const email = reminderEmail({
    name: "Bryan",
    poolName: "Saturday Survivors",
    poolId: "pool-3",
    week: 3,
    firstGameAt: "2026-09-19T17:00:00Z",
    missingCount: 10,
    timeZone: "America/Chicago",
  });

  assert.equal(email.subject, "Week 3 picks are waiting");
  assert.match(email.text, /Saturday Survivors/);
  assert.doesNotMatch(email.text, /10 picks/);
  assert.match(email.html, /Make my picks/);
  assert.match(email.html, /NextGenScores/);
});
