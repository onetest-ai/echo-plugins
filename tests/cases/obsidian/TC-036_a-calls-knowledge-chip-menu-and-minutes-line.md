---
id: TC-036
title: A call's page shows Knowledge in Echo's generic slots — its chip says where its minutes go and its menu chooses (call.header), the ⋯ menu's Save to Knowledge… opens the save sheet over the call (call.menu, ctx.ui.sheet), and the minutes' line while they come (call.minutes)
priority: high
type: functional
requirements: [F-OB-39, F-OB-41]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, call]
---

# TC-036: A call's Knowledge chip, menu and minutes line

## Preconditions
- The environment from `up.sh` (Echo built from source, its window served; `ECHOCTL_TEST_OPEN_LOG_ONLY` in its
  environment, so a link Echo opens is only logged), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`
- `T="$VAULTS/acme-twin"` (twin-shaped, its pages in `knowledge/`, a git repository); `<base_url>` the window `up.sh`
  printed; window steps with Playwright (headless Chromium, 1440×900), light and dark
- acme-twin and acme-wiki connected (`ECHOCTL_PICK_FOLDER="$VAULTS/<vault>" obs add '{"wait":true}'`; the fake Claude
  can't describe them: both `failed`), acme-twin the default vault for minutes, `minutes` auto, `commit` on
  (`obs default '{"id":"acme-twin"}'`, `obs set …`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `#call/<a call with minutes and no thread, e.g. today's "Acme weekly sync">/notes` | On its header, before My notes and ⋯: the chip "Minutes → acme-twin ▾" (the default vault, minutes automatic, the call's AI profile) |
| 2 | Click the chip | "Save this call's minutes to": acme-twin ✓ "automatically", acme-wiki "when I ask", *Don't save this call*, the foot about what is saved |
| 3 | *Don't save this call* | The chip "Not saved to Knowledge ▾"; `$ECHOCTL_HOME/.echo/plugins/obsidian/calls.json` has the call with "none"; the chip's menu → *Back to the vaults' rules* → "Minutes → acme-twin ▾" again, the entry gone |
| 4 | ⋯ of the call | Knowledge's group after a separator, above Delete: *Save to Knowledge…* |
| 5 | *Save to Knowledge…* | Echo's sheet over the call: "Save the minutes to Knowledge", the vault acme-twin, "Saving minutes into a vault isn't in this version of Knowledge yet"; Esc closes it; nothing in `$T` |
| 6 | A call whose minutes are coming (queued or due: today's "Globex standup" in the standard data) | In the box saying so: "Then saved to acme-twin, with a row in the index." |
| 7 | `obs call_knowledge '{"call":{"name":"<the call>","threads":[],"client":null,"profile":"<another profile>"}}'` | `targets` [] — a call on another AI profile never goes by itself |
