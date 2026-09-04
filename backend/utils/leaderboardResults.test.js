import test from "node:test";
import assert from "node:assert/strict";
import { getPickResult, getPickResults } from "./leaderboardResults.js";

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
