---
id: TC-006
title: Updated from Obsidian vaults 0.8 — it asks again (it may now change the vaults), keeps the vaults, their descriptions and Claude's entries, takes minutes only when asked, and deletes 0.8's facts vault and its entry at once
priority: critical
type: functional
requirements: [F-OB-08]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, update, migration, claude-code]
---

# TC-006: From 0.8 — the update keeps the vaults and drops the facts vault

## Preconditions
- The environment from `OBSIDIAN_FROM=0.8 up.sh` (a 0.8 user: two vaults, acme-wiki confirmed, Knowledge on with one
  note), `. <dir>/env`, `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`, `P="$ECHOCTL_HOME/.plugins/obsidian"`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl core \| grep -i 'obsidian\|knowledge'`; `ls "$S"` | Rows "Obsidian vaults", "Obsidian vaults · knowledge" and "Obsidian vaults · acme-wiki"; `$S` holds `vault`, `knowledge`, `vaults` |
| 2 | `tests/fixtures/obsidian/next.sh <dir>`; `echoctl plugin update obsidian` | It lists the sheet with "(new)" on "Reads and changes the folders of notes (Knowledge vaults) you pick, on this computer — only those: it may write, move and delete files in them", and ends "run again with --yes to agree"; `echoctl plugin list` still says obsidian 0.8.0 |
| 3 | `echoctl plugin update obsidian --yes` | "Updated Knowledge to 1.0.0" |
| 4 | `echoctl plugin call obsidian view \| python3 -c '…'` printing each vault's id, schema, minutes mode, confirmed; `cat "$S/vaults/acme-wiki/description.md"` | `acme-wiki 1 ask True` and `home-notes 1 ask False`; default `None`; the description still says "Decisions on Acme projects and who made them" |
| 5 | `ls "$S" "$S/vaults"`; `test -e "$S/vault" \|\| echo gone`; `test -e "$S/knowledge" \|\| echo gone` | No `vault`, no `knowledge` (both "gone"); `vaults` holds `acme-wiki` and no `echo`; `runs` holds no `knowledge` |
| 6 | `echoctl core \| grep -i 'obsidian\|knowledge'`; `ls "$P"` | Rows "Knowledge" ("The user's notes: 1 Knowledge vault — acme-wiki") and "Knowledge · acme-wiki" ("Decisions on Acme projects and who made them"); no "· knowledge" row; `$P` holds `CLAUDE.md`, `acme-wiki`, `scripts` and no `knowledge` |
| 7 | `echoctl plugin call obsidian knowledge_status`; `echoctl plugin call obsidian search '{"vault":"echo","q":"acme"}'` | `no command “knowledge_status”`; `no vault “echo” — connected: acme-wiki, home-notes` |
| 8 | `echoctl plugin call obsidian info '{"vault":"acme-wiki","note":"Rollout by region"}'` | The note's facts (title "Rollout by region", tags ["decision"], links_to "People/Ada Lovelace.md"): Echo's index of the vault works as before |
| 9 | `echoctl plugin call obsidian view` again; `ls "$S"` | The same as steps 4–5: nothing changes on a second load |
| 10 | The window: reload `base_url` with Playwright; `#settings/obsidian:main` | The section is titled "Knowledge"; its list shows acme-wiki and home-notes; no Notes switch or "Read what was said before" anywhere |

## Expected Final State
Knowledge 1.0.0 installed; the two vaults kept with their descriptions; 0.8's facts vault, its state and Claude's entry for it gone.
