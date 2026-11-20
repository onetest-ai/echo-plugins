---
id: TC-011
title: On an Echo that has plugins' offered commands, Scheduler offers `routines` and `runs` (reading) and `run` — listed by `echoctl plugin commands`, named in Claude's core, called through the `echo_plugins` server, `run` refused in a run that only reads; its own commands answer as before
priority: high
type: functional
requirements: [F-SCH-11]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, offers, claude]
---

# TC-011: Scheduler's commands for other plugins and Claude

## Preconditions
- An environment from `up.sh` on an Echo built from `main` with plugins' offered commands (`onetest-ai/echo#871`);
  `gateway-digest` and `folder-notes` there from the start, both off
- `mcp() { printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}' "$1" | echoctl plugins-mcp $2 | tail -1; }`

**Changes:** none (a refused run starts nothing)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin commands` | One entry: `scheduler`, "Your scheduled Claude prompts (routines): which there are, their runs, and running one now" |
| 2 | `echoctl plugin commands scheduler`; `echoctl plugin commands scheduler runs` | Commands `routines` (`"reads": true`), `runs` (`"reads": true`), `run` (`"reads": false`); `runs` takes `id` (`"optional": false`, "the routine (routines gives the ids)") |
| 3 | `echoctl core \| sed -n "/## Plugins. commands/,/## Plugins$/p"` | The line ``- `scheduler`: Your scheduled Claude prompts (routines): which there are, their runs, and running one now`` |
| 4 | `mcp '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"call","arguments":{"id":"scheduler","name":"routines","args":{}}}}' --read` | `isError` false; its text lists `folder-notes` ("Folder notes", `daily 18:00`) and `gateway-digest` ("Gateway digest", `weekdays 08:30`), each `"enabled": false` |
| 5 | `mcp '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"call","arguments":{"id":"scheduler","name":"run","args":{"id":"folder-notes"}}}}' --read`; `ls "$RUNS"` | `isError` true, "scheduler's “run” may change things, and this run only reads"; no `folder-notes` run: `ls` finds no `folder-notes` in `$RUNS` (or no `$RUNS` at all) |
| 6 | `echoctl plugin call scheduler runs '{"id":"gateway-digest"}'`; `echoctl plugin call scheduler view \| head -c 80` | `[]`; `view` answers as before (its `deliver` and `profiles`) |
