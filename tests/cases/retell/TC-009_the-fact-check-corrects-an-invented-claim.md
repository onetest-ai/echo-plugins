---
id: TC-009
title: The fact check reports a claim the article never makes and corrects the block before it is voiced
priority: medium
type: functional
requirements: [F-RT-10]
module: retell
run: agent
platform: any
data: standard
tags: [retell, factcheck]
---

# TC-009: The fact check reports a claim the article never makes and corrects the block before it is voiced

## Preconditions
- Setting "factcheck" is fix (its default)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Add `https://docs.acme-test.example/posts/fact-trap.html`; wait until ready | `ready` |
| 2 | Read `factcheck.json` and `script.json` | An issue (`unsupported`, `applied: true`) for "…ninety percent…"; no block says it any more |
| 3 | `fake-claude.log`, this article's runs | One `check` run (it rewrote the block itself, `fixed.json`): no run per block |
