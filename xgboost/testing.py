import os
import requests
import logging
from dotenv import load_dotenv
from pymongo import MongoClient

# -------------------------------
# Load environment variables
# -------------------------------
load_dotenv()
CFBD_API_KEY = os.getenv("CFB_API_KEY")
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = "ncaa"

HEADERS = {"Authorization": f"Bearer {CFBD_API_KEY}"}
BASE_URL = "https://api.collegefootballdata.com"

# -------------------------------
# Configure logging
# -------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

# -------------------------------
# MongoDB setup
# -------------------------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db["games_raw"]

def clear_collection():
    result = collection.delete_many({})
    logging.info(f"Cleared {result.deleted_count} documents from collection")

def fetch_endpoint(endpoint, params=None):
    """Fetch a CFBD endpoint and return JSON."""
    url = f"{BASE_URL}/{endpoint}"
    r = requests.get(url, headers=HEADERS, params=params or {})
    if r.status_code != 200:
        logging.warning(f"Failed to fetch {endpoint}: {r.status_code}")
        return []
    data = r.json()
    logging.info(f"Fetched {len(data) if isinstance(data, list) else 'N/A'} items from {endpoint}")
    return data

def normalize_team_name(name: str):
    """Normalize team names for fuzzy matching."""
    return name.lower().replace("&", "and").replace(".", "").strip() if name else ""

def fetch_and_merge_all(year: int):
    clear_collection()

    # Fetch main game list (all games for the season)
    games = fetch_endpoint("games", {"year": year, "seasonType": "regular"})
    if not games:
        logging.error("No games fetched. Aborting.")
        return []

    # Endpoints to merge
    endpoints = {
        "teams": "teams/fbs",
        "venues": "venues",
        "ratings_sp": "ratings/sp",
        "ratings_fpi": "ratings/fpi",
        "stats_season": "stats/season",
        "records": "records",
        "lines": "lines",
        "rankings": "rankings",
        "coaches": "coaches",
        "conferences": "conferences"
    }

    extra_data = {}
    for key, ep in endpoints.items():
        extra_data[key] = fetch_endpoint(ep, {"year": year})

    # Create normalized lookup dictionaries for faster matching
    team_index = {normalize_team_name(t["school"]): t for t in extra_data["teams"]}
    sp_index = {normalize_team_name(t["team"]): t for t in extra_data["ratings_sp"]}
    fpi_index = {normalize_team_name(t["team"]): t for t in extra_data["ratings_fpi"]}
    stat_index = {normalize_team_name(t["team"]): t for t in extra_data["stats_season"]}
    record_index = {normalize_team_name(t["team"]): t for t in extra_data["records"]}
    venue_index = {v["id"]: v for v in extra_data["venues"]}

    sp_merged_count = 0
    team_info_count = 0
    season_stats_count = 0

    # Merge data into each game
    for game in games:
        home_team = game.get("homeTeam")
        away_team = game.get("awayTeam")

        home_key = normalize_team_name(home_team)
        away_key = normalize_team_name(away_team)

        # Initialize nested fields
        game["ratings"] = {"sp": {"home": None, "away": None}, "fpi": {"home": None, "away": None}}
        game["team_info"] = {"home": None, "away": None}
        game["season_stats"] = {"home": None, "away": None}
        game["records"] = {"home": None, "away": None}
        game["venue_info"] = None
        game["fbs_only"] = False  # flag if ratings exist

        # Merge ratings safely
        game["ratings"]["sp"]["home"] = sp_index.get(home_key)
        game["ratings"]["sp"]["away"] = sp_index.get(away_key)
        game["ratings"]["fpi"]["home"] = fpi_index.get(home_key)
        game["ratings"]["fpi"]["away"] = fpi_index.get(away_key)
        if game["ratings"]["sp"]["home"] or game["ratings"]["sp"]["away"]:
            sp_merged_count += 1
            game["fbs_only"] = True

        # Merge team info
        game["team_info"]["home"] = team_index.get(home_key)
        game["team_info"]["away"] = team_index.get(away_key)
        if game["team_info"]["home"] or game["team_info"]["away"]:
            team_info_count += 1

        # Merge season stats
        game["season_stats"]["home"] = stat_index.get(home_key)
        game["season_stats"]["away"] = stat_index.get(away_key)
        if game["season_stats"]["home"] or game["season_stats"]["away"]:
            season_stats_count += 1

        # Merge team records (FBS + all divisions)
        game["records"]["home"] = record_index.get(home_key)
        game["records"]["away"] = record_index.get(away_key)

        # Merge venue info
        venue_id = game.get("venueId")
        game["venue_info"] = venue_index.get(venue_id) if venue_id else None

        # Debug unmatched teams
        if not game["ratings"]["sp"]["home"]:
            logging.debug(f"No SP rating for home team: {home_team}")
        if not game["ratings"]["sp"]["away"]:
            logging.debug(f"No SP rating for away team: {away_team}")
        if not game["team_info"]["home"]:
            logging.debug(f"No FBS team info for home team: {home_team}")
        if not game["team_info"]["away"]:
            logging.debug(f"No FBS team info for away team: {away_team}")

    # Insert merged data into MongoDB
    if games:
        collection.insert_many(games)
        logging.info(f"Inserted {len(games)} merged game records into MongoDB")

    # Merge summary
    logging.info(f"✅ SP ratings merged for {sp_merged_count} games")
    logging.info(f"✅ Team info merged for {team_info_count} games")
    logging.info(f"✅ Season stats merged for {season_stats_count} games")

    return games


if __name__ == "__main__":
    data = fetch_and_merge_all(2024)
    logging.info(f"✅ Finished pulling and merging {len(data)} total games")
