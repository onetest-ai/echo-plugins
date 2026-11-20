---
id: TC-009
title: The fact check grounds every statement, finds a claim the article never makes and a point the retelling misses, fixes and completes it, and checks again before it is voiced
priority: medium
type: functional
requirements: [F-RT-10]
module: retell
run: agent
platform: any
data: standard
tags: [retell, factcheck]
---

# TC-009: The fact check finds an invented claim and a missed point, fixes and completes the retelling, and checks again before it is voiced

## Preconditions
- Setting "factcheck" is fix (its default)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Add `https://docs.acme-test.example/posts/fact-trap.html`; wait until ready | `ready` |
| 2 | Read `factcheck.json` and `script.json` | An issue (`invented`, `applied: true`) for "…ninety percent…"; no block says it any more |
| 3 | `script.json`, `factcheck.json` | A block "Added: the page makes a second point." anchored to an element of the page; `added` lists it; `rounds` has two checks, the second with no issues |
| 4 | `fake-claude.log`, this article's runs | check, fix, check — in that order; no run per block |
