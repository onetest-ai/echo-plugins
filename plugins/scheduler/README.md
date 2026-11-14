# Scheduler

Run your own Claude prompts on a schedule — a plan for your day, Monday asks, a Friday wrap-up, meeting prep — and get
the answer in Telegram, Teams or mail.

- **Its own Settings section** (Settings → From plugins → Scheduler): a row per routine with its next and last run and
  what it cost in 30 days; the routine's runs on the right; each run's answer, tokens and cost, where it went, what
  Claude did.
- **Routines** are files in its folder of your data folder (`.echo/plugins/scheduler/routines/<id>.md`): a little
  frontmatter (schedule, profile, model, permissions, where to send) and your prompt.
- **Templates** to start from: `templates/` (Plan for the day, Monday asks, Meeting prep, Friday wrap-up).
- **Permissions are yours to pick** per routine: read only (Echo's guard), your Echo folder session's, or none asked.
- **Claude in Echo knows your routines**: what runs when, what a run answered or cost, why one failed — and helps you
  write a new one, which you save in the section.
- Runs on your AI profiles through Echo; costs as Claude Code reports them. Missed runs (Echo off) run once when Echo
  is back.

Needs Echo 0.9.9 or later. `main.js` is its host half (schedule, runs, delivery), `client.js` its client half (the Settings section).

Part of the [Echo plugins](../../README.md) marketplace.
