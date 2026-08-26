import dotenv from "dotenv";
import mongoose from "mongoose";
import Pool from "../models/pool.js";
import Pick from "../models/pick.js";
import User from "../models/User.js";
import PoolNotification from "../models/poolNotification.js";
import { sendLeaderboardEmail, sendPickReminderEmail } from "../utils/mailer.js";
import { selectGamesForPool } from "../utils/poolGameSelection.js";

dotenv.config();

const gameSchema = new mongoose.Schema({}, { strict: false, collection: "games" });
const Game = mongoose.models.game || mongoose.model("game", gameSchema);

async function getCurrentWeek(season) {
  const weeks = await Game.aggregate([
    { $match: { season } },
    { $group: { _id: "$week", startDate: { $min: "$startDate" } } },
    { $project: { _id: 0, week: "$_id", startDate: 1 } },
    { $sort: { startDate: 1 } },
  ]);
  const now = Date.now();
  return weeks.filter(item => new Date(item.startDate).getTime() <= now).at(-1)?.week ?? weeks[0]?.week ?? null;
}

function standings(pool, games, picks, users) {
  const completedGames = games.filter(game => game.homePoints != null && game.awayPoints != null);
  const picksByUser = new Map();
  picks.forEach(pick => {
    const userId = pick.userId.toString();
    if (!picksByUser.has(userId)) picksByUser.set(userId, new Map());
    picksByUser.get(userId).set(Number(pick.gameId), pick.pick);
  });
  const usersById = new Map(users.map(user => [user._id.toString(), user]));
  const results = pool.participants.map(participantId => {
    const userPicks = picksByUser.get(participantId.toString()) || new Map();
    const correct = completedGames.reduce((total, game) => {
      const pick = userPicks.get(Number(game.id));
      const homeWon = Number(game.homePoints) > Number(game.awayPoints);
      const awayWon = Number(game.awayPoints) > Number(game.homePoints);
      return total + ((pick === "home" && homeWon) || (pick === "away" && awayWon) ? 1 : 0);
    }, 0);
    return { userId: participantId, name: usersById.get(participantId.toString())?.name || "Player", correct, picks: userPicks.size };
  }).sort((a, b) => b.correct - a.correct || b.picks - a.picks || a.name.localeCompare(b.name));
  let previousScore = null;
  results.forEach((entry, index) => {
    entry.rank = entry.correct === previousScore ? results[index - 1].rank : index + 1;
    previousScore = entry.correct;
  });
  return results;
}

async function wasSent(type, poolId, userId, season, week) {
  return PoolNotification.exists({ type, poolId, userId, season, week });
}

async function recordSent(type, poolId, userId, season, week) {
  try {
    await PoolNotification.create({ type, poolId, userId, season, week });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const season = Number(process.env.CFB_YEAR) || new Date().getFullYear();
  const week = await getCurrentWeek(season);
  if (week == null) return console.log("No current week is available.");

  const games = await Game.find({ season, week }).sort({ startDate: 1 }).lean();
  const pools = await Pool.find({});
  const now = Date.now();
  let sent = 0;

  for (const pool of pools) {
    const weekGames = await selectGamesForPool({ pool, games, season, week });
    if (!weekGames.length) continue;
    const users = await User.find({ _id: { $in: pool.participants } }).select("name email");
    const picks = await Pick.find({ poolId: pool._id, season, week });
    const firstGameAt = Math.min(...weekGames.map(game => new Date(game.startDate).getTime()));
    const isReminderWindow = now >= firstGameAt - 24 * 60 * 60 * 1000 && now < firstGameAt;

    if (isReminderWindow) {
      for (const user of users) {
        const submitted = new Set(picks.filter(pick => pick.userId.toString() === user._id.toString()).map(pick => Number(pick.gameId)));
        const hasAllPicks = weekGames.every(game => submitted.has(Number(game.id)));
        if (!hasAllPicks && !(await wasSent("pick-reminder", pool._id, user._id, season, week))) {
          await sendPickReminderEmail({ to: user.email, name: user.name, poolName: pool.name, week, firstGameAt });
          await recordSent("pick-reminder", pool._id, user._id, season, week);
          sent += 1;
        }
      }
    }

    const complete = weekGames.every(game => game.homePoints != null && game.awayPoints != null);
    if (complete) {
      const leaderboard = standings(pool, weekGames, picks, users);
      for (const user of users) {
        if (!(await wasSent("leaderboard", pool._id, user._id, season, week))) {
          await sendLeaderboardEmail({ to: user.email, name: user.name, poolName: pool.name, week, entries: leaderboard });
          await recordSent("leaderboard", pool._id, user._id, season, week);
          sent += 1;
        }
      }
    }
  }
  console.log(`Sent ${sent} pool notification(s) for week ${week}.`);
}

run().catch(error => { console.error("Pool notification job failed:", error); process.exitCode = 1; }).finally(() => mongoose.disconnect());
