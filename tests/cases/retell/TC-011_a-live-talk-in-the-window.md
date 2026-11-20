---
id: TC-011
title: A live talk in the window: greeting voiced, what is said written down, the coach answers in one conversation with no tools; Finish keeps the talk and its review
priority: critical
type: functional
requirements: [F-RT-12, F-RT-17]
module: retell
run: agent
platform: any
data: standard
tags: [retell, practice, talk]
---

# TC-011: A live talk in the window: greeting voiced, what is said written down, the coach answers in one conversation with no tools; Finish keeps the talk and its review

## Preconditions
- A browser with the microphone from `$RETELL_MIC`; `curl -X POST $FAKE_RETELL/_state -d '{"transcripts": ["I think the article is about running evaluations on every change.", "In my work I would run ten tasks on each release."]}'`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Practice → Start a talk | The live view: "Opening the microphone and the coach…", then the coach's greeting, voiced |
| 2 | Wait while the microphone plays | "You" lines with the two transcripts; after each, the coach's answer ("Good point about that…") |
| 3 | Read `fake-claude.log` | `talk` runs, the second one with `resume` (the same conversation), all with no tools |
| 4 | Finish | The talk's review appears; `talks/<id>/meta.json` `status` done, `review` written; no `v/` folder left; her turns kept with their stretches of speech; `ls $S/runs` holds no `talk-…` or `judge-…` folder |
