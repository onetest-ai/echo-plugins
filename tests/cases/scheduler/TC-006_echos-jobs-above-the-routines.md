---
id: TC-006
title: Echo's jobs above the routines — each job's name, what it does, last run, runs today and its settings with their defaults; hidden and shown again
priority: critical
type: functional
requirements: [F-SCH-06]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, jobs]
---

# TC-006: Echo's jobs above the routines

## Preconditions
- The environment from `up.sh`: every job on its defaults; Needs you now recorded as run 3 times today, Recall once

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open `{{base_url}}/#settings/scheduler:main` | Under "Scheduler" ("What Echo runs by itself, and your prompts run by Claude on a schedule with the answer sent to you."): a part "Echo’s jobs" — "What Echo runs by itself. They run on these settings with or without the Scheduler; a change applies at a job’s next run.", "Night: from 22:30 to 07:00", "Back to default", "Hide" — then "Your routines" with the facts and the routines' table (Gateway digest) |
| 2 | Read the jobs, in order | Seven: Needs you now, Thread sync, Threads' mail and meeting chats, Minutes, Meeting prep, Recall, Live notes — each with what it does (Echo's words, e.g. "Keeps a running summary during a call") |
| 3 | Read Needs you now and Recall, then Minutes | Needs you now: "Last run today <time> · 3 runs today"; Recall: "Last run today <time> · 1 run today"; Minutes: "Not run yet · 0 runs today" |
| 4 | Read Needs you now's settings | "Every (minutes)" 5, "default: 5"; "Paused at night" on, "default: on"; "Model" "Job’s default" (options Job’s default, Haiku, Sonnet, Opus — no Other…), "default: the profile's live model" |
| 5 | Read the rest's settings | Thread sync: "Mail and chat wait at most (minutes)" 120, "…or until this many wait" 5, paused at night on, a model; Threads' mail and meeting chats: every 30, paused at night, no model; Minutes: "Automatic: after the call (minutes)" 15, a model, no night; Meeting prep: every 5, paused at night off ("default: off"), a model; Recall: every 5, "Documents a pass" 30, paused at night off, a model; Live notes: "Summary every (seconds)" 90, a model, no night |
| 6 | Click "Hide"; reload the page | Only the part's head with "Show 7"; still so after the reload |
| 7 | Click "Show 7" | The seven jobs again |

## Expected Final State
Nothing changed; the part open.
