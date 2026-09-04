import test from "node:test";
import assert from "node:assert/strict";
import { selectFeaturedMatchups } from "./featuredMatchups.js";

const game = (id, fields = {}) => ({ id, spread: 1, startDate: "2026-09-05T18:00:00Z", ...fields });

test("major-conference games outrank small-school toss-ups", () => {
  for (const conference of ["SEC", "Big Ten", "ACC", "Big 12", "Pac-12"]) {
    assert.deepEqual(selectFeaturedMatchups([game(1), game(2, { spread: -11, homeConference: conference })]).map(g => g.id), [2, 1]);
  }
});
test("ranked teams qualify regardless of conference or home/away side", () => {
  assert.deepEqual(selectFeaturedMatchups([game(1), game(2, { spread: 10, awayApRank: 25 })]).map(g => g.id), [2, 1]);
});
test("ranked-vs-ranked can outrank a slightly closer conference matchup", () => {
  const ranked = game(1, { spread: 10, homeApRank: 3, awayApRank: 8 });
  const conference = game(2, { spread: 7, homeConference: "SEC", awayConference: "SEC" });
  assert.equal(selectFeaturedMatchups([conference, ranked])[0].id, 1);
});
test("large-spread marquee blowouts don't displace competitive games", () => {
  const blowout = game(1, { spread: 35, homeApRank: 1, homeConference: "SEC" });
  assert.equal(selectFeaturedMatchups([blowout, game(2)])[0].id, 2);
});
test("fills remaining slots, excludes missing lines, retains zero and limits to ten", () => {
  const preferred = game(100, { spread: 11, homeConference: "ACC" });
  const input = [game(200, { spread: null }), game(201, { spread: "" }), game(202, { spread: "bad" }), ...Array.from({ length: 12 }, (_, i) => game(i, { spread: i })), preferred];
  const results = selectFeaturedMatchups(input);
  assert.equal(results.length, 10);
  assert.equal(results[0].id, 100);
  assert.ok(results.some(g => g.spread === 0));
  assert.ok(results.every(g => g.id < 200));
  assert.equal(input.length, 16);
});
test("ties have stable ordering independent of input order", () => {
  assert.deepEqual(selectFeaturedMatchups([game(2), game(1)]).map(g => g.id), [1, 2]);
});
test("fills ten with larger spreads after preferred games at or below eleven", () => {
  const preferred = [game(100, { spread: -11, homeConference: "SEC" }), game(101, { spread: 11, awayApRank: 25 })];
  const fallback = Array.from({ length: 12 }, (_, i) => game(i, { spread: 12 + i, homeConference: "Big 12" }));
  const results = selectFeaturedMatchups([...fallback, ...preferred]);
  assert.equal(results.length, 10);
  assert.ok(results.slice(0, 2).every(g => g.id >= 100));
  assert.ok(results.slice(2).every(g => g.spread > 11));
});
test("uses games without lines only as a last resort to fill ten", () => {
  const games = Array.from({ length: 12 }, (_, i) => game(i, { spread: i < 8 ? i : null }));
  const results = selectFeaturedMatchups(games);
  assert.equal(results.length, 10);
  assert.ok(results.slice(0, 8).every(g => g.spread != null));
  assert.ok(results.slice(8).every(g => g.spread == null));
});
test("does not invent or duplicate games when fewer than ten exist", () => {
  assert.equal(selectFeaturedMatchups([game(1), game(2)]).length, 2);
  assert.deepEqual(selectFeaturedMatchups([]), []);
});
