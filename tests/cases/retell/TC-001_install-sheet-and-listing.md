---
id: TC-001
title: Its install sheet names only what it uses — no folder, no run marked to skip permission checks — and its listing gives its summary
priority: critical
type: functional
requirements: [F-RT-01]
module: retell
run: agent
platform: any
data: standard
tags: [retell, install]
---

# TC-001: Its install sheet names only what it uses — no folder, no run marked to skip permission checks — and its listing gives its summary

## Preconditions
- The environment from `up.sh` (Retell installed from the local marketplace)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin list`: Retell's entry under `installed`, its `uses` | Lines for: running Claude Code on the user's AI profiles; reading About me; hearing the microphone in its own view; "Talks to the addresses you list in its setting “tts”"; "Reads web pages on the public internet (https)…"; working on a schedule |
| 2 | The same lines, searched | No line about a folder of notes (Obsidian), none ending "a run you mark so may skip every permission check" |
| 3 | Its entry under `discover` | `summary` "Retells an article (a link, a PDF, a Word or PowerPoint file, or pasted text) so it can be listened to, and lets you practise speaking English on it: …" |
