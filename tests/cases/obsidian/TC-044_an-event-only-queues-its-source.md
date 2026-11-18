---
id: TC-044
title: An event only queues its source — minutes_written and sources_changed put a call or a mail (Intake's facts) in the queue of its routed vault by the vault's rule, once; nothing is written into the vault and no model runs; another profile's is not queued
priority: high
type: functional
requirements: [F-OB-47]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, ingest, events]
---

# TC-044: The event queue writes nothing into the vault

## Preconditions
- TC-043 done (`acme-rollout` → acme-notes, its minutes off), `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`, `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`
- `snap() { (cd "$VAULTS/acme-notes" && find . -type f -exec cksum {} + | sort); }`
- Mails as Intake tells them (made up; the fake Microsoft 365's conversation "Acme pilot plan"): `M='{"changed":["mail:mail/c1","mail:mail/c2","mail:mail/c3"],"removed":[],"items":[{"id":"mail:mail/c1","kind":"mail","title":"Acme pilot plan","subject":"Acme pilot plan","at":"2026-11-16","threads":[{"id":"acme-rollout","name":"Acme rollout","client":"acme","client_name":"Acme"}],"client":{"id":"acme","name":"Acme"},"profile":"work","from":["Jane Doe"],"people":["jane@acme.example"],"trust":"trusted","link":"echo://mail/mail/c1","url":null,"m365_id":"AAMk-acme-pilot-2","conversation_id":"acme-pilot-conv"},{"id":"mail:mail/c2","kind":"mail","title":"Elsewhere","subject":"Elsewhere","at":"2026-11-16","threads":[{"id":"acme-rollout","name":"Acme rollout","client":"acme","client_name":"Acme"}],"client":{"id":"acme","name":"Acme"},"profile":"other","from":["Dana Lee"],"people":[],"trust":"trusted","link":"echo://mail/mail/c2","url":null,"m365_id":null},{"id":"mail:mail/c3","kind":"mail","title":"Older thread","subject":"Older thread","at":"2026-11-10","threads":[{"id":"acme-rollout","name":"Acme rollout","client":"acme","client_name":"Acme"}],"client":{"id":"acme","name":"Acme"},"profile":"work","from":["Dana Lee"],"people":[],"trust":"trusted","link":"echo://mail/mail/c3","url":null,"m365_id":null},{"id":"mail:channel/p1","kind":"channel","title":"#general","subject":"#general","at":"2026-11-16","threads":[{"id":"acme-rollout","name":"Acme rollout","client":"acme","client_name":"Acme"}],"client":{"id":"acme","name":"Acme"},"profile":"work","from":["Dana Lee"],"people":[],"trust":"trusted","link":"echo://mail/channel/p1","url":null,"m365_id":null}]}'`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs set '{"id":"acme-notes","key":"ingest.calls","value":"add"}'`; `obs set '{"id":"acme-notes","key":"ingest.mail","value":"prepare"}'`; `snap > /dev/null; B="$(snap)"` | The rules set; the vault's files as they are (B) |
| 2 | `echoctl plugin emit minutes_written --from 2026-11-17_170000-acme-weekly-sync`; `echoctl plugin emit sources_changed "$M"`; after 3 s `[ "$(snap)" = "$B" ] && echo unchanged` | `unchanged`: not a file of the vault written |
| 3 | `python3 -c 'import json,sys; l=json.load(open(sys.argv[1])); print(sorted((k, q["kind"], q["rule"], q["state"]) for k, q in l["queued"].items()), list(l.get("not_queued", {})))' "$S/vaults/acme-notes/ingest.json"` | `[('call:2026-11-17_170000', 'call', 'add', 'queued'), ('mail:mail/c1', 'mail', 'prepare', 'queued'), ('mail:mail/c3', 'mail', 'prepare', 'queued')] ['mail:channel/p1']` — the other profile's mail (`other`) isn't queued; the channel's post isn't queued and the ledger says why ("Echo can't read a channel's posts for a vault yet"); a mail entry holds Intake's facts (subject, from, its `m365_id`, its profile), no message text |
| 4 | Emit both again; after 3 s the same check | Still the same three: each queued once |
| 5 | `obs sources '{"vault":"acme-notes"}' \| python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["counts"], [(s.get("id"), s["kind"], s["state"], s.get("queued")) for s in d["sources"]])'` | `counts` with `queued` 3 and `new` 3: `('call:…', 'echo', 'new', True)`, `('mail:mail/c1', 'mail', 'new', True)`, `('mail:mail/c3', 'mail', 'new', True)` |
| 6 | `grep -c '"text"' "$S/vaults/acme-notes/ingest.json"`; `cat <dir>/graph.log` | `0`: the queue keeps Intake's facts and Echo's routing, never a mail's or a call's text; the fake Microsoft 365 was asked nothing |
