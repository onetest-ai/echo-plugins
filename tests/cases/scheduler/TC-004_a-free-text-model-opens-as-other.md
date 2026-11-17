---
id: TC-004
title: A routine written with a model that isn't one of the three opens as Other… with its name filled in, shown on its row, and is kept when saved
priority: high
type: functional
requirements: [F-SCH-03, F-SCH-04, F-SCH-02]
module: scheduler
run: agent
platform: any
data: standard
tags: [scheduler, model, migration]
---

# TC-004: A free-text model opens as Other…

## Preconditions
- The environment from `up.sh`: `gateway-digest` there from the start (model `acme-gw/sonnet-large`, off);
  `{{base_url}}/#settings/scheduler:main` open

**Changes:** `$R/gateway-digest.md`, `$RUNS/gateway-digest/`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Read the row "Gateway digest"; click it | The row reads "Weekdays at 08:30 · reads only · acme-gw/sonnet-large", its switch off; the panel's "AI" ends " · acme-gw/sonnet-large" |
| 2 | "Edit" | "Model" has "Other…" picked; the field "Other model" holds "acme-gw/sonnet-large" |
| 3 | Click "Save" without a change; `cat "$R/gateway-digest.md"` | `model: acme-gw/sonnet-large`; name, schedule, `tools: read`, `enabled: false` and the prompt as they were (the save may write an empty key as `key: `, with a space) |
| 4 | `echoctl plugin call scheduler run_wait '{"id":"gateway-digest","deliver":false}'`; the run's `log.txt`, first line | "… Echo runs “Gateway digest” on <profile>, model acme-gw/sonnet-large (asked: read permissions …" |

## Expected Final State
`gateway-digest` unchanged.
