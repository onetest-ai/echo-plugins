---
id: TC-031
title: Pages reads as #17 did — the tree and its filters, a page's properties, links routing inside the activity, a missing page to make, the web opened by Echo; the Links, Outline and History rails and the local graph
priority: critical
type: functional
requirements: [F-OB-31]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, pages]
---

# TC-031: A page read in the activity

## Preconditions
- The environment from `up.sh` (Echo built from source, its window served; `ECHOCTL_TEST_OPEN_LOG_ONLY` in its
  environment, so a link Echo opens is only logged), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`
- `T="$VAULTS/acme-twin"` (twin-shaped, its pages in `knowledge/`, a git repository); `<base_url>` the window `up.sh`
  printed; window steps with Playwright (headless Chromium, 1440×900), light and dark
- acme-twin and acme-wiki connected (`ECHOCTL_PICK_FOLDER="$VAULTS/<vault>" obs add '{"wait":true}'`; the fake Claude
  can't describe them: both `failed`), acme-twin the default vault for minutes, `minutes` auto, `commit` on
  (`obs default '{"id":"acme-twin"}'`, `obs set …`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `#obsidian:knowledge/acme-twin/pages` | The tree: clients, notes (open), topics folders with their counts, CATALOG.md marked "index", TAG_TAXONOMY.md; "N pages · sources and templates hidden"; the index opens ("CATALOG.md · the index") |
| 2 | `#obsidian:knowledge/acme-twin/pages/clients%2Facme.md` | The bar "clients / acme.md", Read · Edit, *Obsidian* (an `obsidian://` link), ⋯; the properties (tags: client); "Acme Corp"; links `2026-01-01-kickoff` and `the rollout` with `href="#obsidian:knowledge/acme-twin/pages/…"`; "Pricing model" dashed (Echo's `a.md-missing`, no href) |
| 3 | Click *the rollout* | The address `…/pages/topics%2Frollout.md`, "topics / rollout.md"; Back returns to acme.md |
| 4 | Click "Pricing model" | The *New page* sheet with "Pricing model" as its name, *In* the pages' top folder (a missing link's page is made there, not in clients); *Cancel* |
| 5 | The Links rail | *Linked from* 3 (Knowledge Catalog, Kickoff, Rollout by region, each with its line), *Links from this page* 3 (Pricing model "no such page — make it"), *Local graph* drawn |
| 6 | ⋯ of the page | *Show in Finder*, *Copy path*, *Ask about it*, *History* |
| 6a | *Show in Finder* | `<dir>/open.log` gains `reveal <$T>/knowledge/clients/acme.md` |
| 7 | Outline, then History | Outline: "Acme Corp"; History: "The twin, made up" by Sam Rivera, current |
| 8 | Find: type "rollout" | The tree lists the hits (title, path); Enter opens the first |
| 9 | `topics/hostile.md` | Its `<script>` and `<img onerror>` shown as text; *web* is a link with `data-ext` (Echo opens it; logged only); no `javascript:` or `file:` link |
