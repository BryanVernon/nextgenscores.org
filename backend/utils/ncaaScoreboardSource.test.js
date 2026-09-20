import test from "node:test";
import assert from "node:assert/strict";
import { NCAA_SCOREBOARD_URL } from "./ncaaScoreboardSource.js";

test("live scoreboard uses the deployed NextGenScores NCAA API service", () => {
  assert.equal(NCAA_SCOREBOARD_URL, "https://ncaa-api-e2vv.onrender.com/scoreboard/football/fbs");
});
