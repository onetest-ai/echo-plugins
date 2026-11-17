---
id: TC-032
title: A page edited in the activity — the live preview, a save committed, a change on disk while editing shown as #17's conflict (Compare, Take theirs, Keep mine) with the typed text kept, a new page, a row in the index; its history, a version and Restore
priority: critical
type: functional
requirements: [F-OB-32, F-OB-33]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, pages, git]
---

# TC-032: A page edited, its conflict and its history

## Preconditions
- The environment from `up.sh` (Echo built from source, its window served; `ECHOCTL_TEST_OPEN_LOG_ONLY` in its
  environment, so a link Echo opens is only logged), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`
- `T="$VAULTS/acme-twin"` (twin-shaped, its pages in `knowledge/`, a git repository); `<base_url>` the window `up.sh`
  printed; window steps with Playwright (headless Chromium, 1440×900), light and dark
- acme-twin and acme-wiki connected (`ECHOCTL_PICK_FOLDER="$VAULTS/<vault>" obs add '{"wait":true}'`; the fake Claude
  can't describe them: both `failed`), acme-twin the default vault for minutes, `minutes` auto, `commit` on
  (`obs default '{"id":"acme-twin"}'`, `obs set …`)
- `(cd "$T" && git status --porcelain)` empty (`git checkout -- <file>` to undo a step's change)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | acme.md → *Edit*, type a line at the end | "Editing clients/acme.md · not saved"; the preview beside follows within a second, its `[[links]]` as links; *Message* "Edit clients/acme.md"; "Save writes the file and commits only this file on main." |
| 2 | Wait 3 s (Echo redraws meanwhile) | The typed text, the caret and the scroll stay |
| 3 | *Save* | "Saved and committed (<id>)."; the reader shows the line; `git -C "$T" log -1 --format=%s` "Edit clients/acme.md" |
| 4 | *Edit* again, type a line; then `printf '\nA line added outside Echo.\n' >> "$T/knowledge/clients/acme.md"`; wait 2 s (or *Save* at once) | The banner "This page changed on disk while you were editing (<time now>). Your text isn't saved yet." with *Compare*, *Take theirs*, *Keep mine* — within Knowledge's 2 s look at the vault, or on *Save*; *Save* off then; the typed text still there |
| 5 | *Compare* | The line diff: "− only in your text · + only on disk", the typed line −, the outside line + |
| 6 | *Keep mine* → *Save mine* | Saved over the change; "Saved. Not committed: …" (the file had changes git hasn't got) — said once |
| 7 | History rail | Two versions; click the older one: "version of <date>", its diff, *Restore this version* |
| 8 | *Restore this version* → *Restore* | Refused: "clients/acme.md has changes that are not committed — commit them first, or copy what you need from this version"; the file as it was |
| 9 | `git checkout -- knowledge/clients/acme.md` in `$T`; History → the older version → *Restore* | "Restored, in a new commit."; a commit "Restore knowledge/clients/acme.md to <id>" |
| 10 | Header *New page*: "Pricing model", *Create page* (Add a row to the index ticked) | The page opens in the editor at `…/pages/Pricing%20model.md`; CATALOG.md has its row; Home's *What's new* lists it "New in Echo" |
| 11 | notes/2026-01-08-weekly.md → the rail's "Not in the index — … *Add a row…*" | The *Add to the index* sheet: its row under "Notes", "1 of 1 will be added"; *Add 1 row* → "1 row added to the index and committed." |
