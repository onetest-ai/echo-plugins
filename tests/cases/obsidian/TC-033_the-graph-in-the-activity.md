---
id: TC-033
title: Graph draws #17's live graph — the whole vault coloured by folder with its legend, find, a page selected with its card and local graph, coloured by tag, isolated pages and the index hidden or shown
priority: high
type: functional
requirements: [F-OB-34]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, graph]
---

# TC-033: The graph in the activity

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
| 1 | `#obsidian:knowledge/acme-twin/graph` | A canvas with the pages and links; the controls card (Find, Colour by Folder · Tag, Local graph Off 1 2 3, *Hide index pages* on with "CATALOG.md links to most pages…", *Show isolated pages*, *Tags as nodes*); counts "N pages · N links · index hidden"; the legend by folder ("top level", notes/, topics/, clients/); zoom buttons |
| 2 | Find "acme corp", Enter | Acme Corp selected: its card (clients/acme.md, links out/in, tags, *Open page*, *Ask about it*, *Its local graph*) |
| 3 | Local graph 1 | Only Acme Corp and its neighbours |
| 4 | Colour by Tag | The legend by tag: #meeting, #client, #stray-tag, #concept, other or none |
| 5 | *Show isolated pages* off | The isolated pages leave the graph; the counts follow |
| 6 | *Open page* on the card | Pages opens clients/acme.md |
