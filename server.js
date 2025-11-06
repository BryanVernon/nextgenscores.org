import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Health check
app.get("/", (req, res) => {
  res.send("NextGenScores API is live!");
});

// Fetch Week 11 games from CollegeFootballData API
app.get("/api/games/week11", async (req, res) => {
  try {
    const headers = process.env.CFB_API_KEY
      ? { Authorization: `Bearer ${process.env.CFB_API_KEY}` }
      : {};

    const response = await fetch(
      "https://api.collegefootballdata.com/games?year=2025&week=11",
      { headers }
    );

    if (!response.ok) {
      throw new Error(`CFB API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Optional: only return games with home and away teams defined
    const validGames = data.filter(game => game.homeTeam && game.awayTeam);

    res.json(validGames);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Week 11 games" });
  }
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
