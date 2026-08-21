import express from "express";
import Pool from "../models/pool.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

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