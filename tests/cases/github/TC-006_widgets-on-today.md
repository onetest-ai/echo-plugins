---
id: TC-006
title: The three widgets on Today — repos failing first with what fails, CI's worst state opening the failing repo's Actions, the glance's numbers
priority: high
type: functional
requirements: [F-GH-07, F-GH-08, F-GH-09]
module: github
run: agent
platform: any
data: standard
tags: [github, widgets, today]
---

# TC-006: GitHub on Today

## Preconditions
- TC-005 done: picks acme-test and acme-labs/site

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl today add plugin:github:repos --size M`; `echoctl today add plugin:github:ci --size S`; `echoctl today add plugin:github:glance --size M`; open `{{base_url}}/#today` | Three widgets on Today |
| 2 | GitHub repos | Rows in this order: "acme-test/api — ✗ CI failing: deploy · 4 open PRs · 1 review for you", "acme-test/web — ● CI running · 2 open PRs · 1 review for you", "acme-test/docs — no CI · 0 open PRs", "acme-labs/site — ✓ CI passing · 1 open PR"; a "Refresh" action |
| 3 | GitHub CI | A red state, "CI", "1 failing: acme-test/api · deploy"; "Open" asks before opening https://github.com/acme-test/api/actions (cancel it) |
| 4 | GitHub at a glance | CI failing 1 (red), Open PRs 7 (acme-test's repos 4 + 2 + 0, and acme-labs/site's 1), Reviews for you 2 (amber) — match `echoctl widget show plugin:github:glance` |
| 5 | Resize: GitHub CI to M, GitHub repos to L (Edit, or `echoctl today size …`); switch the window to dark | Each drawn in each size, readable in light and dark |
