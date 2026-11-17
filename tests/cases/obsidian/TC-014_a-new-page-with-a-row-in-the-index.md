---
id: TC-014
title: A new page from the vault's template, named as its folder names pages, never over one that is there, with a row in the index's table for its folder
priority: high
type: functional
requirements: [F-OB-15, F-OB-20]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, new-page]
---

# TC-014: A new page with a row in the index

## Preconditions
- The environment from `up.sh` (Echo built from source), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`
- `T="$VAULTS/acme-twin"` (twin-shaped, its pages in `knowledge/`, a git repository), `W="$VAULTS/acme-wiki"` (its pages
  at its root, no git)

- TC-013 done (acme-twin as it was, `commit` off)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs new_page '{"id":"acme-twin","folder":"topics","title":"Pricing model","template":"page.md","index_row":true}'` | `{"path": "topics/pricing-model.md", "index": "added", "commit": "off", "pages": "knowledge"}` |
| 2 | `cat "$T/knowledge/topics/pricing-model.md"`; `grep -n 'pricing-model\|Last update' "$T/knowledge/CATALOG.md"` | The template filled: `title: Pricing model`, `date: <today>`, `# Pricing model`; the Topics table has `\| [pricing-model.md](topics/pricing-model.md) \| Pricing model \|` and the index says `Last update: <today>` |
| 3 | `obs new_page '{"id":"acme-twin","folder":"topics","title":"Pricing model"}'` | Fails "topics/pricing-model.md already exists" |
| 4 | `obs new_page '{"id":"acme-twin","folder":"ideas","title":"Q4: pricing","index_row":true}'`; `head -3 "$T/knowledge/ideas/q4-pricing.md"` | `index` "skipped: no “ideas” table in the index — add a section for it"; the page starts `---`, `title: "Q4: pricing"` (valid YAML) |
| 5 | `obs activity '{"id":"acme-twin"}'` | Newest first: a `new` line by `new-page` for knowledge/ideas/q4-pricing.md, then one for knowledge/topics/pricing-model.md with `also` ["knowledge/CATALOG.md"] |
| 6 | `(cd "$T" && git checkout -- knowledge/CATALOG.md && rm -r knowledge/ideas knowledge/topics/pricing-model.md)` | The vault as it was |
