import test from "node:test";
import assert from "node:assert/strict";
import { favoriteTeamNextGame } from "../src/dashboardGames.js";

test("favorite team game cards preserve the home and away logos", () => {
  const game = favoriteTeamNextGame("Team A", {
    isHome: false,
    opponent: "Team B",
    startDate: "2026-09-19T18:00:00Z",
    outlet: "ESPN",
    teamLogo: "team-a.svg",
    opponentLogo: "team-b.svg",
  });

  assert.deepEqual(game, {
    homeTeam: "Team B",
    awayTeam: "Team A",
    homeLogo: "team-b.svg",
    awayLogo: "team-a.svg",
    startDate: "2026-09-19T18:00:00Z",
    outlet: "ESPN",
  });
});
