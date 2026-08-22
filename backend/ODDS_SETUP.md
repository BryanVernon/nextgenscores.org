# College-football odds fallback

CollegeFootballData remains the primary source for the schedule and betting
lines. To fill missing point spreads and totals when a second provider has a
listed market, create a free The Odds API key and set this server-side
environment variable locally and in Render:

```text
THE_ODDS_API_KEY=your_the_odds_api_key
```

On the next `/api/fetch-games?year=YYYY` refresh, the importer makes one U.S.
spreads-and-totals request, preserves CFBD lines, and fills only missing values
from The Odds API. It never invents a line for a game that no sportsbook has
priced.

The free plan includes 500 monthly credits. This importer request normally uses
two credits because it asks for two markets: spreads and totals. Do not call the
refresh endpoint on every page load.
