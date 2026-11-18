---
id: TC-017
title: A vault's graph with its hubs, folders, tags and links, as the activity draws it; its checks, read only
priority: medium
type: functional
requirements: [F-OB-18, F-OB-19]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, graph, checks]
---

# TC-017: The graph and the checks

## Preconditions
- The environment from `up.sh` (Echo built from source), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`
- `T="$VAULTS/acme-twin"` (twin-shaped, its pages in `knowledge/`, a git repository), `W="$VAULTS/acme-wiki"` (its pages
  at its root, no git)

- TC-008 done; acme-twin as it was

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs graph '{"id":"acme-twin","mode":"links"}'` | `hubs` ["CATALOG.md"]; clients/acme.md with `folder` "clients", `deg` 5; CATALOG.md's `folder` "" (the top level); an edge clients/acme.md → topics/rollout.md; no tag nodes |
| 2 | `mode` "both" | Tag nodes #client, #concept, #meeting, #stray-tag (`tag` true) and edges from pages to them |
| 3 | `obs checks '{"id":"acme-twin"}'` | `not_in_index` [notes/2026-01-08-weekly.md, topics/hostile.md]; `broken` [[clients/acme.md, "Pricing model"]]; `isolated` the same two pages; `no_props` [topics/hostile.md]; `unknown_tags` [[topics/hostile.md, "stray-tag"]]; `dead_rows` []; `no_index` false; `meeting_tag_missing` null |
| 4 | `(cd "$T" && git status --porcelain)` | Nothing changed |
