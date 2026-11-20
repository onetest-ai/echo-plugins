---
id: TC-013
title: A saved phrase gets a card explained in the language of explanations
priority: medium
type: functional
requirements: [F-RT-14]
module: retell
run: agent
platform: any
data: standard
tags: [retell, phrases, language]
---

# TC-013: A saved phrase gets a card explained in the language of explanations

## Preconditions
- The environment of TC-003

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin set retell explain_lang Ukrainian`; save the phrase "To put it another way" (`phrase_add`) | Its card's meaning and hint are asked for in Ukrainian (the fake answers "(Ukrainian) …") |
| 2 | `echoctl plugin set retell explain_lang English` | Set back |
