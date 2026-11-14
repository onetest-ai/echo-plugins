---
id: TC-003
title: A vault renamed, given a client, its "when" line edited, or removed — Claude's entry follows at once
priority: high
type: functional
requirements: [F-OB-02, F-OB-03]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, claude-code, sessions]
---

# TC-003: A vault's change reaches Claude at once

## Preconditions
- TC-002 done: `acme-wiki` confirmed; the standard data's client Acme (`acme`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin call obsidian rename '{"id":"acme-wiki","name":"Acme wiki"}'`; `echoctl plugin call obsidian belongs '{"id":"acme-wiki","belongs":[{"client":"acme"}]}'`; `head -3 "$P/acme-wiki/CLAUDE.md"`; `echoctl core` | The file starts "# Acme wiki" and says "An Obsidian vault the user connected to Echo, for Acme. Folder: …"; the core's plugin row says "The user's notes: 1 Obsidian vault — Acme wiki"; the entry keeps its name `acme-wiki` |
| 2 | `echoctl plugin call obsidian save '{"id":"acme-wiki","key":"when","text":"Acme decisions, and who made them"}'`; `echoctl core` | The row "Obsidian vaults · acme-wiki" now gives "Acme decisions, and who made them" |
| 3 | `ECHOCTL_PICK_FOLDER="$VAULTS/home-notes" echoctl plugin call obsidian add '{"wait":true}'`; `save` its `when` "Trips and recipes"; `confirm` it; `echoctl core` | Two vault rows: `acme-wiki` and `home-notes` ("Trips and recipes"); the plugin's row "The user's notes: 2 Obsidian vaults — Acme wiki, home-notes" |
| 4 | `echoctl plugin call obsidian remove '{"id":"home-notes"}'`; `ls "$P"`; `echoctl core` | `true`; `home-notes` is gone from `$P` and from the core; the plugin's row names only Acme wiki |

## Expected Final State
`acme-wiki` ("Acme wiki", for Acme) the only vault.
