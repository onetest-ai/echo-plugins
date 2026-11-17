---
id: TC-035
title: A vault's Settings tab — 0.8's "What Claude knows" (its state, the When-line and the five parts changed in place, read again) and "For whom", then #17's Structure, Meeting minutes, Ingest, Ask, Schema, Skills and Git & AI; a setting kept; Remove asks first
priority: critical
type: functional
requirements: [F-OB-37, F-OB-38]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, settings, description]
---

# TC-035: A vault's Settings with What Claude knows

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
| 1 | `#obsidian:knowledge/acme-twin/settings` | The nav: What Claude knows, Structure, Meeting minutes, Ingest, Ask, Schema & vocabulary, Skills, Git & AI, Health →, Remove from Echo…; *What Claude knows* first: "It couldn't be read. … a fake here" with *Try again* (the fake Claude); *For whom* "Yours — no client or thread yet." with *Add a client or thread…*; *What Echo read* with *Read it again*; the When-line and the five parts, each with *Change* or *Write it* |
| 2 | *Write it* on *What it is*, type, wait 3 s, *Save* | The field keeps the text while Echo redraws; saved: the row shows it; `obs view` has it in the vault's `description.what`; Claude's entry is rebuilt (TC-002) |
| 3 | *Add a client or thread…* → a client | A chip with its name and ×; `obs view`'s `belongs` has it; × takes it away |
| 4 | `obs confirm '{"id":"acme-twin"}'` after a When-line; reload | The banner is gone (ready) |
| 5 | The nav's sections in turn | Structure (Name, Pages live in knowledge, Index, Meeting notes, Sources, *Read again*); Meeting minutes (Automatically · Only when I ask · Never, As, Also include, Preview); Ingest (the skill, the new calls' rule); Ask (*Ask the vault*); Schema (AGENTS.md, TAG_TAXONOMY.md *Open*); Skills (ingest, *Run in Claude*, the twin starter row); Git & AI (main, *Commit what Echo writes*, AI profile, Echo's index) |
| 6 | *Commit what Echo writes* off, then on | Each kept (`obs view`'s `commit`) |
| 7 | *Remove from Echo…* → *Keep it* | The sheet "Remove acme-twin from Echo?" says the folder stays; *Keep it* keeps the vault |
| 8 | *Run in Claude* on a skill | Claude Code opens in Echo's panel (TC-037); "/<skill> is copied: paste it in Claude." |
