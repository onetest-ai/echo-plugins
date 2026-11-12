---
id: TC-004
title: The sign-in is never shown, kept or logged — not in the section, the plugin's answers, its store or Echo's log
priority: critical
type: functional
requirements: [F-GH-04]
module: github
run: agent
platform: any
data: standard
tags: [github, signin, privacy]
---

# TC-004: The token stays secret

## Preconditions
- The environment from `up.sh`, signed in; GitHub read at least once (TC-002)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `T=$(cat "$FAKE_GH_TOKEN_FILE")`; `grep -rlF "$T" "$ECHOCTL_HOME" "$ECHOCTL_CONFIG_DIR" <dir>/serve.log` | Nothing found (exit 1): the token is in no file of Echo's or the plugin's, and not in the log |
| 2 | `echoctl plugin call github status \| grep -cF "$T"`; the same for `echoctl widget show plugin:github:repos`, `…:ci`, `…:glance`, and `echoctl plugin call github discover` | 0 every time |
| 3 | The section `#settings/github:main`: search the page's snapshot for the token | Not there |
