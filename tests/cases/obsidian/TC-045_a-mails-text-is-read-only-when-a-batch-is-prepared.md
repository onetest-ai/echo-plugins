---
id: TC-045
title: Preparing a batch writes the queued sources into the vault's sources folder — a call as Echo's minutes (echo/<date>-<slug>.md), a mail's own text read from Microsoft 365 only now; what can't be read stays queued, saying why
priority: high
type: functional
requirements: [F-OB-48, F-OB-47]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, ingest, mail, m365]
---

# TC-045: A mail's text only on prepare

## Preconditions
- TC-044 done (acme-notes' queue: the call and the mail), `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`, `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`
- The environment's fake Microsoft 365 (`ECHOCTL_TEST_GRAPH`, README): its conversation "Acme pilot plan", the mail `AAMk-acme-pilot-2` and its thread

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `: > <dir>/graph.log`; `obs prepare_sources '{"vault":"acme-notes"}'` | `written`: the call (`raw_inbox/echo/2026-11-17-acme-weekly-sync.md`) and `mail:mail/c1` (`raw_inbox/mail/<date>-acme-pilot-plan.md`); `failed`: `mail:mail/c3` "this mail can't be read until Echo gives its id" (no search for it); `commit` "off" |
| 2 | `cat <dir>/graph.log` | Microsoft 365 asked only now, only for that mail's thread: `GET /me/messages/AAMk-acme-pilot-2…`, its conversation, the attachments — no `POST /search/query` |
| 3 | `cat "$VAULTS/acme-notes/raw_inbox/mail/"*-acme-pilot-plan.md` | `title: Acme pilot plan`, `kind: mail`, `people:` the thread's names, `source:` the picked mail's link, `origin: echo`; `# Acme pilot plan`; one `### <name> · <date time>` section a message with its text; `Attachments: acme-pilot-plan.pdf` named, not downloaded |
| 4 | `head -9 "$VAULTS/acme-notes/raw_inbox/echo/2026-11-17-acme-weekly-sync.md"` | `title: Acme weekly sync`, `date: 2026-11-17`, `kind: call`, `participants:`, `duration:`, `source: "echo://call/2026-11-17_170000-acme-weekly-sync"`, `origin: echo`; then `# Acme weekly sync — minutes` and Echo's minutes as written |
| 5 | `python3 -c 'import json,sys; l=json.load(open(sys.argv[1])); print({k: q.get("why") for k, q in l["queued"].items()}, sorted(e["by"] for e in l["sources"].values()), l["calls"], l["mails"])' "$S/vaults/acme-notes/ingest.json"` | Queued: only `mail:mail/c3`, with its why; sources by `call` and `mail`; `calls` and `mails` name what was written |
| 6 | `rm "$VAULTS/acme-notes/raw_inbox/echo/2026-11-17-acme-weekly-sync.md"`; emit `minutes_written --from 2026-11-17_170000-acme-weekly-sync` and `sources_changed "$M"` again; after 3 s step 5's check | Nothing queued again: the ledger remembers the call and the mail |
| 7 | `obs skip_source '{"vault":"acme-notes","id":"mail:mail/c3","note":"Read it in Outlook"}'`; `obs prepare_sources '{"vault":"acme-notes"}'` | `{"id": "mail:mail/c3", "state": "skipped"}`; then `written` [] and `failed` []: a skipped source isn't prepared |
