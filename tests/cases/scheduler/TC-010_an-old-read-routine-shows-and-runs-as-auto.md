---
id: TC-010
title: A routine of before with `tools: read` keeps running as Auto — its row, panel and editor say Auto, its run asks for auto, a save writes `tools: auto`
priority: high
type: functional
requirements: [F-SCH-10]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, permissions, migration]
---

# TC-010: An old read-only routine shows and runs as Auto

## Preconditions
- A fresh environment from `up.sh`: `gateway-digest` there from the start, written before, with `tools: read` (off);
  `{{base_url}}/#settings/scheduler:main` open

**Changes:** `$R/gateway-digest.md`, `$RUNS/gateway-digest/`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `grep '^tools:' "$R/gateway-digest.md"`; read the row "Gateway digest" | `tools: read`; the row reads "Weekdays at 08:30 · Auto · acme-gw/sonnet-large", its switch off (no error on the row) |
| 2 | Click the row; read "Permissions" in the panel | "Auto" |
| 3 | `echoctl plugin call scheduler run_wait '{"id":"gateway-digest","deliver":false}'`; the run's `log.txt`, first line; `grep '^tools:' "$R/gateway-digest.md"` | "… Echo runs “Gateway digest” on <profile>, model acme-gw/sonnet-large (asked: auto; runs with …" (Echo asked for auto; on this free-text model, which has no auto mode, it runs with "edits accepted: this profile's model has no auto mode"); the file still `tools: read`: a run rewrites nothing |
| 4 | "Edit"; read "What Claude may do" | "Auto" picked; the other choice "Skip all permission checks"; no "Read only" |
| 5 | Click "Save" without a change; `grep '^tools:' "$R/gateway-digest.md"` | The list, the row as in step 1; `tools: auto` |

## Expected Final State
`gateway-digest` saved with `tools: auto`, still off.
