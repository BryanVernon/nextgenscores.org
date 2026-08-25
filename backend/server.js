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
  "http://127.0.0.1:5173",
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
  oddsSource: String,
  outlet: String,
});
gameSchema.index({ season: 1, week: 1, startDate: 1 });

const Game = mongoose.model("game", gameSchema);

function normalizeTeamName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

// CFBD and odds providers occasionally use different, but equivalent, school names.
// Keep this list intentionally small so an uncertain match never assigns a line to
// the wrong game.
const TEAM_NAME_ALIASES = new Map([
  ["olemiss", "mississippi"],
  ["uconn", "connecticut"],
  ["umass", "massachusetts"],
  ["miamioh", "miamiohio"],
  ["hawaii", "hawaii"],
  ["louisianamonroe", "ulm"],
  ["ulmonroe", "ulm"],
  ["louisianalafayette", "louisiana"],
  ["ullafayette", "louisiana"],
  ["utep", "texaselpaso"],
  ["utsa", "texassanantonio"],
  ["brighamyoung", "byu"],
  ["centralflorida", "ucf"],
  ["floridainternational", "fiu"],
  ["louisianatech", "latech"],
  ["middletennessee", "middletennessee"],
  ["northcarolinastate", "ncstate"],
  ["southerncalifornia", "usc"],
  ["southernmethodist", "smu"],
  ["texaschristian", "tcu"],
]);

function comparableTeamName(name) {
  const normalized = normalizeTeamName(name);
  const alias = [...TEAM_NAME_ALIASES.entries()]
    .sort(([left], [right]) => right.length - left.length)
    .find(([variant]) => normalized.startsWith(variant));
  return alias?.[1] ?? normalized;
}

function matchupKey(homeTeam, awayTeam) {
  return `${comparableTeamName(homeTeam)}:${comparableTeamName(awayTeam)}`;
}

function selectTheOddsApiLine(event) {
  const hasUsableLine = bookmaker => bookmaker.markets?.some(market =>
    market.key === "spreads" || market.key === "totals"
  );
  const preferredBooks = ["fanduel", "draftkings", "betmgm", "caesars"];
  const bookmaker = preferredBooks
    .map(key => event.bookmakers?.find(item => item.key === key))
    .find(hasUsableLine)
    ?? event.bookmakers?.find(hasUsableLine);

  if (!bookmaker) return null;

  const spreadMarket = bookmaker.markets.find(market => market.key === "spreads");
  const totalMarket = bookmaker.markets.find(market => market.key === "totals");
  const homeSpread = spreadMarket?.outcomes?.find(outcome => outcome.name === event.home_team)?.point;
  const total = totalMarket?.outcomes?.find(outcome => outcome.name === "Over")?.point;

  if (homeSpread == null && total == null) return null;

  return {
    spread: homeSpread ?? null,
    overUnder: total ?? null,
    source: `The Odds API (${bookmaker.title})`,
  };
}

function providerTeamMatches(scheduleTeam, providerTeam) {
  const schedule = comparableTeamName(scheduleTeam);
  const provider = comparableTeamName(providerTeam);
  return provider === schedule || provider.startsWith(schedule);
}

function timesAreCompatible(scheduleStart, oddsStart) {
  const scheduleTime = new Date(scheduleStart).getTime();
  const oddsTime = new Date(oddsStart).getTime();
  if (Number.isNaN(scheduleTime) || Number.isNaN(oddsTime)) return true;

  // Kickoff times can be announced or adjusted independently by the providers.
  return Math.abs(scheduleTime - oddsTime) < 36 * 60 * 60 * 1000;
}

