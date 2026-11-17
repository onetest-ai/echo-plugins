---
id: TC-006
title: Echo's jobs in their own tab — one row a job with its settings in plain words, what was changed marked; the tab kept as left and opened from ⌘K
priority: critical
type: functional
requirements: [F-SCH-06]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, jobs]
---

# TC-006: Echo's jobs tab

## Preconditions
- The environment from `up.sh`: every job on its defaults; Needs you now recorded as run 3 times today, Recall once

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open `{{base_url}}/#today`, then Settings → From plugins → Scheduler | "Scheduler" ("Your prompts, run by Claude on a schedule, and what Echo runs by itself."), two tabs "Routines 1" (picked) and "Echo’s jobs 7"; under Routines the facts, the table (Gateway digest) and "+ New routine" |
| 2 | Click "Echo’s jobs" | "+ New routine" gone; the head "Echo’s jobs" — "What Echo runs by itself — on these settings with or without the Scheduler; a change applies at the job’s next run." — with "Night 22:30 → 07:00" on the right, no ↺; one card with seven rows in order: Needs you now, Thread sync, Threads' mail and meeting chats, Minutes, Meeting prep, Recall, Live notes, each with a ✎ button ("Change <job>’s settings") |
| 3 | Read the rows' second lines | Needs you now "every 5 min · pauses at night · default model · <time>, 3 today"; Thread sync "waits up to 120 min or 5 items · pauses at night · default model · not run yet"; Threads' mail… "every 30 min · pauses at night · not run yet"; Minutes "15 min after the call · default model · not run yet"; Meeting prep "every 5 min · runs at night · default model · not run yet"; Recall "every 5 min · 30 a pass · runs at night · default model · <time>, 1 today"; Live notes "every 90 s · default model · not run yet". No part marked (no dot) |
| 4 | Hover "Live notes" | Its tooltip: "Keeps a running summary during a call" |
| 5 | `echoctl jobs set thread_sync model=haiku`; reload | Thread sync's line: "… · ● Haiku · …" — Haiku in the text colour with a violet dot, the rest in the sub colour; the "Echo’s jobs" tab still picked after the reload |
| 6 | Click "Routines"; reload; ⌘K "Scheduler: Echo’s jobs" | Routines kept after the reload; the ⌘K entry opens the Echo’s jobs tab |
| 7 | `echoctl jobs set thread_sync model=` | Back to defaults |

## Expected Final State
Every job on its defaults; the Echo’s jobs tab picked.
