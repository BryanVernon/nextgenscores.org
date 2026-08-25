import dotenv from "dotenv";
import mongoose from "mongoose";
import fetch from "node-fetch";

dotenv.config();

const mongoUri = process.env.MONGODB_URI;
const apiKey = process.env.CFB_API_KEY;
const args = new Set(process.argv.slice(2));
const year = Number(process.env.CFB_YEAR || new Date().getFullYear());
const weekArg = [...args].find((arg) => arg.startsWith("--week="));
const week = Number(weekArg?.split("=")[1] || process.env.CFB_WEEK) || null;
const force = args.has("--force");

if (!mongoUri) throw new Error("MONGODB_URI is required");
if (!apiKey) throw new Error("CFB_API_KEY is required");

const refreshHours = {
  games: Number(process.env.CFB_GAMES_REFRESH_HOURS || 6),
  rankings: Number(process.env.CFB_RANKINGS_REFRESH_HOURS || 12),
  lines: Number(process.env.CFB_LINES_REFRESH_HOURS || 3),
  media: Number(process.env.CFB_MEDIA_REFRESH_HOURS || 24),
  teams: Number(process.env.CFB_TEAMS_REFRESH_HOURS || 24 * 30),
};

const headers = { Accept: "application/json", Authorization: `Bearer ${apiKey}` };

function value(object, camelCase, snakeCase = camelCase) {
  return object?.[camelCase] ?? object?.[snakeCase] ?? null;
}

function scopeFor(feed) {
  // Teams and rankings are season-wide data, not week-specific data.
  const scopeWeek = ["teams", "rankings"].includes(feed) ? "all" : week ?? "all";
  return `${feed}:${year}:${scopeWeek}`;
}

async function getJson(path, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, item]) => item != null)
  );
  const response = await fetch(`https://api.collegefootballdata.com${path}?${query}`, {
    headers,
  });
  if (!response.ok) throw new Error(`CFBD ${path} request failed: ${response.status}`);
  return response.json();
}

async function shouldSync(syncState, feed) {
  if (force) return true;

  const previous = await syncState.findOne({ scope: scopeFor(feed) });
  const refreshMs = refreshHours[feed] * 60 * 60 * 1000;
  return !previous?.syncedAt || Date.now() - previous.syncedAt.getTime() >= refreshMs;
}

