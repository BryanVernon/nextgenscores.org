# College-football odds fallback

CollegeFootballData remains the primary source for the schedule and betting
lines. To fill missing point spreads and totals when a second provider has a
listed market, create a free The Odds API key and set this server-side
environment variable locally and in Render:

```text
THE_ODDS_API_KEY=your_the_odds_api_key
```

On the next authenticated administrator `POST /api/fetch-games?year=YYYY`
request (with `Content-Type: application/json` and an empty JSON body), the importer makes one U.S.
spreads-and-totals request, preserves CFBD lines, and fills only missing values
from The Odds API. It never invents a line for a game that no sportsbook has
priced. The refresh updates games by ID without deleting the existing schedule.
`POST /api/sync-game-outlets?year=YYYY` uses the same administrator and JSON requirements.

The free plan includes 500 monthly credits. This importer request normally uses
two credits because it asks for two markets: spreads and totals. Do not call the
refresh endpoint on every page load.
