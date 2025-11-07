import express from "express";
import fetch from "node-fetch";
import Game from "../models/game.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Check DB first
    const games = await Game.find();
    if (games.length > 0) {
      return res.json(games);
    }

    // Otherwise fetch from API
    const headers = process.env.CFB_API_KEY
      ? { Authorization: `Bearer ${process.env.CFB_API_KEY}` }
      : {};

    const response = await fetch(
      "https://api.collegefootballdata.com/games?year=2025&week=11",
      { headers }
    );
    const data = await response.json();

    const validGames = data.filter((game) => game.homeTeam && game.awayTeam);

    // Save to DB
    await Game.insertMany(validGames);

    res.json(validGames);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load games" });
  }
});

export default router;
