import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gameDateLabel, gameStatus, groupGamesByDate, latestUpdate, spreadLabel, teamScheduleFilters, teamScheduleHref } from "../src/scheduleUtils.js";

test("team selection shows all weeks", () => {
  assert.deepEqual(teamScheduleFilters("Texas A&M"), { team: "Texas A&M", conference: "All", week: "all" });
});

test("team schedule links preserve the full team name", () => {
  assert.equal(teamScheduleHref("Texas A&M"), "/schedule?week=all&team=Texas%20A%26M");
  assert.equal(teamScheduleHref(""), "/schedule");
});

test("schedule game cards opt into kickoff date labels", () => {
  const scoreboardSource = readFileSync(new URL("../src/pages/Scoreboard.jsx", import.meta.url), "utf8");
  assert.match(scoreboardSource, /<GameCard game=\{game\} showDate \/>/);
});

test("featured game dates use the selected timezone", () => {
  assert.equal(gameDateLabel("2026-09-27T00:30:00Z", "America/Chicago"), "Sat 9/26");
  assert.equal(gameDateLabel("invalid", "America/Chicago"), null);
});

test("a kickoff in the past is not evidence of a live or final game", () => {
  const game = { startDate: "2026-09-01T12:00:00Z" };
  assert.equal(gameStatus(game, Date.parse("2026-09-02")).label, "Awaiting update");
  assert.equal(gameStatus({ ...game, homePoints: 0, awayPoints: 7 }).label, "Score reported");
  assert.equal(gameStatus({ ...game, homePoints: 0, awayPoints: 7, completed: false }).label, "In progress");
  assert.equal(gameStatus({ ...game, completed: true }).label, "Final");
});

test("unknown kickoffs do not display invalid dates or pretend to have a kickoff time", () => {
  for (const startDate of [null, undefined, "", "invalid"]) {
    assert.equal(gameStatus({ startDate }).label, "Time TBD");
    assert.equal(groupGamesByDate([{ startDate }])[0].label, "Date to be announced");
  }
  assert.equal(gameStatus({ startTimeTBD: true, startDate: "2030-09-01" }).label, "Time TBD");
});

test("spread identifies the correct favorite including away favorites and pick'em", () => {
  const game = { homeTeam: "Texas", awayTeam: "Ohio State" };
  assert.equal(spreadLabel({ ...game, spread: -7.5 }), "Texas −7.5");
  assert.equal(spreadLabel({ ...game, spread: 3 }), "Ohio State −3");
  assert.equal(spreadLabel({ ...game, spread: 0 }), "Even (pick 'em)");
  assert.equal(spreadLabel(game), null);
  assert.equal(spreadLabel({ ...game, spread: NaN }), null);
});

test("date groups order games chronologically and keep unknown dates last without mutating input", () => {
  const games = [{ id: 3 }, { id: 2, startDate: "2026-09-19T23:00:00Z" }, { id: 1, startDate: "2026-09-19T20:00:00Z" }];
  assert.deepEqual(groupGamesByDate(games).flatMap(group => group.games.map(game => game.id)), [1, 2, 3]);
  assert.deepEqual(games.map(game => game.id), [3, 2, 1]);
});

test("freshness uses the source timestamp, not the time the page loaded", () => {
  assert.equal(latestUpdate([{ updatedAt: "bad" }]), null);
  assert.equal(latestUpdate([{ updatedAt: "2026-09-16T12:00:00Z" }, { updatedAt: "2026-09-17T12:00:00Z" }]).toISOString(), "2026-09-17T12:00:00.000Z");
});
