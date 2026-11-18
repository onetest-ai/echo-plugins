---
id: TC-002
title: Haiku, Sonnet or Opus picked — saved as haiku, sonnet or opus, reopened picked, on the routine's row, and the run asks Claude Code for it
priority: high
type: functional
requirements: [F-SCH-01, F-SCH-02, F-SCH-04]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, model]
---

# TC-002: Haiku, Sonnet, Opus

## Preconditions
- TC-001 done (`plan-default` saved); `{{base_url}}/#settings/scheduler:main` open

**Changes:** `$R/plan-default.md`, `$RUNS/plan-default/`

## Steps

Steps 1–4 run three times, for <M>, <m> = Haiku, haiku; then Sonnet, sonnet; then Opus, opus.

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click the row "Plan default", then "Edit" in the panel; pick <M> in the list "Model" | <M> picked; no field "Other model"; no hint under the lists |
| 2 | Click "Save" | The list; the row "Plan default" reads "Weekdays at 08:30 · Auto · <M>"; the panel's "AI" line ends " · <M>" |
| 3 | `grep '^model:' "$R/plan-default.md"`; click "Edit" again | `model: <m>`; the editor opens with <M> picked in "Model"; click "Cancel" |
| 4 | `echoctl plugin call scheduler run_wait '{"id":"plan-default","deliver":false}'`; `head -1 "$(ls -d "$RUNS"/plan-default/* \| tail -1)/log.txt"` | The newest run's log's first line: "… Echo runs “Plan default” on <profile>, model <m> (asked: auto; runs with …" |
| 5 | In the panel click "Run now"; wait 3 s; click the panel's newest run | The run page ("Failed": the fake `claude`); "What it did" has the step "Echo runs “Plan default” on Claude · work, model opus (asked: auto; runs with …" (a `run_wait` with `"deliver":false` is a try, never listed in the panel) |

## Expected Final State
`plan-default` on `opus`.
