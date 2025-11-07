import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// --- Connect to MongoDB ---
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// --- Define Game Schema ---
const gameSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  season: Number,
  week: Number,
  homeTeam: String,
  awayTeam: String,
  homePoints: Number,
  awayPoints: Number,
  startDate: String,
  venue: String,
  awayConference: String,
  homeConference: String,
});

const Game = mongoose.model("game", gameSchema);

// --- Health check ---
app.get("/", (req, res) => res.send("NextGenScores API is live!"));

// --- Route: Fetch all 2025 games from API and store in DB ---
// --- Route: Fetch all 2025 games from API and store in DB ---
app.get("/api/fetch-2025-games", async (req, res) => {
  try {
    // Clear existing games first
    await Game.deleteMany({});
    console.log("🗑️ Cleared all existing games from MongoDB");

    const headers = process.env.CFB_API_KEY
      ? { Authorization: `Bearer ${process.env.CFB_API_KEY}` }
      : {};

    const response = await fetch(
      "https://api.collegefootballdata.com/games?year=2025",
      { headers }
    );

    if (!response.ok) {
      throw new Error(`CFB API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Log first 5 games to inspect
    console.log("🚀 First 5 games from API:");
    console.log(data.slice(0, 5));

    const validGames = data.filter((g) => g.homeTeam && g.awayTeam);

    // Insert new games
    const result = await Game.insertMany(validGames, { ordered: false }).catch((err) => {
      if (err.code !== 11000) console.error(err);
    });

    res.json({ message: `Inserted ${result?.length || 0} games into the database` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch or store games", details: err.message });
  }
});


// --- Route: Get all games from DB ---
app.get("/api/games", async (req, res) => {
  try {
    const games = await Game.find().sort({ week: 1 });

    // Log first 5 games from DB to inspect
    console.log("🗄️ First 5 games from DB:");
    console.log(games.slice(0, 5));

    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch games from MongoDB" });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
