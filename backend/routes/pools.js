import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Pool from "../models/pool.js";
import Pick from "../models/pick.js";
import requireAuth from "../middleware/requireAuth.js";
import { selectGamesForPool, filterGamesForPool } from "../utils/poolGameSelection.js";
import { getPickResults } from "../utils/leaderboardResults.js";

import { selectFeaturedMatchups } from "../utils/featuredMatchups.js";
import { isGameLocked, laterPeriod, memberStart, isEligible, validatePickChanges, firstUnstartedPeriod } from "../utils/poolTiming.js";

const router = express.Router();
const MAX_POOLS_PER_USER = 10;

async function hasReachedPoolLimit(userId) {
  const poolCount = await Pool.countDocuments({
    $or: [{ creatorId: userId }, { participants: userId }],
  });
  return poolCount >= MAX_POOLS_PER_USER;
}

function getGameModel() {
  return mongoose.model("game");
}

function getCurrentWeek(games) {
  const now = Date.now();
  const weeks = [...new Set(games.map(game => Number(game.week)).filter(Number.isFinite))]
    .map(week => ({
      week,
      start: Math.min(...games
        .filter(game => Number(game.week) === week)
        .map(game => new Date(game.startDate).getTime())
        .filter(Number.isFinite)),
    }))
    .filter(item => Number.isFinite(item.start));

  return weeks
    .filter(item => item.start <= now)
    .sort((a, b) => b.start - a.start)[0]?.week
    ?? weeks.sort((a, b) => a.start - b.start)[0]?.week;
}

async function getCurrentWeekForSeason(season) {
  const weeks = await getGameModel().aggregate([
    { $match: { season } },
    { $group: { _id: "$week", startDate: { $min: "$startDate" } } },
    { $project: { _id: 0, week: "$_id", startDate: 1 } },
    { $sort: { startDate: 1 } },
  ]);
  return getCurrentWeek(weeks);
}

function isPoolParticipant(pool, userId) {
  return pool.participants.some(participant => participant.toString() === userId);
}

async function currentPeriod(pool, requestedSeason, userId) {
  const season = Number(requestedSeason) || new Date().getFullYear();
  const week = await getCurrentWeekForSeason(season);
  let period = laterPeriod({ season, week }, { season: pool.startSeason, week: pool.startWeek });
  if (userId) period = laterPeriod(period, memberStart(pool, userId));
  return period;
}

async function openingPeriod(pool, minimum) {
  const games = await getGameModel().find({ season: { $gte: minimum.season, $lte: minimum.season + 1 } }).sort({ season: 1, week: 1, startDate: 1 }).lean();
  const periods = new Map();
  for (const game of games) {
    if (game.season === minimum.season && game.week < (minimum.week ?? 0)) continue;
    const key = game.season + ":" + game.week;
    if (!periods.has(key)) periods.set(key, []);
    periods.get(key).push(game);
  }
  return firstUnstartedPeriod(periods.values(), async (candidates, { season, week }) => {
    const eligible = filterGamesForPool(candidates, pool);
    return pool.isNew
      ? (pool.gameSelection === "competitive-ten" ? selectFeaturedMatchups(eligible) : eligible)
      : await selectGamesForPool({ pool, games: candidates, season, week });
  });
}

function shapePool(pool) {
  return {
    id: pool._id,
    name: pool.name,
    scoringType: pool.scoringType,
    gameSelection: pool.gameSelection || "all",
    conference: pool.conference,
    participants: pool.participants.length,
    limit: pool.limit ?? 10,
    visibility: pool.visibility || "public",
    startSeason: pool.startSeason,
    startWeek: pool.startWeek,
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getPoolUsers(pool) {
  const User = mongoose.model("User");
  const users = await User.find({ _id: { $in: pool.participants } }).select("name");
  return new Map(users.map(user => [user._id.toString(), user]));
}

router.get("/", async (req, res) => {
  try {
    const filters = [
      { $expr: { $lt: [{ $size: "$participants" }, "$limit"] } },
    ];
    const query = String(req.query.q || "").trim();
    if (query) filters.push({ name: { $regex: escapeRegex(query), $options: "i" } });
    const pools = await Pool.find({
      $and: [
        ...filters,
      ],
    }).sort({ createdAt: -1 });
    pools.sort((left, right) => Number((left.visibility || "public") === "private") - Number((right.visibility || "public") === "private"));
    res.json(pools.map(shapePool));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load pools" });
  }
});

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const pools = await Pool.find({
      $or: [{ creatorId: req.userId }, { participants: req.userId }],
    }).sort({ createdAt: -1 });
    res.json(pools.map(shapePool));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load your pools" });
  }
});

