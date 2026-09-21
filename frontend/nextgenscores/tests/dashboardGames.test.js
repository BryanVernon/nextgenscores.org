import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { favoriteGameDay, favoriteTeamNextGame } from "../src/dashboardGames.js";

test("favorite team game cards preserve the home and away logos", () => {
  const game = favoriteTeamNextGame("Team A", {
    isHome: false,
    opponent: "Team B",
    startDate: "2026-09-19T18:00:00Z",
    outlet: "ESPN",
    spread: -3.5,
    overUnder: 52.5,
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
    spread: -3.5,
    overUnder: 52.5,
  });
});

test("favorite next-game cards show the kickoff date", () => {
  const dashboardSource = readFileSync(new URL("../src/pages/Dashboard.jsx", import.meta.url), "utf8");
  assert.match(dashboardSource, /dashboard-game-label[\s\S]{0,200}<GameCard game=\{game\} showDate \/>/);
});

test("favorite game day includes the selected timezone date", () => {
  assert.equal(favoriteGameDay("2026-09-20T03:30:00Z", "America/Chicago"), "Saturday 9/19");
});
