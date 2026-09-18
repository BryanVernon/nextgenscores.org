# Friday pick reminders

The `Friday Pick Reminders` GitHub Actions workflow checks hourly Thursday–Saturday UTC, covering Friday in every supported timezone. A user is eligible only during the 9 AM Friday hour in their saved timezone (Central by default). GitHub may delay a scheduled run, so delivery is not guaranteed at precisely 9:00.

Only eligible pool members missing one or more **unlocked** picks receive mail. Thursday games that already started do not prevent a reminder for remaining Friday/Saturday games. Complete entries, weeks before a member joins, and off-season games more than a week away are skipped. The email links directly to `/pickem?pool=...`; login preserves that destination.

## Activate

1. Deploy the backend and workflow changes from the repository's default branch.
2. Add the same random `REMINDER_JOB_TOKEN` secret to both the Render backend service and the GitHub repository's Actions secrets. GitHub uses it only to authorize the protected Render endpoint.
3. Configure the Render backend service with `MONGODB_URI`, `SMTP_USER`, and `SMTP_PASS`; optional values are `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, and `FRONTEND_URL`. The job inherits those values from Render, so they do not need to exist in GitHub.
4. Run the `Friday Pick Reminders` GitHub workflow manually with **dry_run=true**. GitHub calls Render, and Render connects to MongoDB and reports eligibility without sending mail.

The GitHub workflow never connects to MongoDB or SMTP. This avoids GitHub-hosted runner network access rules while retaining free GitHub scheduling.

## Delivery history and retries

The unique `poolnotifications` key (type, pool, user, season, week) prevents overlapping runs from delivering the same reminder. Existing reminder records still count as sent. A user in multiple pools can receive one reminder per incomplete pool per week.

- `sent`: delivered; skipped on later runs.
- `failed`: definite SMTP rejection; may retry in the next Friday window.
- `sending` or `unknown`: interrupted or uncertain delivery; skipped to prevent duplicate mail. Inspect the mail provider's delivery log before an operator changes one to `failed` for a retry.

An SMTP acknowledgement and a database update cannot be one atomic transaction. If a process stops between them, the uncertain state requires operator review. SMTP failures cause the workflow to fail visibly; they do not stop processing the other recipients.

`notify:pools` now sends completed-week standings only. It no longer sends the former 24-hour-before-first-kickoff reminder.
