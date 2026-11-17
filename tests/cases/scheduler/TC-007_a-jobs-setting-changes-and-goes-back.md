---
id: TC-007
title: A job's setting changes on the user's own change — a number, the night switch, a model — and goes back to its default; Echo's refusal shows and the field keeps Echo's value
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
- TC-006 done; `{{base_url}}/#settings/scheduler:main` open, Echo's jobs shown

**Changes:** `<config dir>/jobs.json`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | In Needs you now, set "Every (minutes)" to 10 and press Enter; `echoctl jobs` | The field 10, beside it "Back to default: 5" in place of "default: 5"; `needs` → `every` value 10, `"set": true` |
| 2 | Set it to 0 and press Enter | Under the part's head "needs every: 0 is outside 1–240" (Echo's words); the field back to 10; `echoctl jobs`: still 10 |
| 3 | In Thread sync, pick "Haiku" in "Model"; `echoctl jobs` | No error line; "Back to default: the thread's, else the profile's minutes model"; `thread_sync` → `model` "haiku", set |
| 4 | In Meeting prep, click the "Paused at night" switch | The switch on; "Back to default: off"; `echoctl jobs`: `prep` → `night` true, set |
| 5 | Click Needs you now's "Back to default: 5"; in Thread sync pick "Job’s default"; click Meeting prep's "Back to default: off"; `echoctl jobs`; `cat "$ECHOCTL_CONFIG_DIR/jobs.json"` | Each shows "default: …" again (5; the model's default; off, the switch off); every field `"set": false`; the file holds none of them (no `needs`, `thread_sync`, `prep`) |
| 6 | Reload the page | As left: every job on its defaults |

## Expected Final State
Every job on its defaults.

## Notes
- A change without the user's click or key is refused by Echo itself (`ctx.echo.jobs.set` throws before sending):
  Echo's case plugins/TC-059 covers it; the Scheduler only calls it from its click and change handlers.
