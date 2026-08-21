import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";import subscriberRoutes from "./routes/subscriberRoutes.js";
import authRoutes from "./routes/auth.js";
import cookieParser from "cookie-parser";


dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());
const allowedOrigins = [
  "https://nextgenscores.org",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

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
  homeApRank: Number,
  awayApRank: Number,
  spread: Number,
  overUnder: Number,
});

const Game = mongoose.model("game", gameSchema);

function normalizeTeamName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

async function fetchApRankings(year) {
  try {
    const headers = process.env.CFB_API_KEY
      ? { Authorization: `Bearer ${process.env.CFB_API_KEY}` }
      : {};

    const response = await fetch(
      `https://api.collegefootballdata.com/rankings?year=${year}`,
      { headers }
    );
    if (!response.ok) throw new Error(`CFBD rankings request failed: ${response.status}`);

    const data = await response.json();

    // Data is an array of { season, week, polls: [ { poll: "AP Top 25", ranks: [...] } ] }
    // Grab the most recent week that has an AP poll
    const apWeeks = data
      .map(w => ({
        week: w.week,
        apPoll: w.polls?.find(p => p.poll === "AP Top 25"),
      }))
      .filter(w => w.apPoll);

    if (apWeeks.length === 0) {
      console.log(`No AP poll data found for ${year}`);
      return new Map();
    }

    const latest = apWeeks[apWeeks.length - 1];
    console.log(`AP rankings fetched: week ${latest.week}, ${latest.apPoll.ranks.length} ranked teams for ${year}`);

    return new Map(
      latest.apPoll.ranks.map(rank => [normalizeTeamName(rank.school), Number(rank.rank)])
    );
  } catch (error) {
    console.error("AP rankings error:", error.message);
    return new Map();
  }
}

function addApRanks(game, apRankings) {
  const rawGame = typeof game.toObject === "function" ? game.toObject() : game;
  return {
    ...rawGame,
    homeApRank: apRankings.get(normalizeTeamName(rawGame.homeTeam)) ?? null,
    awayApRank: apRankings.get(normalizeTeamName(rawGame.awayTeam)) ?? null,
  };
}

async function syncApRanks(games, apRankings) {
  if (games.length === 0) return;

  await Game.bulkWrite(
    games.map(game => {
      const homeApRank = apRankings.get(normalizeTeamName(game.homeTeam)) ?? null;
      const awayApRank = apRankings.get(normalizeTeamName(game.awayTeam)) ?? null;

      return {
        updateOne: {
          filter: { _id: game._id },
          update: { $set: { homeApRank, awayApRank } },
        },
      };
    }),
    { ordered: false }
  );
}

// --- Health check ---
app.get("/", (req, res) => res.send("NextGenScores API is live!"));

// --- Route: Fetch all 2025 games, logos, and betting lines ---
// --- Route: Fetch games for a given season (defaults to current year) ---
app.get("/api/fetch-games", async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const apRankings = await fetchApRankings(year);

    // Only clear games for that season, not the whole collection
    await Game.deleteMany({ season: year });
    console.log(`🗑️ Cleared existing ${year} games from MongoDB`);

    const headers = process.env.CFB_API_KEY
      ? { Authorization: `Bearer ${process.env.CFB_API_KEY}` }
      : {};

    const gamesRes = await fetch(
      `https://api.collegefootballdata.com/games?year=${year}`,
      { headers }
    );
    const gamesData = await gamesRes.json();

    const teamsRes = await fetch("https://api.collegefootballdata.com/teams", { headers });
    const teamsData = await teamsRes.json();

    const teamLogoMap = {};
    teamsData.forEach(team => {
      if (team.school && team.logos && team.logos.length > 0) {
        teamLogoMap[team.school] = team.logos[0];
      }
    });

    const linesRes = await fetch(`https://api.collegefootballdata.com/lines?year=${year}`, { headers });
    const linesData = await linesRes.json();
    const linesMap = {};
    linesData.forEach(line => {
      linesMap[line.id] = line.lines && line.lines.length > 0 ? line.lines[0] : {};
    });

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
      homeApRank: apRankings.get(normalizeTeamName(g.homeTeam)) ?? null,
      awayApRank: apRankings.get(normalizeTeamName(g.awayTeam)) ?? null,
      spread: linesMap[g.id]?.spread ?? null,
      overUnder: linesMap[g.id]?.overUnder ?? null,
    }));

    const result = await Game.insertMany(enrichedGames, { ordered: false }).catch(err => {
      if (err.code !== 11000) console.error(err);
    });

    res.json({ message: `Inserted ${result?.length || 0} games for ${year} with logos and betting data.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch or store enriched games", details: err.message });
  }
});

// --- Route: Get all games from DB ---
app.get("/api/games", async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const games = await Game.find({ season: year }).sort({ week: 1 });
    const apRankings = await fetchApRankings(year);
    await syncApRanks(games, apRankings);
    res.json(games.map(game => addApRanks(game, apRankings)));
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
