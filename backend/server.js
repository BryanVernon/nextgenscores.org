import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";import subscriberRoutes from "./routes/subscriberRoutes.js";
import authRoutes from "./routes/auth.js";
import cookieParser from "cookie-parser";
import poolRoutes from "./routes/pools.js";
import adminRoutes from "./routes/admin.js";

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
  outlet: String,
});

const Game = mongoose.model("game", gameSchema);

function normalizeTeamName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

async function fetchGameOutlets(year) {
  try {
    const headers = process.env.CFB_API_KEY
      ? { Authorization: `Bearer ${process.env.CFB_API_KEY}` }
      : {};
    const response = await fetch(
      `https://api.collegefootballdata.com/games/media?year=${year}`,
      { headers }
    );
    if (!response.ok) throw new Error(`CFBD media request failed: ${response.status}`);

    const media = await response.json();
    return new Map(media.filter(item => item.outlet).map(item => [Number(item.id), item.outlet]));
  } catch (error) {
    console.error("Game media fetch error:", error.message);
    return new Map();
  }
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
    const outletByGameId = await fetchGameOutlets(year);

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
      outlet: outletByGameId.get(Number(g.id)) ?? g.outlet ?? g.tv ?? g.network ?? null,
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

// Backfill TV outlets without replacing the existing schedule data.
app.get("/api/sync-game-outlets", async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const outletByGameId = await fetchGameOutlets(year);
    const operations = [...outletByGameId].map(([id, outlet]) => ({
      updateOne: { filter: { id }, update: { $set: { outlet } } },
    }));

    if (operations.length) await Game.bulkWrite(operations, { ordered: false });
    res.json({ message: `Updated TV outlets for ${operations.length} ${year} games.` });
  } catch (error) {
    console.error("Sync game outlets error:", error);
    res.status(500).json({ error: "Failed to sync game outlets" });
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
// --- Route: Team summary for dashboard (record, last game, next game) ---
app.get("/api/team-summary", async (req, res) => {
  try {
    const { team, year } = req.query;
    if (!team) return res.status(400).json({ error: "team is required" });

    const season = parseInt(year) || new Date().getFullYear();
    const games = await Game.find({
      season,
      $or: [{ homeTeam: team }, { awayTeam: team }],
    }).sort({ startDate: 1 }).lean();

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
        upcoming.push({ opponent, isHome, startDate: g.startDate, outlet: g.outlet ?? g.tv ?? g.network ?? null });
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
// --- Route: Teams grouped by conference (for dropdowns) ---
app.get("/api/teams-by-conference", async (req, res) => {
  try {
    const season = parseInt(req.query.year) || new Date().getFullYear();
    const games = await Game.find({ season });

    const map = {};
    games.forEach(g => {
      if (g.homeConference && g.homeTeam) {
        map[g.homeConference] = map[g.homeConference] || new Set();
        map[g.homeConference].add(g.homeTeam);
      }
      if (g.awayConference && g.awayTeam) {
        map[g.awayConference] = map[g.awayConference] || new Set();
        map[g.awayConference].add(g.awayTeam);
      }
    });

    const result = Object.fromEntries(
      Object.entries(map).map(([conf, teams]) => [conf, Array.from(teams).sort()])
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load teams by conference" });
  }
});
app.use("/api/pools", poolRoutes);
app.use("/api/admin", adminRoutes);

// Routes
app.use("/api/auth", authRoutes);

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
