---
id: TC-001
title: Installed, its part for Claude is laid out in .plugins/obsidian/ with its paths filled in, the core lists it with the manifest's summary, and no runtime skill is given
priority: high
type: functional
requirements: [F-OB-01, F-OB-06]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, claude-code, sessions]
---

# TC-001: Installed — Claude is told the plugin is there

## Preconditions
- The environment from `up.sh`, no vault connected yet

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `cat <dir>/install.log` | The sheet's lines include "Tells Claude in Echo how to work with it (a guide), loaded only when you work with it (its files: …)" and "Installed Obsidian vaults 0.8.0" |
| 2 | `P="$ECHOCTL_HOME/.plugins/obsidian"`; `ls -a "$P"`; `head -1 "$P/CLAUDE.md"`; `grep -c 'CLAUDE_PLUGIN_ROOT' "$P/CLAUDE.md"`; `grep -o "[^\`]*/scripts/echoctl plugin call obsidian" "$P/CLAUDE.md"` | `$P` holds `CLAUDE.md`, `scripts` and Echo's `.echo-layout.json` (no vault folders, no `.claude`); the file starts "# Obsidian vaults"; no `${CLAUDE_PLUGIN_ROOT}` left (0); the index's CLI is `$P/scripts/echoctl plugin call obsidian` with `$P` written out |
| 3 | `grep -E '^## ' "$P/CLAUDE.md"` | The headings "Finding the vault", "Working with a vault", "Echo's index of the vaults", "Adding to a vault", "Where the user manages it" |
| 4 | `echoctl core` | The Plugins table has the row `\| Obsidian vaults \| The user's Obsidian vaults and Echo's Knowledge: which vault to look in, asking Echo's index of them, adding notes in each vault's own way \| `.plugins/obsidian/CLAUDE.md` \|` and no row "Obsidian vaults · …" |
| 5 | `ls "$ECHOCTL_CONFIG_DIR/plugins/session/obsidian"` | No `skills` folder: the plugin gives Echo's sessions no runtime skill |

## Expected Final State
The plugin installed, its part laid out, no vault connected.
