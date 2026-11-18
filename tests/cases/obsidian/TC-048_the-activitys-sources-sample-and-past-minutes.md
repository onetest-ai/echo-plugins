---
id: TC-048
title: The Knowledge activity's step-4 sheets — Ingest's Add a source takes a call (a web page only by its address: TC-059 adds one), the queue lists it; a vault's Settings preview how a call lands and offer the past minutes
priority: high
type: functional
requirements: [F-OB-52, F-OB-46, F-OB-51]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, ingest, minutes]
---

# TC-048: Sources, the sample and past minutes in the activity

## Preconditions
- TC-047 done (my-twin the default vault, in git), the served window, Playwright headless (1440×900, light and dark);
  `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `<base_url>/#obsidian:knowledge/my-twin/ingest` → *Add a source* → *A call or memo*; type "Acme weekly sync", pick the first; *Add* | The sheet lists calls with minutes (another profile's flagged); after *Add* the queue shows a source under `raw_inbox/echo/` |
| 2 | *Add a source* → *A web page*: empty, then `acme.example/notes` typed | Empty: the button reads *Type the address…* (Echo's own box asks); typed without a scheme: the button is off, "A web address starts with http:// or https://." under the field; nothing fetched (`curl -s $FAKE_WEB/_log` and `$FAKE_WEB_OTHER/_log` list nothing new) |
| 3 | `<base_url>/#obsidian:knowledge/my-twin/settings` | Meeting minutes: *Save past minutes* with a count and *Save N…*; *Preview…* |
| 4 | *Preview…* | "How a call lands here": the newest call on the vault's profile, its file under `knowledge/notes/`, its index row and the note's text (`title: "…"`); nothing written |
| 5 | `obs past '{"id":"my-twin"}'` | `count` as the Settings row says; `first` its first calls |
