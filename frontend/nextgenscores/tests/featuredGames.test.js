import test from "node:test";
import assert from "node:assert/strict";
import { featuredGames, featuredWeekIndex } from "../src/featuredGames.js";

const games = [
  { id: 1, homeTeam: "Unranked A", awayTeam: "Unranked B", spread: 28, startDate: "2026-09-19T17:00:00Z" },
  { id: 2, homeTeam: "Ranked A", awayTeam: "Ranked B", homeApRank: 5, awayApRank: 8, spread: -3.5, startDate: "2026-09-19T20:00:00Z" },
  ...Array.from({ length: 10 }, (_, index) => ({
    id: index + 3,
    homeTeam: `Team ${index + 3}`,
    awayTeam: `Opponent ${index + 3}`,
    homeConference: "SEC",
    spread: 7 + index / 10,
    startDate: `2026-09-20T${String(9 - index).padStart(2, "0")}:00:00Z`,
  })),
];

test("featured games prioritizes competitive marquee matchups and limits the dashboard to ten", () => {
  const result = featuredGames(games);

  assert.equal(result.length, 10);
  assert.equal(result[0].id, 2);
  assert.ok(!result.some(game => game.id === 1));
  assert.ok(result.every((game, index) => index === 0 || new Date(result[index - 1].startDate) <= new Date(game.startDate)));
  assert.deepEqual(games.map(game => game.id), Array.from({ length: 12 }, (_, index) => index + 1));
});

test("featured weeks turn over on Sunday in the display timezone", () => {
  const weeks = [
    { week: 3, startDate: "2026-09-17T00:00:00Z" },
    { week: 4, startDate: "2026-09-24T00:00:00Z" },
  ];

  assert.equal(featuredWeekIndex(weeks, new Date("2026-09-19T18:00:00Z"), "America/Chicago"), 0);
  assert.equal(featuredWeekIndex(weeks, new Date("2026-09-20T18:00:00Z"), "America/Chicago"), 1);
});
