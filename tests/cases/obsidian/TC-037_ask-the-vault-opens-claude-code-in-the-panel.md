---
id: TC-037
title: "Ask the vault" opens Claude Code in Echo's panel, in the vault — its own tab "Claude · Knowledge" at the vault's root as its project, the profile and permissions named; Echo types nothing into it
priority: critical
type: functional
requirements: [F-OB-38]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, claude]
---

# TC-037: Ask the vault opens Claude Code in the panel

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
| 1 | Home → *Ask the vault* (the header's, Home's card, Settings → Ask, Health's *Ask about it*, the page menu's *Ask about it*, ⌘K *Ask the vault…*) | Echo's bottom panel opens on its tab "Claude · Knowledge": "Knowledge · Claude Code in <$T>, as that folder's own project — it reads only; asks each time · <profile>"; with the test's fake Claude the session ends at once ("The session ended. Resume …") |
| 2 | Never type into it | — |
| 3 | ⌘K | "New conversation in Claude · Knowledge" and "Restart Claude · Knowledge" are there |
| 4 | *Ask about it* on a page | The same tab, and the notice "Ask Claude in the panel about <title> (<path>)." |
