---
id: TC-056
title: A call is known by its stamp — retitled, its note is updated in place, it is queued and prepared once, read as it is named now; its record names the folder seen last
priority: critical
type: functional
requirements: [F-OB-63]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, minutes, ingest, stamp]
---

# TC-056: A retitled call is the same call

## Preconditions
- TC-038 done (my-twin), `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`, `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`
- `obs default '{"id":"my-twin"}'`; `obs set '{"id":"my-twin","key":"ingest.calls","value":"add"}'`; `C=2026-11-17_143000-guest-call-7`
  (the standard data's guest call 7; the day is the data's, so `ls "$ECHOCTL_HOME/calls" | grep guest-call-7` names it)
- The steps that emit an event wait 3 s for the served window to take it

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin emit minutes_written --from $C`; `ls "$VAULTS/my-twin/knowledge/notes"`; `python3 -c 'import json,sys; print(sorted(json.load(open(sys.argv[1]))["queued"]))' "$S/vaults/my-twin/ingest.json"`; `python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["folder"])' "$S/calls/2026-11-17_143000.json"` | One note `2026-11-17-guest-call-7.md` (auto); queued `['call:2026-11-17_143000']` — by its stamp; the record `calls/2026-11-17_143000.json` names the folder `$C` |
| 2 | `echoctl title $C 'Guest call with Acme'`; `ls "$ECHOCTL_HOME/calls" \| grep 2026-11-17_143000` | Echo renames the folder `2026-11-17_143000-guest-call-with-acme` — the stamp stays |
| 3 | `echoctl plugin emit minutes_written --from 2026-11-17_143000-guest-call-with-acme`; the same three reads | Still one note (its record's entry `updated`, the same path); still one queued `call:2026-11-17_143000`; the record names the new folder |
| 4 | `obs prepare_sources '{"vault":"my-twin"}'`; `grep -m2 'Guest call with Acme' "$VAULTS/my-twin/raw_inbox/echo/"*.md` | `written` `[{"id": "call:2026-11-17_143000", "path": "raw_inbox/echo/2026-11-17-guest-call-with-acme.md"}]` — read by its stamp: the call as it is named now |
| 5 | Emit step 3's event again; the queue | `[]`: prepared once, never queued again |
| 6 | The call's page in the window (`#call/2026-11-17_143000-guest-call-with-acme/notes`) | The chip "In my-twin ↗": the page's call (with its stamp) finds its record |
