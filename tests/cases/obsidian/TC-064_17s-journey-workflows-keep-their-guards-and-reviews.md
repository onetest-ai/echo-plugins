---
id: TC-064
title: "#17's journey, part 2 — workflows keep their guards and reviews: minutes saved once and a changed note kept, Ask the vault in Echo's panel, Mail and Teams without a sign-in said, an Ingest run on a copy reviewed with the user's own text written exactly, an AI check's quotes checked and its inserted summary applied once"
priority: critical
type: functional
requirements: [F-OB-38, F-OB-45, F-OB-52, F-OB-57, F-OB-58, F-OB-59]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, window, ingest, health, minutes, from-17]
---

# TC-064: #17's journey — workflows keep their guards and reviews

From onetest-ai/echo-plugins#17's `tests/cases/knowledge/TC-002`, on this plugin's fixture. #17's Ask, Curate and
Research chat is gone in 1.0 (README, *From #17*): its place is *Ask the vault* (step 3).

## Preconditions
- A fresh environment from `up.sh` (`DATA_NOW=2026-11-17T20:00`), `. <dir>/env`,
  `obs() { echoctl plugin call obsidian "$@"; }`, `T="$VAULTS/acme-twin"`, `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`,
  `snap() { (cd "$T" && find . -path ./.git -prune -o -type f -exec cksum {} + | sort); }`; no fake Microsoft 365
  (Echo isn't signed in); `command -v claude` inside `<dir>`
- acme-twin connected and the default vault, commit on: `ECHOCTL_PICK_FOLDER="$T" obs add '{"wait":true}'`;
  `obs default '{"id":"acme-twin"}'`; `obs set '{"id":"acme-twin","key":"commit","value":"on"}'`;
  `obs baseline '{"vault":"acme-twin","done":true}'`
- `C=2026-11-10_100000-acme-weekly-sync` (the standard data's call with minutes, profile `work`)
- Window steps with headless Playwright at 1440×900

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs save_minutes "{\"call\":\"$C\"}"` twice; `ls "$T/knowledge/notes" \| grep -c acme-weekly-sync` | The first saves the note (its path under `knowledge/notes/`); the second answers `unchanged`; `1`: no second note |
| 2 | The user changes the note (`printf '\nMy own line.\n' >> <the note>`); `obs save_minutes "{\"call\":\"$C\"}"`; `tail -1 <the note>` | "kept": Echo's minutes written again don't go over the user's change; "My own line." still last |
| 3 | `#obsidian:knowledge/acme-twin/home` → *Ask the vault* | Echo's panel opens on "Claude · Knowledge" in `$T` (the fake Claude ends at once); nothing typed |
| 4 | Ingest → *Add a source* → *Mail or Teams*; type a word ("pilot") | First "Type to search mail and Teams chats of the last 90 days. …"; once a search is asked: "Mail and Teams chats come through Echo's Microsoft 365 sign-in, and Echo isn't signed in. Sign in from Settings → Calendar & chat." — nothing reached |
| 5 | *A call or memo* | The standard data's calls to pick from, by day; *Cancel* |
| 6 | The fake's scenario `<dir>/fake-ingest.json`: `{"write": {"knowledge/topics/pilot.md": "---\ntitle: Pilot\ntags: [concept]\n---\n# Pilot\n\nThe pilot moves to 18 November.\n", "knowledge/topics/budget.md": "---\ntitle: Budget\ntags: [concept]\n---\n# Budget\n\nThe budget is made up.\n"}, "append": {"knowledge/clients/acme.md": "\n- The pilot moves to 18 November.\n"}, "answer": "Made-up run."}`; a made-up source `printf -- '# Pilot\n\nThe pilot moves to 18 November.\n' > "$VAULTS/pilot.md"`; `obs add_source '{"vault":"acme-twin","kind":"file"}' --file "$VAULTS/pilot.md"`; `B="$(snap)"`; `obs ingest_go '{"id":"acme-twin","sources":["raw_inbox/pilot.md"]}'`; `[ "$(snap)" = "$B" ] && echo unchanged` | `state` "review", 3 changes; `unchanged`: the run worked on a copy, the vault untouched |
| 7 | Ingest → the run: pilot.md → *Edit*, its text replaced by the user's own (`# Pilot\n\nOur own words.\n` after its properties), *Use my text* (it approves the change: "Approved · your text"); budget.md *Reject*; acme.md left undecided; meanwhile `printf -- '- By hand.\n' >> "$T/knowledge/notes/2026-01-08-weekly.md"` (a page the run didn't touch) | *Write 1 approved* |
| 8 | *Write 1 approved* | "Wrote knowledge/topics/pilot.md into acme-twin. Committed (<id>)."; its card *Written* shows the user's text; acme.md still waits |
| 9 | `cat "$T/knowledge/topics/pilot.md"`; `ls "$T/knowledge/topics"`; `git -C "$T" status --porcelain` | Exactly the user's text ("Our own words."), not the run's; no budget.md; only the user's own edits uncommitted — the weekly note and step 2's line in the minutes note (Echo never commits a note the user changed) |
| 10 | The fake's AI check answer — a missing summary of topics/rollout.md whose fix inserts one under its heading, and a finding whose quote is invented: `printf 'Check these pages of the vault\t%s\n' '{"type": "result", "subtype": "success", "is_error": false, "result": "{\"findings\": [{\"kind\": \"missing_summary\", \"title\": \"Rollout by region has no summary\", \"note\": \"A line on top helps.\", \"pages\": [{\"path\": \"knowledge/topics/rollout.md\", \"quote\": \"EU first, then the US.\"}], \"fix\": {\"path\": \"knowledge/topics/rollout.md\", \"old\": \"# Rollout by region\\n\", \"new\": \"# Rollout by region\\n\\n> Summary: EU first.\\n\"}}, {\"kind\": \"stale\", \"title\": \"Invented\", \"pages\": [{\"path\": \"knowledge/topics/rollout.md\", \"quote\": \"The rollout starts in Asia.\"}]}]}", "total_cost_usd": 0.05, "duration_ms": 900, "num_turns": 2, "usage": {"input_tokens": 2400, "output_tokens": 350, "cache_read_input_tokens": 0, "cache_creation_input_tokens": 0}}' >> <dir>/fake-answers.tsv`; `obs lint '{"id":"acme-twin"}'` | `done`, `kept` 1, `dropped` 1: the invented quote is not on its page |
| 11 | Health → AI → the summary finding → *Fix* | "Fixed: knowledge/topics/rollout.md. …"; the finding leaves the list |
| 12 | `grep -c 'Summary: EU first' "$T/knowledge/topics/rollout.md"`; `obs lint '{"id":"acme-twin"}'` (the same answer again); `obs health '{"id":"acme-twin"}'` | `1`; the check now `kept` 0: the summary is there already, so the same fix is never offered twice; no AI finding for rollout.md |
| 13 | The page's console | No error from the plugin |

## Clean up
`down.sh <dir>`.
