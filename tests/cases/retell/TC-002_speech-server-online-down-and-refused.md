---
id: TC-002
title: Retell voice: the speech server online with its models, ▶ Listen asks it for speech; a server that is down or refuses the key is said in words
priority: critical
type: functional
requirements: [F-RT-07]
module: retell
run: agent
platform: any
data: standard
tags: [retell, voice, failure]
---

# TC-002: Retell voice: the speech server online with its models, ▶ Listen asks it for speech; a server that is down or refuses the key is said in words

## Preconditions
- The environment from `up.sh`: the fake speech server up (`curl $FAKE_RETELL/_state` → `"speech": "up"`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open `{{base_url}}/#settings/retell:voice`, press Check | The section "Retell voice": the server's address `$FAKE_RETELL`, online, its models offered (gpt-4o-mini-tts, tts-1 …) |
| 2 | Press ▶ Listen | A sample plays; `curl $FAKE_RETELL/_log` has a `POST /v1/audio/speech` |
| 3 | `curl -X POST $FAKE_RETELL/_state -d '{"speech":"down"}'`; Check | The section says the server answered 503, in words — not a blank or a spinner |
| 4 | `… -d '{"speech":"key"}'`; Check | "The server refused the API key" |
| 5 | `… -d '{"speech":"up"}'`; Check | Online again |
