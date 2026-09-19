# Scoreboard Refresh Job

GitHub Actions schedules refresh requests. Render executes them, so MongoDB and CFBD credentials remain only in Render and the refresh is not affected by a PC VPN.

## Required configuration

1. Create a long random value and add it to the Render web service as `SCOREBOARD_JOB_TOKEN`.
2. Add the exact same value to the GitHub repository Actions secrets as `SCOREBOARD_JOB_TOKEN`.
3. Ensure the Render web service already has `MONGODB_URI` and `CFB_API_KEY` configured.
4. Deploy the backend, then run **Refresh Scoreboard** from GitHub Actions once with `force` enabled to confirm the protected endpoint works.

Scheduled invocations occur at minute 17 of every hour. Render permits a refresh at 7 AM and 7 PM daily, plus every hour from 11 AM through 11 PM on Saturdays, in `America/Chicago`. Each permitted run checks the CFBD `/scoreboard` feed and updates current scores, game status, period/clock, possession, last play, win probabilities, line scores, and weather for already-scheduled games. The season schedule feed remains throttled separately, so the live board does not wait for its six-hour refresh window. A manual workflow dispatch bypasses the time gate.

The endpoint is `POST /api/jobs/scoreboard-refresh` and requires `Authorization: Bearer <SCOREBOARD_JOB_TOKEN>`.
