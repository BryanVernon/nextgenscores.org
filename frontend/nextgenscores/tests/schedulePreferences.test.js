import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SCHEDULE_CONFERENCES, effectiveScheduleConferences, filterScheduleGames, scheduleConferenceGames, visibleScheduleConferences } from "../src/schedulePreferences.js";

const teams = [
  { name: "Oregon State", conference: "Pac-12" },
  { name: "Memphis", conference: "American" },
];

test("schedule preferences start with only the Power Five conferences", () => {
  assert.deepEqual(DEFAULT_SCHEDULE_CONFERENCES, ["ACC", "Big Ten", "Big 12", "Pac-12", "SEC"]);
  assert.deepEqual(effectiveScheduleConferences([], [], teams), DEFAULT_SCHEDULE_CONFERENCES);
});

test("a favorite team adds its conference to the default schedule view", () => {
  assert.deepEqual(effectiveScheduleConferences(["SEC"], ["Memphis"], teams), ["SEC", "American"]);
});

test("all-conference schedule filtering retains matchups involving a selected conference", () => {
  const games = [
    { id: 1, homeConference: "SEC", awayConference: "Sun Belt" },
    { id: 2, homeConference: "American", awayConference: "MAC" },
    { id: 3, homeConference: "Mountain West", awayConference: "Mountain West" },
  ];

  assert.deepEqual(filterScheduleGames(games, ["SEC", "American"]).map(game => game.id), [1, 2]);
});

test("conference options show the first nine until expanded", () => {
  const conferences = Array.from({ length: 12 }, (_, index) => `Conference ${index + 1}`);
  assert.deepEqual(visibleScheduleConferences(conferences, false), conferences.slice(0, 9));
  assert.deepEqual(visibleScheduleConferences(conferences, true), conferences);
});

test("featured games schedule filter returns the curated matchup slate", () => {
  const games = [
    { id: 1, homeConference: "SEC", awayConference: "SEC", spread: 21, startDate: "2026-09-19T18:00:00Z" },
    { id: 2, homeConference: "SEC", awayConference: "SEC", homeApRank: 3, awayApRank: 8, spread: 3, startDate: "2026-09-19T20:00:00Z" },
    ...Array.from({ length: 9 }, (_, index) => ({ id: index + 3, homeConference: "SEC", awayConference: "SEC", spread: 6, startDate: `2026-09-20T${String(12 + index).padStart(2, "0")}:00:00Z` })),
  ];
  const featured = scheduleConferenceGames(games, "Featured games", []);
  assert.equal(featured.length, 10);
  assert.equal(featured[0].id, 2);
  assert.ok(!featured.some(game => game.id === 1));
});
