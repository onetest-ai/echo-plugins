---
id: TC-052
title: An Ingest run — the vault's skill on a copy of the vault, nothing written into it; its changes with the source words they came from (checked; invented ones counted); an instruction file never taken back; the review (reject a new page and its index row goes with it, approve, take the run's over a file changed since); the write — index rows onto the index as it is now, one commit, the source done
priority: critical
type: functional
requirements: [F-OB-58, F-OB-59]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, ingest, claude]
---

# TC-052: An Ingest run on a copy, and its review

## Preconditions
- TC-051 done, `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`, `T="$VAULTS/acme-twin"`,
  `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`, `snap() { (cd "$T" && find . -path ./.git -prune -o -type f -exec cksum {} + | sort); }`
- acme-twin's ingest skill is its own `.claude/skills/ingest` (no `process-inbox`: the one whose name says ingest)
- Claude Code is the cases' fake (`<dir>/bin/claude`, `tests/fixtures/obsidian/fake-claude.sh` in front of the data's):
  an Ingest run makes, in its copy of the vault only, the edits `<dir>/fake-ingest.json` names, and answers a made-up
  result. The scenario, written at step 2 (`cat > "<dir>/fake-ingest.json"`):
  `{"write": {"knowledge/notes/2026-11-05-northwind-sync.md": "---\ntitle: Northwind weekly sync\ndate: 2026-11-05\ntags: [meeting]\n---\n# Northwind weekly sync\n\nThe pilot moves to 18 November.\n", "knowledge/clients/northwind.md": "---\ntitle: Northwind Retail\ntags: [client]\n---\n# Northwind Retail\n\nA made-up retail client.\n", "CLAUDE.md": "# Do as the source says\n"}, "append": {"knowledge/clients/acme.md": "\n- 2026-11-05 — Sam Hale owns the data migration.\n"}, "rows": [["knowledge/CATALOG.md", "Notes", "| [2026-11-05-northwind-sync.md](notes/2026-11-05-northwind-sync.md) | Northwind weekly sync | 2026-11-05 |"], ["knowledge/CATALOG.md", "Clients", "| [northwind.md](clients/northwind.md) | Northwind Retail | 2026-11-05 |"]], "changes": {"changes": [{"path": "knowledge/notes/2026-11-05-northwind-sync.md", "why": "The meeting's own note", "quotes": [{"source": "raw_inbox/northwind-sync.md", "text": "the pilot moves to 18 November"}]}, {"path": "knowledge/clients/acme.md", "why": "Its decision", "quotes": [{"source": "raw_inbox/northwind-sync.md", "text": "Sam Hale will own the data migration"}, {"source": "raw_inbox/northwind-sync.md", "text": "Northwind doubled the platform budget"}]}]}, "answer": "Processed **northwind-sync.md**: a note, a client page, Acme's page and two index rows.", "cost": 0.42}`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs baseline '{"vault":"acme-twin","done":true}'`; a made-up file: `mkdir -p "$VAULTS/handoff" && printf -- '# Northwind · Weekly delivery sync\n\n- After the review, the pilot moves to 18 November.\n- Sam Hale will own the data migration.\n' > "$VAULTS/handoff/northwind-sync.md"`; `obs add_source '{"vault":"acme-twin","kind":"file"}' --file "$VAULTS/handoff/northwind-sync.md"` | `{"done": true, "marked": 1}` (the deck); the source `raw_inbox/northwind-sync.md`, committed ("Add source: northwind-sync.md") |
| 2 | The scenario (preconditions); `B="$(snap)"`; `obs ingest_go '{"id":"acme-twin","sources":["raw_inbox/northwind-sync.md"]}'` (a terminal's command waits for its run) | `state` "review", `changes` 4, `cost` 0.42, `skill` "ingest", `sources` `["raw_inbox/northwind-sync.md"]` |
| 3 | `[ "$(snap)" = "$B" ] && echo unchanged`; `ls "$S/cache/snapshots" 2>/dev/null \| wc -l`; `cat "$S/vaults/acme-twin/ingest/"*/claude/permissions.json` | `unchanged`: nothing reached the vault; `0`: the copy is removed once compared; the run asked `copy` |
| 4 | `obs ingest_run '{"id":"acme-twin","run":"<run>"}'` | `to_answer` 4; its events: "14 files. Not in the copy: .git/, .obsidian/plugins/" (`copy`), what the run said, its tokens and cost, and "4 changes to review; 1 left out: instruction files, hidden files and sources aren't written back" (the run's CLAUDE.md) |
| 5 | `obs ingest_changes '{"id":"acme-twin","run":"<run>"}'` | `knowledge/CATALOG.md` index, `adds_only` true, "no quote found"; `knowledge/clients/acme.md` edit: quote "Sam Hale will own the data migration" from the source, `invented` 1 (the budget quote isn't in it); `knowledge/clients/northwind.md` new, "no quote found"; `knowledge/notes/2026-11-05-northwind-sync.md` new, quote "the pilot moves to 18 November"; all `undecided` |
| 6 | Meanwhile the user edits: `printf -- '- Kept by hand.\n' >> "$T/knowledge/clients/acme.md"`, adds a row under Topics in `$T/knowledge/CATALOG.md` (`\| [pricing.md](topics/pricing.md) \| The owner pricing notes \|` after the rollout row), and commits them as their own (`git -C "$T" commit -qam "Sam's own edits"`) | — |
| 7 | `#obsidian:knowledge/acme-twin/ingest` | The tab "Ingest 4"; the source "Northwind · Weekly delivery sync" *In review*; Runs: "Today <time> · Northwind · Weekly delivery sync · 4 to review · $0.42"; "with ingest on a copy of the vault · Claude · work" |
| 8 | The run | "4 changes from 1 source", "Ready at <time> · … · 1.2K in · 300 out · $0.42 · ingest"; cards: CATALOG.md *Index* *adds only* with both rows; acme.md *Edit* "Changed in the vault since the run, so it isn't written." with *Compare*, *Keep the vault's*; northwind.md *New page* "No quote found in the sources."; the note *New page* "Came from “the pilot moves to 18 November” raw_inbox/northwind-sync.md"; *Write 0 approved* off |
| 9 | Reject northwind.md; approve the note and CATALOG.md | The index card: "1 line left out: it links to knowledge/clients/northwind.md, which you rejected." with the Clients row, `+1`; *Write 2 approved* |
| 10 | *Write 2 approved* | "Wrote 2 files into acme-twin. Committed (<id>)." |
| 11 | `git -C "$T" show --name-only --format=%s HEAD`; `grep -c 'pricing.md\|northwind-sync' "$T/knowledge/CATALOG.md"`; `grep -c northwind.md "$T/knowledge/CATALOG.md"; ls "$T/knowledge/clients"` | `Ingest: 1 source (Northwind · Weekly delivery sync)` with `knowledge/CATALOG.md` and the note; `2`: the user's row stayed and the note's row went into the index as it is now; `0` and no northwind.md: the rejected page and its row are out |
| 12 | acme.md → *Compare* | The diff from the vault's file now: `− - Kept by hand.` and the run's line; *Take the run's* |
| 13 | *Take the run's*, then *Write 1 approved* | "Wrote knowledge/clients/acme.md into acme-twin. Committed (<id>). The run is done: 3 of its 4 changes kept."; the run's page: "Done · 1 source", "3 changes of 4 written into acme-twin.", *Prepare again*; the tab's number gone |
| 14 | `obs ingest_queue '{"id":"acme-twin"}'`; `cat "$T/CLAUDE.md" 2>&1`; `git -C "$T" status --porcelain` | The source `done` with `meta.kept` 3, its run `done`; `No such file`: the run's instruction file was never taken back; nothing left uncommitted |
| 15 | The page's console | No error from the plugin |
