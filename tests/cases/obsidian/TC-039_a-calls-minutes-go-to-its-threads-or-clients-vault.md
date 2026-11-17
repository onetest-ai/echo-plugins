---
id: TC-039
title: A call's minutes go to the vault set on its threads, else its client's, else the default vault; "none" stops them; a call in two threads with two vaults goes into both
priority: critical
type: functional
requirements: [F-OB-42]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, minutes, routing]
---

# TC-039: Routing by thread, client and default

## Preconditions
- TC-038 done (vaults `my-twin`, `acme-notes`, `globex-notes`), `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`
- `r() { obs route "{\"call\":\"$1\"}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["from"], [(v["id"], v["why"]) for v in d["vaults"]])'; }`
- `W=2026-11-10_100000-acme-weekly-sync` (thread Acme rollout, client Acme); `G=2026-11-07_110000-globex-pilot-scoping` (threads Acme rollout and Globex pilot)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `r $W` | `none []`: no vault anywhere yet |
| 2 | `obs default '{"id":"my-twin"}'`; `r $W` | `default [('my-twin', 'the default vault')]` |
| 3 | `obs client_vault '{"client":"acme","vault":"acme-notes"}'`; `r $W` | `client [('acme-notes', "Acme's vault")]` |
| 4 | `obs thread_vault '{"thread":"acme-rollout","vault":"globex-notes"}'`; `r $W` | `thread [('globex-notes', 'set on the thread Acme rollout')]` |
| 5 | `obs thread_vault '{"thread":"acme-rollout","vault":"none"}'`; `r $W` | `none []`: the thread says none — not its client's, not the default |
| 6 | `obs thread_vault '{"thread":"acme-rollout","vault":"nope"}'` | Fails "no such vault" |
| 7 | `obs thread_vault '{"thread":"acme-rollout","vault":"acme-notes"}'`; `obs thread_vault '{"thread":"globex-pilot","vault":"globex-notes"}'`; `r $G` | `thread [('acme-notes', 'set on the thread Acme rollout'), ('globex-notes', 'set on the thread Globex pilot')]` |
| 8 | `obs set '{"id":"acme-notes","key":"minutes","value":"ask"}'`; `obs set '{"id":"globex-notes","key":"minutes","value":"ask"}'`; `obs save_minutes "{\"call\":\"$G\"}" \| python3 -c 'import json,sys; print([(s["vault"], s["state"], s["path"], s["index"]) for s in json.load(sys.stdin)["saved"]])'` | `[('acme-notes', 'saved', 'knowledge/notes/2026-11-07-globex-pilot-scoping.md', 'added'), ('globex-notes', 'saved', 'knowledge/notes/2026-11-07-globex-pilot-scoping.md', 'added')]` |
| 9 | `head -14 "$VAULTS/acme-notes/knowledge/notes/2026-11-07-globex-pilot-scoping.md"` | Echo's properties: `title`, `date: 2026-11-07`, `meeting: "Globex pilot scoping (MS Teams)"`, `tags: [meeting]`, `participants:` the invite's names, `people:` Echo's people as `echo://person/…`, `duration:`, `threads: ["Acme rollout", "Globex pilot"]` (no `client:`: two clients between them), `source: echo://call/2026-11-07_110000-globex-pilot-scoping`, `origin: echo`, `echo_call: 2026-11-07_110000-globex-pilot-scoping`, `summary:` one line; then `# Globex pilot scoping — 2026-11-07` and the minutes from their first `## ` section |
| 10 | `grep -n globex-pilot-scoping "$VAULTS/globex-notes/knowledge/CATALOG.md" "$VAULTS/globex-notes/log.md"` | A row in the Notes table `\| [2026-11-07-globex-pilot-scoping.md](notes/2026-11-07-globex-pilot-scoping.md) \| <N>m Globex pilot scoping — … \| 2026-11-07 \|`; a log line `· added · knowledge/notes/2026-11-07-globex-pilot-scoping.md · minutes of "Globex pilot scoping" from Echo` |
| 11 | `obs client_vault '{"client":"acme","vault":null}'` | The client's value removed (`"vault": null`) |
