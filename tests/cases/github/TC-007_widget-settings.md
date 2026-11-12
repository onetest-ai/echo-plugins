---
id: TC-007
title: Each widget's settings pick what it shows — open issues on, PRs off
priority: medium
type: functional
requirements: [F-GH-10]
module: github
run: agent
platform: any
data: standard
tags: [github, widgets]
---

# TC-007: Widget settings

## Preconditions
- TC-006 done

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl today set plugin:github:repos issues true`; `echoctl today set plugin:github:repos prs false`; reload `#today` | GitHub repos rows: "acme-test/api — ✗ CI failing: deploy · 1 review for you · 9 open issues", no "open PRs" on any row |
| 2 | Edit Today → GitHub repos' ⚙ | CI on, Open pull requests off, Reviews for you on, Open issues on |
| 3 | `echoctl today set plugin:github:glance issues true` | The glance shows four numbers, the fourth "Open issues" |
