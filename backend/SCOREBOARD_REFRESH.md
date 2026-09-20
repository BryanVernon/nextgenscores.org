# Scoreboard Refresh Job

GitHub Actions schedules refresh requests. Render executes them, so MongoDB and provider access remain in Render and the refresh is not affected by a PC VPN.

## Required configuration

1. Create a long random value and add it to the Render web service as `SCOREBOARD_JOB_TOKEN`.
2. Add the exact same value to the GitHub repository Actions secrets as `SCOREBOARD_JOB_TOKEN`.
3. Ensure the Render web service already has `MONGODB_URI` and `CFB_API_KEY` configured for season schedule synchronization.
4. Deploy the backend, then run **Refresh Scoreboard** from GitHub Actions once with `force` enabled to confirm the protected endpoint works.

Scheduled invocations occur at minute 17 of every hour. Render permits a refresh at 7 AM and 7 PM daily, plus every hour from 11 AM through 11 PM on Saturdays, in `America/Chicago`. Each permitted run reads NCAA.com scoreboard data through the open-source [ncaa-api](https://github.com/henrygd/ncaa-api) project and updates live scores, state, period, and clock for uniquely matched scheduled games. The season schedule feed remains throttled separately, so the live board does not wait for its six-hour refresh window. A manual workflow dispatch bypasses the time gate.

The scoreboard source is the NextGenScores ncaa-api service at `https://ncaa-api-e2vv.onrender.com`. No NCAA scoreboard environment variable or API key is needed.

The endpoint is `POST /api/jobs/scoreboard-refresh` and requires `Authorization: Bearer <SCORE...N>`.
