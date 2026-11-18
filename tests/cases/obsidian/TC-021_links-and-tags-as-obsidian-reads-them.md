---
id: TC-021
title: Links and tags are read as Obsidian (and 0.8) reads them — none in comments, math or code spans; a heading's count; tags split from tags:; no tag after ( ; no link with a space in its bare address — by Claude's commands, pages, the graph and the checks alike
priority: high
type: functional
requirements: [F-OB-24, F-OB-12]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, links, tags]
---

# TC-021: Links and tags as Obsidian reads them

## Preconditions
- The environment from `up.sh`, `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`; `W="$VAULTS/acme-wiki"`
  connected (TC-008)
- A note as the user's Obsidian would write it: `printf -- '---\ntags: one, two #three\n---\n# Parity #heading-tag [[Ada Lovelace]]\n\nSee [[Decisions/Rollout by region]] %%%% [[Hidden]] #hidden %%%% and ``[[Code]]`` (#paren) [x](a b.md) [y](<People/Ada Lovelace.md>)\n<!-- [[Gone]] #gone -->\n$$ [[Math]] $$\n' > "$W/Parity.md"`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs info '{"vault":"acme-wiki","note":"Parity.md"}'`; `obs links '{"vault":"acme-wiki","note":"Parity.md"}'` | `tags` ["one", "two", "three", "heading-tag"] — no "hidden", "gone" or "paren"; `links_to` People/Ada Lovelace.md and Decisions/Rollout by region.md, `unresolved` []; `links`: "Ada Lovelace" line 4 (the heading's), "Decisions/Rollout by region" line 6, "People/Ada Lovelace.md" line 6 `markdown` — no Hidden, Code, Gone, Math or "a b.md" |
| 2 | `obs page '{"id":"acme-wiki","path":"People/Ada Lovelace.md"}'` | `backlinks`: Decisions/Rollout by region.md, and Parity.md with its line "Parity #heading-tag Ada Lovelace" |
| 3 | `obs graph '{"id":"acme-wiki","mode":"both"}'` | Tag nodes #decision, #heading-tag, #one, #three, #two (no #hidden, #gone, #paren); Parity.md's edges to those four tags, Decisions/Rollout by region.md and People/Ada Lovelace.md |
| 4 | `obs checks '{"id":"acme-wiki"}'` | `broken` [] — the commented, code and math links aren't links |
| 5 | `rm "$W/Parity.md"` | The vault as it was |
