---
id: TC-055
title: The activity corrects its own address in place (Echo's ctx.go replace) — Knowledge opened names its vault, a discarded run's and a removed vault's address go; Back skips them, while a tab the user opens is a step
priority: high
type: functional
requirements: [F-OB-62]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, activity, window, routes]
---

# TC-055: The activity corrects its own address in place

## Preconditions
- An environment from `up.sh` with at least one vault connected (TC-038's my-twin, or acme-twin as TC-030 has it);
  `<base_url>` the window; headless Playwright at 1440×900

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open `<base_url>/#calls` (Echo opens a call's page), note `history.length`; then set the address to `#obsidian:knowledge` | The address becomes `#obsidian:knowledge/<the last or first vault>/home`; `history.length` grew by one (the step the user took), not two |
| 2 | Back | The call's page again — never the bare `#obsidian:knowledge`, which would only correct itself again |
| 3 | Knowledge → *Pages*, then Back | Back returns to Home: a tab the user opens is a step of its own |
| 4 | Ingest → a run waiting for review (TC-052's, or on the minutes environment TC-061's: this step then runs after TC-061 step 5) → *Discard the run* → *Discard*; Back | The address is `…/ingest` in place of the run's; Back doesn't open the discarded run |
| 5 | A vault made for this step (`mkdir -p "$VAULTS/gone"`, `ECHOCTL_PICK_FOLDER="$VAULTS/gone" obs new_vault '{"name":"Gone"}'`), opened in Knowledge, Settings → *Remove from Echo…* → *Remove from Echo*; Back | The address `#obsidian:knowledge` corrected to the next vault in place; Back never opens the removed vault's Settings |
