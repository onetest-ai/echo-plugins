---
id: TC-009
title: A vault from Obsidian vaults 0.8 is detected once, in the background, when the app loads the new version: its pages at its root, Claude's answers as before
priority: high
type: functional
requirements: [F-OB-11, F-OB-12]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, detect, update]
---

# TC-009: A 0.8 vault is detected in the background

## Preconditions
- An environment of its own: `OBSIDIAN_FROM=0.8 ECHO_REPO=… up.sh "$(mktemp -d)/ob8" <port>`, `. <dir>/env`,
  `obs() { echoctl plugin call obsidian "$@"; }`
- `tests/fixtures/obsidian/next.sh <dir>`; `echoctl plugin update obsidian --yes` (as TC-006 does)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs view` (a terminal: one command, no background work) | acme-wiki and home-notes, each with `detected` null — nothing found yet |
| 2 | Stop the window and serve it again (`down.sh <dir>`; from the Echo checkout, `ECHOCTL_SERVE_IPC=1 nohup echoctl window --serve <port> > <dir>/serve.log 2>&1 &`, its pid into `<dir>/pid`); wait 5 s; `obs view` | Both vaults have `detected` with `pages` "" (their root); `grep 'plugin obsidian' <dir>/serve.log` names no failed detection |
| 3 | `obs search '{"vault":"acme-wiki","q":"ada"}'` | `People/Ada Lovelace.md` as 0.8 answered, with no `pages` key (the vault's pages are its root) |

## Expected Final State
Both 0.8 vaults detected; their descriptions and Claude's entries as TC-006 left them.
