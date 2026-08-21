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
router.get("/team-summary", async (req, res) => {
  try {
    const { team, year } = req.query;
    if (!team) return res.status(400).json({ error: "team is required" });

    const season = parseInt(year) || new Date().getFullYear();
    const games = await Game.find({
      season,
      $or: [{ homeTeam: team }, { awayTeam: team }],
    }).sort({ startDate: 1 });

    const now = new Date();
    let wins = 0, losses = 0;
    const played = [];
    const upcoming = [];

    games.forEach(g => {
      const isHome = g.homeTeam === team;
      const teamScore = isHome ? g.homePoints : g.awayPoints;
      const oppScore = isHome ? g.awayPoints : g.homePoints;
      const opponent = isHome ? g.awayTeam : g.homeTeam;

      if (teamScore != null && oppScore != null) {
        if (teamScore > oppScore) wins++;
        else if (teamScore < oppScore) losses++;
        played.push({ opponent, teamScore, oppScore, isHome, startDate: g.startDate });
      } else if (new Date(g.startDate) >= now) {
        upcoming.push({ opponent, isHome, startDate: g.startDate });
      }
    });

    res.json({
      team,
      record: { wins, losses },
      lastGame: played.length ? played[played.length - 1] : null,
      nextGame: upcoming.length ? upcoming[0] : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load team summary" });
  }
});
export default router;
