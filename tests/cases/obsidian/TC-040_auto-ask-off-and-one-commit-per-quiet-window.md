---
id: TC-040
title: A vault's minutes mode — auto writes the note when the minutes are written (the event), ask and off write nothing by themselves; the rule's notes are committed once, after two quiet minutes
priority: critical
type: functional
requirements: [F-OB-43, F-OB-73]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, minutes, events, git]
---

# TC-040: Auto, ask and off; one commit per quiet window

## Preconditions
- TC-039 done (`acme-rollout` → acme-notes, `globex-pilot` → globex-notes, both `ask`; `my-twin` the default, `auto`, in git), `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`
- `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`; the served window is this environment's (`lsof -nP -iTCP:<port> -sTCP:LISTEN` → the pid in `<dir>/pid`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin emit minutes_written --from 2026-11-17_170000-acme-weekly-sync`; after 3 s `ls "$VAULTS/acme-notes/knowledge/notes"` | "Queued minutes_written…"; acme-notes (ask) has no new note: `README.md` and the Globex pilot scoping note only |
| 2 | `obs set '{"id":"acme-notes","key":"minutes","value":"off"}'`; emit again; `ls "$VAULTS/acme-notes/knowledge/notes"` | Still nothing new (off) |
| 3 | `obs call_state '{"call":"2026-11-17_170000-acme-weekly-sync"}' \| python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["targets"], [(r["id"], r["mode"]) for r in d["routed"]])'` | `[] [('acme-notes', 'off')]` |
| 4 | `echoctl plugin emit minutes_written --from 2026-11-13_090000-initech-hiring-panel` (Initech hiring: no vault of its own → the default, my-twin, auto); after 3 s `ls "$VAULTS/my-twin/knowledge/notes"`; `(cd "$VAULTS/my-twin" && git status --short)` | `2026-11-13-initech-hiring-panel.md` is there; git shows it (`??`) and `M knowledge/CATALOG.md`, `M log.md`, and its participants' person pages (`?? knowledge/people/Lena Vogel.md`, `Priya Nair.md`, `Tom Becker.md`: my-twin is Automatic, TC-069): written, not committed yet |
| 5 | `echoctl plugin emit minutes_written --from 2026-11-08_160000-analyst-briefing`; after 3 s `cat "$S/vaults/my-twin/pending.json"` | Both calls wait for one commit: `items` the two notes, CATALOG.md, log.md and the three person pages with their sha256; `calls` two |
| 6 | `cat "$S/calls/2026-11-13_090000.json"` | `saved[0]`: `vault` my-twin, `how` "auto", `state` "saved", `index` "added", `commit` "pending", a `revision` |
| 7 | Wait until two minutes after step 5 have passed (and up to 30 s more); `(cd "$VAULTS/my-twin" && git log --format='%cn \| %s' -2; git show --name-only --format= HEAD; git status --short)` | `Echo (obsidian) \| Echo: minutes of 2 calls` holding exactly `knowledge/CATALOG.md`, `knowledge/notes/2026-11-08-analyst-briefing.md`, `knowledge/notes/2026-11-13-initech-hiring-panel.md`, the three person pages of step 4, `log.md`; nothing left uncommitted |
| 8 | `cat "$S/calls/2026-11-13_090000.json" \| grep commit`; `ls "$S/vaults/my-twin/"` | `commit` is now that commit's id; `pending.json` gone |
