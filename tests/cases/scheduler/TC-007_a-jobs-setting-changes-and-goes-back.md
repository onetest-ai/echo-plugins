---
id: TC-007
title: A job's ✎ opens its settings under its row — a number, the night switch, a model change on the user's own change and go back with ↺; Echo's refusal shows and the field keeps Echo's value
priority: critical
type: functional
requirements: [F-SCH-07]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, jobs]
---

# TC-007: Change a job and go back

## Preconditions
- TC-006 done; the Echo’s jobs tab open

**Changes:** `<config dir>/jobs.json`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click Thread sync's ✎ | Under its row, labels on the left, controls on the right: "Mail and chat wait at most" [120] min, "…or until this many wait" [5], "Paused at night" (switch on), "Model" ("Default — the thread's, else the profile's minutes model", Haiku, Sonnet, Opus); no ↺ |
| 2 | Set "Mail and chat wait at most" to 60, Enter; `echoctl jobs` | The row's line "● waits up to 60 min or 5 items · …"; ↺ beside the field ("Back to default (120)"); `thread_sync` `batch_wait` 60, set |
| 3 | Set it to 0, Enter | "thread_sync batch_wait: 0 is outside 5–1440" (Echo's words) under the head; the field back to 60; `echoctl jobs`: 60 |
| 4 | Pick "Haiku" in Model; click the "Paused at night" switch | No error; the line "… · ● runs at night · ● Haiku · …"; each with ↺; `echoctl jobs`: `model` haiku, `night` false, both set |
| 5 | Click Needs you now's ✎ | Thread sync's fields close, Needs you now's open (one job at a time) |
| 6 | Thread sync's ✎ again; click each ↺ (wait, night, model); `cat "$ECHOCTL_CONFIG_DIR/jobs.json"` | The line back to "waits up to 120 min or 5 items · pauses at night · default model · …", no dot, no ↺; the file holds no `thread_sync` |
| 7 | Empty "Mail and chat wait at most" and press Tab | The field shows 120 again; nothing sent (`echoctl jobs`: not set) |

## Expected Final State
Every job on its defaults.

## Notes
- A change without the user's click or key is refused by Echo itself (`ctx.echo.jobs.set` throws before sending):
  Echo's case plugins/TC-059 covers it. The Scheduler calls it only from the user's change (a number on Enter or Tab, a
  model picked), click (a switch, ↺) or leaving a night field — never from a redraw, a load or the window losing focus.
