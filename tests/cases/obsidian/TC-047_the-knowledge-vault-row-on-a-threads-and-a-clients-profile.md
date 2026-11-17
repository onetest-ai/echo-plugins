---
id: TC-047
title: The "Knowledge vault" row on a thread's and a client's Profile — what it inherits (the default vault, its client's), a vault of its own or none picked in place, and that vault's minutes Auto / Ask / Off; what is set there is what the minutes follow
priority: high
type: functional
requirements: [F-OB-50, F-OB-42]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, threads, clients]
---

# TC-047: The rows on a thread's and a client's Profile

## Preconditions
- TC-046 done, the served window (`<dir>`'s port), Playwright headless (Echo's `tests/auto/node_modules/playwright`); `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`
- `obs thread_vault '{"thread":"acme-rollout","vault":null}'`; `obs thread_vault '{"thread":"acme-renewal","vault":null}'`; `obs client_vault '{"client":"acme","vault":null}'` (all inherited; my-twin the default)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open `<base_url>/#project/acme-rollout/profile` | Under Sources, a row "Knowledge vault": a picker reading "Inherited — the default vault, My twin" (then My twin, Acme notes, Globex notes, "None — not into a vault"), a segmented Auto / Ask / Off with Auto pressed, and "Minutes of this thread's calls go to **My twin** (the default vault)." |
| 2 | Pick "Acme notes" | "… go to **Acme notes**." and the mode as Acme notes has it pressed; `obs route '{"call":"2026-11-17_170000-acme-weekly-sync"}'` says `from` "thread", acme-notes |
| 3 | Click Ask | Ask pressed; `obs view` shows acme-notes' `minutes.mode` "ask" |
| 4 | Open `<base_url>/#client/acme/profile`; pick "Globex notes" | The client's row: "Inherited — the default vault, My twin" before; then "Minutes of this client's calls go to **Globex notes**." |
| 5 | Open `<base_url>/#project/acme-renewal/profile` | "Inherited — from Acme's vault, Globex notes"; "… go to **Globex notes** (Acme's vault)."; `obs route '{"call":"2026-11-14_100000-acme-renewal-negotiation"}'` → `from` "client", globex-notes |
| 6 | Pick "None — not into a vault" | "The minutes of this thread's calls go into no vault."; no Auto / Ask / Off; `obs route …` → `from` "none" |
| 7 | The browser's console | Nothing logged of the plugin (no `thread.profile` / `client.profile` warning) |
