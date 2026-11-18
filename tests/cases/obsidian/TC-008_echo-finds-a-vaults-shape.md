---
id: TC-008
title: Echo finds a vault's shape when it is connected and when asked to read it again, the user's change kept, nothing written
priority: high
type: functional
requirements: [F-OB-11]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, detect]
---

# TC-008: Echo finds a vault's shape

## Preconditions
- The environment from `up.sh` (Echo built from source), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`
- `T="$VAULTS/acme-twin"` (twin-shaped, its pages in `knowledge/`, a git repository), `W="$VAULTS/acme-wiki"` (its pages
  at its root, no git)

- Before: `(cd "$T" && git status --porcelain)` is empty

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `ECHOCTL_PICK_FOLDER="$T" obs add '{"wait":true}'`; `obs view` | `{"id": "acme-twin"}`; its `detected`: `pages` "knowledge", `index` "knowledge/CATALOG.md", `notes` "knowledge/notes", `naming` "{date}-{slug}.md", `templates` "knowledge/templates", `sources` "raw_inbox", `taxonomies` ["knowledge/TAG_TAXONOMY.md"], `schema` ["AGENTS.md"], `skills` [ingest, kind "skill", "Adds a source to the vault"], `obsidian.markdown_links` true, `md_files` 7, `notes_count` 2 |
| 2 | `ECHOCTL_PICK_FOLDER="$W" obs add '{"wait":true}'`; `obs view` | acme-wiki's `detected`: `pages` "" (its root), `index` null, `obsidian` there (an `.obsidian` folder) with `strict_line_breaks` false |
| 3 | `obs set '{"id":"acme-twin","key":"index","value":"knowledge/notes"}'`; then `value` "knowledge/TAG_TAXONOMY.md"; `obs reread '{"id":"acme-twin"}'` | The first fails "“knowledge/notes” isn't a file"; the second answers `overrides.index` "knowledge/TAG_TAXONOMY.md"; after *Read again* `overrides.index` is still that and `detected.index` "knowledge/CATALOG.md" |
| 4 | `obs set '{"id":"acme-twin","key":"index","value":""}'`; `(cd "$T" && git status --porcelain)`; `ls -a "$T" "$W"` | The override is gone; git shows no change, and no file was added to either vault |

## Expected Final State
Both vaults connected and detected; neither vault changed.
