import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";
import User from "./models/user.js";
import emailRouter from "./routes/email.js";


dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use("/api/email", emailRouter);
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

// --- POST: Save a user pick ---
app.post("/api/picks", auth, async (req, res) => {
  const { gameId, pick, week, season, spread } = req.body;

  const existing = await Pick.findOne({ userId: req.user.userId, gameId });
  if (existing) {
    return res.status(400).json({ error: "Already picked this game" });
  }

  const newPick = await Pick.create({
    userId: req.user.userId,
    gameId,
    pick,
    week,
    season,
    spread
  });

  res.json({ message: "Pick saved", pick: newPick });
});


app.get("/api/picks/:userId", async (req, res) => {
  try {
    const picks = await Pick.find({ userId: req.params.userId });
    res.json(picks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user picks" });
  }
});


app.get("/api/leaderboard", async (req, res) => {
  const users = await User.find();
  const picks = await Pick.find();

  const leaderboard = users.map(u => {
    const userPicks = picks.filter(p => p.userId.toString() === u._id.toString());

    const correct = userPicks.filter(p => {
      const game = gamesMap[p.gameId];
      if (!game) return false;
      if (game.homePoints == null) return false;

      const result = game.homePoints - game.awayPoints;

      const covered =
        (p.pick === "home" && result + p.spread > 0) ||
        (p.pick === "away" && result + p.spread < 0);

      return covered;
    }).length;

    return {
      user: u.displayName || u.email,
      correct,
      total: userPicks.length,
      pct: userPicks.length ? (correct / userPicks.length).toFixed(3) : 0
    };
  });

  res.json(leaderboard.sort((a, b) => b.pct - a.pct));
});

app.post("/api/register", async (req, res) => {
  try {
    const { email, password, displayName, isTestUser } = req.body;

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      passwordHash: hash,
      displayName,
      isTestUser: isTestUser || false
    });

    res.json({ message: "User created", user });
  } catch (err) {
    res.status(400).json({ error: "Registration failed", details: err.message });
  }
});
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "Invalid email or password" });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(400).json({ error: "Invalid email or password" });

  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, user });
});
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

app.get("/api/picks/mine", auth, async (req, res) => {
  const picks = await Pick.find({ userId: req.user.userId });
  res.json(picks);
});

app.post("/api/create-test-user", async (req, res) => {
  const random = Math.floor(Math.random() * 10000);
  const email = `test${random}@test.com`;
  const passwordHash = await bcrypt.hash("password", 10);

  const user = await User.create({
    email,
    passwordHash,
    displayName: `TestUser${random}`,
    isTestUser: true
  });

  res.json({ message: "Test user created", user });
});


// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
