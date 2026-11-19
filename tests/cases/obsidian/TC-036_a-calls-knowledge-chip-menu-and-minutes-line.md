---
id: TC-036
title: A call's page shows Knowledge in Echo's generic slots — its chip says where its minutes go and its menu chooses (call.header), the ⋯ menu's Save to Knowledge… opens the save sheet over the call (call.menu, ctx.ui.sheet) and saves, and the minutes' line while they come names the vault (call.minutes)
priority: high
type: functional
requirements: [F-OB-39, F-OB-43]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, call]
---

# TC-036: A call's Knowledge chip, menu and minutes line

## Preconditions
- The environment from `up.sh` (Echo built from source, its window served; `ECHOCTL_TEST_OPEN_LOG_ONLY` in its
  environment, so a link Echo opens is only logged), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`
- `T="$VAULTS/acme-twin"` (twin-shaped, its pages in `knowledge/`, a git repository); `<base_url>` the window `up.sh`
  printed; window steps with Playwright (headless Chromium, 1440×900), light and dark
- acme-wiki connected first, then acme-twin (`ECHOCTL_PICK_FOLDER="$VAULTS/<vault>" obs add '{"wait":true}'`; the fake Claude
  can't describe them: both `failed`), acme-twin the default vault for minutes, `minutes` auto, `commit` on
  (`obs default '{"id":"acme-twin"}'`, `obs set …`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `#call/<a call with minutes, e.g. 2026-11-16_143000-guest-call-7>/notes` (its threads have no vault: the default, acme-twin) | On its header, before My notes and ⋯: a chip "Minutes → acme-twin ▾" |
| 2 | `obs call_knowledge '{"call":{"name":"<the call>","threads":["initech-hiring","internal-tooling"],"client":null,"profile":null,"notes":true}}'` | No `later`; `vaults` acme-twin and acme-wiki (each with its mode and profile); `targets` acme-twin (the default vault, automatic, the call's profile); `record` `{saved: [], choice: null}`; `stale` []; `failure` null |
| 3 | The chip | Its menu: "Save this call's minutes to", acme-twin checked ("automatically"), acme-wiki, "Don't save this call" |
| 4 | ⋯ of the call → *Save to Knowledge…* (Knowledge's group, after a separator, above Delete) | Echo's sheet over the call: "Save the minutes to Knowledge", the vault acme-twin — where the call's minutes go, though acme-wiki was connected first — *As* `knowledge/notes/` + the call's dated name, its index row as it will be written, Minutes / Transcript / Chat, "Commits only this note, the index row and its people's pages on `main`" (acme-twin is Automatic: the participants' person pages come along, TC-069) |
| 5 | *Save* | The chip reads "In acme-twin ↗"; the note is in `$T/knowledge/notes/`, a row in `$T/knowledge/CATALOG.md`, one commit `Echo: minutes of "<title>" (<date>) → knowledge/notes/` holding the note, `knowledge/CATALOG.md` and its participants' person pages (`knowledge/people/Guest 7.md`) |
| 5a | The call's thread set to acme-wiki, whose minutes are Ask (`obs thread_vault '{"thread":"initech-hiring","vault":"acme-wiki"}'`); the call's page reloaded → ⋯ → *Save to another vault…* (the call is saved already); *Cancel*; then `obs thread_vault '{"thread":"initech-hiring","vault":null}'` | The sheet opens on **acme-wiki** — where the call belongs though it asks — not acme-twin, where it is saved, nor another vault; nothing written |
| 6 | A call whose minutes are coming (today's "Globex standup" in the standard data) | Echo's box says they are coming, with Knowledge's line "Then saved to **acme-twin**, with a row in the index." |
| 7 | `obs call_choice '{"call":"<the call>","vault":"none"}'`; the call renamed as Echo does it (`echoctl title <the call> "Guest call renamed"`: its folder's stamp kept); `obs call_knowledge` with its new folder name | `record.choice` "none" for both — a call is known by its stamp: `$ECHOCTL_HOME/.echo/plugins/obsidian/calls/<stamp>.json` (a made-up name with the same stamp isn't the call: Echo names the stamp's call, TC-056) |
| 8 | `obs call_knowledge '{"call":{"name":"<the call>","threads":[],"client":null,"profile":"other","notes":false}}'` | `targets` [] — a call on another AI profile never goes by itself |
