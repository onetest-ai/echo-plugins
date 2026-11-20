---
id: TC-019
title: Installed from the onetest marketplace on a clean Windows and a clean macOS computer: the sheet, the first article from a link to its voice
priority: high
type: functional
requirements: [F-RT-21]
module: retell
run: person
platform: windows, macos
data: real
tags: [retell, install]
---

# TC-019: Installed from the onetest marketplace on a clean Windows and a clean macOS computer: the sheet, the first article from a link to its voice

## Preconditions
- A clean computer with Echo 0.10.3 or later and Claude Code signed in

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Settings → Plugins → Retell → Install | The sheet as in TC-001 |
| 2 | Set the speech server; add a link | The article retold and voiced; it plays |
