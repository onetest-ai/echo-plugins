---
id: TC-034
title: Health shows the code checks' findings by group and kind with #17's score, trend and filters; a finding with its pages and Ignore; fixes, Fix all and the AI checks say they aren't in this version yet
priority: high
type: functional
requirements: [F-OB-35, F-OB-41]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, health]
---

# TC-034: Health in the activity

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
| 1 | `#obsidian:knowledge/acme-twin/health` | The score card (the ring, "code checks only", the trend "The trend starts today: one point a day.", Links · Index · Properties · Consistency bars); *How Health checks* (By code "always"; AI checks "when you ask · <profile> · not run yet", *Run AI checks*) |
| 2 | The findings | Needs you: Tags not in the taxonomy (#stray-tag); Should fix: Not in the index, Broken links ([[Pricing model]] leads to no page), Without properties; Tidy: Pages with no links; filters All · Needs you · By code · AI |
| 3 | *Not in the index* | Its findings ("Hostile isn't in CATALOG.md" …), each page with *Open*; the reason "Health's fixes and AI checks aren't in this version of Knowledge yet."; *Ask about it*, *Ignore* |
| 4 | *Fix all* (when a kind shows it) | The sheet says the same; nothing written |
| 5 | *Run AI checks* | "Not started: Health's fixes and AI checks aren't in this version of Knowledge yet." |
| 6 | *Ignore* | "Ignored: it no longer counts. Show ignored lists it."; the tab's number and the score follow; *Show ignored (1)* lists it with *List again* |
| 7 | `obs health '{"id":"acme-twin"}'` | The same findings and score; `history` one point for today |
| 8 | `(cd "$T" && git status --porcelain)` | Nothing changed by Health |
