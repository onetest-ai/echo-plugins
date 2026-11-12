---
id: TC-014
title: A thread's Work tab has its repos' open pull requests and issues, with GitHub's icon; another thread's doesn't
priority: high
type: functional
requirements: [F-GH-19]
module: github
run: agent
platform: any
data: standard
tags: [github, work, threads]
---

# TC-014: GitHub in a thread's Work

## Preconditions
- TC-012 done (acme-rollout has acme-test/api; the fake's acme-test/api has PRs #7 "Fix login", #8 "WIP: cache" (draft) and issue #21)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl work show --thread acme-rollout` | Rows `pr:acme-test/api#7` (PR), `pr:acme-test/api#8` (draft PR), `issue:acme-test/api#21` (issue, late) — each once |
| 2 | Open `{{base_url}}/#project/acme-rollout/work`, wait up to 10 s | Under the bar: "Fix login", "WIP: cache", "Flaky test <b>" with GitHub's mark, once each; still there in the Tree layout |
| 3 | `echoctl work show --thread globex-pilot`; open its Work tab | No GitHub row |
