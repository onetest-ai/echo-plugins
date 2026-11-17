---
id: TC-041
title: The profile guard — a call whose AI profile isn't the vault's is never saved into it by itself; saved by hand only after "anyway", which its record keeps; the default profile is the vault's when it names none
priority: critical
type: functional
requirements: [F-OB-44]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, minutes, profiles]
---

# TC-041: The profile guard

## Preconditions
- TC-040 done, `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`, `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`
- `C=2026-11-17_140000-globex-steering` (thread Globex pilot → globex-notes; its profile is the default, `work`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs set '{"id":"globex-notes","key":"minutes","value":"auto"}'`; `obs set '{"id":"globex-notes","key":"profile","value":"system"}'` | globex-notes is read by "Claude Code (as configured)" |
| 2 | `obs call_state "{\"call\":\"$C\"}" \| python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["profile"], d["targets"], [(r["id"], r["profile_ok"]) for r in d["routed"]])'` | `work [] [('globex-notes', False)]` |
| 3 | `echoctl plugin emit minutes_written --from $C`; after 3 s `ls "$VAULTS/globex-notes/knowledge/notes"` | No `2026-11-17-globex-steering.md`: never saved by itself |
| 4 | `obs save_minutes "{\"call\":\"$C\",\"vault\":\"globex-notes\"}"` | `{"state": "mismatch", "mismatch": {"call": "work", "vault": "system"}, "error": "this call's text goes only to the Claude · work profile; Globex notes is read by the Claude Code (as configured) profile — save it anyway?"}`; nothing written |
| 5 | `obs save_minutes "{\"call\":\"$C\",\"vault\":\"globex-notes\",\"anyway\":true}"`; `grep -o '"anyway": [a-z]*' "$S/calls/${C:0:17}.json"` | `state` "saved", `path` `knowledge/notes/2026-11-17-globex-steering.md`; the record says `"anyway": true` |
| 6 | `obs set '{"id":"globex-notes","key":"profile","value":""}'`; `obs call_state "{\"call\":\"$C\"}" \| grep -A2 '"targets"'` | The vault names no profile: the default (`work`) is its — the call's targets include globex-notes again |