async function fetchTheOddsApiOdds(games) {
  const apiKey = process.env.THE_ODDS_API_KEY;
  if (!apiKey) return new Map();

  const query = new URLSearchParams({
    apiKey,
    regions: "us",
    markets: "spreads,totals",
    oddsFormat: "american",
  });
  const response = await fetch(
    `https://api.the-odds-api.com/v4/sports/americanfootball_ncaaf/odds?${query}`
  );

  if (!response.ok) {
    throw new Error(`The Odds API request failed: ${response.status}`);
  }

  const oddsByMatchup = new Map();
  const events = await response.json();
  events.forEach(event => {
    const line = selectTheOddsApiLine(event);
    if (!line) return;

    const matchedGames = games.filter(game =>
      providerTeamMatches(game.homeTeam, event.home_team) &&
      providerTeamMatches(game.awayTeam, event.away_team) &&
      timesAreCompatible(game.startDate, event.commence_time)
    );

    // A line is used only when it maps unambiguously to one scheduled game.
    if (matchedGames.length === 1) {
      const game = matchedGames[0];
      oddsByMatchup.set(matchupKey(game.homeTeam, game.awayTeam), line);
    }
  });

  return oddsByMatchup;
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

    let theOddsApiOdds = new Map();
    if (process.env.THE_ODDS_API_KEY) {
      try {
        theOddsApiOdds = await fetchTheOddsApiOdds(gamesData);
        console.log(`The Odds API fallback supplied lines for ${theOddsApiOdds.size} matchups.`);
      } catch (error) {
        // Do not make an odds-provider outage prevent the existing CFBD schedule import.
        console.error("The Odds API fallback error:", error.message);
      }
    }

    const enrichedGames = gamesData.map(g => {
      const cfbdLine = linesMap[g.id] ?? {};
      const fallbackLine = theOddsApiOdds.get(matchupKey(g.homeTeam, g.awayTeam));
      const spread = cfbdLine.spread ?? fallbackLine?.spread ?? null;
      const overUnder = cfbdLine.overUnder ?? fallbackLine?.overUnder ?? null;

      return {
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
        spread,
        overUnder,
        oddsSource: cfbdLine.spread != null || cfbdLine.overUnder != null
          ? "CollegeFootballData"
          : fallbackLine?.source ?? null,
        outlet: outletByGameId.get(Number(g.id)) ?? g.outlet ?? g.tv ?? g.network ?? null,
      };
    });

    const result = await Game.insertMany(enrichedGames, { ordered: false }).catch(err => {
      if (err.code !== 11000) console.error(err);
    });

    res.json({
      message: `Inserted ${result?.length || 0} games for ${year} with logos and betting data.`,
      theOddsApiFallback: Boolean(process.env.THE_ODDS_API_KEY),
    });
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
    // This is the read path used by the schedule and dashboard. Rankings are
    // stored during the deliberate season import, so page views never call CFBD.
    const games = await Game.find({ season: year }).sort({ week: 1 }).lean();
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch games from MongoDB" });
  }
});

function currentWeekFromMetadata(weeks) {
  const now = Date.now();
  const started = weeks.filter(item => new Date(item.startDate).getTime() <= now);
  return started.at(-1)?.week ?? weeks[0]?.week ?? null;
}

// The schedule screen needs a small amount of metadata for its filters, but it
// should never need to download an entire season's game cards at once.
app.get("/api/schedule", async (req, res) => {
  try {
    const season = parseInt(req.query.year) || new Date().getFullYear();
    const [weeks, teams] = await Promise.all([
      Game.aggregate([
        { $match: { season } },
        { $group: { _id: "$week", startDate: { $min: "$startDate" } } },
        { $project: { _id: 0, week: "$_id", startDate: 1 } },
        { $sort: { startDate: 1 } },
      ]),
      Game.aggregate([
        { $match: { season } },
        { $project: { teams: [
          { name: "$homeTeam", conference: "$homeConference", rank: "$homeApRank" },
          { name: "$awayTeam", conference: "$awayConference", rank: "$awayApRank" },
        ] } },
        { $unwind: "$teams" },
        { $match: { "teams.name": { $ne: null } } },
        { $group: {
          _id: "$teams.name",
          conference: { $first: "$teams.conference" },
          rank: { $min: { $ifNull: ["$teams.rank", 9999] } },
        } },
        { $project: {
          _id: 0,
          name: "$_id",
          conference: 1,
          rank: { $cond: [{ $eq: ["$rank", 9999] }, null, "$rank"] },
        } },
        { $sort: { name: 1 } },
      ]),
    ]);

    const currentWeek = currentWeekFromMetadata(weeks);
    const requestedWeek = req.query.week === "all" ? null : Number(req.query.week) || currentWeek;
    const filter = { season };
    if (requestedWeek != null) filter.week = requestedWeek;

    if (req.query.team) {
      filter.$or = [{ homeTeam: req.query.team }, { awayTeam: req.query.team }];
    } else if (req.query.conference && req.query.conference !== "All") {
      if (req.query.conference === "AP Top 25") {
        filter.$or = [{ homeApRank: { $ne: null } }, { awayApRank: { $ne: null } }];
      } else {
        filter.$or = [{ homeConference: req.query.conference }, { awayConference: req.query.conference }];
      }
    }

    const games = await Game.find(filter).sort({ startDate: 1 }).lean();
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    res.json({ games, weeks, teams, currentWeek });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch schedule from MongoDB" });
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
