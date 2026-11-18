---
id: TC-005
title: The install sheet says the Scheduler shows Echo's background jobs and changes them only in its screens
priority: high
type: functional
requirements: [F-SCH-05]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, jobs, permissions]
---

# TC-005: The sheet names Echo's jobs

## Preconditions
- The environment from `up.sh` (fresh, or after TC-001–TC-004: it reads only the install)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `cat <dir>/install.log` | "Scheduler 0.8.0"; among its lines "Shows Echo's background jobs and changes how often each runs, when it pauses at night and which model it uses — only when you change them in its screens"; "Installed Scheduler 0.8.0" |
| 2 | `echoctl plugin list` | The Scheduler (`"id": "scheduler"`) listed with its summary "Your own Claude prompts on a schedule — the answer in Telegram, Teams or mail — and Echo's own jobs as system routines: their runs, costs and settings" |

## Expected Final State
Scheduler 0.8.0 installed; Echo's jobs untouched.
