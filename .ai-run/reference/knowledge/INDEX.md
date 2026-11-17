# Knowledge (the plugin `obsidian` 1.0) — the port's reference

Everything about the Knowledge plugin lives in this repository; Echo's core keeps only generic slots and services
(and its own section is called Recall since onetest-ai/echo#753). The tracking PR is #22 (`knowledge-1.0` → `main`).

## What is here
- `HANDOFF.md` — the brief the port started from (2026-11-17): the user's decisions, the core primitives, the order.
  Later decisions below win over it.
- `README.md` — the summary of the inventories; `inv-A-integration.md` (the window, guard, chat, terminal),
  `inv-B-engine.md` (#677's engine module by module — §2 is the data model the JS port follows), `inv-C-plugins.md`
  (Obsidian 0.8 × Knowledge 0.1.1: overlap, migration, #17's route and action contract), `P2-files.md`.
- `from-echo-677/` — #677's own documents, as they were on its branch: `design.md` (how the engine works, decisions
  D1–D44, files and state, what was measured, known gaps), `tests-12-knowledge.md` (its release gate), `TC-060.md`,
  `S-35.md`. Reference only: where they say "Echo's native …", the plugin does it now.

## Decisions since the handoff (the user, 2026-11-17)
- **The UI is #17's, ported as is** — its components and classes (`view.js`, `model.js`, `knowledge.css`) — not a
  new design. Its Ask tab goes: "Ask the vault" opens Claude Code in Echo's panel (`ctx.claude.session`).
- **Its place is the plugin's own activity "Knowledge"** (`ctx.activities.add`, full screen, its own routes), with
  #17's tabs drawn inside it. Not tabs in Echo's section (that core PR was closed).
- **Every design, component and word of Knowledge ships in the plugin**; core gives generic slots only: `call.header`
  (the chip on a call's page), `call.minutes` (the "Then saved to…" line), `call.menu` items, `ctx.ui.sheet`,
  `ctx.where().recall`, an activity's `badge()` and `editing()`, `thread.profile` / `client.profile` and
  `ctx.threads` / `ctx.clients` (#746).
- **Calls and mail come in from Echo's events**, not a routine: `minutes_written`, `sources_changed` (Recall on),
  each source routed thread → client → default vault, queued or prepared per the vault's rule, every change reviewed;
  a catch-up from `ctx.echo.read('sources', {since})` on start.
- From the handoff, still standing: the 0.8 facts vault deleted; minutes routed thread → client → default with
  auto/ask/off per vault (migrated vaults `ask`); Echo's dictionary normalises tags; the twin preset kept, its skills
  in the vault or global (a plugin setting); a vault is a nested Claude Code project; no ledger ids, made-up data
  only; the first commit of the port authored by Vadim Vlasenko.
