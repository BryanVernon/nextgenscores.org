import express from "express";
import mongoose from "mongoose";
import Pool from "../models/pool.js";
import Pick from "../models/pick.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

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

// GET /api/pools — list all public pools
router.get("/", async (req, res) => {
  try {
    const pools = await Pool.find().sort({ createdAt: -1 });
    const shaped = pools.map(p => ({
      id: p._id,
      name: p.name,
      scoringType: p.scoringType,
      conference: p.conference,
      participants: p.participants.length,
      limit: p.limit,
    }));
    res.json(shaped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load pools" });
  }
});

// GET /api/pools/mine - list pools the authenticated user created or joined
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const pools = await Pool.find({
      $or: [
        { creatorId: req.userId },
        { participants: req.userId },
      ],
    }).sort({ createdAt: -1 });

    res.json(pools.map(pool => ({
      id: pool._id,
      name: pool.name,
      scoringType: pool.scoringType,
      conference: pool.conference,
      participants: pool.participants.length,
      limit: pool.limit,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load your pools" });
  }
});

router.get("/:id/picks/current", requireAuth, async (req, res) => {
  try {
    const pool = await Pool.findById(req.params.id);
    if (!pool) return res.status(404).json({ message: "Pool not found" });
    if (!pool.participants.some(participant => participant.toString() === req.userId)) {
      return res.status(403).json({ message: "Join this pool to view its picks" });
    }

    const season = Number(req.query.year) || new Date().getFullYear();
    const games = await getGameModel().find({ season }).sort({ startDate: 1 });
    const week = getCurrentWeek(games);
    const weekGames = games.filter(game => Number(game.week) === Number(week));
    const picks = await Pick.find({ poolId: pool._id, userId: req.userId, season, week });

    res.json({
      pool: { id: pool._id, name: pool.name, conference: pool.conference, scoringType: pool.scoringType },
      season,
      week,
      games: weekGames.map(game => ({ id: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam, startDate: game.startDate })),
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
    if (!pool.participants.some(participant => participant.toString() === req.userId)) {
      return res.status(403).json({ message: "Join this pool to save picks" });
    }

    const season = Number(req.query.year) || new Date().getFullYear();
    const games = await getGameModel().find({ season });
    const week = getCurrentWeek(games);
    const validGameIds = new Set(games.filter(game => Number(game.week) === Number(week)).map(game => Number(game.id)));
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
    const pool = await Pool.findById(req.params.id).populate("participants", "name");
    if (!pool) return res.status(404).json({ message: "Pool not found" });

    const isParticipant = pool.participants.some(participant => participant._id.toString() === req.userId);
    if (!isParticipant) return res.status(403).json({ message: "Join this pool to view its leaderboard" });

    const season = Number(req.query.year) || new Date().getFullYear();
    const games = await getGameModel().find({ season }).sort({ startDate: 1 });
    const week = getCurrentWeek(games);
    const weekGames = games.filter(game => Number(game.week) === Number(week));
    const gameIds = new Set(weekGames.map(game => Number(game.id)));
    const picks = await Pick.find({ poolId: pool._id, season, week });
    const picksByUser = new Map();

    picks.forEach(pick => {
      if (!picksByUser.has(pick.userId.toString())) picksByUser.set(pick.userId.toString(), new Map());
      picksByUser.get(pick.userId.toString()).set(Number(pick.gameId), pick.pick);
    });

    const completedGames = weekGames.filter(game => game.homePoints != null && game.awayPoints != null);
    const leaderboard = pool.participants.map(participant => {
      const userPicks = picksByUser.get(participant._id.toString()) || new Map();
      let correct = 0;

      completedGames.forEach(game => {
        const pick = userPicks.get(Number(game.id));
        if (!pick) return;

        const homeWon = Number(game.homePoints) > Number(game.awayPoints);
        const awayWon = Number(game.awayPoints) > Number(game.homePoints);
        if ((pick === "home" && homeWon) || (pick === "away" && awayWon)) correct++;
      });

      return {
        userId: participant._id,
        name: participant.name,
        correct,
        picks: [...userPicks.keys()].filter(gameId => gameIds.has(gameId)).length,
      };
    }).sort((a, b) => b.correct - a.correct || b.picks - a.picks || a.name.localeCompare(b.name));

    let previousScore = null;
    leaderboard.forEach((entry, index) => {
      if (entry.correct !== previousScore) entry.rank = index + 1;
      else entry.rank = leaderboard[index - 1].rank;
      previousScore = entry.correct;
    });

    res.json({
      pool: { id: pool._id, name: pool.name, conference: pool.conference, scoringType: pool.scoringType },
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

// POST /api/pools — create a pool
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, scoringType, conference, limit } = req.body;
    if (!name || !scoringType) {
      return res.status(400).json({ message: "name and scoringType are required" });
    }
    if (!["straight", "spread"].includes(scoringType)) {
      return res.status(400).json({ message: "Invalid scoringType" });
    }

    const pool = await Pool.create({
      name,
      scoringType,
      conference: conference || "All",
      limit: limit || null,
      creatorId: req.userId,
      participants: [req.userId], // creator auto-joins
    });

    res.status(201).json({ id: pool._id, name: pool.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create pool" });
  }
});

// POST /api/pools/:id/join
router.post("/:id/join", requireAuth, async (req, res) => {
  try {
    const pool = await Pool.findById(req.params.id);
    if (!pool) return res.status(404).json({ message: "Pool not found" });

    const alreadyIn = pool.participants.some(p => p.toString() === req.userId);
    if (alreadyIn) return res.json({ message: "Already joined" });

    if (pool.limit && pool.participants.length >= pool.limit) {
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