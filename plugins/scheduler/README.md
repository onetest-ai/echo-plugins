# Scheduler

See and tune what Echo runs by itself, and run your own Claude prompts on a schedule — a plan for your day, Monday
asks, a Friday wrap-up, meeting prep — and get the answer in Telegram, Teams or mail.

- **Two tabs, one look.** *Routines* are yours; *System* holds Echo's own jobs — Needs you now, Thread sync, Threads'
  mail and meeting chats, Minutes, Meeting prep, Recall, Live notes — as system routines. Every routine, yours or
  Echo's, is drawn the same way from Echo's one routine contract: its schedule, next run (or what it waits for), last
  run with how long it took and its cost, where it sends, and its last 30 days as a bar a day with runs and cost. A
  system routine opens into the same panel (its runs as Echo recorded them) and editor: its timer, whether it pauses
  at night, its model (Haiku, Sonnet or Opus — each AI profile maps them to its own); "↺" goes back to a default. The
  night (from–to) is in the System tab's head. Echo's jobs run on their own settings with or without the Scheduler: it
  only shows them and changes them when you do (`echoctl jobs` is the same from the terminal).
- **Its own Settings section** (Settings → From plugins → Scheduler): a row per routine with its next and last run and
  what it cost in 30 days; the routine's runs on the right; each run's answer, tokens and cost, where it went, what
  Claude did.
- **Routines** are files in its folder of your data folder (`.echo/plugins/scheduler/routines/<id>.md`): a little
  frontmatter (schedule, profile, model, permissions, where to send) and your prompt.
- **A model per routine**: the profile's default, Haiku, Sonnet or Opus — or any other name Claude Code takes with
  `--model` (a full id, a model your company's gateway names). A light routine on Haiku, a heavy one on Opus; the
  routine's row shows its model when one is set.
- **Templates** to start from: `templates/` (Plan for the day, Monday asks, Meeting prep, Friday wrap-up).
- **A routine acts on its own**, as you pick per routine: **Auto** (Claude Code's auto mode decides each action; on a
  model without it, edits are accepted) or **Skip all permission checks** — the choices of Echo's routines setting
  (Settings → AI & minutes → Claude's permissions). A routine from before set to read only, or to your folder
  session's permissions, runs and shows as Auto.
- **Claude in Echo knows your routines**: what runs when, what a run answered or cost, why one failed — and helps you
  write a new one, which you save in the section.
- Runs on your AI profiles through Echo; costs as Claude Code reports them. Missed runs (Echo off) run once when Echo
  is back.

Needs Echo 0.9.15 or later. `main.js` is its host half (schedule, runs, delivery), `client.js` its client half (the Settings section).

Part of the [Echo plugins](../../README.md) marketplace.
