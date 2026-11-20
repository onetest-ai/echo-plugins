---
id: TC-007
title: A file handed over has its text taken out at once and is retold; a path typed in Add is refused with the hint to choose the file
priority: high
type: functional
requirements: [F-RT-06]
module: retell
run: agent
platform: any
data: standard
tags: [retell, file, failure]
---

# TC-007: A file handed over has its text taken out at once and is retold; a path typed in Add is refused with the hint to choose the file

## Preconditions
- The environment of TC-003; `<dir>/made-up-notes.md` written with two made-up paragraphs

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin call retell start '{"wait":true,"length":"short"}' --file <dir>/made-up-notes.md` | `{"id": …}`; its `input.json` holds the file's text (`doctext`) |
| 2 | Wait (the window's Echo takes it from the queue) | `ready` |
| 3 | Add, type `C:\Users\sam\Documents\report.pdf` | The hint: "This looks like the path of a file: press “Choose a file…” instead (Echo reads only a file you choose)." |
| 4 | Add to the queue | "Echo reads only a file you choose: press “Choose a file…” and pick it."; nothing queued |
| 5 | Add, type `/Users/sam/Documents/report.pdf`, then `~/Documents/report.pdf`, then `file:///Users/sam/report.pdf`; Add to the queue each time | Each time the same hint and the same refusal; nothing queued |
