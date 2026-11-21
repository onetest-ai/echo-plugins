---
id: TC-022
title: Library opens first and starts with what to listen to now and what is being made, then the reading lists and the articles
priority: high
type: functional
requirements: [F-RT-24]
module: retell
run: agent
platform: any
data: standard
tags: [retell, library, window]
---

# TC-022: One Library opens with what to listen to now

## Preconditions
- A fresh environment (`up.sh`) with no articles. The window is at `{{base_url}}`.
- `echo 20 > <dir>/fake-claude-wait`: each retelling run waits 20 s, so the article can be seen while it is made.

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open `{{base_url}}/#retell:retell` | The tabs are **Library · Practice**, and Library is current. On top: "Nothing to listen to yet" with *Add an article*. Then the Reading lists bar, the search with its filters, and "0 articles". There is no "Nothing matches" line |
| 2 | `echoctl plugin call retell start '{"url":"https://docs.acme-test.example/posts/agent-evals.html"}'`; look at Library within 20 s | A *Making now* card on top: the article's title, its step (reading, writing …) and Stop. The tree lists it under *Not in a topic* with its state. The page follows it without a reload |
| 3 | `rm <dir>/fake-claude-wait`; wait until it is ready | On top: *Start listening*, "Evaluating agents", "Not started", the big ▶. *Making now* is gone |
| 4 | Press the big ▶ | The player opens on it, with the Library tab still current |
| 5 | Play a few seconds, pause, then press *Library* | On top: *Continue listening* with "N% listened", its bar and *Start over* |
| 6 | *Start over* | The player opens from the start |
| 7 | Practice, then Library | Library as in step 5, with the scroll where it was |
| 8 | Library → *New reading list*, type in its topic field while the article is being made (repeat step 2 with another link) | What is typed stays: the page isn't redrawn under the cursor while you type |
