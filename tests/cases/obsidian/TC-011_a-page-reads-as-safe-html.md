---
id: TC-011
title: A page reads as safe HTML: links to pages route inside Echo, a missing page is marked, an image of the vault shows by its folder route, hostile markup stays text; with its links, backlinks and local graph
priority: critical
type: functional
requirements: [F-OB-13]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, page, security]
---

# TC-011: A page reads as safe HTML

## Preconditions
- The environment from `up.sh` (Echo built from source), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`
- `T="$VAULTS/acme-twin"` (twin-shaped, its pages in `knowledge/`, a git repository), `W="$VAULTS/acme-wiki"` (its pages
  at its root, no git)

- TC-008 done; `<base_url>` the window `up.sh` printed

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs page '{"id":"acme-twin","path":"clients/acme.md"}'` | `title` "Acme Corp", `tags` ["client"], `pages` "knowledge", `editable` true, `in_git` true, `in_index` true, a 64-hex `base`; `html` has `<a href="#brain/obsidian:pages/acme-twin/notes/2026-01-01-kickoff.md">2026-01-01-kickoff</a>`, `…/topics/rollout.md">the rollout</a>`, `<a class="md-missing" data-md-missing="Pricing model" …>` and `<img src="plugin/obsidian/folder/<the vault's folder, encoded>/knowledge/img/chart.png" …>`; no `title: Acme Corp` (the frontmatter isn't shown) |
| 2 | Same answer: `links`, `backlinks`, `local` | `links`: kickoff and rollout with their titles, "Pricing model" with `path` null; `backlinks`: CATALOG.md "acme.md · Acme Corp · 2026-01-02", the kickoff "With Acme and Ada Lovelace.", rollout "EU first, then the US. See acme." — plain text; `local` has 4 nodes, the page `me` |
| 3 | `curl -s -o /dev/null -w '%{http_code} %{content_type}' "<base_url>/<the img src of step 1>"` | `200 image/png` |
| 4 | `obs page '{"id":"acme-twin","path":"topics/hostile.md"}'` | `html` shows `&lt;script&gt;alert(1)&lt;/script&gt;` and `&lt;img src=x onerror=alert(1)&gt;` as text; "js" and "file" are plain words (no `javascript:` or `file:` href); `<a href="https://acme.example/plan" rel="noopener noreferrer">web</a>`; `<code>[[not a link]]</code>` with no link |
| 5 | `obs page '{"id":"acme-wiki","path":"Decisions/Rollout by region.md"}'` | `<a href="#brain/obsidian:pages/acme-wiki/People/Ada%20Lovelace.md">Ada Lovelace</a>`; `in_git` false; no `pages` key |
