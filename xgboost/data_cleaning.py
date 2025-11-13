import os
import requests
from dotenv import load_dotenv
import time

# -------------------------------
# Setup
# -------------------------------
load_dotenv()
CFB_API_KEY = os.getenv("CFB_API_KEY")
HEADERS = {"Authorization": f"Bearer {CFB_API_KEY}"}
BASE_URL = "https://api.collegefootballdata.com"

# -------------------------------
# Endpoints to test
# -------------------------------
ENDPOINTS = [
    "/games",
    "/games/teams",
    "/games/players",
    "/games/media",
    "/games/weather",
    "/records",
    "/calendar",
    "/scoreboard",
    "/game/box/advanced",
    "/drives",
    "/plays",
    "/plays/types",
    "/plays/stats",
    "/plays/stats/types",
    "/live/plays",
    "/teams",
    "/teams/fbs",
    "/teams/matchup",
    "/teams/ats",
    "/roster",
    "/talent",
    "/conferences",
    "/venues",
    "/coaches",
    "/player/search",
    "/player/usage",
    "/player/returning",
    "/player/portal",
    "/rankings",
    "/lines",
    "/recruiting/players",
    "/recruiting/teams",
    "/recruiting/groups",
    "/ratings/sp",
    "/ratings/sp/conferences",
    "/ratings/srs",
    "/ratings/elo",
    "/ratings/fpi",
    "/ppa/predicted",
    "/ppa/teams",
    "/ppa/games",
    "/ppa/players/games",
    "/ppa/players/season",
    "/metrics/wp",
    "/metrics/wp/pregame",
    "/metrics/fg/ep",
    "/stats/player/season",
    "/stats/season",
    "/stats/categories",
    "/stats/season/advanced",
    "/stats/game/advanced",
    "/stats/game/havoc",
    "/draft/teams",
    "/draft/positions",
    "/draft/picks"
]

# -------------------------------
# Years to test
# -------------------------------
YEARS = list(range(2024, 2025))

# -------------------------------
# Diagnostic function
# -------------------------------
def test_endpoint(endpoint, year):
    url = BASE_URL + endpoint
    params = {"year": year, "seasonType": "regular"}

    try:
        response = requests.get(url, headers=HEADERS, params=params, timeout=20)
        print(f"\n🔎 Testing {endpoint} ({year}) → {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print(f"   ✅ Records: {len(data)}")
                if len(data) > 0:
                    print(f"   Sample: {data[:1]}")
            else:
                print("   ✅ Single object returned:", list(data.keys()))
        else:
            print(f"   ⚠️  Response content: {response.text[:120]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

# -------------------------------
# Main Loop
# -------------------------------
for endpoint in ENDPOINTS:
    for year in YEARS:
        test_endpoint(endpoint, year)

print("\n✅ Diagnostics complete! Check above for which endpoints/years return valid data.")
