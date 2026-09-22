import test from "node:test";
import assert from "node:assert/strict";
import { filterTeamGroups } from "../src/teamOptions.js";

test("team search filters every team group without changing the group structure", () => {
  const groups = {
    top25: [{ name: "Ole Miss", rank: 4 }, { name: "Indiana", rank: 5 }],
    remaining: [
      { name: "SEC", teams: [{ name: "Alabama" }, { name: "Auburn" }] },
      { name: "Big Ten", teams: [{ name: "Iowa" }] },
    ],
  };
  assert.deepEqual(filterTeamGroups(groups, "in"), {
    top25: [{ name: "Indiana", rank: 5 }],
    remaining: [],
  });
  assert.deepEqual(filterTeamGroups(groups, ""), groups);
});

test("team search only shows names beginning with the typed letters", () => {
  const groups = {
    top25: [{ name: "Tennessee", rank: 7 }, { name: "Ohio State", rank: 2 }],
    remaining: [{ name: "American", teams: [{ name: "Temple" }, { name: "UTEP" }] }],
  };

  assert.deepEqual(filterTeamGroups(groups, "te"), {
    top25: [{ name: "Tennessee", rank: 7 }],
    remaining: [{ name: "American", teams: [{ name: "Temple" }] }],
  });
});
