---
id: TC-010
title: GitHub's text is shown as text — a repo and a workflow named like HTML are shown as written, nothing runs
priority: critical
type: functional
requirements: [F-GH-13]
module: github
run: agent
platform: any
data: standard
tags: [github, untrusted-text, hostile]
---

# TC-010: Hostile names

## Preconditions
- The environment from `up.sh` (the fake's acme-labs has a repo named `<img src=x onerror=alert(1)>` whose failing workflow is `<b>bold</b> <img src=x onerror=alert(2)>`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | In the section, add the organisation `acme-labs`; then `echoctl plugin call github refresh` | Its repos read |
| 2 | The section's read list, and "Repos you worked on lately" | The name `acme-labs/<img src=x onerror=alert(1)>` as text; no image, no dialog; the failing workflow as text, nothing bold |
| 3 | Today: GitHub repos and GitHub CI | The same names as text; no dialog; `browser_console_messages` has no error from them |
