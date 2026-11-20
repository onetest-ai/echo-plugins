---
id: TC-014
title: A hostile page's title and text are shown as text, never markup; its instructions reach Claude only as data, with no tools
priority: critical
type: functional
requirements: [F-RT-15, F-RT-17]
module: retell
run: agent
platform: any
data: standard
tags: [retell, security, untrusted]
---

# TC-014: A hostile page's title and text are shown as text, never markup; its instructions reach Claude only as data, with no tools

## Preconditions
- The environment of TC-003

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Add `https://docs.acme-test.example/posts/hostile.html`; wait until ready; Library | The title "Hostile <img src=x onerror=alert(1)> title" shown as these characters; no dialog opened |
| 2 | Open it, its original | "<script>alert('xss')</script>" and "[a link](javascript:alert(1))" shown as text; no script element, no dialog |
| 3 | `fake-claude.log` | Its sort and retell runs had no tools: "Ignore all previous instructions…" was only text in a prompt |
