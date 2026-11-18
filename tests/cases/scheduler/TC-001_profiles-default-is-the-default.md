---
id: TC-001
title: A new routine's model is the Profile’s default — saved empty, no model on its row, the run asks for none but the profile's own
priority: high
type: functional
requirements: [F-SCH-01, F-SCH-02, F-SCH-04]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, model]
---

# TC-001: Profile’s default is the default

## Preconditions
- A fresh environment from `up.sh`; `{{base_url}}/` loaded

**Changes:** `$R/plan-default.md`, `$RUNS/plan-default/`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open `{{base_url}}/#settings/scheduler:main`; click "+ New routine", then "Blank" | The editor "New routine"; beside "AI profile" a list "Model" with "Profile’s default" picked; under them "Profile’s default: the model the profile writes minutes with."; no field "Other model" |
| 2 | Open the list "Model" | Its options, in order: "Profile’s default", "Haiku", "Sonnet", "Opus", "Other…" |
| 3 | Type the name "Plan default" and the prompt "What is on today?"; click "Save" | The list; a row "Plan default", under it "Weekdays at 08:30 · Auto" (when and permissions) and no model after them |
| 4 | `grep '^model:' "$R/plan-default.md"` | `model:` with nothing after it |
| 5 | Click the row; in the panel, read "AI" | The profile's name only, no " · " and model |
| 6 | `echoctl plugin call scheduler run_wait '{"id":"plan-default","deliver":false}'`; `head -1 "$RUNS"/plan-default/*/log.txt` | The run fails (the fake `claude`); the log's first line is "… Echo runs “Plan default” on Claude · work, model sonnet (asked: auto; runs with …" — `sonnet` is the `work` profile's own minutes model (`echoctl ai status`: `notes_model`), not one the routine asked for |

## Expected Final State
`plan-default` saved with an empty model.
