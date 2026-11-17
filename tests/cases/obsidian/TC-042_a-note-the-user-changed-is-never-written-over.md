---
id: TC-042
title: A note the user changed is never written over — minutes written again leave it (kept), the user's command too; only on their word is it replaced, or a new note saved beside it
priority: critical
type: functional
requirements: [F-OB-45]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, minutes, conflicts]
---

# TC-042: The user's note is kept

## Preconditions
- TC-041 done, `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`, `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`
- `C=2026-11-13_090000-initech-hiring-panel` (saved into my-twin by the rule in TC-040); `N="$VAULTS/my-twin/knowledge/notes/2026-11-13-initech-hiring-panel.md"`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `printf '\nMy own line.\n' >> "$N"`; `cksum "$N"` | The user changed Echo's note: its checksum K |
| 2 | `echoctl plugin emit minutes_written --from $C`; after 3 s `cksum "$N"`; `grep -o '"state": "[a-z]*"' "$S/calls/${C:0:17}.json"` | K again: not written over; the record says `"state": "kept"` |
| 3 | `obs save_minutes "{\"call\":\"$C\",\"vault\":\"my-twin\"}" \| grep state` | `"state": "kept"` — the user's command too, unless they say how |
| 4 | `obs call_state "{\"call\":\"$C\"}" \| python3 -c 'import json,sys; print(json.load(sys.stdin)["kept"])'` | `['my-twin']` |
| 5 | `obs save_minutes "{\"call\":\"$C\",\"vault\":\"my-twin\",\"replace\":true}" \| grep state`; `grep -c 'My own line' "$N"` | `"state": "updated"`; `0`: replaced on the user's word |
| 6 | `printf '\nMine again.\n' >> "$N"`; `cksum "$N"` (K2); `obs save_minutes "{\"call\":\"$C\",\"vault\":\"my-twin\",\"new\":true}"`; `cksum "$N"` | `state` "saved", `path` `knowledge/notes/2026-11-13-initech-hiring-panel-2.md`; the user's note still K2 |
| 7 | `obs call_state "{\"call\":\"$C\"}" \| python3 -c 'import json,sys; print([(s["path"], s["how"]) for s in json.load(sys.stdin)["saved"]])'` | `[('knowledge/notes/2026-11-13-initech-hiring-panel-2.md', 'manual')]`: the new note is the call's note in my-twin now |
