import test from "node:test";
import assert from "node:assert/strict";
import { leaderboardEmail } from "./mailer.js";

test("Sunday results email includes final scores and standings", () => {
  const email = leaderboardEmail({
    name: "Taylor", poolName: "Friends", week: 4, baseUrl: "https://example.test",
    games: [{ awayTeam: "Away", awayPoints: 17, homeTeam: "Home", homePoints: 24 }],
    entries: [{ rank: 1, name: "Taylor", correct: 8 }],
  });
  assert.match(email.subject, /Friends: Week 4 results/);
  assert.match(email.text, /Away 17 at Home 24/);
  assert.match(email.html, /#1 Taylor — 8 correct/);
});
