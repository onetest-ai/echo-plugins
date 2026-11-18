---
id: TC-009
title: What Claude may do is Auto or Skip all permission checks, no Read only — a new routine on Auto, saved, shown and run as picked
priority: critical
type: functional
requirements: [F-SCH-09]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, permissions]
---

# TC-009: A routine runs Auto or skipping every check

## Preconditions
- A fresh environment from `up.sh` (Echo 0.9.15, or a build with onetest-ai/echo#712); `{{base_url}}/#settings/scheduler:main` open

**Changes:** `$R/auto-digest.md`, `$RUNS/auto-digest/`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click "+ New routine", then "Blank"; read "What Claude may do" | Two choices, in order: "Auto" — picked — with "Claude Code’s auto mode decides each action. On a model without auto mode, edits are accepted and anything else is refused. Recommended."; "Skip all permission checks" with "Any tool, unattended. Only for prompts you fully trust." (a warning); no "Read only", no "As your Echo folder session"; under "What Claude should do": "Claude reads your calls, threads, tasks and the Brain and acts on its own, as you pick under “What Claude may do”: it may change your Echo data and send as you. Its answer goes where you send it." |
| 2 | Type the name "Auto digest" and the prompt "What is on today?"; click "Save"; `grep '^tools:' "$R/auto-digest.md"` | The row "Auto digest" reads "Weekdays at 08:30 · Auto"; `tools: auto` |
| 3 | Click the row; read "Permissions" in the panel | "Auto" |
| 4 | `echoctl plugin call scheduler run_wait '{"id":"auto-digest","deliver":false}'`; the run's `log.txt`, first line | The run fails (the fake `claude`); "… Echo runs “Auto digest” on <profile>… (asked: auto; runs with the folder session's: acts on its own (auto mode: Claude Code decides each action))" |
| 5 | "Edit"; click "Skip all permission checks"; "Save"; `grep '^tools:' "$R/auto-digest.md"` | "Skip all permission checks" picked before the save (Auto no longer); the row reads "Weekdays at 08:30 · Skip all permission checks"; `tools: skip` |
| 6 | `echoctl plugin call scheduler run_wait '{"id":"auto-digest","deliver":false}'`; the newest run's `log.txt`, first line | "… (asked: skip; runs with the folder session's: acts on its own (every permission check skipped))" — the Scheduler's sheet has `claude.skip`, so Echo honours it |
| 7 | `echoctl plugin call scheduler save '{"name":"Ask me","schedule":"daily 09:00","prompt":"What is on today?","tools":"ask"}'`; `ls "$R"` | Refused: "tools “ask”: auto or skip"; no `ask-me.md` |

## Expected Final State
`auto-digest` saved with `tools: skip`; two failed runs in `$RUNS/auto-digest/`.
