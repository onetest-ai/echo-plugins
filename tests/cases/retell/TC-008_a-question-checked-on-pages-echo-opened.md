---
id: TC-008
title: A question is answered from the article; with search the web, the part beyond it is checked on pages Echo opened, a page that is gone never a source
priority: high
type: functional
requirements: [F-RT-09, F-RT-17]
module: retell
run: agent
platform: any
data: standard
tags: [retell, questions, web]
---

# TC-008: A question is answered from the article; with search the web, the part beyond it is checked on pages Echo opened, a page that is gone never a source

## Preconditions
- TC-003's article

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | In the window's page: `fetch('/api/plugin/retell/call/ask', …{args: {id, q: 'What else do teams watch besides the evaluation?', web: true}})`; wait for its `qa.json` item | `status` done; `from.anchors` ids of the article |
| 2 | Read its `beyond` and `curl $FAKE_RETELL/_log` | `checked: true`, `sources` only `https://docs.acme-test.example/posts/observability.html`; the fake was asked for `/posts/gone.html` too (it 404'd) but it is no source |
| 3 | Open the article's Questions | The answer's second part is labelled "BEYOND THE ARTICLE · CHECKED ON PAGES ECHO OPENED" with its source |
