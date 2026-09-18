# Friday pick reminders

The `Friday Pick Reminders` GitHub Actions workflow checks hourly Thursday–Saturday UTC, covering Friday in every supported timezone. A user is eligible beginning at 9 AM Friday in their saved timezone (Central by default). Delayed runs catch up before 6 PM local time. GitHub may delay a scheduled run; delivery is not guaranteed at precisely 9:00.

Only eligible pool members missing one or more **unlocked** picks receive mail. Thursday games that already started do not prevent a reminder for remaining Friday/Saturday games. Complete entries, weeks before a member joins, and off-season games more than a week away are skipped. The email links directly to `/pickem?pool=...`; login preserves that destination.

## Activate

1. Deploy frontend and backend changes, and put the workflow on the repository's default branch.
2. Configure repository Actions secrets `MONGODB_URI`, `SMTP_USER`, and `SMTP_PASS` using the same approved database and mail account as the backend.
3. Optional Actions variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`. Defaults match the existing Hostinger mail setup.
4. Run the workflow manually with **dry_run=true** during a Friday delivery window to check eligibility without sending mail.

Local preview: `npm run notify:friday -- --dry-run` from `backend`. The script loads `backend/.env` regardless of the working directory. The dry run reports only a count and does not record sends or freeze lineups.

## Delivery history and retries

The unique `poolnotifications` key (type, pool, user, season, week) prevents overlapping runs from delivering the same reminder. Existing reminder records still count as sent. A user in multiple pools can receive one reminder per incomplete pool per week.

- `sent`: delivered; skipped on later runs.
- `failed`: definite SMTP rejection; may retry in the next Friday window.
- `sending` or `unknown`: interrupted or uncertain delivery; skipped to prevent duplicate mail. Inspect the mail provider's delivery log before an operator changes one to `failed` for a retry.

An SMTP acknowledgement and a database update cannot be one atomic transaction. If a process stops between them, the uncertain state requires operator review. SMTP failures cause the workflow to fail visibly; they do not stop processing the other recipients.

`notify:pools` now sends completed-week standings only. It no longer sends the former 24-hour-before-first-kickoff reminder.
