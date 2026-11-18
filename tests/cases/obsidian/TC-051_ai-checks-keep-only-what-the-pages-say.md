---
id: TC-051
title: AI checks run only on the user's click, read-only in the vault on its AI profile; a failure is said with what it cost; a check's findings are kept only when their quotes are on their pages (kept, dropped); an AI finding's quotes and fix, fixed through Health in one commit; Freshness counts from then on
priority: critical
type: functional
requirements: [F-OB-57, F-OB-56]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, health, claude]
---

# TC-051: AI checks keep only what the pages say

## Preconditions
- TC-034 done (acme-twin connected, commit on, its index rows and Hostile's properties fixed), `. <dir>/env`,
  `obs() { echoctl plugin call obsidian "$@"; }`, `T="$VAULTS/acme-twin"`, `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`
- Claude Code is the data's test fake (`command -v claude` is `<dir>/bin/claude`): a run is refused unless
  `<dir>/fake-answers.tsv` has a line for a phrase of its prompt, whose made-up result line it answers
- The fake's answer for an AI check (its prompt starts "Check these pages of the vault"), three findings — one whose
  quote is on its page with a fix, one with an invented quote, one naming a page outside the vault:
  `printf 'Check these pages of the vault\t%s\n' '{"type": "result", "subtype": "success", "is_error": false, "result": "{\"findings\": [{\"kind\": \"stale\", \"title\": \"The Control Plane date moved\", \"note\": \"A later note says June.\", \"pages\": [{\"path\": \"knowledge/notes/2026-01-08-weekly.md\", \"line\": 7, \"quote\": \"The Control Plane ships in May\"}], \"fix\": {\"path\": \"knowledge/notes/2026-01-08-weekly.md\", \"old\": \"ships in May\", \"new\": \"ships in June\"}}, {\"kind\": \"stale\", \"title\": \"Invented\", \"pages\": [{\"path\": \"knowledge/notes/2026-01-08-weekly.md\", \"quote\": \"The Control Plane ships in March\"}]}, {\"kind\": \"contradiction\", \"title\": \"Outside\", \"pages\": [{\"path\": \"knowledge/topics/rollout.md\", \"quote\": \"EU first, then the US\"}, {\"path\": \"../acme-wiki/Decisions/Rollout by region.md\", \"quote\": \"Acme rolls out by region\"}]}]}", "total_cost_usd": 0.05, "duration_ms": 900, "num_turns": 2, "usage": {"input_tokens": 2400, "output_tokens": 350, "cache_read_input_tokens": 0, "cache_creation_input_tokens": 0}}' >> <dir>/fake-answers.tsv` — written only at step 3

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `#obsidian:knowledge/acme-twin/health`; nothing clicked for a while; `ls "$S/vaults/acme-twin/lint-runs" 2>/dev/null \| wc -l` | AI checks "when you ask · Claude · work · not run yet"; `0`: no check runs by itself |
| 2 | *Run AI checks* (no answer for the fake yet) | "Reading 5 pages · 0 s", *Checking…* and *Stop*; then *Run AI checks* again with "The last AI check failed. Claude Code ended without a result: test data: Claude Code is a fake here." — Health's findings and score as they were, still "code checks only" |
| 3 | The fake's answer (preconditions); `obs lint '{"id":"acme-twin"}'` (a terminal's command waits for its check) | `state` "done", `kept` 1, `dropped` 2, `cost` 0.05, `pages` 5 |
| 4 | `cat "$S/vaults/acme-twin/lint-runs/"*/permissions.json \| tail -1`; `git -C "$T" status --porcelain` | The run asked `read` ("its folder's own Claude Code setup, reads only"); nothing changed in the vault |
| 5 | `obs health '{"id":"acme-twin"}'` | `ai`: `{at, run, cost: 0.05, kept: 1, dropped: 2}`; `score.code_only` false and a fifth category `Freshness`; one finding `by` "ai": `stale:knowledge/notes/2026-01-08-weekly.md:#<8 hex>`, its page `notes/2026-01-08-weekly.md` at line 7 — the invented quote and the page outside the vault are nowhere |
| 6 | Reload Health | The card no longer says "code checks only"; Freshness's bar; AI checks "last <time>, $0.05"; under the findings "AI checks <time>: Kept 1 finding · 2 dropped: their quotes aren't in the pages." with × |
| 7 | Filter *AI* → *Statements a newer page replaced* | "The Control Plane date moved" with the AI tag; its quote `notes/2026-01-08-weekly.md · line 7` "The Control Plane ships in May"; the check's note "A later note says June."; "Echo found each quote on its page, word for word …"; the change "The change the AI check suggests" `+1 −1` (`ships in May` → `ships in June`); *Fix* |
| 8 | *Fix* | "Fixed: knowledge/notes/2026-01-08-weekly.md. Committed (<id>)."; the AI finding leaves the list (its quote isn't on the page any more): "Nothing under this filter." |
| 9 | `git -C "$T" log -1 --format=%s`; `grep -c 'ships in June' "$T/knowledge/notes/2026-01-08-weekly.md"` | `Echo: Health fix in knowledge/notes/2026-01-08-weekly.md`; `1` |
| 10 | Echo records a call: `echoctl plugin emit recording_started '{"call":"2026-11-18_210000-made-up","title":"Made-up call","memo":false}'`; *Run AI checks*; `ls "$S/vaults/acme-twin/lint-runs" \| wc -l` | "Waiting for a call's recording to finish. Recording comes first." with *Stop*; no new run folder: Claude Code isn't started |
| 11 | `echoctl plugin emit recording_stopped '{"call":"2026-11-18_210000-made-up","duration_s":60,"reason":"user"}'`; then `echoctl plugin emit transcribed '{"call":"2026-11-18_210000-made-up","ok":true}'`; the check's state in `$S/vaults/acme-twin/lint.json` after each | "Waiting for a call's transcription to finish"; then the check runs and ends `done` (kept 0: its quote isn't on the page any more), one more run folder |
| 12 | Again with a recording going (`recording_started`, call `2026-11-18_220000-made-up`); *Run AI checks*; *Stop*; then `recording_stopped` and `transcribed` for it | "Stopped. Nothing was kept."; the check `stopped`, "Stopped"; no run folder added, `$S/locks` empty: nothing ran and the vault's check is free again |
| 13 | Echo transcribes a call already when the check is asked for — Echo's own word, no event: `F="$ECHOCTL_HOME/calls/2026-11-11_100000-acme-weekly-sync"; nohup sleep 300 >/dev/null 2>&1 & echo $! > "$F/.transcribing"` (the marker Echo keeps while a call transcribes, naming a live process); `obs lint '{"id":"acme-twin"}'`; then *Run AI checks* | The terminal refuses: "Waiting for a call's transcription to finish: Echo records first — try again once it is done"; the window: "Waiting for a call's transcription to finish. Recording comes first." with *Stop*, no run folder added |
| 14 | `kill "$(cat "$F/.transcribing")"`; `rm "$F/.transcribing"` (its literal path printed first); wait up to 70 s (the app looks every minute) | The check runs and ends `done`, one more run folder |
| 15 | The page's console | No error from the plugin |
