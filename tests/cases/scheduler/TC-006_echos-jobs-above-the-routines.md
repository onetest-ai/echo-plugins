---
id: TC-006
title: Routines and System tabs — the user's routines and Echo's jobs drawn by the same row from the one routine contract, with next run, last run, where it sends and 30 days
priority: critical
type: functional
requirements: [F-SCH-06]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, jobs, routines]
---

# TC-006: Routines and System tabs

## Preconditions
- The environment from `up.sh` (Echo with onetest-ai/echo#674): Echo's jobs on their defaults with a month of made-up
  runs (Needs you now — one slow pass, a failed run two days ago and one today —, Thread sync, Fetch, Recall) and the timed jobs' next looks
- `echoctl plugin call scheduler save '{"name":"Plan for the day","schedule":"weekdays 08:30","prompt":"What is on today?","model":"sonnet","deliver":["mail"]}'`; `echoctl plugin call scheduler run_wait '{"id":"plan-for-the-day"}'` (fails: the fake `claude`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open `{{base_url}}/#today`, then Settings → From plugins → Scheduler | "Scheduler" ("Your prompts, run by Claude on a schedule; and Echo’s own, as system routines."), tabs "Routines 2" and "System 7" (the one last left, Routines the first time), "+ New routine" on Routines |
| 2 | Read the Routines table | Columns Routine, Next run, Last run, Sends to, 30 days; "Plan for the day" — "Weekdays at 08:30 · Auto · Sonnet", next "Tomorrow 08:30 AM" (or the next weekday), last "Failed" with its time, "Mail", one bar today, "1 run · $0.00", its switch on; "Gateway digest" "Off", "Not run yet" |
| 3 | Click "System" | No "+ New routine"; the head "Echo’s own jobs, run by itself — …" with "Night 22:30 → 07:00"; facts "7 system routines, 6 on" (Recall is off in the standard data: Knowledge's automatic reading off), the next one, "108 runs in 30 days · 2 failed", tokens with the cache share (under 100%), the cost; the same columns |
| 4 | Read the rows | Needs you now: "Every 5 min", next a time today, last "Failed" (1 s), "Today", 15 bars (the last runs; two red), "62 runs · $0.28"; Thread sync: "After a call, or when mail and chat wait 120 min or 5 items", next "On its events", last "Done" with 1 m 1 s and $0.11, "Threads’ work", "15 runs · $1.65"; Threads' mail and meeting chats: last "Done", "Threads’ sources", "30 runs · no model"; Minutes and Live notes: "On its events", "Not run yet", "0 runs"; Meeting prep: next a time, "Not run yet"; Recall: "Every 5 min · 30 a pass", next "Off", "Done" with $0.02, "Recall", "1 run · $0.02" |
| 5 | Hover "Live notes" | Its tooltip: "Keeps a running summary during a call" |
| 6 | Reload; then ⌘K "Scheduler: routines" | The System tab still picked after the reload; the ⌘K entry opens Routines |

## Expected Final State
Nothing changed.
