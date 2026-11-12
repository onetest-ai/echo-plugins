---
id: TC-015
title: A widget set to a thread shows that thread's repos; a thread with none says to add them in its Profile
priority: medium
type: functional
requirements: [F-GH-20]
module: github
run: agent
platform: any
data: standard
tags: [github, widgets, threads]
---

# TC-015: Widgets for a thread

## Preconditions
- TC-012 done (acme-rollout has acme-test/api, failing CI "deploy" in the fake)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl today set plugin:github:ci thread acme-rollout`; `echoctl widget show plugin:github:ci` | "1 failing: acme-test/api · deploy" (that thread's repo only) |
| 2 | `echoctl today set plugin:github:repos thread globex-pilot`; `echoctl widget show plugin:github:repos` | `items` [] and `empty` "No GitHub repos for this thread yet — add them in its Profile" |
| 3 | Edit Today → GitHub CI's ⚙ | A "Thread (its repos)" setting showing Acme rollout |
