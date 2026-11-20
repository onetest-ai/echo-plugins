---
id: TC-021
title: An empty or climbing id is refused before anything is removed; an index that can't be read is kept aside and no article folder is swept for being unknown to it
priority: high
type: functional
requirements: [F-RT-23]
module: retell
run: agent
platform: any
data: standard
tags: [retell, store, failure]
---

# TC-021: Ids are checked, and a broken index never sweeps the articles

## Preconditions
- The environment of TC-020 (articles ready); this case may write `$S/index.json` itself (steps 3 and 5)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | In the window's page: `fetch('/api/plugin/retell/call/delete', {method: 'POST', body: JSON.stringify({args: {id: ''}})})` | Refused ("Which article?"); `ls $S/articles` unchanged |
| 2 | The same with `{id: '../index.json'}`, then `qa_delete` with `{id: '<an article>', qid: '../../index'}` | Each refused ("Not a valid …"); `index.json` and every article folder still there |
| 3 | `cp $S/index.json <dir>/index.good`; write `{"articles": [` (cut short) to `$S/index.json`; in the page call `cleanup` | Answers; `$S/index.broken-<ms>.json` holds the cut text; `ls $S/articles` lists every folder it listed before |
| 4 | `cat <dir>/serve.log` | "index.json could not be read: a copy is kept …" |
| 5 | `cp <dir>/index.good $S/index.json`; restart the window's Echo (`down.sh` is not run: stop and start `echoctl window --serve` as up.sh does); Library | Every article listed as before |
