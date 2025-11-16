import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";import subscriberRoutes from "./routes/subscriberRoutes.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use("/api", subscriberRoutes);
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
  homeLogo: String,
  awayLogo: String,
  spread: Number,
  overUnder: Number,
});

const Game = mongoose.model("game", gameSchema);

// --- Health check ---
app.get("/", (req, res) => res.send("NextGenScores API is live!"));

// --- Route: Fetch all 2025 games, logos, and betting lines ---
app.get("/api/fetch-2025-games", async (req, res) => {
  try {
    // Clear existing games
    await Game.deleteMany({});
    console.log("🗑️ Cleared all existing games from MongoDB");

    const headers = process.env.CFB_API_KEY
      ? { Authorization: `Bearer ${process.env.CFB_API_KEY}` }
      : {};

    // --- Fetch games ---
    const gamesRes = await fetch(
      "https://api.collegefootballdata.com/games?year=2025",
      { headers }
    );
    const gamesData = await gamesRes.json();

    // --- Fetch teams ---
    const teamsRes = await fetch("https://api.collegefootballdata.com/teams", { headers });
    const teamsData = await teamsRes.json();

    // Create a lookup map: team name => logo URL
    const teamLogoMap = {};
    teamsData.forEach(team => {
      if (team.school && team.logos && team.logos.length > 0) {
        teamLogoMap[team.school] = team.logos[0]; // take first logo
      }
    });

    // --- Fetch betting lines ---
    const linesRes = await fetch("https://api.collegefootballdata.com/lines?year=2025", { headers });
    const linesData = await linesRes.json();
    // Create a map: gameId => lines object
    const linesMap = {};
    linesData.forEach(line => {
      linesMap[line.id] = line.lines && line.lines.length > 0 ? line.lines[0] : {};
    });

    // --- Enrich games ---
    const enrichedGames = gamesData.map(g => ({
      id: g.id,
      season: g.season,
      week: g.week,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homePoints: g.homePoints ?? null,
      awayPoints: g.awayPoints ?? null,
      startDate: g.startDate,
      venue: g.venue,
      homeConference: g.homeConference,
      awayConference: g.awayConference,
      homeLogo: teamLogoMap[g.homeTeam] ?? "",
      awayLogo: teamLogoMap[g.awayTeam] ?? "",
      spread: linesMap[g.id]?.spread ?? null,
      overUnder: linesMap[g.id]?.overUnder ?? null,
    }));

    const result = await Game.insertMany(enrichedGames, { ordered: false }).catch(err => {
      if (err.code !== 11000) console.error(err);
    });

    res.json({ message: `Inserted ${result?.length || 0} games with logos and betting data.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch or store enriched games", details: err.message });
  }
});


// --- Route: Get all games from DB ---
app.get("/api/games", async (req, res) => {
  try {
    const games = await Game.find().sort({ week: 1 });
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch games from MongoDB" });
  }
});


// Routes
app.use("/api/auth", authRoutes);

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
