---
id: TC-010
title: A quiz from what was listened to: a choice checked at once, a written answer coached
priority: high
type: functional
requirements: [F-RT-11]
module: retell
run: agent
platform: any
data: standard
tags: [retell, practice, quiz]
---

# TC-010: A quiz from what was listened to: a choice checked at once, a written answer coached

## Preconditions
- Articles ready (TC-003…)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Practice → Make a quiz | The first question with four options |
| 2 | Pick the first option | Marked right, with why |
| 3 | Next to the written question; type "I am agree, the article says the main idea matters for agents."; Check my answer | The coach's feedback: "I am agree" → "I agree", a smoother version, a phrase to reuse |
