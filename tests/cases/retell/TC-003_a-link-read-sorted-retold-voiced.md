---
id: TC-003
title: A link: Echo reads the page, Claude sorts out the article with no tools, writes and checks it in runs on files with file tools only, the voice is made, the article plays
priority: critical
type: functional
requirements: [F-RT-02, F-RT-08, F-RT-17]
module: retell
run: agent
platform: any
data: standard
tags: [retell, add, retell, voice]
---

# TC-003: A link: Echo reads the page, Claude sorts out the article with no tools, writes and checks it in runs on files with file tools only, the voice is made, the article plays

## Preconditions
- TC-002 left the speech server up

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Library → Add, `https://docs.acme-test.example/posts/agent-evals.html`, Add to the queue | The hint says Echo reads each link; the article is in the queue (`index.json`: `queued`, then `fetching`) |
| 2 | Wait (≤ 10 min) | Its status goes through writing and voicing to `ready`; its title "Evaluating agents" (the page's own, kept after the retelling is written) |
| 3 | Read `$S/articles/<id>/source.json` | Its elements are the article's own (headings, paragraphs, a list, a picture); no "Subscribe to our newsletter", no "Related posts" |
| 4 | Read `script.json` | Blocks b1…, each `anchor` an id of `source.json` |
| 5 | Read `<dir>/fake-claude.log` | This article's runs are sort, write, memo, check (fix and check again only when the check flagged something), termsf (and mark): sort and mark with `"tools": ""`; the others with `"tools": "Read,Write,Edit,Glob,Grep"`, `"mode": "dontAsk"`, `"skip": false`. write's `cwd` is `$S/articles/<id>` (its `files` hold `source.txt` and `images`), the others' a folder of `$S/work/` (memo: `["source.txt"]`; check: `["memo.txt", "retelling.txt", "source.txt"]`; termsf: `["retelling.txt", "source.txt"]`). `factcheck.json` has `rounds`. After it's ready `$S/work` is empty and `$S/articles/<id>` holds no `source.txt` or `retelling.json`. `ls $S/work` is empty after it's ready; `terms.json` `ready` |
| 6 | `ls $S/articles/<id>/audio` | An MP3 per block |
| 7 | Open it (Listen) | The player, Side by side: ORIGINAL ("What an evaluation is", the picture, "Figure 1: the loop.") beside RETELLING · CLICK A BLOCK TO PLAY FROM IT ("Retold: …" blocks); ▶ plays it, its words lit |
