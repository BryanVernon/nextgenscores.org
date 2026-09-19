import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dashboardPath = new URL("../src/pages/Dashboard.jsx", import.meta.url);

test("featured-game links lead to the registered schedule route", async () => {
  const dashboard = await readFile(dashboardPath, "utf8");

  assert.ok(dashboard.includes('to="/schedule"'));
  assert.ok(!dashboard.includes('to="/scoreboard"'));
});
