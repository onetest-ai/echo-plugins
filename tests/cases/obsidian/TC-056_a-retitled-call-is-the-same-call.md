---
id: TC-056
title: A call is known by its stamp — retitled, its note is updated in place, it is queued and prepared once, read as it is named now; two calls of one second kept apart; a ledger of before kept by stamp
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
- An environment of its own: `SAME_SECOND=1 ECHO_REPO=… tests/fixtures/obsidian/up.sh <dir> <port>` — the standard data plus a
  made-up memo started in the same second as guest call 7 (`<day>_143000-guest-memo`); then TC-038 steps 2 and 6 (my-twin, acme-notes, globex-notes)
- `. <dir>/env`, `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`, `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`
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
| 7 | `echoctl plugin emit minutes_written --from 2026-11-17_143000-guest-memo`; `ls "$S/calls"`; the notes and the queue as in step 1 | Two records — `2026-11-17_143000.json` (the guest call, now "with Acme") and `2026-11-17_143000~<sha>.json` naming `2026-11-17_143000-guest-memo`; a second note `2026-11-17-guest-memo.md` beside the guest call's (never over it); queued `['call:2026-11-17_143000~<sha>']` |
| 8 | `obs prepare_sources '{"vault":"my-twin"}'` | `written` the memo (`raw_inbox/echo/2026-11-17-guest-memo.md`, its title "Guest memo"), `failed` [] — read by its folder, not the shared stamp |
| 9 | A ledger as 1.0 before Echo #772 left it — globex-notes the default, its calls rule *add* (`obs default '{"id":"globex-notes"}'`, `obs set '{"id":"globex-notes","key":"ingest.calls","value":"add"}'`), then its `$S/vaults/globex-notes/ingest.json` written with the call `R=$(ls "$ECHOCTL_HOME/calls" \| grep acme-security-review)` queued under two folders, the second as it was retitled (`{"baseline": null, "sources": {}, "calls": [], "mails": [], "runs": [], "queued": {"call:${R%-review}": {"id": "call:${R%-review}", "kind": "call", "title": "Acme security", "rule": "add", "state": "queued", "added": "2026-11-17T12:00:00Z"}, "call:$R": {"id": "call:$R", "kind": "call", "title": "Acme security review", "rule": "add", "state": "queued", "added": "2026-11-17T13:00:00Z"}}}`); `obs sources '{"vault":"globex-notes"}' \| grep '"id": "call'` | One queued call, `call:<its stamp>` — the retitled pair is one call (the earliest entry kept) |
| 10 | `echoctl plugin emit minutes_written --from $R`; the ledger's `keys` and queue | `"keys": "stamp"`, still the one `call:<its stamp>` — never queued a third time |
