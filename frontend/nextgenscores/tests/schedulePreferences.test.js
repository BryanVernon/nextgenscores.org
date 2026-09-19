import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SCHEDULE_CONFERENCES, effectiveScheduleConferences, filterScheduleGames } from "../src/schedulePreferences.js";

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
