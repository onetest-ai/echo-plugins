---
id: TC-003
title: Other… shows a field for any model name — saved as typed, reopened as Other… with it, on the row, and the run asks Claude Code for it; back to a listed one or the default
priority: high
type: functional
requirements: [F-SCH-01, F-SCH-02, F-SCH-03, F-SCH-04]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, model]
---

# TC-003: Other… takes any name

## Preconditions
- TC-002 done (`plan-default` on `opus`); `{{base_url}}/#settings/scheduler:main` open

**Changes:** `$R/plan-default.md`, `$RUNS/plan-default/`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | "Plan default" → "Edit"; pick "Other…" in "Model" | A field "Other model" appears under the lists, empty (not "opus"), with the cursor in it, placeholder "a model’s name, e.g. claude-sonnet-4-5"; under it "Any name Claude Code takes with --model: a full model id, or one your company’s gateway names. Empty: the profile’s default." |
| 2 | Type ` claude-sonnet-4-5-20250929 ` (spaces around); click "Save" | The row reads "Weekdays at 08:30 · reads only · claude-sonnet-4-5-20250929" |
| 3 | `grep '^model:' "$R/plan-default.md"`; "Edit" | `model: claude-sonnet-4-5-20250929` (trimmed); the editor opens with "Other…" picked and the field holding "claude-sonnet-4-5-20250929" |
| 4 | "Edit"; change only the prompt, to "What is on today? Short."; "Save" | The model is kept: `grep '^model:'` still `claude-sonnet-4-5-20250929` |
| 5 | `echoctl plugin call scheduler run_wait '{"id":"plan-default","deliver":false}'`; the newest run's `log.txt`, first line | "…, model claude-sonnet-4-5-20250929 (asked: read permissions …" |
| 6 | "Edit"; pick "Sonnet"; "Save"; `grep '^model:'` | The field "Other model" goes when Sonnet is picked; `model: sonnet`; the row ends " · Sonnet" |
| 7 | "Edit"; pick "Profile’s default"; "Save"; `grep '^model:'` | `model:` empty; the row has no model |

## Expected Final State
`plan-default` back on the profile's default.
