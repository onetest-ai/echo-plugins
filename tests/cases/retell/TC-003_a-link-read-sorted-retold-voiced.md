---
id: TC-003
title: A link: Echo reads the page, Claude sorts out the article and retells it with no tools, the voice is made, the article plays
priority: critical
type: functional
requirements: [F-RT-02, F-RT-08, F-RT-17]
module: retell
run: agent
platform: any
data: standard
tags: [retell, add, retell, voice]
---

# TC-003: A link: Echo reads the page, Claude sorts out the article and retells it with no tools, the voice is made, the article plays

## Preconditions
- TC-002 left the speech server up

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Library → Add, `https://docs.acme-test.example/posts/agent-evals.html`, Add to the queue | The hint says Echo reads each link; the article is in the queue (`index.json`: `queued`, then `fetching`) |
| 2 | Wait (≤ 10 min) | Its status goes through writing and voicing to `ready`; its title "Evaluating agents" |
| 3 | Read `$S/articles/<id>/source.json` | Its elements are the article's own (headings, paragraphs, a list, a picture); no "Subscribe to our newsletter", no "Related posts" |
| 4 | Read `script.json` | Blocks b1…, each `anchor` an id of `source.json` |
| 5 | Read `<dir>/fake-claude.log` | Runs of kinds sort, retell, memo, check, terms (and mark) — every one with `"tools": ""` |
| 6 | `ls $S/articles/<id>/audio` | An MP3 per block |
| 7 | Open it (Listen) | The player: the retelling ("Retold: …") with its words lit as it plays, the original "Evaluating agents" beside it |
