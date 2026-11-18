---
id: TC-065
title: "#17's journey, part 3 — disabled, enabled again, removed and installed again: the vaults, their records and an unsaved edit stay; while off, Knowledge is gone from the window and an event writes nothing; back on, everything returns once"
priority: critical
type: functional
requirements: [F-OB-69]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, lifecycle, from-17]
---

# TC-065: #17's journey — disabled, enabled, removed: the vaults stay

From onetest-ai/echo-plugins#17's `tests/cases/knowledge/TC-003`, on this plugin's fixture. #17's checks of Echo's
native Knowledge service and of the Obsidian plugin beside it are gone in 1.0 (README, *From #17*).

## Preconditions
- A fresh environment from `up.sh` (`DATA_NOW=2026-11-17T20:00`), `. <dir>/env`,
  `obs() { echoctl plugin call obsidian "$@"; }`, `T="$VAULTS/acme-twin"`, `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`,
  `snap() { (cd "$T" && find . -path ./.git -prune -o -type f -exec cksum {} + | sort); }`
- acme-twin connected, the default vault, minutes `auto`, commit on (`obs default …`, `obs set …`); its description's
  "when" line saved and confirmed (`obs save …`, `obs confirm …`)
- One headless Playwright page on `<base_url>` for the whole case (the window is never restarted), its `pageerror`s collected

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `#obsidian:knowledge/acme-twin/pages/clients%2Facme.md` → *Edit*, type "A draft not saved." (no *Save*) | "Editing clients/acme.md · not saved" |
| 2 | `cp "$S/vaults.json" <dir>/vaults-before.json`; `echoctl plugin disable obsidian`; `echoctl plugin list` | Exit 0; the list shows obsidian off |
| 3 | The page, within 3 s | Knowledge leaves the activity bar; the window goes to Calls; no element, style or sheet of Knowledge's is left in the page (no `.kn-` element, no `knowledge.css`) |
| 4 | Open `#obsidian:knowledge/acme-twin/home` | Echo shows Calls ("Pick a call …"): a route of a plugin that is off opens nothing of it |
| 5 | `B="$(snap)"`; `echoctl plugin emit minutes_written --from 2026-11-10_100000-acme-weekly-sync`; wait 3 s; `[ "$(snap)" = "$B" ] && echo unchanged`; `ls "$S/calls" 2>/dev/null` | `unchanged`, and no record of the call: an off plugin hears nothing and writes nothing |
| 6 | `obs view` | Echo refuses: "obsidian isn't loaded: it isn't installed and on" |
| 7 | `echoctl plugin enable obsidian` (the window not restarted); the page, within 5 s | Knowledge back in the activity bar — one icon; its vault and tabs as before; the event of step 5 isn't delivered late |
| 8 | Pages → clients/acme.md → *Edit* | The draft "A draft not saved." is offered again (kept in the window's own storage, never written) |
| 9 | `cmp "$S/vaults.json" <dir>/vaults-before.json && echo same`; `echoctl core \| grep -c 'Knowledge · acme-twin'` | `same`; `1`: Claude's entry is back |
| 10 | `echoctl plugin emit minutes_written --from 2026-11-10_100000-acme-weekly-sync`; wait 3 s; `ls "$T/knowledge/notes" \| grep -c acme-weekly-sync`; `grep -c 'acme-weekly-sync' "$T/knowledge/CATALOG.md"`; `cat "$S/calls/2026-11-10_100000.json"` | `1` note and `1` index row; the record has one `saved` entry for acme-twin, its commit `pending`: one handler after enabling again, not two |
| 11 | At once: `echoctl plugin remove obsidian` (its data kept); `echoctl plugin list`; `ls "$ECHOCTL_CONFIG_DIR/plugins/grants/"`; `ls "$S"`; `snap \| wc -l` | Exit 0 (if not, stop: an install over a plugin still there is an update that keeps its folders, and step 12 means nothing), obsidian no longer listed, no `obsidian.json` among the grants; `$S` still holds `vaults.json`, `vaults/`, `calls/` (the call's record) and the pending commit; the vault's files all there |
| 12 | `echoctl plugin install obsidian --from local --yes`; `obs view`; `echoctl core \| grep -c 'Knowledge · acme-twin'`; the page reloaded, `#obsidian:knowledge/acme-twin/home` | "Installed Knowledge 1.0.0"; acme-twin back with its settings (the default, minutes auto, commit on) and its description, `given` false: Echo took the plugin's folders back with the removal; `0`: no entry for Claude while Echo doesn't give the folder; the page: "Echo doesn't give Knowledge acme-twin's folder now" with *Pick the folder again…* and *Remove from Echo…* — not "isn't there" (the folder is there); Knowledge in the activity bar once |
| 13 | The folder given again as the user would pick it: `ECHOCTL_PICK_FOLDER="$T" obs give_again '{"id":"acme-twin"}'`; `echoctl core \| grep -c 'Knowledge · acme-twin'`; the page reloaded | `{"id": "acme-twin", "given": true}`; `1`; the vault's Home as before |
| 14 | `echoctl plugin emit minutes_written --from 2026-11-10_100000-acme-weekly-sync`; wait 3 s; `ls "$T/knowledge/notes" \| grep -c acme-weekly-sync`; then wait for the quiet window (2 minutes and up to 70 s); `git -C "$T" log -1 --format=%s`; `git -C "$T" status --porcelain` | Still `1` note: the record kept with the data says it is saved, no second writer; the pending commit was kept through the removal and lands now: `Echo: minutes of "Acme weekly sync" (…) → knowledge/notes/`, nothing left uncommitted |
| 15 | The page's errors | None from the plugin |

## Clean up
`git -C "$T" status --porcelain` (Echo's commits only); `down.sh <dir>`.
