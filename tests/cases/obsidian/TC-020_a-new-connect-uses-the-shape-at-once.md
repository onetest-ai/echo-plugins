---
id: TC-020
title: A vault connected in 1.0 uses the shape Echo found at once: its sources (Inbox) and templates aren't pages
priority: high
type: functional
requirements: [F-OB-23, F-OB-11]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, detect]
---

# TC-020: A new connect uses the shape at once

## Preconditions
- The environment from `up.sh` (Echo built from source), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`

- `N="$VAULTS/home-notes"` (Trips/Lisbon.md, Inbox/clip.md, templates/note.md), not connected

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `ECHOCTL_PICK_FOLDER="$N" obs add '{"wait":true}'`; `obs view` | home-notes with `structure` "confirmed", `detected.sources` "Inbox", `detected.templates` "templates", `detected.pages` "" |
| 2 | `obs tree '{"id":"home-notes"}'` | Only `Trips/Lisbon.md` — no Inbox/clip.md, no templates/note.md |
| 3 | `obs page '{"id":"home-notes","path":"Inbox/clip.md"}'`; `save_page` on it with its `base`; `obs page '{"id":"home-notes","path":"templates/note.md"}'` | The clipping is answered as a source, as it came (Ingest shows it so), never as a page: `source` true, `editable` false, `text` null, no links or backlinks; its save fails; the template fails "templates/note.md isn't a page of this vault" |
| 4 | `obs remove '{"id":"home-notes"}'` | `true` |
