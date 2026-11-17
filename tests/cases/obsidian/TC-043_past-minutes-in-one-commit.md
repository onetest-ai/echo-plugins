---
id: TC-043
title: Past minutes — the calls routed to a vault since a day, on its profile and not yet saved there, saved in one go with one commit; asked again, there are none
priority: medium
type: functional
requirements: [F-OB-46]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, minutes, git]
---

# TC-043: Past minutes in one commit

## Preconditions
- TC-042 done (my-twin the default vault, in git, commits on), `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs past_minutes '{"vault":"my-twin","since":"2026-11-14","dry":true}'` | `count` N > 0 and the `first` five (`call`, `title`, `date`): the calls since 2026-11-14 with minutes whose route is my-twin (not Acme rollout's, Globex pilot's or Acme renewal's), none saved there yet |
| 2 | `(cd "$VAULTS/my-twin" && git rev-list --count HEAD)` | The count before (B) |
| 3 | `obs past_minutes '{"vault":"my-twin","since":"2026-11-14"}'` | `saved` N, `commit` a commit's id |
| 4 | `(cd "$VAULTS/my-twin" && git rev-list --count HEAD; git log -1 --format='%cn \| %s'; git status --short)` | B + 1; `Echo (obsidian) \| Echo: minutes of N past calls`; nothing of Echo's left uncommitted (only the note the user changed in TC-042, ` M knowledge/notes/2026-11-13-initech-hiring-panel.md`) |
| 5 | `obs past_minutes '{"vault":"my-twin","since":"2026-11-14","dry":true}'` | `count` 0 |
| 6 | `obs past_minutes '{"vault":"my-twin","since":"last week"}'` | Fails "since: a day, YYYY-MM-DD" |
