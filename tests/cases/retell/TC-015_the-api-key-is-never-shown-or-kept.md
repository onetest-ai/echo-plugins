---
id: TC-015
title: The speech server's API key is never shown, kept in the store or logged, and is sent only to the speech server
priority: critical
type: functional
requirements: [F-RT-16]
module: retell
run: agent
platform: any
data: standard
tags: [retell, security, secret]
---

# TC-015: The speech server's API key is never shown, kept in the store or logged, and is sent only to the speech server

## Preconditions
- The environment of TC-003

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin set retell api_key sk-test-acme-0000`; `curl -X POST $FAKE_RETELL/_state -d '{"speech":"key"}'`; Retell voice → Check, ▶ Listen | Online; a sample plays |
| 2 | The page's HTML | No "sk-test-acme-0000" (the key shows only as set) |
| 3 | `grep -r sk-test-acme-0000` in the store (but Echo's own settings file) and `<dir>/*.log` | Nothing |
| 4 | `curl $FAKE_RETELL/_log` | Every `/v1/models` and `/v1/audio/speech` had the Bearer and it was the key |
