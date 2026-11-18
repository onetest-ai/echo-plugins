---
id: TC-018
title: A page typed in another case, or reached through a folder linked inside the vault, is that file: Echo reads, writes, asks git and commits it by its real name, never taking the user's uncommitted edits along
priority: critical
type: functional
requirements: [F-OB-22, F-OB-16]
module: obsidian
run: agent
platform: macos
data: standard
tags: [obsidian, knowledge, git, security]
---

# TC-018: Real names, never the name as typed

## Preconditions
- The environment from `up.sh` (Echo built from source), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`

- `T="$VAULTS/acme-twin"` connected (`ECHOCTL_PICK_FOLDER="$T" obs add '{"wait":true}'`); `obs set '{"id":"acme-twin","key":"commit","value":"on"}'`
- `knowledge/customers` in it is a link to `knowledge/clients`; the disk ignores case (macOS's default)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | The user's own edit: `printf 'My own line.\n' >> "$T/knowledge/clients/acme.md"`; `obs page '{"id":"acme-twin","path":"Clients/Acme.md"}'` | `path` "clients/acme.md" — its real name |
| 2 | `save_page` with `path` "Clients/Acme.md", that `base` and the text plus "Echo's line.\n"; `(cd "$T" && git log --format=%s -1; git status --porcelain)` | `commit` "skipped: the file had changes of yours that weren't committed"; no new commit (`git log -1` is the commit from before the save); ` M knowledge/clients/acme.md` |
| 3 | `obs history '{"id":"acme-twin","path":"CLIENTS/acme.md"}'`; `obs restore` with `path` "Clients/ACME.md" and that version | `path` "clients/acme.md"; the restore fails "clients/acme.md has changes that are not committed — …"; the page still has both lines |
| 4 | `obs page '{"id":"acme-twin","path":"customers/acme.md"}'`; `save_page` through `customers/acme.md` with its `base` | `path` "clients/acme.md"; the save's `commit` is "skipped: …" again; `git status --porcelain` names only knowledge/clients/acme.md |
| 5 | `obs new_page '{"id":"acme-twin","folder":"customers","title":"Beta"}'`; `ls -l "$T/knowledge/clients/beta.md"` | `path` "clients/beta.md"; a file in clients/; `commit` a commit id holding only knowledge/clients/beta.md (`git show --name-only --format=%s HEAD`) |
| 6 | `(cd "$T" && git checkout -- knowledge/clients/acme.md)`; `obs set '{"id":"acme-twin","key":"commit","value":"off"}'` | The user's edit undone (beta.md stays, committed) |
