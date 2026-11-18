---
id: TC-062
title: A folder Echo refuses when it is picked — hidden, or inside a hidden one (Echo #784) — is said in Echo's own words, nothing connected
priority: medium
type: functional
requirements: [F-OB-68]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, connect, folders]
---

# TC-062: A folder Echo refuses is said in its words

## Preconditions
- `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`
- A made-up folder of notes inside a hidden one: `mkdir -p "$VAULTS/.archive/old-notes"` and a note in it
  (`printf -- '# Old\n' > "$VAULTS/.archive/old-notes/old.md"`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `ECHOCTL_PICK_FOLDER="$VAULTS/.archive/old-notes" obs pick '{"for":"connect"}'` (what the Connect sheet asks after *Choose…*) | `{"path": null, "name": "", "refused": "<the folder> is a hidden folder or inside one (“.archive”), where other programs keep their settings: pick a folder that isn't hidden"}` — Echo's own words, which the sheet shows in its warning line; *Next* stays off |
| 2 | `obs kn \| grep -c old-notes`; `cat "$ECHOCTL_CONFIG_DIR/plugins/grants/obsidian.json" 2>/dev/null \| grep -c archive` | `0` and `0`: nothing connected, nothing granted |
