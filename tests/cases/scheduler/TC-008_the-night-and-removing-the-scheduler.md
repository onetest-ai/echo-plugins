---
id: TC-008
title: The shared night is edited in place in the tab's head and back to Echo's own with ↺; Echo's jobs keep their settings when the Scheduler is removed
priority: high
type: functional
requirements: [F-SCH-08]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, jobs, removal]
---

# TC-008: The night, and removing the Scheduler

## Preconditions
- TC-007 done; the Echo’s jobs tab open; the last case of the run (it removes the plugin)

**Changes:** `<config dir>/jobs.json`, the installed plugins

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click "22:30 → 07:00" | Two time fields (22:30, 07:00) and "Done" in its place, the cursor in the first |
| 2 | Set the first to 23:00, Tab; the second to 06:30, Enter; `echoctl jobs` | "Night 23:00 → 06:30" with ↺ ("Back to default (22:30 → 07:00)"); `night` `{"from": "23:00", "to": "06:30"}` |
| 3 | Click ↺ | "Night 22:30 → 07:00", no ↺; `echoctl jobs`: `{"from": "22:30", "to": "07:00"}` |
| 4 | Click the times, then Escape | Back to "22:30 → 07:00"; nothing saved |
| 5 | Needs you now's ✎: every 15, Enter; `echoctl plugin remove scheduler`; `echoctl jobs` | Needs you now still every 15 (`"set": true`): removing the plugin changes none of Echo's jobs |
| 6 | `echoctl jobs set needs every=` | Back to 5 |

## Expected Final State
The Scheduler removed; Echo's jobs on their defaults.
