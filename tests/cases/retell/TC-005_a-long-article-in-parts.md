---
id: TC-005
title: A long article is cut into parts in one topic, each retold and fact checked within one Claude run
priority: high
type: functional
requirements: [F-RT-04]
module: retell
run: agent
platform: any
data: standard
tags: [retell, parts]
---

# TC-005: A long article is cut into parts in one topic, each retold and fact checked within one Claude run

## Preconditions
- The environment of TC-003

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Add `https://docs.acme-test.example/posts/long-guide.html` | Soon its title is "The long guide to agent evaluation · part 1 of n" and parts 2…n are queued in the same topic |
| 2 | Wait until all are ready; read each part's `source.json` | Every part `ready`; each part's text 15,000 characters or less; each a `factcheck.json`; no "Too long for one Claude run" |
| 3 | Library | A topic "The long guide to agent evaluation" holding the parts in order |
