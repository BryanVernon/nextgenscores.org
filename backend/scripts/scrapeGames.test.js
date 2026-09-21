import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("AP ranking replacement writes the cache and game ranks in one transaction", async () => {
  const source = await readFile(new URL("./scrapeGames.js", import.meta.url), "utf8");
  assert.match(source, /startSession\(\)/);
  assert.match(source, /withTransaction\(/);
  assert.match(source, /rankingCache\.bulkWrite\(rankingSnapshotOperations[\s\S]*session/);
  assert.match(source, /games\.bulkWrite\(scheduled\.map[\s\S]*session/);
});
