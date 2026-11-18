---
id: TC-069
title: Echo's people as person pages — routed as minutes are, only Echo's properties merged in, a renamed page still the person's, a deleted one back only on Update; written with a call's minutes, by the daily catch-up and by Update person pages, one commit a batch
priority: critical
type: functional
requirements: [F-OB-72, F-OB-73]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, people, minutes, routing, git, window]
---

# TC-069: Echo's people as person pages

## Preconditions
- An environment of its own: `DATA_NOW=2026-11-17T20:00 ECHO_REPO=<Echo from main with onetest-ai/echo#813> tests/fixtures/obsidian/up.sh <dir> <port>`; `. <dir>/env`; `obs() { echoctl plugin call obsidian "$@"; }`; `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`; the served window is this environment's (`lsof -nP -iTCP:<port> -sTCP:LISTEN` → the pid in `<dir>/pid`), `ECHOCTL_TEST_OPEN_LOG_ONLY` in its environment
- The standard data's people: placed in `acme-rollout` (Dana Lee champion, delivery lead; Alex Chen architect; Omar Haddad…), `globex-pilot`, `acme-renewal`, `acme-hackathon`; seen in calls (Priya Nair); Alex Chen reports to Priya Nair
- `mkdir -p "$VAULTS/my-twin" "$VAULTS/acme-notes"`; `T="$VAULTS/my-twin"`, `A="$VAULTS/acme-notes"`, `PP=knowledge/people`
- Window steps with Playwright (headless Chromium, 1440×900) on `<base_url>`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `ECHOCTL_PICK_FOLDER="$T" obs new_vault '{"name":"My twin","git":true,"minutes":"ask"}'`; `obs set '{"id":"my-twin","key":"commit","value":"true"}'`; `obs default '{"id":"my-twin"}'`; `ECHOCTL_PICK_FOLDER="$A" obs new_vault '{"name":"Acme notes","minutes":"ask"}'`; `obs thread_vault '{"thread":"acme-rollout","vault":"acme-notes"}'` | `written` 24 each (the twin's `knowledge/people/README.md` and a People table in `CATALOG.md`); `acme-rollout` → acme-notes, every other thread → my-twin (the default) |
| 2 | `printf -- '# Kim Park\n\nMy own notes on Kim.\n' > "$T/$PP/Kim Park.md"` (the user's own page, no `echo:`); `obs vault_settings '{"id":"my-twin"}' \| grep -A6 '"people"'` | `people`: `dir` "knowledge/people", `pages` 0, `last` null |
| 3 | Window: `#obsidian:knowledge/my-twin/settings` | The nav has *People* after *Meeting minutes*; its section: *Person pages* — "Echo's people of the threads whose calls come here, a page each in knowledge/people/. Echo writes only its own properties — origin, echo, reports_to, reports, threads; the rest of a page is yours. Only when you click: this vault's minutes aren't saved automatically." and *Update person pages* |
| 4 | Click *Update person pages* | The button says *Updating…*, then "<N> new person pages, 0 changed, one commit."; the row ends "Last: 2026-…, <N> new pages, 0 changed." |
| 5 | `ls "$T/$PP"`; `cat "$T/$PP/Alex Chen.md" "$T/$PP/Priya Nair.md"`; `cat "$T/$PP/Kim Park.md"`; `head -4 "$T/$PP/Kim Park-2.md"` | A page for each person of the threads that route to my-twin, named as they are; no page for anyone seen only in `acme-rollout`. Alex Chen: `origin: echo`, `echo: "echo://person/alex@initech.example"`, `reports_to: "[[Priya Nair]]"`, `threads:` `acme-renewal` and `globex-pilot` only (not `acme-rollout`: it routes to acme-notes), then `# Alex Chen`. Priya Nair: `reports: ["[[Alex Chen]]"]`, `threads:` `initech-hiring`. The user's `Kim Park.md` as written; Echo's Kim is `Kim Park-2.md` (`echo: "echo://person/kim@globex.example"`) |
| 6 | `(cd "$T" && git log --format='%cn \| %s' -1; git show --name-only --format= HEAD; git status --short)`; `grep -A4 '^## People' "$T/knowledge/CATALOG.md"`; `tail -1 "$T/log.md"` | One commit `Echo (obsidian) \| Echo: <N> person pages → knowledge/people/` holding exactly the <N> pages, `knowledge/CATALOG.md` and `log.md`; only `?? knowledge/people/Kim Park.md` left (the user's, never committed by Echo); the People table has their rows (`\| [Alex Chen.md](people/Alex%20Chen.md) \| Alex Chen — Solution architect, Initech \| <today> \|`…); the log's last line `- <today> · people · knowledge/people/ · <N> person pages from Echo (<N> new, 0 changed)` |
| 7 | `obs people_sync '{"id":"acme-notes"}'`; `ls "$A/$PP"`; `cat "$A/$PP/Dana Lee.md"` | `added` the people of `acme-rollout`, `commit` "off" (acme-notes has no git); Dana Lee's `threads:` only `- thread: acme-rollout`, `role: delivery lead`, `stance: champion` |
| 8 | `obs people_sync '{"id":"my-twin"}'`; `(cd "$T" && git log --oneline \| wc -l)`; `tail -1 "$T/log.md"` | `added` 0, `changed` 0, `unchanged` <N>, `commit` "skipped: nothing written"; no new commit, no new log line: nothing changed |
| 9 | The user's edits: `mv "$T/$PP/Alex Chen.md" "$T/$PP/Alex C.md"`; in it, `aliases: [AC]` added as the frontmatter's first line and `Prefers whiteboards.` added at the end; then `echoctl project person globex-pilot "Alex Chen" --email alex@initech.example --role reviewer` | The rename and the role are made |
| 10 | `obs people_sync '{"id":"my-twin"}'`; `cat "$T/$PP/Alex C.md"`; `ls "$T/$PP" \| grep Alex`; `grep reports "$T/$PP/Priya Nair.md"`; `(cd "$T" && git show --name-only --format=%s HEAD; git status --short)` | `added` 0, `changed` 2 (Alex, and Priya's link to him). `Alex C.md` keeps `aliases: [AC]` and "Prefers whiteboards.", its `globex-pilot` place has `role: reviewer`; no `Alex Chen.md` again; Priya: `reports: ["[[Alex C\|Alex Chen]]"]`. The commit `Echo: 2 person pages → knowledge/people/` holds only Priya's page and `log.md` — not `Alex C.md`, part of the user's uncommitted rename (` D …/Alex Chen.md`, `?? …/Alex C.md` left as they are); the log's line `… (0 new, 2 changed)` |
| 11 | `rm "$T/$PP/Tom Becker.md"`; `obs set '{"id":"my-twin","key":"minutes","value":"auto"}'`; `obs catch_up \| python3 -c 'import json,sys; print(json.load(sys.stdin)["people"])'`; `ls "$T/$PP/Tom Becker.md"` | `{'ok': True, 'vaults': {'my-twin': {… 'added': 0, 'changed': 0, 'gone': 1 …}}}` — acme-notes (Ask) not in it; Tom's page isn't written again: "No such file" |
| 12 | `obs catch_up \| python3 -c 'import json,sys; print(json.load(sys.stdin)["people"])'` | `{'done': 'today already'}`: at most once a day |
| 13 | `echoctl project person initech-hiring "Lena Vogel" --email lena@initech.example --role interviewer`; `echoctl plugin emit minutes_written --from 2026-11-13_090000-initech-hiring-panel` (Priya, Tom, Lena; Initech hiring → my-twin, Auto); after 3 s `ls "$T/knowledge/notes"`; `grep -A2 initech-hiring "$T/$PP/Lena Vogel.md"`; `ls "$T/$PP/Tom Becker.md"`; `python3 -c 'import json,sys; print(sorted(i["path"] for i in json.load(open(sys.argv[1]))["items"]))' "$S/vaults/my-twin/pending.json"` | The note `2026-11-13-initech-hiring-panel.md`; Lena's page has `- thread: initech-hiring` with `role: interviewer`; Tom's still not written (deleted: only Update brings it back); the quiet window's batch holds the note, `knowledge/CATALOG.md`, Lena's page and `log.md` |
| 14 | `obs commit_pending '{"vault":"my-twin"}'`; `(cd "$T" && git show --name-only --format=%s HEAD)` | One commit `Echo: minutes of "Initech hiring panel" (2026-11-13) → knowledge/notes/` with the note, CATALOG.md, Lena's page and log.md: the participants' pages in the note's commit |
| 15 | `echoctl project person globex-pilot '../../Eve <x>/#1' --email eve@globex.example`; `obs people_sync '{"id":"my-twin"}'`; `ls "$T/$PP" \| grep Eve`; `ls "$T/.." "$T/knowledge"`; `ls "$T/$PP/Tom Becker.md"` | `added` 2: a hostile name is the file `-..-Eve -x---1.md` inside `knowledge/people` (nothing outside it, nothing new beside the vault), its title the name as text; Tom's page is back (Update writes a deleted page again — the same text as its last commit, so git sees no change); the commit holds Eve's page, `knowledge/CATALOG.md` and `log.md` |
| 16 | Window: `#obsidian:knowledge/my-twin/settings` → *People* | "Updated with each call's minutes and once a day." (my-twin is Automatic now); "Last: 2026-…, 2 new pages, 0 changed." |
