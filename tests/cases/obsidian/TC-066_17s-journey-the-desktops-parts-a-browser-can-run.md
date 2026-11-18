---
id: TC-066
title: "#17's journey, part 4 — what the desktop does that a headless window can run with Echo's stand-ins: installed from Settings → Plugins, a folder connected and files added through the pickers, Open in Obsidian and Show in Finder only logged, Ask the vault in the panel, and turned off with its panel"
priority: high
type: functional
requirements: [F-OB-30, F-OB-38, F-OB-51, F-OB-69]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, install, picker, from-17]
---

# TC-066: #17's journey — the desktop's parts a headless window can run

From onetest-ai/echo-plugins#17's `tests/cases/knowledge/TC-004` (native desktop and accounts): the parts that run in
a served window with Echo's debug stand-ins. What needs the native desktop or a real account is TC-067 (a person).

## Preconditions
- A fresh environment from `up.sh`, `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`; then
  `echoctl plugin remove obsidian --delete-data` (a computer that never had it) and the window served again with
  Echo's picker stand-ins: `down.sh <dir>`; from the Echo checkout,
  `ECHOCTL_PICK_FOLDER="$VAULTS/acme-twin" ECHOCTL_PICK_FILES="$VAULTS/handoff/brief.md" ECHOCTL_SERVE_IPC=1 nohup echoctl window --serve <port> > <dir>/serve.log 2>&1 &`
  (its pid into `<dir>/pid`; `ps eww -p $(cat <dir>/pid)` names both stand-ins and `ECHOCTL_TEST_OPEN_LOG_ONLY` —
  else stop: *Choose…* would open the system's picker)
- A made-up file to add: `mkdir -p "$VAULTS/handoff" && printf -- '# Brief\n\nMade up.\n' > "$VAULTS/handoff/brief.md"`
- Headless Playwright at 1440×900, its `pageerror`s collected

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `#settings/plugins` → Knowledge (from the local marketplace) → *Install*; the sheet → agree | The sheet "Install Knowledge 1.0.0?" lists what it uses (running Claude Code, Echo's reads and events, "the folders of notes (Knowledge vaults) you pick", Microsoft 365, "the addresses you list in its setting “web_sites”", its skills and guide); *Install* → the card says "Installed ✓"; Knowledge in the activity bar |
| 2 | Knowledge → *Connect a folder…* → *Choose…* → *Next*, *Next*, *Connect* | The stand-in's folder (acme-twin) in the sheet; "acme-twin is connected — nothing in its folder changed."; the activity on `…/acme-twin/home`, its tabs drawn with Knowledge's stylesheet (`knowledge.css` loaded) |
| 3 | ⋯ → *Open in Obsidian*; ⋯ → *Show in Finder* | `<dir>/open.log` gains an `obsidian://open?path=…acme-twin` line and `reveal <$VAULTS>/acme-twin`: Echo opens them, nothing opened here |
| 4 | Ingest → *Add a source* → *Files* → *Choose…*, *Add* | `raw_inbox/brief.md` added (as it is), committed when the vault commits; only acme-twin has it |
| 5 | *Ask the vault* | Echo's panel on "Claude · Knowledge" in `$VAULTS/acme-twin` (the fake Claude); nothing typed |
| 6 | `echoctl plugin disable obsidian`; the page within 3 s | Knowledge leaves the activity bar; its panel tab "Claude · Knowledge" goes with it (its session has ended — a running one would stay, it is the user's, and its tab go once it ends); the vault's files as they were |
| 7 | The page's errors | None from the plugin |

## Clean up
`down.sh <dir>`.
