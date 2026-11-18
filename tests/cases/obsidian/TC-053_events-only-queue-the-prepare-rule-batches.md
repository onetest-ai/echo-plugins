---
id: TC-053
title: THE RULE's batching — a call's minutes event only queues it, even with "Add and prepare changes"; the app starts one run over everything queued once the batch's number of sources wait (Settings → Ingest), the queue prepared into the sources folder in one commit first
priority: high
type: functional
requirements: [F-OB-60]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, ingest, events, rule]
---

# TC-053: Events only queue; the prepare rule batches

## Preconditions
- TC-052 done, `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`, `T="$VAULTS/acme-twin"`,
  `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`; no scenario for the fake (`rm -f <dir>/fake-ingest.json`): a run changes nothing
- acme-twin is the default vault: the standard data's calls with no vault of their own go there; the served window is
  this environment's (`lsof -nP -iTCP:<port> -sTCP:LISTEN` shows the pid in `<dir>/pid`) — events are told to it
- `q() { python3 -I -c 'import json,sys; l=json.load(open(sys.argv[1])); print(sorted((k, x["rule"], x["state"]) for k, x in l["queued"].items()), [(r["state"], len(r["sources"])) for r in l["runs"]])' "$S/vaults/acme-twin/ingest.json"; }`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Settings → Ingest of acme-twin | The ingest skill "Found: ingest"; "New calls' minutes" with *Add and prepare changes* ("Runs start by themselves, in batches (below), never during a call. …"); "Prepared in batches": 5 sources or 24 hours |
| 2 | *Add and prepare changes*; the batch's sources typed as 2 (Tab); `obs kn '{"id":"acme-twin"}'`, acme-twin's `ingest` | `"calls": "prepare"`, `"batch_sources": 2`, `"batch_hours": 24` — kept as set |
| 3 | `echoctl plugin emit minutes_written --from 2026-11-17_143000-guest-call-7`; after 3 s `q` | `[('call:2026-11-17_143000-guest-call-7', 'prepare', 'queued')]` and the runs as they were (one `done`): the event only queued it |
| 4 | Wait 70 s (the app looks every minute); `q`; `ls "$T/raw_inbox/echo" 2>&1` | Still one queued, no new run: one source of a batch of 2; nothing written into the vault |
| 5 | `echoctl plugin emit minutes_written --from 2026-11-16_150000-partner-sync-with-vandelay`; wait up to 70 s; `q` | No call queued any more; a new run `('review', 2)` first in the list — one run over both |
| 6 | `ls "$T/raw_inbox/echo"`; `git -C "$T" log --format=%s -1` | `2026-11-16-partner-sync-with-vandelay.md`, `2026-11-17-guest-call-7.md`; `Add sources: 2` — the queue prepared in one commit before the run |
| 7 | `obs ingest_run '{"id":"acme-twin","run":"<the new run>"}'`; the run in the window | `state` "review", `changes` 0 (the fake changed nothing), its `sources` the two files; "0 changes from 2 sources", *Finish the run*; Runs: "Today <time> · 2 sources · nothing changed — finish · $0.42" |
| 8 | *Finish the run* | "The run is done: it changed nothing."; both sources Done |
| 9 | `obs set '{"id":"acme-twin","key":"ingest.batch_sources","value":"0"}'`; `obs set '{"id":"acme-twin","key":"ingest.batch_hours","value":"200"}'` | Refused: "a batch of 1–100 sources", "a batch of 1–168 hours" |
