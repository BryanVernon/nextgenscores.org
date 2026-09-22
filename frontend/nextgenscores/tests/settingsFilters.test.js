import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("settings uses the shared non-searchable picker for favorite teams and timezone", () => {
  const settingsSource = readFileSync(new URL("../src/pages/Settings.jsx", import.meta.url), "utf8");

  assert.match(settingsSource, /StaticFilterPicker/);
  assert.match(settingsSource, /label="Display times in"/);
  assert.doesNotMatch(settingsSource, /type="search"/);
  const pickerSource = readFileSync(new URL("../src/components/StaticFilterPicker.jsx", import.meta.url), "utf8");
  assert.match(pickerSource, /filter-picker-chevron/);
});
