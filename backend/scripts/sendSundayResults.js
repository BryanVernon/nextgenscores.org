import dotenv from "dotenv";
import mongoose from "mongoose";
import Pool from "../models/pool.js";
import Pick from "../models/pick.js";
import User from "../models/User.js";
import PoolNotification from "../models/poolNotification.js";
import { sendLeaderboardEmail } from "../utils/mailer.js";
import { footballSeason } from "../utils/timeZone.js";
import { isEligible } from "../utils/poolTiming.js";
import { selectGamesForPool } from "../utils/poolGameSelection.js";
import { getPickResult } from "../utils/leaderboardResults.js";
import { deliverReminder } from "../utils/pickReminders.js";
import { allLineupGamesFinal, hasTimelyCompletePicks, isSundayResultsTime, sundayResultsWeek } from "../utils/sundayResults.js";

dotenv.config();
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const Game = mongoose.models.game || mongoose.model("game", new mongoose.Schema({}, { strict: false, collection: "games" }));

function standings(pool, games, picks, users) {
  const picksByUser = new Map();
  for (const pick of picks) {
    const id = String(pick.userId);
    if (!picksByUser.has(id)) picksByUser.set(id, new Map());
    picksByUser.get(id).set(Number(pick.gameId), pick.pick);
  }
  const names = new Map(users.map(user => [String(user._id), user.name]));
  const entries = pool.participants.map(id => {
    const selected = picksByUser.get(String(id)) || new Map();
    return { userId: id, name: names.get(String(id)) || "Player", correct: games.filter(game => getPickResult(game, selected.get(Number(game.id)), pool.scoringType) === "correct").length };
  }).sort((left, right) => right.correct - left.correct || left.name.localeCompare(right.name));
  entries.forEach((entry, index) => { entry.rank = index && entry.correct === entries[index - 1].correct ? entries[index - 1].rank : index + 1; });
  return entries;
}

async function run() {
  const required = dryRun ? ["MONGODB_URI"] : ["MONGODB_URI", "SMTP_USER", "SMTP_PASS"];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(", ")}`);
  const now = Date.now();
  if (!force && !isSundayResultsTime(now)) { console.log("Sunday results skipped outside the 9 AM Central hour."); return; }
  await mongoose.connect(process.env.MONGODB_URI, dryRun ? { autoIndex: false, autoCreate: false } : {});
  if (!dryRun) await PoolNotification.init();
  const season = Number(process.env.CFB_YEAR) || footballSeason(new Date(now));
  const weeks = await Game.aggregate([{ $match: { season } }, { $group: { _id: "$week", startDate: { $min: "$startDate" } } }, { $project: { _id: 0, week: "$_id", startDate: 1 } }, { $sort: { startDate: 1 } }]);
  const week = sundayResultsWeek(weeks, now);
  if (week == null) { console.log("No results week is available."); return; }
  const games = await Game.find({ season, week }).sort({ startDate: 1 }).lean();
  let eligible = 0, sent = 0, failures = 0;
  for (const pool of await Pool.find({})) {
    const participants = pool.participants.filter(id => isEligible(pool, id, season, week));
    if (!participants.length) continue;
    const lineup = await selectGamesForPool({ pool, games, season, week });
    if (!allLineupGamesFinal(lineup)) continue;
    const users = await User.find({ _id: { $in: participants } }).select("name email");
    const picks = await Pick.find({ poolId: pool._id, season, week }).lean();
    const board = standings({ ...pool.toObject(), participants }, lineup, picks, users);
    for (const user of users) {
      const userPicks = picks.filter(pick => String(pick.userId) === String(user._id));
      if (!hasTimelyCompletePicks(lineup, userPicks)) continue;
      const key = { type: "leaderboard", poolId: pool._id, userId: user._id, season, week };
      if (dryRun) { eligible += 1; continue; }
      try {
        if (await deliverReminder({ key, notifications: PoolNotification, send: () => sendLeaderboardEmail({ to: user.email, name: user.name, poolName: pool.name, week, entries: board, games: lineup }) })) sent += 1;
      } catch (error) { failures += 1; console.error(`Sunday results failed for pool ${pool._id}, user ${user._id}: ${error.code || error.name}`); }
    }
  }
  console.log(dryRun ? `Dry run: ${eligible} Sunday result emails eligible; no emails sent.` : `Sunday results: ${sent} sent, ${failures} failed.`);
  if (failures) process.exitCode = 1;
}

run().catch(error => { console.error("Sunday results job failed:", error.name, error.code || "Check configuration and connectivity"); process.exitCode = 1; }).finally(() => mongoose.disconnect());
