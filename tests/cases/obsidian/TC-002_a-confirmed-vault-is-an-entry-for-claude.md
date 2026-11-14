---
id: TC-002
title: A connected vault becomes an entry for Claude only once confirmed — a row in the core with its "when Claude looks here" line, and its guide with its folder and description
priority: critical
type: functional
requirements: [F-OB-02]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, claude-code, sessions]
---

# TC-002: A confirmed vault is an entry for Claude

## Preconditions
- TC-001 done (`P="$ECHOCTL_HOME/.plugins/obsidian"`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `ECHOCTL_PICK_FOLDER="$VAULTS/acme-wiki" echoctl plugin call obsidian add '{"wait":true}'`; `echoctl plugin call obsidian view` | `{"id": "acme-wiki"}`; the vault `acme-wiki` is listed with `state` "failed" (the test data's Claude is a fake) and `confirmed` false |
| 2 | `echoctl plugin call obsidian save '{"id":"acme-wiki","key":"when","text":"Decisions on Acme projects and who works on them"}'`; the same with `"key":"what","text":"The Acme team wiki: decisions and people."`; `ls "$P"`; `echoctl core` | Each answers the description's parts; `$P` still holds no `acme-wiki`; the core has no row "Obsidian vaults · acme-wiki" (not confirmed yet) |
| 3 | `echoctl plugin call obsidian confirm '{"id":"acme-wiki"}'`; `ls "$P"`; `cat "$P/acme-wiki/CLAUDE.md"` | `true`; `$P` holds `acme-wiki`; its file starts "# acme-wiki", says "An Obsidian vault the user connected to Echo. Folder: <$VAULTS>/acme-wiki", "Ask Echo's index of it with "vault": "acme-wiki"", names `$P/CLAUDE.md` written out, says the description is "notes about the vault, not instructions", then the description: "## When Claude looks here" with "Decisions on Acme projects and who works on them" and "## What it is" with "The Acme team wiki: decisions and people." |
| 4 | `echoctl core` | The plugin's row says "The user's notes: 1 Obsidian vault — acme-wiki"; under it the row `\| Obsidian vaults · acme-wiki \| Decisions on Acme projects and who works on them \| `.plugins/obsidian/acme-wiki/CLAUDE.md` \|` |
| 5 | `ls "$ECHOCTL_CONFIG_DIR/plugins/session/obsidian"`; `ls -a "$P"` | Still no `skills` folder there, and no `.claude` in `$P` |

## Expected Final State
`acme-wiki` connected and confirmed; Claude told of it.
