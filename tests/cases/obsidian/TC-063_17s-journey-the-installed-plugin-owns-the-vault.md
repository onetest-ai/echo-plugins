---
id: TC-063
title: "#17's journey, part 1 — the installed plugin owns the vault: connecting changes nothing, the six tabs and their main actions without an error, a page read and followed, the graph's switches by their spoken names, a deep link, and the thread and client choices hold only their names"
priority: critical
type: functional
requirements: [F-OB-11, F-OB-30, F-OB-31, F-OB-32, F-OB-34, F-OB-37]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, from-17]
---

# TC-063: #17's journey — the installed plugin owns the vault

From onetest-ai/echo-plugins#17's `tests/cases/knowledge/TC-001` (Knowledge 0.1.1), on this plugin's fixture. What
#17 checked that 1.0 dropped is listed in the README (*From #17*).

## Preconditions
- A fresh environment from `up.sh` (Echo built from source, its window served; `ECHOCTL_TEST_OPEN_LOG_ONLY` in its
  environment), `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`, `T="$VAULTS/acme-twin"`,
  `P="$ECHOCTL_HOME/.plugins/obsidian"`; window steps with headless Playwright at 1440×900, the page's `console` and
  `pageerror` events and any `dialog` collected from the first step on
- `snap() { (cd "$T" && find . -path ./.git -prune -o -type f -exec cksum {} + | sort); }`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `grep -c 'Knowledge' <dir>/install.log`; `echoctl plugin list` | The sheet was shown and agreed ("Installed Knowledge 1.0.0"); the plugin is listed `obsidian` 1.0.0, enabled — the window's Knowledge comes from the installed package (`$ECHOCTL_HOME/.echo/plugins`' install), not from Echo |
| 2 | `snap > <dir>/before.txt`; `ECHOCTL_PICK_FOLDER="$T" obs add '{"wait":true}'`; `snap \| diff <dir>/before.txt -`; `git -C "$T" status --porcelain` | `{"id": "acme-twin"}`; no difference and git clean: connecting wrote nothing in the vault |
| 3 | Open `<base_url>/#obsidian:knowledge/acme-twin/home` | The tabs are Home · Pages · Graph · Ingest · Health · Settings — six, no Ask |
| 4 | Each tab and its main action: Home → *Most linked*'s first page; Pages → *New page* (then *Cancel*); Graph → Colour by *Tag*; then a new page (header *New page* "Made up", *Create page*): the header's "main · N pages" and the switcher's count are the Pages tree's at once; Ingest → *Add a source* (then *Cancel*); Health → the first finding; Settings → What Echo read → *Read again* | Each draws; no `pageerror`, no console error, no dialog in the whole run so far |
| 5 | Pages → find "rollout", open topics/rollout.md, click its link *acme* | Rollout by region opens, then Acme Corp at `…/pages/clients%2Facme.md` inside the activity; the Links rail's *Linked from* has Rollout by region and Kickoff, each with its line |
| 6 | topics/hostile.md | Its `<script>` and `<img onerror>` are text; no dialog opened |
| 7 | Graph → the controls card's switches | Each is a `role="switch"` with its plain name — "Hide index pages", "Show isolated pages", "Tags as nodes" — and `aria-checked`; the count beside "Show isolated pages" is shown; a click on *Show isolated pages* flips its `aria-checked` and back again |
| 8 | A new page at `<base_url>/#obsidian:knowledge/acme-twin/pages/topics%2Frollout.md` (a link kept from before) | The activity opens on acme-twin, Pages, Rollout by region |
| 9 | Settings → *What Claude knows* → *For whom*: pick the client Acme and the thread Acme rollout; `obs view \| python3 -c 'import json,sys; d=json.load(sys.stdin); print(sorted({k for c in d["clients"] for k in c}), sorted({k for t in d["threads"] for k in t}), [v["belongs"] for v in d["vaults"]])'` | The choices show their names (Acme, Acme rollout…); the vault keeps only their ids (`belongs`); the clients and threads Knowledge is given hold only Echo's ids, names, group and client — no notes, people, sources or briefs |
| 10 | acme.md → *Edit*, type "First save.", *Save*; *Edit* again, type "Second save."; meanwhile `printf '\nAdded outside.\n' >> "$T/knowledge/clients/acme.md"` | The first save lands; within 2 s of the outside change — before *Save* can be pressed — the conflict "This page changed on disk while you were editing (<time>). Your text isn't saved yet." with *Compare*, *Take theirs*, *Keep mine*, *Save* off; the file still ends with "Added outside." |

## Clean up
`git -C "$T" checkout -- knowledge/clients/acme.md`; `down.sh <dir>`.
