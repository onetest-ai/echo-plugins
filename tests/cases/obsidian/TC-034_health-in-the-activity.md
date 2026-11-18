---
id: TC-034
title: Health shows the code checks' findings by group and kind with #17's score, trend and filters; a finding's fix as a diff, Fix and Fix all written only as shown, each in one commit; Ignore
priority: high
type: functional
requirements: [F-OB-35, F-OB-54, F-OB-55, F-OB-56]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, health]
---

# TC-034: Health in the activity

## Preconditions
- The environment from `up.sh` (Echo built from source, its window served; `ECHOCTL_TEST_OPEN_LOG_ONLY` in its
  environment, so a link Echo opens is only logged), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`
- `T="$VAULTS/acme-twin"` (twin-shaped, its pages in `knowledge/`, a git repository); `<base_url>` the window `up.sh`
  printed; window steps with Playwright (headless Chromium, 1440×900), light and dark
- acme-twin connected (`ECHOCTL_PICK_FOLDER="$T" obs add '{"wait":true}'`; the fake Claude can't describe it), `commit`
  on (`obs set '{"id":"acme-twin","key":"commit","value":"on"}'`), the default vault (`obs default '{"id":"acme-twin"}'`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `#obsidian:knowledge/acme-twin/health` | The score card (the ring, "code checks only", "The trend starts today: one point a day.", Links · Index · Properties · Consistency bars — no Freshness); *How Health checks*: By code "always"; AI checks "when you ask · Claude · work · not run yet", *Run AI checks*; the tab "Health 1" |
| 2 | The findings | Needs you: Tags not in the taxonomy (#stray-tag); Should fix: Not in the index "2 fixable by code", Broken links ([[Pricing model]] leads to no page), Without properties "1 fixable by code"; Tidy: Pages with no links; filters All · Needs you · By code · AI |
| 3 | *Broken links* | "[[Pricing model]] leads to no page", `clients/acme.md · line 7` with *Open*; choices *Remove the link, keep its text* (and *Create the page*); "Nothing close to point it to." — no diff until a choice is made; *Remove the link, keep its text* shows its diff (`− … Not written yet: [[Pricing model]].` / `+ … Not written yet: Pricing model.`) |
| 4 | *Not in the index* | Its first finding open: "Add its row to the index", the diff `+2 −1` (the *Last update* line and the row `| [2026-01-08-weekly.md](notes/2026-01-08-weekly.md) | Weekly sync — The Control Plane ships in May. | <today> |`), "Written only if the page still reads as it does now.", *Fix*; and *Add 2 rows to the index…* |
| 5 | *Add 2 rows to the index…* | The sheet "Add 2 rows to the index": "Each fix as Echo found it. Untick any you'd rather leave.", both rows ticked with their diffs; "1 file · one commit of these files"; *Apply 2* |
| 6 | *Apply 2* | "Fixed: knowledge/CATALOG.md. Committed (<id>)."; Not in the index and Pages with no links leave the list (the index links them now) |
| 7 | `git -C "$T" log -1 --format=%s`; `git -C "$T" show --name-only --format= HEAD` | `Echo: Health fix in knowledge/CATALOG.md`; only `knowledge/CATALOG.md` — both rows in one commit |
| 8 | *Without properties* → its finding | "Hostile has no properties", the diff `+5`: `---`, `title: Hostile`, `date: <the day of its first commit>`, `tags: []`, `---`; *Fix* → "Fixed: knowledge/topics/hostile.md. Committed (<id>)." |
| 9 | Before a fix, the page changes: `obs health_finding '{"id":"acme-twin","key":"broken:knowledge/clients/acme.md:[[Pricing model]]","choice":"remove"}'` keeps `fix.base`, `fix.sha`; `printf -- '- Edited by hand.\n' >> "$T/knowledge/clients/acme.md"`; `obs fix '{"id":"acme-twin","key":"broken:knowledge/clients/acme.md:[[Pricing model]]","choice":"remove","base":"<base>","sha":"<sha>"}'`; `git -C "$T" checkout -- knowledge/clients/acme.md` | `"changed_since": ["knowledge/clients/acme.md"]`, `written` empty: the page changed since its fix was shown, nothing written over it |
| 10 | *Tags not in the taxonomy* → *Ignore* | "Ignored: it no longer counts. Show ignored lists it."; the tab's number goes; *Show ignored (1)* lists it with *List again* |
| 11 | `obs health '{"id":"acme-twin"}'` | The same findings and score; `score.code_only` true; `history` one point for today with its categories |
| 12 | `git -C "$T" status --porcelain` | Nothing: Health changed only what was fixed, and committed it |
| 13 | The page's console | No error from the plugin |
