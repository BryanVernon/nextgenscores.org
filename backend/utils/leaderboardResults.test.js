import test from "node:test";
import assert from "node:assert/strict";
import { getPickResult, getPickResults, isGameComplete } from "./leaderboardResults.js";

test("home and away picks use the same winner as leaderboard totals", () => {
  for (const [homePoints, awayPoints, winner] of [[21, 7, "home"], [0, 3, "away"]]) {
    const game = { homePoints, awayPoints };
    assert.equal(getPickResult(game, winner), "correct");
    assert.equal(getPickResult(game, winner === "home" ? "away" : "home"), "incorrect");
  }
});
test("breakdown includes stored betting lines and logos, retaining a pick'em spread", () => {
  const [withOdds, withoutOdds] = getPickResults([
    { id: 1, spread: 0, overUnder: 45.5, oddsSource: "CollegeFootballData", homeLogo: "home.svg", awayLogo: "away.svg" },
    { id: 2 },
  ], new Map());
  assert.equal(withOdds.spread, 0);
  assert.equal(withOdds.overUnder, 45.5);
  assert.equal(withOdds.oddsSource, "CollegeFootballData");
  assert.equal(withOdds.homeLogo, "home.svg");
  assert.equal(withOdds.awayLogo, "away.svg");
  assert.equal(withoutOdds.spread, null);
  assert.equal(withoutOdds.overUnder, null);
  assert.equal(withoutOdds.oddsSource, null);
});
test("pending, missing picks and ties do not count as incorrect", () => {
  assert.equal(getPickResult({ homePoints: null, awayPoints: null }, "home"), "pending");
  assert.equal(getPickResult({ homePoints: 7 }, "away"), "pending");
  assert.equal(getPickResult({ homePoints: 7, awayPoints: 0 }), "unpicked");
  assert.equal(getPickResult({ homePoints: 0, awayPoints: 0 }, "home"), "tie");
});
test("breakdown includes only selected pool games and retains score zero", () => {
  const games = [{ id: 1, homeTeam: "Home", awayTeam: "Away", homePoints: 0, awayPoints: 7 }, { id: 2 }];
  const results = getPickResults(games, new Map([[1, "away"], [99, "home"]]));
  assert.equal(results.length, 2);
  assert.equal(results[0].homePoints, 0);
  assert.equal(results[0].result, "correct");
  assert.equal(results[1].result, "unpicked");
  assert.equal(results[1].pick, null);
});

test("spread pools score a favorite that wins without covering as incorrect", () => {
  const game = { homePoints: 24, awayPoints: 21, spread: -7.5 };
  assert.equal(getPickResult(game, "home", "straight"), "correct");
  assert.equal(getPickResult(game, "home", "spread"), "incorrect");
  assert.equal(getPickResult(game, "away", "spread"), "correct");
});

test("spread pools apply positive home handicaps and preserve pushes", () => {
  assert.equal(getPickResult({ homePoints: 17, awayPoints: 21, spread: 4.5 }, "home", "spread"), "correct");
  for (const pick of ["home", "away"]) {
    assert.equal(getPickResult({ homePoints: 28, awayPoints: 21, spread: -7 }, pick, "spread"), "tie");
  }
  assert.equal(getPickResult({ homePoints: 0, awayPoints: 3, spread: 0 }, "away", "spread"), "correct");
});

test("an unavailable spread does not silently grade a spread pick straight-up", () => {
  for (const spread of [undefined, null, "", NaN, "unavailable"]) {
    assert.equal(getPickResult({ homePoints: 21, awayPoints: 7, spread }, "home", "spread"), "pending");
  }
});

test("leaderboard breakdown forwards the pool scoring rules", () => {
  const [result] = getPickResults([{ id: 1, homePoints: 24, awayPoints: 21, spread: -7.5 }], new Map([[1, "away"]]), "spread");
  assert.equal(result.result, "correct");
});

test("in-progress scores are not awarded as completed wins", () => {
  assert.equal(getPickResult({ homePoints: 21, awayPoints: 7, completed: false }, "home"), "pending");
  assert.equal(getPickResult({ homePoints: 21, awayPoints: 7, completed: true }, "home"), "correct");
});

test("standings and notification completion share final-score checks", () => {
  assert.equal(isGameComplete({ homePoints: 21, awayPoints: 7, completed: false }), false);
  assert.equal(isGameComplete({ homePoints: 21, awayPoints: 7, completed: true }), true);
  assert.equal(isGameComplete({ homePoints: 21, awayPoints: 7 }), true);
  assert.equal(isGameComplete({ homePoints: "unavailable", awayPoints: 7 }), false);
  assert.equal(isGameComplete({ homePoints: null, awayPoints: 0, completed: true }), false);
});

test("other players' selections remain hidden until each game locks", () => {
  const kickoff = Date.parse("2026-09-19T17:00:00Z");
  const games = [{ id: 1, startDate: new Date(kickoff).toISOString() }, { id: 2, startDate: new Date(kickoff + 3600000).toISOString() }];
  const picks = new Map([[1, "home"], [2, "away"]]);
  const before = getPickResults(games, picks, "straight", { hideUnlocked: true, now: kickoff - 1 });
  assert.ok(before.every(result => result.pick === null && result.pickHidden && result.result === "hidden"));
  const atKickoff = getPickResults(games, picks, "straight", { hideUnlocked: true, now: kickoff });
  assert.equal(atKickoff[0].pick, "home");
  assert.equal(atKickoff[0].pickHidden, false);
  assert.equal(atKickoff[1].pick, null);
  assert.equal(atKickoff[1].result, "hidden");
});

test("players can review their own selections and hidden entries do not reveal missing picks", () => {
  const game = { id: 1, startDate: "2026-09-19T17:00:00Z" };
  const now = Date.parse("2026-09-19T16:00:00Z");
  assert.equal(getPickResults([game], new Map([[1, "away"]]), "straight", { now })[0].pick, "away");
  const [hiddenMissingPick] = getPickResults([game], new Map(), "straight", { hideUnlocked: true, now });
  assert.equal(hiddenMissingPick.result, "hidden");
  assert.equal(hiddenMissingPick.pick, null);
});
