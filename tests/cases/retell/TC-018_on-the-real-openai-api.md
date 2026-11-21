---
id: TC-018
title: On the real OpenAI API with a person's own key: the voice, a spoken quiz answer and a live talk with a real microphone
priority: high
type: functional
requirements: [F-RT-20]
module: retell
run: person
platform: any
data: real
tags: [retell, voice, talk, real]
---

# TC-018: On the real OpenAI API with a person's own key: the voice, a spoken quiz answer and a live talk with a real microphone

## Preconditions
- A person's Echo with Retell; their own OpenAI API key; headphones

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Retell: address `https://api.openai.com`, the key, Check | Online; OpenAI's models listed (gpt-4o-mini-tts …) |
| 2 | Add a real article; listen | Voiced with the chosen voice and manner; words lit near the voice |
| 3 | Practice → a quiz, answer one aloud | The words written down; pace, fillers and pauses shown |
| 4 | Start a talk; talk for two minutes, cut in once while the coach speaks | The coach answers each turn, stops when cut in, the review comes after Finish |
