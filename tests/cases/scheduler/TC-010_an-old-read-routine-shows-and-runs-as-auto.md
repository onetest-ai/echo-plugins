---
id: TC-010
title: Routines of before with `tools: read` or `folder` keep running as Auto — row, panel and editor say Auto, the run asks for auto, on/off changes only `enabled:`, a save writes `tools: auto`
priority: high
type: functional
requirements: [F-SCH-10]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, permissions, migration]
---

# TC-010: Old read and folder routines show and run as Auto

## Preconditions
- A fresh environment from `up.sh` of its own (not after TC-004, which saves `gateway-digest`): `gateway-digest`
  (`tools: read`) and `folder-notes` (`tools: folder`) there from the start, both off; `{{base_url}}/#settings/scheduler:main` open

**Changes:** `$R/gateway-digest.md`, `$R/folder-notes.md`, `$RUNS/gateway-digest/`, `$RUNS/folder-notes/`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `grep '^tools:' "$R/gateway-digest.md" "$R/folder-notes.md"`; read the rows "Gateway digest" and "Folder notes" | `tools: read`, `tools: folder`; the rows read "Weekdays at 08:30 · Auto · acme-gw/sonnet-large" and "Every day at 18:00 · Auto", their switches off (no error on either row) |
| 2 | Click each row; read "Permissions" in the panel | "Auto" for both |
| 3 | `echoctl plugin call scheduler run_wait '{"id":"gateway-digest","deliver":false}'` and the same for `folder-notes`; each newest run's `log.txt`, first line; `grep '^tools:'` both files | Both "… (asked: auto; runs with …" (Echo asked for auto; on `gateway-digest`'s free-text model, which has no auto mode, it runs with "edits accepted: this profile's model has no auto mode"); the files still `tools: read` and `tools: folder`: a run rewrites nothing |
| 4 | Click the switch of "Folder notes" (on), then again (off); after each, `grep -E '^(tools|enabled):' "$R/folder-notes.md"` | `enabled: true`, then `enabled: false`; `tools: folder` both times: switching changes only `enabled:` |
| 5 | "Gateway digest" → "Edit"; read "What Claude may do" | "Auto" picked; the other choice "Skip all permission checks"; no "Read only" |
| 6 | Click "Save" without a change; `grep '^tools:' "$R/gateway-digest.md"` | The list, the row as in step 1; `tools: auto` |
| 7 | "Folder notes" → "Edit"; "Auto" picked; "Save"; `grep '^tools:' "$R/folder-notes.md"` | `tools: auto` |

## Expected Final State
Both routines saved with `tools: auto`, still off.
