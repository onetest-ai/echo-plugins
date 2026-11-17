---
id: TC-010
title: Echo's index of a vault reads its pages folder only; Claude's commands answer as before with note paths relative to it, named as pages; a change outside Echo changes the revision
priority: critical
type: functional
requirements: [F-OB-12]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, index]
---

# TC-010: The index over a vault's pages folder

## Preconditions
- The environment from `up.sh` (Echo built from source), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`
- `T="$VAULTS/acme-twin"` (twin-shaped, its pages in `knowledge/`, a git repository), `W="$VAULTS/acme-wiki"` (its pages
  at its root, no git)

- TC-008 done (both vaults connected and detected)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs tree '{"id":"acme-twin"}'` | `vault.pages` "knowledge", `index` "CATALOG.md", a 16-hex `rev`; `pages`: CATALOG.md, TAG_TAXONOMY.md, clients/acme.md, notes/2026-01-01-kickoff.md, notes/2026-01-08-weekly.md, topics/hostile.md, topics/rollout.md — no template, no raw_inbox, no AGENTS.md; `in_index` true for clients/acme.md, notes/2026-01-01-kickoff.md and topics/rollout.md, false for the weekly and hostile pages, null for CATALOG.md and TAG_TAXONOMY.md |
| 2 | `obs search '{"vault":"acme-twin","q":"acme"}'`; `obs backlinks '{"vault":"acme-twin","note":"[[acme]]"}'` | Each answers `pages` "knowledge"; the first note is `clients/acme.md`; the backlinks are CATALOG.md, notes/2026-01-01-kickoff.md and topics/rollout.md, each with its line |
| 3 | `obs search '{"vault":"acme-wiki","q":"ada"}'` | `People/Ada Lovelace.md`; no `pages` key (its pages are its root) |
| 4 | `obs rev '{"id":"acme-twin"}'`; `printf '\nOne more line.\n' >> "$T/knowledge/notes/2026-01-08-weekly.md"`; `obs rev …` again | The second `rev` differs from the first |
| 5 | `python3 -c 'import json,sys,os; d=sys.argv[1]; j=json.load(open(d+"/index.json")); print(j["v"], j["pages"], sum(len(json.load(open(d+"/index/"+p))) for p in j["parts"]), sorted(os.listdir(d+"/index"))==sorted(j["parts"]))' "$ECHOCTL_HOME/.echo/plugins/obsidian/vaults/acme-twin"` | `4 knowledge 7 True` — a head and its parts (no part of an earlier build left), in the plugin's store, never in the vault |
| 6 | `(cd "$T" && git checkout -- knowledge/notes/2026-01-08-weekly.md)` | The vault as it was |
