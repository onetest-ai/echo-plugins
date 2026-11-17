---
id: TC-045
title: Preparing a batch writes the queued sources into the vault's sources folder — a call as Echo's minutes (echo/<date>-<slug>.md), a mail's own text read from Microsoft 365 only now; what can't be read stays queued, saying why
priority: high
type: functional
requirements: [F-OB-48]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, ingest, mail, m365]
---

# TC-045: A mail's text only on prepare

## Preconditions
- TC-044 done (acme-notes' queue: the call and the mail), `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`, `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`
- The test data has no Microsoft 365 sign-in (and Echo's test data has no fake Microsoft 365): the mail can't be read here

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs prepare_sources '{"vault":"acme-notes"}'` | `written` `[{"id": "call:2026-11-17_170000-acme-weekly-sync", "path": "raw_inbox/echo/2026-11-17-acme-weekly-sync.md"}]`; `failed` `[{"id": "mail:mail/c1", "title": "Acme rollout plan", "error": "Microsoft 365 isn't connected: sign in to it in Echo's Settings → Calendar & chat"}]` — Microsoft 365 asked only now; `commit` "off" |
| 2 | `cat "$VAULTS/acme-notes/raw_inbox/echo/2026-11-17-acme-weekly-sync.md"` | `title: Acme weekly sync`, `date: 2026-11-17`, `kind: call`, `participants:`, `duration:`, `source: echo://call/2026-11-17_170000-acme-weekly-sync`, `origin: echo`; then `# Acme weekly sync — minutes` and the minutes as Echo wrote them (its own header included) |
| 3 | `python3 -c 'import json,sys; l=json.load(open(sys.argv[1])); print(list(l["queued"]), [(p, e["by"], e["state"], e.get("from")) for p, e in l["sources"].items()], l["calls"])' "$S/vaults/acme-notes/ingest.json"` | Queued: only `mail:mail/c1` (it waits); the call is a source `('raw_inbox/echo/2026-11-17-acme-weekly-sync.md', 'call', 'new', 'call:2026-11-17_170000-acme-weekly-sync')`; `calls` names it |
| 4 | `rm "$VAULTS/acme-notes/raw_inbox/echo/2026-11-17-acme-weekly-sync.md"`; `echoctl plugin emit minutes_written --from 2026-11-17_170000-acme-weekly-sync`; after 3 s step 3's check | The call isn't queued again: the ledger remembers it |
| 5 | `obs skip_source '{"vault":"acme-notes","id":"mail:mail/c1","note":"Read it in Outlook"}'`; `obs prepare_sources '{"vault":"acme-notes"}'` | `{"id": "mail:mail/c1", "state": "skipped"}`; then `written` [] and `failed` []: a skipped source isn't prepared |
