---
id: TC-049
title: The catch-up when Echo starts — the calls with minutes and Recall's mail since the last day seen go through the same routing as the live events; a call whose record has the vault isn't written again, a source the ledger has isn't queued again; the first look only notes the day
priority: high
type: functional
requirements: [F-OB-53]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, minutes, events]
---

# TC-049: The catch-up on start

## Preconditions
- TC-048 done (my-twin the default vault, in git, its past minutes saved; acme-notes queues calls), `. <dir>/env`,
  `obs() { echoctl plugin call obsidian "$@"; }`, `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`
- The app runs the same catch-up when it starts (`catch_up` is it, asked from the terminal)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `rm -f "$S/seen.json"`; `obs catch_up` | `{"first": true, "ok": true}`; `cat "$S/seen.json"` names today; nothing saved or queued |
| 2 | `(cd "$VAULTS/my-twin" && git rev-list --count HEAD; ls knowledge/notes \| wc -l)` (C, N); `printf '{"since":"2026-11-15"}' > "$S/seen.json"`; `obs catch_up` | `{"first": false, "ok": true}`; `seen.json` names today again |
| 3 | `(cd "$VAULTS/my-twin" && ls knowledge/notes \| wc -l; git status --short)` | N again: every call since 2026-11-15 routed to my-twin has its record (TC-043's past minutes) — none written again; only the user's own changes in `git status` |
| 4 | `python3 -c 'import json,sys; print(sorted(json.load(open(sys.argv[1]))["queued"]))' "$S/vaults/acme-notes/ingest.json"` | `['call:2026-11-17_180000', 'mail:mail/c3']` (a call by its stamp): Acme rollout's memo since 2026-11-15 queued once; not the weekly sync written in TC-045, the skipped mail kept as it was |
| 5 | `obs catch_up` again | Nothing new: each call has its record, each source its ledger entry |
