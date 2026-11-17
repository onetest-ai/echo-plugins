---
id: TC-008
title: The shared night is changed in the Scheduler and back to Echo's own; Echo's jobs keep their settings when the Scheduler is removed
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
- TC-007 done; `{{base_url}}/#settings/scheduler:main` open; the last case of the run (it removes the plugin)

**Changes:** `<config dir>/jobs.json`, the installed plugins

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Set "Night: from" to 23:00, then Tab; `echoctl jobs` | The field 23:00 (saved when the field is left, not while typing); `night` `{"from": "23:00", "to": "07:00"}` |
| 2 | Set "to" to 06:30, then Enter; `echoctl jobs` | `{"from": "23:00", "to": "06:30"}` |
| 3 | Click "Back to default" beside the night | 22:30 and 07:00 again; `echoctl jobs`: `{"from": "22:30", "to": "07:00"}` |
| 4 | Set Needs you now's "Every (minutes)" to 15 (Enter); then `echoctl plugin remove scheduler`; `echoctl jobs` | Needs you now still every 15 (`"set": true`): removing the plugin changes none of Echo's jobs |
| 5 | `echoctl jobs set needs every=` | Back to 5 (the CLI is the user's too) |

## Expected Final State
The Scheduler removed; Echo's jobs on their defaults.
