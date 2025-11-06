import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB Atlas 'ncaa' database
const uri = process.env.MONGODB_URI;
mongoose
  .connect(uri, { dbName: "ncaa" })
  .then(() => console.log("✅ Connected to MongoDB Atlas (ncaa database)"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Game schema
const GameSchema = new mongoose.Schema({
  gameId: Number,
  homeTeam: String,
  awayTeam: String,
  spread: Number,
  date: String,
});
const Game = mongoose.model("Game", GameSchema);

// Health check
app.get("/", (req, res) => {
  res.send("NextGenScores API is live!");
});

// List all games
app.get("/api/games", async (req, res) => {
  try {
    const games = await Game.find({}, { _id: 0 });
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch games from MongoDB" });
  }
});

// Add a test game
app.post("/api/games", async (req, res) => {
  try {
    const newGame = new Game(req.body);
    await newGame.save();
    res.json(newGame);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save game" });
  }
});

// Fetch this weekend's games + spreads
app.get("/api/update-games", async (req, res) => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const week = 11; // Only fetch Week 11
    const headers = { Authorization: `Bearer ${process.env.CFB_API_KEY}` };

    // Fetch games for the specific week
    const response = await fetch(
      `https://api.collegefootballdata.com/games?year=${year}&seasonType=regular&week=${week}`,
      { headers }
    );

    const data = await response.json();
    let inserted = 0;

    for (const game of data) {
      const spread = game.lines?.[0]?.spread ?? null;

      const gameDoc = {
        gameId: game.id,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        spread,
        date: game.start_date,
      };

      await Game.updateOne({ gameId: game.id }, { $set: gameDoc }, { upsert: true });
      inserted++;
    }

    res.json({ message: `Fetched and updated ${inserted} games for Week ${week}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch games from CollegeFootballData API" });
  }
});

// Start server (Render uses process.env.PORT)
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
