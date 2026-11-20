---
id: TC-070
title: On an Echo that has plugins' offered commands, the plugin offers its nine reading commands (search, info, links, backlinks, resolve, tags, where, tasks, unresolved), each marked reads — listed with their arguments, called through the `echo_plugins` server also in a run that only reads; Claude's session commands answer as before
priority: high
type: functional
requirements: [F-OB-74]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, offers, claude]
---

# TC-070: The index's reading commands for other plugins and Claude

## Preconditions
- An environment from `up.sh` on an Echo built from `main` with plugins' offered commands (`onetest-ai/echo#871`)
- acme-wiki connected: `ECHOCTL_PICK_FOLDER="$VAULTS/acme-wiki" echoctl plugin call obsidian add '{"wait":true}'`
- `mcp() { printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}' "$1" | echoctl plugins-mcp $2 | tail -1; }`

**Changes:** acme-wiki's index (the `add` above)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin commands obsidian` | Description "Your Obsidian vaults through Echo's index: notes by title, tag or property, their links, backlinks and tasks"; commands exactly `search`, `info`, `links`, `backlinks`, `resolve`, `tags`, `where`, `tasks`, `unresolved`, each `"reads": true` — no `add`, `save`, `rename_plan` or any other |
| 2 | `echoctl plugin commands obsidian search` | `args`: `vault` ("a vault's name or folder"), `q` ("the words to find"), `tag`, `folder`, `limit`, each with its line |
| 3 | `mcp '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"call","arguments":{"id":"obsidian","name":"tags","args":{"vault":"acme-wiki"}}}}' --read` | `isError` false; its text lists the tag `decision` with `"notes": 1` |
| 4 | `echoctl plugin call obsidian search '{"vault":"acme-wiki","q":"acme"}'` | Answers as before: `{"notes": […], "total": …, "vault": "acme-wiki"}` — the session's `plugin call` path is unchanged |
