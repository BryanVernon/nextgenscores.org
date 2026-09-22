import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resetScrollPosition } from "../src/scrollRestoration.js";

test("route navigation resets the document viewport to the top", () => {
  const calls = [];

  resetScrollPosition((x, y) => calls.push([x, y]));

  assert.deepEqual(calls, [[0, 0]]);
});

test("layout resets scroll when the route pathname changes", () => {
  const layoutSource = readFileSync(new URL("../src/Layout.jsx", import.meta.url), "utf8");

  assert.match(layoutSource, /useLocation\(\)/);
  assert.match(layoutSource, /resetScrollPosition\(window\.scrollTo\.bind\(window\)\)/);
  assert.match(layoutSource, /\[pathname\]/);
});
