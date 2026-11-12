---
id: TC-005
title: What to show — organisations and recent repos offered, picked as chips, any repo added by name, a missing one says why; nothing picked shows the repos pushed to last
priority: high
type: functional
requirements: [F-GH-05, F-GH-06]
module: github
run: agent
platform: any
data: standard
tags: [github, picks]
---

# TC-005: Picking organisations and repos

## Preconditions
- The environment from `up.sh`, signed in, nothing picked yet

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open `{{base_url}}/#settings/github:main` | Card "What to show": "Shown on Today" — "Nothing picked: Today shows the 10 repos you pushed to last."; "Your organisations" — "+ acme-test · 3 repos", "+ acme-labs · 2 repos"; "Repos you worked on lately" — "+ acme-test/api" first, then acme-test/web, acme-labs/site, ada-acme/notes, acme-test/docs …, and "+ Another repo or organisation"; the list under "GitHub, as Echo last read it" holds those repos |
| 2 | Click "+ acme-test · 3 repos" | A chip "acme-test ×" under "Shown on Today"; acme-test no longer offered; the read list: acme-test/api (CI failing: deploy), acme-test/web, acme-test/docs |
| 3 | "+ Another repo or organisation", type `acme-labs/site`, Enter | A chip "acme-labs/site ×"; the list adds acme-labs/site, "✓ CI passing" |
| 4 | Add `acme-test/gone` the same way | A chip "acme-test/gone ×" and "⚠ acme-test/gone — not found, or your sign-in can’t see it" |
| 5 | Add `not a repo` | The section says "not a repo or an organisation: not a repo (write owner/repo, or an organisation’s name)"; no chip |
| 6 | Click × on "acme-test/gone" | The chip and its warning are gone |
| 7 | `echoctl plugin call github status` | `picks` ["acme-test", "acme-labs/site"] |
