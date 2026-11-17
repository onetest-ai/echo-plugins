---
id: TC-012
title: Paths never leave the vault: .., absolute paths, device names, dot folders, the sources and the templates are refused, read or written
priority: critical
type: functional
requirements: [F-OB-21]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, security]
---

# TC-012: Paths never leave the vault

## Preconditions
- The environment from `up.sh` (Echo built from source), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`
- `T="$VAULTS/acme-twin"` (twin-shaped, its pages in `knowledge/`, a git repository), `W="$VAULTS/acme-wiki"` (its pages
  at its root, no git)

- TC-008 done

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs page` on acme-twin with `path` "../acme-wiki/People/Ada Lovelace.md", "/etc/passwd", "../../config/plugins/x.md", "../.git/config", "../raw_inbox/deck.pdf" | Each fails "not a path in this vault" |
| 2 | `path` ".obsidian/app.json", "templates/page.md"; then "CON.md" | "… isn't a page of this vault"; "“CON.md” names a device on Windows" |
| 3 | `obs save_page '{"id":"acme-twin","path":"../AGENTS.md","text":"x","base":"<64 zeros>"}'`; `obs new_page '{"id":"acme-twin","folder":".obsidian","title":"X"}'`; `… "folder":"templates" …`; `… "folder":"topics","title":"X","template":"../../AGENTS"` | "not a path in this vault"; ".obsidian isn't a folder of pages"; "templates isn't a folder of pages"; "no template “../../AGENTS”" |
| 4 | `(cd "$T" && git status --porcelain)`; `cat "$T/AGENTS.md"` | Nothing changed: "# Rules for agents" |
