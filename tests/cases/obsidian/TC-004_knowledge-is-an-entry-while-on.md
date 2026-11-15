---
id: TC-004
title: Knowledge on, with notes — an entry for Claude, first, with its vault's paths; off — the entry goes
priority: medium
type: functional
requirements: [F-OB-04]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, claude-code, knowledge]
---

# TC-004: Knowledge is an entry while it is on

## Preconditions
- TC-003 done; Knowledge off; `up.sh` put one note (`Acme.md`) in the Knowledge vault

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin call obsidian knowledge '{"on":true}'`; `ls "$P"` | `{"notes": 0, "on": true}`; no `knowledge` in `$P` yet (its vault holds no notes Echo has read) |
| 2 | `echoctl plugin call obsidian echo_reindex`; `ls "$P"`; `echoctl core` | `{"notes": 1}`; `$P` holds `knowledge`; the core's rows: the plugin's "The user's notes: Knowledge, the facts Echo learned from calls and mail; and 1 Obsidian vault — Acme wiki", then "Obsidian vaults · knowledge" ("Knowledge: the lasting facts Echo learned from the user's calls and mail — …"), then "Obsidian vaults · acme-wiki" |
| 3 | `head -3 "$P/knowledge/CLAUDE.md"`; `grep -c "$ECHOCTL_HOME/.echo/plugins/obsidian/vault/index.md" "$P/knowledge/CLAUDE.md"` | "# Knowledge: what Echo knows about things", "kept as an Obsidian vault: <$ECHOCTL_HOME>/.echo/plugins/obsidian/vault"; its index's path written out (1) |
| 4 | `echoctl plugin call obsidian knowledge '{"on":false}'`; `ls "$P"`; `echoctl core` | `"on": false`; `knowledge` is gone from `$P` and the core; the plugin's row names only Acme wiki |

## Expected Final State
Knowledge off; `acme-wiki` the only entry.
