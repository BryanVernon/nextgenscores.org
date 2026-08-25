import express from "express";
import mongoose from "mongoose";
import Pool from "../models/pool.js";
import Pick from "../models/pick.js";
import requireAuth from "../middleware/requireAuth.js";

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

function filterGamesForPool(games, pool) {
  if (!pool.conference || pool.conference === "All") return games;
  if (pool.conference === "AP Top 25") {
    return games.filter(game => game.homeApRank != null || game.awayApRank != null);
  }
  return games.filter(game => game.homeConference === pool.conference || game.awayConference === pool.conference);
}

function isPoolParticipant(pool, userId) {
  return pool.participants.some(participant => participant.toString() === userId);
}

function shapePool(pool) {
  return {
    id: pool._id,
    name: pool.name,
    scoringType: pool.scoringType,
    conference: pool.conference,
    participants: pool.participants.length,
    limit: pool.limit ?? 10,
  };
}

async function getPoolUsers(pool) {
  const User = mongoose.model("User");
  const users = await User.find({ _id: { $in: pool.participants } }).select("name");
  return new Map(users.map(user => [user._id.toString(), user]));
}

router.get("/", async (req, res) => {
  try {
    const pools = await Pool.find().sort({ createdAt: -1 });
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

    const season = Number(req.query.year) || new Date().getFullYear();
    const week = await getCurrentWeekForSeason(season);
    const games = await getGameModel().find({ season, week }).sort({ startDate: 1 }).lean();
    const weekGames = filterGamesForPool(games, pool);
    const picks = await Pick.find({ poolId: pool._id, userId: req.userId, season, week });

    res.json({
      pool: shapePool(pool),
      season,
      week,
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

    const season = Number(req.query.year) || new Date().getFullYear();
    const week = await getCurrentWeekForSeason(season);
    const games = await getGameModel().find({ season, week }).lean();
    const validGameIds = new Set(filterGamesForPool(
      games,
      pool
    ).map(game => Number(game.id)));
    const operations = (Array.isArray(req.body.picks) ? req.body.picks : [])
      .filter(item => validGameIds.has(Number(item.gameId)) && ["home", "away"].includes(item.pick))
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

    const season = Number(req.query.year) || new Date().getFullYear();
    const week = await getCurrentWeekForSeason(season);
    const games = await getGameModel().find({ season, week }).sort({ startDate: 1 }).lean();
    const weekGames = filterGamesForPool(games, pool);
    const gameIds = new Set(weekGames.map(game => Number(game.id)));
    const picks = await Pick.find({ poolId: pool._id, season, week });
    const usersById = await getPoolUsers(pool);
    const picksByUser = new Map();

    picks.forEach(pick => {
      if (!picksByUser.has(pick.userId.toString())) picksByUser.set(pick.userId.toString(), new Map());
      picksByUser.get(pick.userId.toString()).set(Number(pick.gameId), pick.pick);
    });

    const completedGames = weekGames.filter(game => game.homePoints != null && game.awayPoints != null);
    const leaderboard = pool.participants.map(participantId => {
      const participant = usersById.get(participantId.toString());
      const userPicks = picksByUser.get(participantId.toString()) || new Map();
      const correct = completedGames.reduce((total, game) => {
        const pick = userPicks.get(Number(game.id));
        const homeWon = Number(game.homePoints) > Number(game.awayPoints);
        const awayWon = Number(game.awayPoints) > Number(game.homePoints);
        return total + ((pick === "home" && homeWon) || (pick === "away" && awayWon) ? 1 : 0);
      }, 0);

      return {
        userId: participantId,
        name: participant?.name || "Player",
        correct,
        picks: [...userPicks.keys()].filter(gameId => gameIds.has(gameId)).length,
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
    const { name, scoringType, conference, limit } = req.body;
    if (!name || !scoringType) {
      return res.status(400).json({ message: "name and scoringType are required" });
    }
    if (!["straight", "spread"].includes(scoringType)) {
      return res.status(400).json({ message: "Invalid scoringType" });
    }
    if (await hasReachedPoolLimit(req.userId)) {
      return res.status(400).json({ message: `You can join or create up to ${MAX_POOLS_PER_USER} pools.` });
    }
    const requestedLimit = Number(limit);
    const playerLimit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? requestedLimit : 10;

    const pool = await Pool.create({
      name,
      scoringType,
      conference: conference || "All",
      limit: playerLimit,
      creatorId: req.userId,
      participants: [req.userId],
    });

    res.status(201).json({ id: pool._id, name: pool.name });
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
    const pool = await Pool.findById(req.params.id);
    if (!pool) return res.status(404).json({ message: "Pool not found" });

    if (isPoolParticipant(pool, req.userId)) return res.json({ message: "Already joined" });
    if (await hasReachedPoolLimit(req.userId)) {
      return res.status(400).json({ message: `You can join or create up to ${MAX_POOLS_PER_USER} pools.` });
    }
    const poolLimit = pool.limit ?? 10;
    if (pool.participants.length >= poolLimit) {
      return res.status(400).json({ message: "Pool is full" });
    }

    pool.participants.push(req.userId);
    await pool.save();
    res.json({ message: "Joined pool" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to join pool" });
  }
});

export default router;
