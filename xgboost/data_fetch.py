import os
import time
import logging
import requests
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv

# -------------------------------
# Setup
# -------------------------------
load_dotenv()
CFBD_API_KEY = os.getenv("CFB_API_KEY")
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = "ncaa"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
raw_collection = db["cfbd_raw"]

HEADERS = {"Authorization": f"Bearer {CFBD_API_KEY}"}
BASE_URL = "https://api.collegefootballdata.com"

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

# -------------------------------
# Endpoints that just need `year`
# -------------------------------
endpoints = [
    "/rankings",
    "/teams",
    "/teams/fbs",
    "/teams/ats",
    "/stats/season",
    "/stats/season/advanced",
    "/ratings/sp",
    "/ratings/srs",
    "/ratings/elo",
    "/ratings/fpi",
    "/ppa/teams",
    "/conferences",
    "/venues",
    "/coaches",
]

# -------------------------------
# Fetch & store
# -------------------------------
def fetch_and_store(endpoint, year):
    url = BASE_URL + endpoint
    params = {"year": year}
    try:
        response = requests.get(url, headers=HEADERS, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        if not data:
            logging.warning(f"No data returned for {endpoint} {year}")
            return
        # Store in MongoDB
        if isinstance(data, list):
            raw_collection.insert_many(data)
        else:
            raw_collection.insert_one(data)
        logging.info(f"✅ Stored {len(data) if isinstance(data,list) else 1} records for {endpoint} {year}")
        time.sleep(0.2)  # avoid rate limits
    except Exception as e:
        logging.error(f"❌ Failed for {endpoint} {year}: {e}")

# -------------------------------
# Loop over years and endpoints
# -------------------------------
for year in range(2015, 2026):
    for ep in endpoints:
        fetch_and_store(ep, year)

# -------------------------------
# Optional: export a CSV for verification
# -------------------------------
all_docs = list(raw_collection.find())
if all_docs:
    df = pd.json_normalize(all_docs)
    df.to_csv("cfbd_raw_data.csv", index=False)
    logging.info("CSV exported: cfbd_raw_data.csv")
else:
    logging.warning("No data found to export")
