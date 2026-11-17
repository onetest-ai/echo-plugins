---
id: TC-007
title: A system routine opens into the routine panel with its runs, and its editor changes its timer, night and model at once with Save — back to defaults with ↺, Echo's refusal shown, Cancel changes nothing
priority: critical
type: functional
requirements: [F-SCH-07]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, jobs]
---

# TC-007: A system routine's panel and editor

## Preconditions
- TC-006 done; the System tab open

**Changes:** `<config dir>/jobs.json`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click "Needs you now" | The right panel "System routine": "Needs you now", "Every 5 min · next today …", "Edit"; Sends to "Today", When, At night "pauses at night (22:30 → 07:00)", Model "Default model — the profile's live model", What (Echo's words); "Last 20 runs" with bars and an average; the newest run "Today … · failed", "1 s · the profile isn't signed in", then "done" runs "4 s · claude-haiku · 2 items in Needs you now" with their cost |
| 2 | Click "Edit" | "Scheduler › System › Needs you now › Edit": Name and what it does (not editable); Model (Default — the profile's live model, Haiku, Sonnet, Opus); "Every" [5] min "default · 1–240"; "Pause at night (22:30 → 07:00)" ticked, "default"; Cancel, Save |
| 3 | Every 0, Save | "needs every: 0 is outside 1–240" (Echo's words); the editor stays; `echoctl jobs`: every 5 |
| 4 | Every 10, untick the night, Model Sonnet, Save; `echoctl jobs` | Back on the System tab: the row "Every 10 min · Sonnet" (both marked as changed); `needs`: every 10, night false, model sonnet, all set |
| 5 | Edit; click ↺ beside Every and beside the night; Model "Default …"; Save; `cat "$ECHOCTL_CONFIG_DIR/jobs.json"` | The row "Every 5 min", no model; the file holds no `needs` |
| 6 | Edit; Every 33; Cancel | The row still "Every 5 min"; `echoctl jobs`: every 5, not set |

## Expected Final State
Every job on its defaults.

## Notes
- A change without the user's click or key is refused by Echo itself (`ctx.echo.jobs.set` throws before sending):
  Echo's case plugins/TC-059 covers it. The Scheduler calls it only from Save, ↺ on the night, or leaving a night field.
