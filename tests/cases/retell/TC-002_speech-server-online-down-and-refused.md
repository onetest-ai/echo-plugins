---
id: TC-002
title: Retell: the speech server online with its models, ▶ Listen asks it for speech; a server that is down or refuses the key is said in words
priority: critical
type: functional
requirements: [F-RT-07]
module: retell
run: agent
platform: any
data: standard
tags: [retell, voice, failure]
---

# TC-002: Retell: the speech server online with its models, ▶ Listen asks it for speech; a server that is down or refuses the key is said in words

## Preconditions
- The environment from `up.sh`: the fake speech server up (`curl $FAKE_RETELL/_state` → `"speech": "up"`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open `{{base_url}}/#settings/retell:main`, press Check | The section "Retell": the server's address `$FAKE_RETELL`, online, its models offered (gpt-4o-mini-tts, tts-1 …) |
| 2 | Press ▶ Listen | A sample plays; `curl $FAKE_RETELL/_log` has a `POST /v1/audio/speech` |
| 3 | `curl -X POST $FAKE_RETELL/_state -d '{"speech":"down"}'`; Check | The section says the server answered 503, in words — not a blank or a spinner |
| 4 | `… -d '{"speech":"key"}'`; Check | "The server refused the API key" |
| 5 | `… -d '{"speech":"up"}'`; Check | Online again |
| 6 | `#settings/plugins/retell` | Retell's settings aren't fields there: one row listing them, "Set in Retell", *Open* opens `#settings/retell:main` |
| 7 | Back on `#settings/retell:main` | Under the title and its lead line Echo's "Its settings": *Speech server* (`$FAKE_RETELL`, with Echo's note), *API key* (not set), then the article options (language, fact check, notify …) — no voice model, voice, style or recognition model fields there (the cards below set those from the server's lists); then the server's state and the voice cards |
| 8 | Change *Speech server* to `$FAKE_RETELL/` and leave the field; wait for the window to reload | The section shows the server online again with its models (it checks it on load), no Check needed |
