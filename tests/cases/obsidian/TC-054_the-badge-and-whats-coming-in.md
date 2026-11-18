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
| 1 | `#obsidian:knowledge/acme-twin/home` | Coming in: "1 source not processed yet", files 1, *Prepare changes*; the activity's badge none (nothing waits: TC-034 ignored the one finding only the user decides) |
| 2 | Ingest; `raw_inbox/fallback.md` ticked (the only New one); *Prepare changes* | The address `…/ingest/<run>`; the run's review: "2 changes from 1 source", "… · $0.07 · ingest" |
| 3 | The tabs and the activity bar | "Ingest 2", "Health" without a number; the badge on Knowledge 2 |
| 4 | `#obsidian:knowledge/acme-twin/home` | Coming in: "2 changes wait for your review", "fallback.md (2)", *Review* |
| 5 | *Review* | The run's review opens (`…/ingest/<run>`) |
| 6 | Approve `knowledge/topics/fallback.md`, reject `knowledge/topics/budget.md` | "Ingest" without a number, the badge gone; *Write 1 approved* |
| 7 | *Write 1 approved* | "Wrote knowledge/topics/fallback.md into acme-twin. Committed (<id>). The run is done: 1 of its 2 changes kept." |
| 8 | Dark scheme: Home, Ingest (the source Fallback: "Done · kept 1", its text as it came, read only) and Health | Drawn in Echo's dark theme, nothing unreadable |
| 9 | The page's console | No error from the plugin |