router.get("/:id/picks/current", requireAuth, async (req, res) => {
  try {
    const pool = await Pool.findById(req.params.id);
    if (!pool) return res.status(404).json({ message: "Pool not found" });
    if (!isPoolParticipant(pool, req.userId)) {
      return res.status(403).json({ message: "Join this pool to view its picks" });
    }

    const { season, week } = await currentPeriod(pool, req.query.year, req.userId);
    if (week == null) return res.status(409).json({ message: "No scheduled week is available yet." });
    const games = await getGameModel().find({ season, week }).sort({ startDate: 1 }).lean();
    const weekGames = await selectGamesForPool({ pool, games, season, week });
    const picks = await Pick.find({ poolId: pool._id, userId: req.userId, season, week });

    res.json({
      pool: shapePool(pool),
      season,
      week,
      startsLater: season > new Date().getFullYear() || week > (await getCurrentWeekForSeason(season)),
      games: weekGames.map(game => ({
        id: game.id,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        startDate: game.startDate,
        homeLogo: game.homeLogo,
        awayLogo: game.awayLogo,
        homeApRank: game.homeApRank,
        awayApRank: game.awayApRank,
        spread: game.spread,
        overUnder: game.overUnder,
        locked: isGameLocked(game),
      })),
      picks: Object.fromEntries(picks.map(pick => [pick.gameId, pick.pick])),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load current picks" });
  }
});

router.put("/:id/picks/current", requireAuth, async (req, res) => {
  try {
    const pool = await Pool.findById(req.params.id);
    if (!pool) return res.status(404).json({ message: "Pool not found" });
    if (!isPoolParticipant(pool, req.userId)) {
      return res.status(403).json({ message: "Join this pool to save picks" });
    }

    const { season, week } = await currentPeriod(pool, req.query.year, req.userId);
    if (Number(req.body.season) !== season || Number(req.body.week) !== week) {
      return res.status(409).json({ message: "The active week has changed. Refresh before saving your picks." });
    }
    const games = await getGameModel().find({ season, week }).lean();
    const selectedGames = await selectGamesForPool({ pool, games, season, week });
    const existing = await Pick.find({ poolId: pool._id, userId: req.userId, season, week });
    let changes;
    try {
      changes = validatePickChanges(selectedGames, Array.isArray(req.body.picks) ? req.body.picks : [], new Map(existing.map(pick => [Number(pick.gameId), pick.pick])));
    } catch (error) {
      return res.status(409).json({ message: error.message });
    }
    const operations = changes
      .map(item => ({
        updateOne: {
          filter: { poolId: pool._id, userId: req.userId, gameId: Number(item.gameId), week, season },
          update: { $set: { pick: item.pick } },
          upsert: true,
        },
      }));

    if (operations.length > 0) await Pick.bulkWrite(operations, { ordered: false });
    res.json({ message: "Picks saved", week, season });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save picks" });
  }
});

router.get("/:id/leaderboard/current", requireAuth, async (req, res) => {
  try {
    const pool = await Pool.findById(req.params.id);
    if (!pool) return res.status(404).json({ message: "Pool not found" });
    if (!isPoolParticipant(pool, req.userId)) {
      return res.status(403).json({ message: "Join this pool to view its leaderboard" });
    }

    const { season, week } = await currentPeriod(pool, req.query.year);
    if (week == null) return res.status(409).json({ message: "No scheduled week is available yet." });
    const games = await getGameModel().find({ season, week }).sort({ startDate: 1 }).lean();
    const weekGames = await selectGamesForPool({ pool, games, season, week });
    const gameIds = new Set(weekGames.map(game => Number(game.id)));
    const picks = await Pick.find({ poolId: pool._id, season, week });
    const usersById = await getPoolUsers(pool);
    const picksByUser = new Map();

    picks.forEach(pick => {
      if (!picksByUser.has(pick.userId.toString())) picksByUser.set(pick.userId.toString(), new Map());
      picksByUser.get(pick.userId.toString()).set(Number(pick.gameId), pick.pick);
    });

    const completedGames = weekGames.filter(game => game.homePoints != null && game.awayPoints != null);
    const leaderboard = pool.participants.filter(id => isEligible(pool, id, season, week)).map(participantId => {
      const participant = usersById.get(participantId.toString());
      const userPicks = picksByUser.get(participantId.toString()) || new Map();
      const results = getPickResults(weekGames, userPicks);
      const correct = results.filter(game => game.result === "correct").length;

      return {
        userId: participantId,
        name: participant?.name || "Player",
        correct,
        picks: [...userPicks.keys()].filter(gameId => gameIds.has(gameId)).length,
        results,
      };
    }).sort((a, b) => b.correct - a.correct || b.picks - a.picks || a.name.localeCompare(b.name));

    let previousScore = null;
    leaderboard.forEach((entry, index) => {
      entry.rank = entry.correct === previousScore ? leaderboard[index - 1].rank : index + 1;
      previousScore = entry.correct;
    });

    res.json({
      pool: shapePool(pool),
      season,
      week,
      completedGames: completedGames.length,
      totalGames: weekGames.length,
      leaderboard,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, scoringType, conference, limit, visibility, poolPassword, gameSelection } = req.body;
    if (!name || !scoringType) {
      return res.status(400).json({ message: "name and scoringType are required" });
    }
    if (!["straight", "spread"].includes(scoringType)) {
      return res.status(400).json({ message: "Invalid scoringType" });
    }
    if (!["all", "competitive-ten"].includes(gameSelection || "all")) {
      return res.status(400).json({ message: "Invalid game selection" });
    }
    if (await hasReachedPoolLimit(req.userId)) {
      return res.status(400).json({ message: `You can join or create up to ${MAX_POOLS_PER_USER} pools.` });
    }
    const requestedLimit = Number(limit);
    const playerLimit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? requestedLimit : 10;
    const poolVisibility = visibility === "private" ? "private" : "public";
    if (poolVisibility === "private" && String(poolPassword || "").length < 4) {
      return res.status(400).json({ message: "Private pools need a password of at least 4 characters" });
    }
    const joinPasswordHash = poolVisibility === "private" ? await bcrypt.hash(String(poolPassword), 10) : undefined;

    const pool = new Pool({
      name,
      scoringType,
      gameSelection: gameSelection || "all",
      conference: conference || "All",
      limit: playerLimit,
      visibility: poolVisibility,
      joinPasswordHash,
      creatorId: req.userId,
      participants: [req.userId],
    });

    const minimum = { season: new Date().getFullYear(), week: await getCurrentWeekForSeason(new Date().getFullYear()) };
    const opening = await openingPeriod(pool, minimum);
    if (!opening) return res.status(409).json({ message: "No unstarted lineup is scheduled yet. Please try again when the next week's schedule is available." });
    pool.startSeason = opening.season;
    pool.startWeek = opening.week;
    await pool.save();
    const openingGames = await getGameModel().find({ season: opening.season, week: opening.week }).sort({ startDate: 1 }).lean();
    await selectGamesForPool({ pool, games: openingGames, ...opening });
    res.status(201).json(shapePool(pool));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create pool" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const pool = await Pool.findById(req.params.id);
    if (!pool) return res.status(404).json({ message: "Pool not found" });

    const User = mongoose.model("User");
    const user = await User.findById(req.userId).select("role");
    const isOwner = pool.creatorId.toString() === req.userId;
    if (!isOwner && user?.role !== "admin") {
      return res.status(403).json({ message: "Only the pool owner or an admin can delete this pool" });
    }

    await Pick.deleteMany({ poolId: pool._id });
    await pool.deleteOne();
    res.json({ message: "Pool deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete pool" });
  }
});

router.post("/:id/join", requireAuth, async (req, res) => {
  try {
    const pool = await Pool.findById(req.params.id).select("+joinPasswordHash +inviteCode");
    if (!pool) return res.status(404).json({ message: "Pool not found" });

    if (isPoolParticipant(pool, req.userId)) return res.json({ message: "Already joined" });
    if (pool.visibility === "private") {
      const password = String(req.body?.password || "");
      const passwordMatches = pool.joinPasswordHash && await bcrypt.compare(password, pool.joinPasswordHash);
      const legacyCodeMatches = pool.inviteCode && password.trim().toUpperCase() === pool.inviteCode;
      if (!passwordMatches && !legacyCodeMatches) {
        return res.status(403).json({ message: "The pool password is incorrect" });
      }
    }
    if (await hasReachedPoolLimit(req.userId)) {
      return res.status(400).json({ message: `You can join or create up to ${MAX_POOLS_PER_USER} pools.` });
    }
    const poolLimit = pool.limit ?? 10;
    if (pool.participants.length >= poolLimit) {
      return res.status(400).json({ message: "Pool is full" });
    }

    const opening = await openingPeriod(pool, await currentPeriod(pool));
    if (!opening) return res.status(409).json({ message: "No unstarted lineup is scheduled yet. Please join when the next week's schedule is available." });
    pool.memberStarts.set(String(req.userId), opening);
    pool.participants.push(req.userId);
    await pool.save();
    res.json({ message: "Joined pool" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to join pool" });
  }
});

export default router;
