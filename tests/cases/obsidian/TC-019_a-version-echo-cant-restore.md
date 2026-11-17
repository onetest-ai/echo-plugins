---
id: TC-019
title: Restore refuses a version over 2 MB or not UTF-8 in plain words, and writes nothing
priority: high
type: functional
requirements: [F-OB-16]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, git]
---

# TC-019: A version Echo can't restore

## Preconditions
- The environment from `up.sh` (Echo built from source), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`

- `H="$VAULTS/acme-history"` (in git: legacy.md once Latin-1, archive.md once 2.7 MB; both changed since) connected:
  `ECHOCTL_PICK_FOLDER="$H" obs add '{"wait":true}'`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs history '{"id":"acme-history","path":"legacy.md"}'` | Two versions: "In UTF-8, trimmed", "Old pages" |
| 2 | `obs restore` legacy.md to "Old pages"'s `rev` | Fails "that version of legacy.md isn't UTF-8 text, so Echo doesn't restore it" |
| 3 | `obs restore` archive.md to its "Old pages" version | Fails "that version of archive.md is too large to restore in Echo" |
| 4 | `cat "$H/legacy.md" "$H/archive.md"`; `(cd "$H" && git status --porcelain)`; `obs activity '{"id":"acme-history"}'` | "# Café notes", "# Archive … Trimmed."; nothing changed; no activity line |