async function markSynced(syncState, feed) {
  await syncState.updateOne(
    { scope: scopeFor(feed) },
    {
      $set: {
        scope: scopeFor(feed),
        feed,
        year,
        week: ["teams", "rankings"].includes(feed) ? null : week,
        syncedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

async function syncFeed({ name, syncState, run }) {
  if (!(await shouldSync(syncState, name))) {
    console.log(`Skipping ${name}; refreshed within the last ${refreshHours[name]} hours.`);
    return false;
  }

  const count = await run();
  await markSynced(syncState, name);
  console.log(`Synced ${count} ${name} document${count === 1 ? "" : "s"}.`);
  return true;
}

function operations(documents, filter) {
  return documents.map((document) => ({
    updateOne: { filter: filter(document), update: { $set: document }, upsert: true },
  }));
}

async function run() {
  await mongoose.connect(mongoUri);

  try {
    const db = mongoose.connection.db;
    const games = db.collection("games");
    const teamCache = db.collection("cfb_team_cache");
    const lineCache = db.collection("cfb_line_cache");
    const mediaCache = db.collection("cfb_media_cache");
    const rankingCache = db.collection("cfb_ranking_cache");
    const syncState = db.collection("cfb_sync_state");

    await Promise.all([
      games.createIndex({ id: 1 }, { unique: true }),
      teamCache.createIndex({ id: 1 }, { unique: true }),
      lineCache.createIndex({ id: 1 }, { unique: true }),
      mediaCache.createIndex({ gameId: 1, mediaType: 1, outlet: 1 }, { unique: true }),
      rankingCache.createIndex({ year: 1, school: 1 }, { unique: true }),
      syncState.createIndex({ scope: 1 }, { unique: true }),
    ]);

    await syncFeed({
      name: "teams",
      syncState,
      run: async () => {
        const data = await getJson("/teams");
        const documents = data.map((team) => ({
          id: team.id,
          school: team.school,
          conference: team.conference ?? null,
          logos: team.logos || [],
          updatedAt: new Date(),
        }));
        if (documents.length) await teamCache.bulkWrite(operations(documents, (team) => ({ id: team.id })));
        return documents.length;
      },
    });

    await syncFeed({
      name: "rankings",
      syncState,
      run: async () => {
        const data = await getJson("/rankings", { year });
        const apWeeks = data
          .map((entry) => ({
            week: entry.week,
            ranks: entry.polls?.find((poll) => poll.poll === "AP Top 25")?.ranks || [],
          }))
          .filter((entry) => entry.ranks.length);
        const latest = apWeeks.at(-1);
        const documents = (latest?.ranks || []).map((rank) => ({
          year,
          school: rank.school,
          rank: Number(rank.rank),
          pollWeek: latest.week,
          updatedAt: new Date(),
        }));
        if (documents.length) {
          await rankingCache.bulkWrite(
            operations(documents, (rank) => ({ year: rank.year, school: rank.school }))
          );
        }
        return documents.length;
      },
    });

    await syncFeed({
      name: "lines",
      syncState,
      run: async () => {
        const data = await getJson("/lines", { year, week });
        const documents = data.map((game) => ({
          id: game.id,
          season: game.season,
          week: game.week,
          lines: game.lines || [],
          updatedAt: new Date(),
        }));
        if (documents.length) await lineCache.bulkWrite(operations(documents, (game) => ({ id: game.id })));
        return documents.length;
      },
    });

    await syncFeed({
      name: "media",
      syncState,
      run: async () => {
        const data = await getJson("/games/media", { year, week });
        const documents = data.map((item) => ({
          gameId: Number(item.id),
          mediaType: item.mediaType ?? null,
          outlet: item.outlet ?? null,
          updatedAt: new Date(),
        }));
        if (documents.length) {
          await mediaCache.bulkWrite(
            operations(documents, (item) => ({
              gameId: item.gameId,
              mediaType: item.mediaType,
              outlet: item.outlet,
            }))
          );
        }
        return documents.length;
      },
    });

    await syncFeed({
      name: "games",
      syncState,
      run: async () => {
        const schedule = await getJson("/games", { year, week });
        const ids = schedule.map((game) => Number(game.id));
        const [teams, lines, media, rankings, existing] = await Promise.all([
          teamCache.find({}).toArray(),
          lineCache.find({ id: { $in: ids } }).toArray(),
          mediaCache.find({ gameId: { $in: ids }, outlet: { $ne: null } }).toArray(),
          rankingCache.find({ year }).toArray(),
          games.find({ id: { $in: ids } }).toArray(),
        ]);

        const logos = new Map(teams.map((team) => [team.school, team.logos?.[0] || ""]));
        const linesByGame = new Map(lines.map((line) => [Number(line.id), line.lines?.[0] || {}]));
        const outlets = new Map(media.map((item) => [item.gameId, item.outlet]));
        const ranks = new Map(rankings.map((rank) => [rank.school, rank.rank]));
        const existingById = new Map(existing.map((game) => [Number(game.id), game]));

        const documents = schedule.map((game) => {
          const id = Number(value(game, "id"));
          const previous = existingById.get(id) || {};
          const line = linesByGame.get(id) || {};
          const homeTeam = value(game, "homeTeam", "home_team");
          const awayTeam = value(game, "awayTeam", "away_team");

          return {
            id,
            season: value(game, "season"),
            week: value(game, "week"),
            homeTeam,
            awayTeam,
            homePoints: value(game, "homePoints", "home_points"),
            awayPoints: value(game, "awayPoints", "away_points"),
            startDate: value(game, "startDate", "start_date"),
            venue: value(game, "venue"),
            homeConference: value(game, "homeConference", "home_conference"),
            awayConference: value(game, "awayConference", "away_conference"),
            homeLogo: logos.get(homeTeam) || previous.homeLogo || "",
            awayLogo: logos.get(awayTeam) || previous.awayLogo || "",
            homeApRank: ranks.get(homeTeam) ?? previous.homeApRank ?? null,
            awayApRank: ranks.get(awayTeam) ?? previous.awayApRank ?? null,
            spread: line.spread ?? previous.spread ?? null,
            overUnder: line.overUnder ?? previous.overUnder ?? null,
            oddsSource: line.spread != null || line.overUnder != null
              ? "CollegeFootballData"
              : previous.oddsSource ?? null,
            outlet: outlets.get(id) || previous.outlet || null,
            updatedAt: new Date(),
          };
        });

        if (documents.length) await games.bulkWrite(operations(documents, (game) => ({ id: game.id })));
        return documents.length;
      },
    });
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Sync failed:", error.message);
  process.exitCode = 1;
});
