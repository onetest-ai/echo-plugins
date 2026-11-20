---
id: TC-020
title: Other plugins and Claude in Echo see Retell's offered commands — seven that read, two that add — and a reading run may call only the reading ones; a link queued by Claude is taken by the running Echo
priority: high
type: functional
requirements: [F-RT-22]
module: retell
run: agent
platform: any
data: standard
tags: [retell, offers, claude]
---

# TC-020: Others read the library and queue a link through Retell's offered commands

## Preconditions
- The environment of TC-003 (an article ready)
- `mcp() { printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}' "$1" | echoctl plugins-mcp $2 | tail -1; }`
  (one request after `initialize`; the last line is its answer; `$2` is `--read` for a run that only reads)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin commands retell` | Exactly `list`, `article`, `search`, `qa`, `phrases`, `quizzes`, `reading_lists` with `reads: true`, and `start`, `phrase_add` without; no `ask`, `quiz_make`, `delete`, `clear`, `pick_file` |
| 2 | `echoctl plugin commands retell article`; `… start`; `… phrase_add` | `article`: `id` required; `start`: `url`, `text`, `pages` all optional; `phrase_add`: `text` required, `note` optional |
| 3 | `echoctl core` (the plugins table) | A row for Retell with id `retell` and the manifest's `agent.summary` |
| 4 | `mcp '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"call","arguments":{"id":"retell","name":"list","args":{}}}}' --read` | `isError` false; the TC-003 article among `articles`, its title "Evaluating agents" |
| 5 | The same with `"name":"article","args":{"id":"<its id>"}` `--read` | Its `source`, `script` and `outline`; its `index.json` entry's `opened` unchanged |
| 6 | `"name":"search","args":{"q":"evaluation"}` `--read` | The article with a snippet |
| 7 | `"name":"start","args":{"url":"https://docs.acme-test.example/posts/observability.html"}` with `--read` | `isError` true: the run only reads |
| 8 | The same without `--read`; wait (≤ 2 min) | An `{id}`; within 10 s `index.json` has it `fetching`, then `ready` — the window's Echo took it from the queue |
| 9 | `"name":"phrase_add","args":{"text":"to put it in a nutshell"}` | `phrases.json` holds it |
| 10 | `"name":"article","args":{"id":"../index"}` `--read` | `isError` true, "Not a valid id"; nothing read |
