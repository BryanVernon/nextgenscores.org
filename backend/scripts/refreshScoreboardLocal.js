import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

const backend = fileURLToPath(new URL("../", import.meta.url));
const config = dotenv.config({ path: path.join(backend, ".env") });
if (config.error) throw new Error("Cannot load backend/.env for scoreboard refresh");

const logDirectory = path.join(backend, "logs");
mkdirSync(logDirectory, { recursive: true });
const now = new Date();
const logPath = path.join(logDirectory, `scoreboard-${now.toISOString().slice(0, 7)}.log`);
function log(message) {
  let safe = String(message);
  for (const key of ["MONGODB_URI", "CFB_API_KEY"]) {
    if (process.env[key]) safe = safe.split(process.env[key]).join("[REDACTED]");
  }
  appendFileSync(logPath, safe + "\n");
  console.log(safe);
}

const year = now.getFullYear();
const seasons = now.getMonth() < 2 ? [year, year - 1] : [year];
let failed = false;
log(`[${now.toISOString()}] Starting scheduled scoreboard refresh`);
for (const season of seasons) {
  const result = spawnSync(process.execPath, ["scripts/scrapeGames.js"], {
    cwd: backend,
    env: {
      ...process.env,
      CFB_YEAR: String(season),
      CFB_WEEK: "", // Refresh every week, even if local development pins a week.
      CFB_GAMES_REFRESH_HOURS: "6",
    },
    encoding: "utf8",
    timeout: 10 * 60 * 1000,
    windowsHide: true,
  });
  log(`Season ${season}:\n${result.stdout || ""}${result.stderr || ""}`);
  if (result.error || result.status !== 0) {
    failed = true;
    log(`Season ${season} failed: ${result.error?.message || `exit ${result.status}`}`);
  }
}
log(`[${new Date().toISOString()}] Refresh ${failed ? "FAILED" : "SUCCEEDED"}`);
process.exitCode = failed ? 1 : 0;
