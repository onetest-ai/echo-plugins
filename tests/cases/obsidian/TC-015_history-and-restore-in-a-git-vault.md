---
id: TC-015
title: In a vault in git: a save commits only that page when commit is on, the user's other changes left; a page's history and a version; a restore never over uncommitted changes, and is a new commit
priority: high
type: functional
requirements: [F-OB-16, F-OB-20]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, git]
---

# TC-015: History and restore in a git vault

## Preconditions
- The environment from `up.sh` (Echo built from source), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`
- `T="$VAULTS/acme-twin"` (twin-shaped, its pages in `knowledge/`, a git repository), `W="$VAULTS/acme-wiki"` (its pages
  at its root, no git)

- TC-014 done (acme-twin as it was)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs set '{"id":"acme-twin","key":"commit","value":"on"}'`; `printf 'my note\n' >> "$T/knowledge/notes/2026-01-08-weekly.md"` (the user's own change) | `commit` true |
| 2 | Read `base` of topics/rollout.md; `save_page` with "…See [[acme]].\nAPAC in 2027.\n"; `(cd "$T" && git log -1 --format='%s \| %an \| %cn <%ce>' --name-only; git status --porcelain)` | `commit` a commit id; the commit "Edit knowledge/topics/rollout.md" by Sam Rivera, committed by `Echo (obsidian) <obsidian@plugins.echo.invalid>`, holds only knowledge/topics/rollout.md; the weekly note is still ` M` |
| 3 | `obs history '{"id":"acme-twin","path":"topics/rollout.md"}'` | Two versions, newest first: "Edit knowledge/topics/rollout.md" (`echo` "obsidian"), "The twin, made up" (`echo` null); `path` "topics/rollout.md" |
| 4 | `obs version` with the older `rev` (its first 10 characters) | `text` ends "EU first, then the US. See [[acme]]."; `html` with the acme link routed; `added` 7, `removed` 0 |
| 5 | `printf 'my edit\n' >> "$T/knowledge/topics/rollout.md"`; `obs restore` with the older `rev`; `tail -1` of the page | Fails "topics/rollout.md has changes that are not committed — commit them first, or copy what you need from this version"; the page still ends "my edit" |
| 6 | `(cd "$T" && git checkout -- knowledge/topics/rollout.md)`; `obs restore` again; `obs history …` | A new `commit`; the page has no "APAC"; three versions, the newest "Restore knowledge/topics/rollout.md to <rev>" |
| 7 | `obs activity '{"id":"acme-twin"}'` | Newest first: the restore (`ref` the version, `commit` set), the save (`commit` set) |
| 8 | `(cd "$T" && git checkout -- knowledge/notes/2026-01-08-weekly.md)`; `obs set '{"id":"acme-twin","key":"commit","value":"off"}'` | The user's change undone; commit off |
