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
| 3 | `cp $S/index.json <dir>/index.good`; write `{"articles": [` (cut short) to `$S/index.json`; in the page call `cleanup`, then `list` | `cleanup` answers 0; `list` has no articles; `$S/index.broken-<ms>.json` holds the cut text; `$S/index.json` still the cut text; `ls $S/articles` lists every folder it listed before |
| 4 | In the page call `start` with `{url: 'https://docs.acme-test.example/posts/limits.html'}` | Refused: "Retell's list of articles (index.json in its data) can't be read …"; `$S/index.json` unchanged |
| 5 | `echoctl plugin call retell list`; then restart the window's Echo (stop and start `echoctl window --serve` as up.sh does) | Both load Retell with the index still cut: `$S/index.json` still the cut text, every article folder still there |
| 6 | `cat <dir>/serve.log` | "index.json could not be read: a copy is kept …" |
| 7 | `cp <dir>/index.good $S/index.json`; in the page call `list` | Every article listed as before |
