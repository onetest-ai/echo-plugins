---
id: TC-050
title: A mail thread and a Teams chat the user adds — read from Microsoft 365 by their ids, each written once as it came (a section a message, attachments named), recorded so the queue never takes them again; on another AI profile only "anyway"
priority: high
type: functional
requirements: [F-OB-51, F-OB-44]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, ingest, mail, m365]
---

# TC-050: A mail and a chat the user adds

## Preconditions
- TC-049 done, the environment's fake Microsoft 365 (README), `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`,
  `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs source_m365 '{"id":"globex-notes","q":"pilot"}'` | `signed_in` true; the mails of "Acme pilot plan" and the chat `19:acme-pilot@thread.v2` |
| 2 | `obs source_add '{"id":"globex-notes","kind":"mail","message":"AAMk-acme-pilot-1"}'`; `cat "$VAULTS/globex-notes/raw_inbox/mail/"*acme-pilot-plan*.md` | A `path` under `raw_inbox/mail/`; the thread's messages, one section each, `Attachments: acme-pilot-plan.pdf` |
| 3 | `grep -c 'm365:AAMk-acme-pilot-1' "$S/vaults/globex-notes/ingest.json"` | at least `1`: the mail is known by its id (`m365:AAMk-acme-pilot-1`) — the queue never takes it again |
| 4 | `obs source_add "{\"id\":\"globex-notes\",\"kind\":\"chat\",\"chat\":\"19:acme-pilot@thread.v2\",\"since\":\"$(date +%F)\",\"until\":\"$(date +%F)\"}"`; `cat "$VAULTS/globex-notes/raw_inbox/teams/"*.md` | `raw_inbox/teams/<today>-acme-pilot.md`: `kind: teams`, `since`/`until` today, the chat's messages of that day as sections (the fake's are dated relative to now: one or two), `Attachments:` named |
| 5 | `obs set '{"id":"globex-notes","key":"profile","value":"system"}'`; `obs source_add '{"id":"globex-notes","kind":"mail","message":"AAMk-acme-pilot-2"}'`; `obs set '{"id":"globex-notes","key":"profile","value":""}'` | `mismatch` `{"call": "work", "vault": "system", …}`: a mail Recall hasn't routed is the default profile's; nothing written |
