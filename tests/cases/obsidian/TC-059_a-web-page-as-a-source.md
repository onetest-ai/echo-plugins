---
id: TC-059
title: A web page as a source — read once when added, as Echo's safe Markdown with its pictures beside it; a listed site at once, any other page through Echo's own box; cancelled, JavaScript-only or moved pages add nothing, said; the same page twice refused; never read again
priority: high
type: functional
requirements: [F-OB-65, F-OB-51, F-OB-41]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, ingest, sources, web]
---

# TC-059: A web page as a source

## Preconditions
- TC-038 done (my-twin), `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`; acme-twin connected for the window
  steps (`ECHOCTL_PICK_FOLDER="$VAULTS/acme-twin" obs add '{"wait":true}'`)
- The fake web site `up.sh` started (never the internet): `$FAKE_WEB` and `$FAKE_WEB_OTHER`, both on 127.0.0.1; Echo's
  own box answers `$ECHOCTL_ASK_ADDRESS` in this development build (`$FAKE_WEB_OTHER/rollout.html` for the window; a CLI
  step may set its own)
- `curl -s -X DELETE $FAKE_WEB/_log` before step 1

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin set obsidian web_sites "$FAKE_WEB"` | Saved, with Echo's note that the window may reach the address too (the sheet named this setting when it was installed: "Talks to the addresses you list in its setting “web_sites”…") |
| 2 | `obs add_source '{"vault":"my-twin","kind":"web","url":"'$FAKE_WEB'/rollout.html"}'` | `path` `raw_inbox/web/<today>-acme-rollout-plan.md`, `pictures` 1, `pictures_failed` 1, `url` the page's |
| 3 | `cat` that file; `ls "$VAULTS/my-twin/raw_inbox/web/<today>-acme-rollout-plan"` | Properties `title: Acme rollout plan`, `kind: web`, its `url`, `fetched`, `author: Ada Lovelace`, `published: 2026-11-02`, `lang: en`, `origin: echo`; `# Acme rollout plan`, the article's text as Markdown with its words escaped (`\[\[link\]\]`, `\*bold\*`), the list and the table — no menu, footer or script; `![The regions map](<today>-acme-rollout-plan/01.png)` and the other host's picture with its address; the folder holds `01.png` |
| 4 | `curl -s $FAKE_WEB/_log` | `GET /rollout.html` and `GET /img/map.png`, each once, `User-Agent: Mozilla/5.0 (compatible; Echo)` — nothing else, and nothing outside 127.0.0.1 |
| 5 | `obs sources '{"vault":"my-twin"}' \| python3 -c 'import json,sys; print([(s["path"], s["kind"], s["state"]) for s in json.load(sys.stdin)["sources"] if s["kind"]=="web"])'` | Only the page, `web`, `new` — its picture is part of it, not a source of its own |
| 6 | Step 2 again | Fails "this page is in the vault already: raw_inbox/web/<today>-acme-rollout-plan.md"; the log has no new request |
| 7 | `obs add_source '{"vault":"my-twin","kind":"web","url":""}'` (the box answers `$FAKE_WEB_OTHER/rollout.html`) | A second file `… (2).md` from the other address (not listed: Echo's box gave it) — its pictures not saved (a page on this computer gets only pictures the plugin may reach), each keeping its address |
| 8 | `ECHOCTL_ASK_ADDRESS="$FAKE_WEB_OTHER/spa.html" obs add_source '{"vault":"my-twin","kind":"web","url":""}'`; the same with `/moved.html`; with `ECHOCTL_ASK_ADDRESS=` (cancelled) | "This page builds itself with JavaScript, which Echo doesn't read yet, so nothing was added. Save it from your browser as a PDF and add the file instead"; "the page answered 302 (it moved): Echo doesn't follow a redirect…"; `{"cancelled": true}`; `ls raw_inbox/web` as after step 7 |
| 9 | Window: `#obsidian:knowledge/acme-twin/ingest` → *Add a source* → *A web page* | The note: a listed site at once, any other page through Echo's own box; read once, never again; pictures beside it; no JavaScript. The field empty: *Type the address…* |
| 10 | *Type the address…* | "Added raw_inbox/web/<today>-acme-rollout-plan.md. 2 pictures couldn't be saved and keep their web addresses." (the box's page) |
| 11 | *Add a source* → *A web page*, `$FAKE_WEB/rollout.html`, *Add the page* | "Added raw_inbox/web/<today>-acme-rollout-plan (2).md with 1 picture. 1 picture couldn't be saved and keeps its web address."; Ingest lists both under Web |
| 12 | The same with `$FAKE_WEB/spa.html` | The sheet stays open with the JavaScript error; nothing added |
| 13 | Wait 2 minutes; `curl -s $FAKE_WEB/_log` | No request since: a page is never read again by itself |
