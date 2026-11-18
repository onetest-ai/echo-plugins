---
id: TC-030
title: Knowledge is the plugin's own activity — #17's header, switcher and tabs (Home, Pages, Graph, Ingest, Health, Settings; no Ask), its own routes, Home's cards, Echo's Settings section and ⌘K
priority: critical
type: functional
requirements: [F-OB-30, F-OB-36, F-OB-40, F-OB-62]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, activity]
---

# TC-030: The Knowledge activity and its tabs

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
| 1 | Open `<base_url>/#obsidian:knowledge` | The activity bar has Knowledge (a folder of notes icon), selected; the address becomes `#obsidian:knowledge/acme-twin/home` (the first vault, on Home) in place — no step in the window's history (TC-055); the header: "Knowledge", the switcher "acme-twin", the folder, "main · N pages", *Ask the vault*, *Add a source*, *New page*, ⋯ |
| 2 | The tabs | Home · Pages · Graph · Ingest · Health (with its number: the findings that need you) · Settings — no Ask |
| 3 | Home | *Ask acme-twin* card with *Ask the vault*; *What's new* with "The twin, made up" by Sam Rivera (a commit) and each page Echo wrote ("Edited in Echo", "New in Echo"); *Health* with the score ring, "code checks only", *Needs you* lines; *Coming in*: "1 source not processed yet" (files 1) with *Prepare changes*; *Most linked*: CATALOG.md "the index", clients/acme.md; the vault card (Folder, Pages knowledge/ · Obsidian, Index CATALOG.md, Git main, AI, Holds) |
| 4 | The switcher, then the ⋯ menu | The switcher lists acme-twin (★ minutes) and acme-wiki, *Connect a folder…*, *Start a new vault…*; ⋯: *Show in Finder*, *Open in Obsidian* (an `obsidian://open?path=…` link Echo opens), *Read the folder again*, *Vault settings* |
| 4a | ⋯ → *Show in Finder* | `$ECHOCTL_TEST_OPEN_LOG` (`<dir>/open.log`) gains `reveal <$T>` — Echo's `ctx.system.reveal`, nothing opened |
| 5 | Switcher → *Connect a folder…* | The sheet "Connect a folder", steps Folder · What Echo found · Meetings & AI, *Next* off until a folder is chosen |
| 5a | Only on a window served with `ECHOCTL_PICK_FOLDER="$VAULTS/home-notes"` in its environment (check: `ps eww -p $(cat <dir>/pid)` names it; else skip — *Choose…* would open the system's folder picker): *Choose…*, then *Cancel*; again *Choose…*, then Esc | Each time the folder shows in the sheet and is in `$ECHOCTL_CONFIG_DIR/plugins/grants/obsidian.json`; once the sheet closes it is given back (not in that file) |
| 5b | *Choose…*, *Next*, *Next*, *Connect* | *What Echo found* lists its pages; *Meeting minutes* defaults to "Save each call's minutes here automatically" (#17's default: saving works since step 4; the vault takes calls only once it is the default or set on a thread or client); "home-notes is connected — nothing in its folder changed.", the address `…/home-notes/home`; `<dir>/serve.log` has one more "pick: the folder picker asked" and no "add: the folder picker asked" — the picker was asked once, `add` took the folder picked |
| 6 | Switcher → *Start a new vault…*, a name, *Create* (*Pick or make a folder…* not pressed: the system's picker) | The sheet "Start a new vault": Name, Folder "no folder yet" with *Pick or make a folder…*, the twin starter's files ("23 files in a new folder."); *Create* says "Pick or make a folder for the vault first."; nothing is made in `$VAULTS` (TC-038 makes one) |
| 7 | Ingest | The first open's question ("1 file is already in raw_inbox/. Was it processed?", *Mark them done* · *Treat them as new*); *Mark them done*: the question goes and asks no more, `obs ingest_queue '{"id":"acme-twin"}'` holds the deck as done; *Add a source* opens #17's sheet (Files · A call or memo · Mail or Teams · A web page); *A web page* says how Echo reads it (a listed site at once, any other page through Echo's own box; read once; no JavaScript) — TC-059 adds one |
| 8 | `#settings/obsidian:main` | Settings → From plugins → Knowledge: *Vaults* — each with its folder, pages, git (acme-twin, though Claude couldn't describe it), minutes and AI profile, *Open*; *Connect a folder…*, *Start a new vault…*; *Open* on acme-twin goes to `#obsidian:knowledge/acme-twin/settings` |
| 9 | ⌘K, type "knowledge" | Knowledge's actions: *Connect a folder…*, *Start a new vault…*, *Find a page…*, *Ask the vault…*, *Add a source…*, *Prepare changes*, *Open Health*, *Run AI checks*, *Save the minutes to Knowledge…* |
| 10 | The page's console | No error from the plugin |

## Clean up
None (the next cases go on with this data).
