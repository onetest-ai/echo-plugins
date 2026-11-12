---
id: TC-008
title: A change on GitHub shows after Refresh — CI fixed turns the CI widget green, a new review shows on the glance
priority: high
type: functional
requirements: [F-GH-11, F-GH-08]
module: github
run: agent
platform: any
data: standard
tags: [github, refresh]
---

# TC-008: CI goes green

## Preconditions
- TC-006 done (CI red on Today)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `curl -s -X POST $FAKE_GITHUB/_state -d '{"repos": {"acme-test/api": {"ci": "SUCCESS", "failing": []}, "acme-test/web": {"ci": "SUCCESS"}}}'` | The fake's state answered |
| 2 | Press "Refresh" on GitHub CI | "All passing (3 repos)", green; GitHub repos: acme-test/api "✓ CI passing" |
| 3 | `curl -s -X POST $FAKE_GITHUB/_state -d '{"reviews": ["acme-test/api", "acme-test/web", "acme-labs/site"]}'`; `echoctl plugin call github refresh`; reload `#today` | Reviews for you 3 |
