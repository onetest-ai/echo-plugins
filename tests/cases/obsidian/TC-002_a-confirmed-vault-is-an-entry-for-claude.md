---
id: TC-002
title: A connected vault becomes an entry for Claude only once confirmed — a row in the core with its "when Claude looks here" line, and its guide with its folder and description
priority: critical
type: functional
requirements: [F-OB-02, F-OB-07]
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
| 4 | `echoctl core` | The plugin's row says "The user's notes: 1 Obsidian vault — acme-wiki"; under it a row with Plugin "Obsidian vaults · acme-wiki", What it gives "Decisions on Acme projects and who works on them" and Read first `.plugins/obsidian/acme-wiki/CLAUDE.md` |
| 5 | `ls "$ECHOCTL_CONFIG_DIR/plugins/session/obsidian"`; `ls -a "$P"` | Still no `skills` folder there, and no `.claude` in `$P` |
| 6 | The laid-out launcher, as Claude in Echo runs it (`export ECHOCTL_BIN="$(command -v echoctl)"`: this build): `"$P/scripts/echoctl" plugin call obsidian search '{"vault":"acme-wiki","q":"rollout"}'`; `"$P/scripts/echoctl" plugin call obsidian backlinks '{"vault":"acme-wiki","note":"Ada Lovelace"}'` | The search lists `Decisions/Rollout by region.md`; the backlinks give `Decisions/Rollout by region.md` with its line "…See [[Ada Lovelace]]." |
| 7 | The same search as a read-only routine runs it: `ECHOCTL_RUN_MODE=routine "$P/scripts/echoctl" plugin call obsidian search '{"vault":"acme-wiki","q":"rollout"}'` | The same answer: the read is not refused in a read-only routine (a line on stderr that the plugin's start-up couldn't re-tell Claude its entries — "agent: changing files or settings isn't allowed in a read-only routine" — is expected there) |

## Expected Final State
`acme-wiki` connected and confirmed; Claude told of it.
