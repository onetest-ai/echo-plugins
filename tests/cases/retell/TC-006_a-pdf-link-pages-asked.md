---
id: TC-006
title: A PDF at a link: Echo downloads it and takes its text out; only the pages asked for are retold
priority: high
type: functional
requirements: [F-RT-05]
module: retell
run: agent
platform: any
data: standard
tags: [retell, pdf]
---

# TC-006: A PDF at a link: Echo downloads it and takes its text out; only the pages asked for are retold

## Preconditions
- The environment of TC-003

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Add `https://docs.acme-test.example/files/eval-guide.pdf` with "Pages of a PDF" `2` | Queued; then `ready` |
| 2 | Read its `source.json` and `fake-claude.log` | Page 2's words ("Chapter two…"), none of page 1's; a `doc` run with no tools |
