---
id: TC-004
title: A page's pictures are saved with the article, shown in the original, and the block about one is marked from the picture itself
priority: high
type: functional
requirements: [F-RT-03]
module: retell
run: agent
platform: any
data: standard
tags: [retell, pictures]
---

# TC-004: A page's pictures are saved with the article, shown in the original, and the block about one is marked from the picture itself

## Preconditions
- TC-003's article is ready

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Read its `source.json` and `ls images/` | An `img` element with its `file` (`img1.png`) and alt "The loop: agent, tests, fixes"; the file is in `images/` |
| 2 | Read `script.json` and `fake-claude.log` | The block anchored to the picture has `highlights`; its `mark` run had one picture and no tools |
