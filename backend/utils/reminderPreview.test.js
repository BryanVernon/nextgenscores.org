import test from "node:test";
import assert from "node:assert/strict";
import { buildReminderPreview } from "./reminderPreview.js";

test("reminder preview targets one valid email and uses recognizable sample data", () => {
  assert.deepEqual(buildReminderPreview("bryan@nextgenscores.org", { week: 3 }), {
    to: "bryan@nextgenscores.org",
    name: "Bryan",
    poolName: "NextGenScores Preview Pool",
    poolId: "preview",
    week: 3,
    missingCount: 3,
  });
});

test("reminder preview rejects invalid recipient addresses", () => {
  assert.throws(() => buildReminderPreview("not-an-email"), /valid email/i);
});
