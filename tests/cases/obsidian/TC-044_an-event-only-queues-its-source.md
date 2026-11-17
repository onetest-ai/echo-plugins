---
id: TC-044
title: An event only queues its source — minutes_written and sources_changed put a call or a mail (Recall's facts) in the queue of its routed vault by the vault's rule, once; nothing is written into the vault and no model runs; another profile's is not queued
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
- A mail as Recall tells it (made up): `M='{"changed":["mail:mail/c1","mail:mail/c2"],"removed":[],"items":[{"id":"mail:mail/c1","kind":"mail","title":"Acme rollout plan","subject":"Acme rollout plan","at":"2026-11-16","threads":[{"id":"acme-rollout","name":"Acme rollout","client":"acme","client_name":"Acme"}],"client":{"id":"acme","name":"Acme"},"profile":"work","from":["Dana Lee"],"people":["dana@acme.example"],"trust":"trusted","link":"echo://mail/mail/c1","url":"https://outlook.example/owa/?ItemID=AAMk%2Bc1"},{"id":"mail:mail/c2","kind":"mail","title":"Elsewhere","subject":"Elsewhere","at":"2026-11-16","threads":[{"id":"acme-rollout","name":"Acme rollout","client":"acme","client_name":"Acme"}],"client":{"id":"acme","name":"Acme"},"profile":"other","from":["Dana Lee"],"people":[],"trust":"trusted","link":"echo://mail/mail/c2","url":null}]}'`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs set '{"id":"acme-notes","key":"ingest.calls","value":"add"}'`; `obs set '{"id":"acme-notes","key":"ingest.mail","value":"prepare"}'`; `snap > /dev/null; B="$(snap)"` | The rules set; the vault's files as they are (B) |
| 2 | `echoctl plugin emit minutes_written --from 2026-11-17_170000-acme-weekly-sync`; `echoctl plugin emit sources_changed "$M"`; after 3 s `[ "$(snap)" = "$B" ] && echo unchanged` | `unchanged`: not a file of the vault written |
| 3 | `python3 -c 'import json,sys; l=json.load(open(sys.argv[1])); print(sorted((k, q["kind"], q["rule"], q["state"]) for k, q in l["queued"].items()))' "$S/vaults/acme-notes/ingest.json"` | `[('call:2026-11-17_170000-acme-weekly-sync', 'call', 'add', 'queued'), ('mail:mail/c1', 'mail', 'prepare', 'queued')]` — the mail of the other profile (`other`) isn't queued; the mail entry holds Recall's facts (subject, from, url), no message text |
| 4 | Emit both again; after 3 s the same check | Still the same two: each queued once |
| 5 | `obs sources '{"vault":"acme-notes"}' \| python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["counts"], [(s.get("id"), s["kind"], s["state"], s.get("queued")) for s in d["sources"]])'` | `counts` with `queued` 2 and `new` 2; the two as `('call:…', 'echo', 'new', True)` and `('mail:mail/c1', 'mail', 'new', True)` |
| 6 | `grep -c '"text"' "$S/vaults/acme-notes/ingest.json"` | `0`: the queue keeps Recall's facts and Echo's routing, never a mail's or a call's text |
