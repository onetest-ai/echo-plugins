---
id: TC-054
title: The activity's badge and Home — Ingest's number counts the changes waiting for an answer, Health's the findings only the user decides, the badge both; Home's Coming in shows the changes waiting with Review and the run's sources; Prepare changes from the window starts a run on a copy
priority: high
type: functional
requirements: [F-OB-61, F-OB-58]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, ingest, health]
---

# TC-054: The badge and what's coming in

## Preconditions
- TC-053 done, `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`, `T="$VAULTS/acme-twin"`
- The scenario for the cases' fake (`<dir>/fake-ingest.json`): two new pages —
  `{"write": {"knowledge/topics/fallback.md": "---\ntitle: Fallback plan\ntags: [concept]\n---\n# Fallback plan\n\nSam Hale will own the data migration.\n", "knowledge/topics/budget.md": "---\ntitle: Budget\ntags: [concept]\n---\n# Budget\n\nNo figures yet.\n"}, "answer": "Two topic pages.", "cost": 0.07}`
- A made-up source added: `printf -- '# Fallback\n\nSam Hale will own the data migration.\n' > "$VAULTS/handoff/fallback.md"`; `obs add_source '{"vault":"acme-twin","kind":"file"}' --file "$VAULTS/handoff/fallback.md"`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `#obsidian:knowledge/acme-twin/home` | Coming in: "1 new source" (or by kind: Files 1) with *Prepare*; Health's card; the activity's badge 1 (the tag only the user decides) |
| 2 | Ingest; `raw_inbox/fallback.md` ticked; *Prepare changes* | The address `…/ingest/<run>`; "Preparing changes · 1 source", then the review: "2 changes from 1 source" |
| 3 | The tabs and the activity bar | "Ingest 2", "Health 1"; the badge on Knowledge 3 |
| 4 | `#obsidian:knowledge/acme-twin/home` | Coming in: "2 changes wait for your review", the run's source, *Review* |
| 5 | *Review* | The run's review opens |
| 6 | Approve one, reject the other | "Ingest" without a number once both are answered (*Write 1 approved*); the badge 1 |
| 7 | *Write 1 approved* | "Wrote knowledge/topics/<page>.md into acme-twin. Committed (<id>). The run is done: 1 of its 2 changes kept." |
| 8 | Dark scheme: Home, Ingest and Health | Drawn in Echo's dark theme, nothing unreadable |
| 9 | The page's console | No error from the plugin |
