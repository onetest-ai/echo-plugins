---
id: TC-016
title: A deleted thread takes its GitHub repos, its hint and its Work rows with it
priority: medium
type: functional
requirements: [F-GH-16, F-GH-19]
module: github
run: agent
platform: any
data: standard
tags: [github, threads]
---

# TC-016: Thread deleted

## Preconditions
- TC-012–TC-015 done

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl project delete acme-rollout` | "acme-rollout moved to the trash" |
| 2 | `echoctl plugin call github threadRepos '{"thread":"acme-rollout"}'`; `echoctl work show --thread acme-rollout` | `[]`; `work show` says there is no such thread (no project "acme-rollout") |
| 3 | `echoctl plugin call github refresh`; `cat "$ECHOCTL_CONFIG_DIR/plugins/hints/github.json"` | No hint for acme-rollout |
