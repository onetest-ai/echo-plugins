---
id: TC-016
title: A page that is gone puts its article in error with why; the next one in the queue is retold
priority: high
type: functional
requirements: [F-RT-18]
module: retell
run: agent
platform: any
data: standard
tags: [retell, failure, queue]
---

# TC-016: A page that is gone puts its article in error with why; the next one in the queue is retold

## Preconditions
- The speech server up

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Add both, one per line: `https://docs.acme-test.example/posts/gone.html` and `…/posts/limits.html` | Two articles queued |
| 2 | Wait | The first in error: "Echo could not read the page: … 404 …"; the second `ready` |
