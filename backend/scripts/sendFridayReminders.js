import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import Pool from "../models/pool.js";
import Pick from "../models/pick.js";
import User from "../models/User.js";
import PoolWeek from "../models/poolWeek.js";
import PoolNotification from "../models/poolNotification.js";
import { isEligible } from "../utils/poolTiming.js";
import { selectGamesForPool } from "../utils/poolGameSelection.js";
import { historicalLineup } from "../utils/poolStandings.js";
import { footballSeason } from "../utils/timeZone.js";
import { isFridayReminderTime, missingOpenPicks, deliverReminder } from "../utils/pickReminders.js";
import { sendPickReminderEmail } from "../utils/mailer.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
const dryRun = process.argv.includes("--dry-run");
const Game = mongoose.models.game || mongoose.model("game", new mongoose.Schema({}, { strict: false, collection: "games" }));

async function run() {
  const required = dryRun ? ["MONGODB_URI"] : ["MONGODB_URI", "SMTP_USER", "SMTP_PASS"];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(", ")}`);
  await mongoose.connect(process.env.MONGODB_URI, dryRun ? { autoIndex: false, autoCreate: false } : {});
  if (!dryRun) await PoolNotification.init();
  const now = Date.now();
  const season = Number(process.env.CFB_YEAR) || footballSeason(new Date(now));
  const weeks = await Game.aggregate([
    { $match: { season } },
    { $group: { _id: "$week", startDate: { $min: "$startDate" } } },
    { $sort: { startDate: 1 } },
  ]);
  const week = weeks.filter(item => Date.parse(item.startDate) <= now).at(-1)?._id ?? weeks[0]?._id;
  if (week == null) { console.log("No scheduled week; no reminders needed."); return; }
  const games = await Game.find({ season, week }).sort({ startDate: 1 }).lean();
  const pools = await Pool.find({});
  let eligible = 0, sent = 0, failures = 0;
  for (const pool of pools) {
    const users = await User.find({ _id: { $in: pool.participants } }).select("name email timeZone");
    const due = users.filter(user => isEligible(pool, user._id, season, week) && isFridayReminderTime(now, user.timeZone));
    if (!due.length) continue;
    const snapshot = dryRun ? await PoolWeek.findOne({ poolId: pool._id, season, week }).lean() : null;
    const lineup = dryRun ? historicalLineup(pool, games, snapshot, []) : await selectGamesForPool({ pool, games, season, week });
    for (const user of due) {
      try {
        // Read just before delivery so picks saved during the job are respected.
        const picks = await Pick.find({ poolId: pool._id, userId: user._id, season, week }).lean();
        const missingGames = missingOpenPicks(lineup, picks, Date.now());
        if (!missingGames.length) continue;
        const key = { type: "pick-reminder", poolId: pool._id, userId: user._id, season, week };
        if (dryRun) {
          const previous = await PoolNotification.findOne(key).lean();
          if (!previous || previous.status === "failed") eligible++;
          continue;
        }
        const delivered = await deliverReminder({ key, notifications: PoolNotification, send: () => sendPickReminderEmail({
          to: user.email, name: user.name, poolName: pool.name, poolId: pool._id, week,
          firstGameAt: Math.min(...missingGames.map(game => Date.parse(game.startDate))),
          missingCount: missingGames.length, timeZone: user.timeZone,
        }) });
        if (delivered) sent++;
      } catch (error) {
        failures++;
        console.error(`Reminder failed for pool ${pool._id}, user ${user._id}: ${error.code || error.name}`);
      }
    }
  }
  console.log(dryRun ? `Dry run: ${eligible} reminders eligible; no emails sent.` : `Friday reminders: ${sent} sent, ${failures} failed.`);
  if (failures) process.exitCode = 1;
}

run().catch(error => { console.error("Friday reminder job failed:", error.name, error.code || "Check configuration and connectivity"); process.exitCode = 1; }).finally(() => mongoose.disconnect());
