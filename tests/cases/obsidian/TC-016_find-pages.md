---
id: TC-016
title: Find pages in a vault: by tag, then title, path and words in the text, a text hit with its line as plain text; the catalog's search without a vault as before
priority: medium
type: functional
requirements: [F-OB-17]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, find]
---

# TC-016: Find pages

## Preconditions
- The environment from `up.sh` (Echo built from source), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`
- `T="$VAULTS/acme-twin"` (twin-shaped, its pages in `knowledge/`, a git repository), `W="$VAULTS/acme-wiki"` (its pages
  at its root, no git)

- TC-008 done

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs find '{"id":"acme-twin","q":"acme"}'` | `hits` start with clients/acme.md (`hit` "title"), then text hits, among them notes/2026-01-01-kickoff.md with `line` "With Acme and Ada Lovelace." |
| 2 | `q` "control plane" | notes/2026-01-08-weekly.md, `hit` "text", `line` "The Control Plane ships in May." |
| 3 | `q` "#meeting" | The kickoff and the weekly note, `hit` "tag" |
| 4 | `q` "nothing-like-this"; `q` "   " | `hits` [] both |
| 5 | `obs find '{"q":"acme"}'` (no vault) | A list (the catalog of confirmed vaults; [] here, none confirmed) |
