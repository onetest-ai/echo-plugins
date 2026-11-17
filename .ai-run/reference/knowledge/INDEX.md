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

## Rule: nothing Echo already did is done again; any reprocessing is justified and batched (the user, 2026-11-17)
Knowledge takes Echo's results as they are — through its events and `ctx.echo.read` (a call's facts, resolved
participants, threads and client, AI profile, the minutes by section, transcript and chat, a mail as Recall stored it
without quotes, sender trust, dedup, the calendar with Echo's threads). It never fetches, parses or routes them again.
Whatever it does on top of them is listed here with its reason; anything new needs a row before it is built.

| What Knowledge does after Echo | Why Echo's result isn't enough | Model? | How it is batched |
|---|---|---|---|
| An event (`minutes_written`, `sources_changed`) puts the source in its vault's queue | Echo doesn't know vaults; routing thread → client → default vault is the plugin's | no | per event: queue only, no write into the vault |
| A call's minutes become a vault note (its folder, file name, properties, index row, `log.md` line) | The vault keeps notes in its own shape; the content stays Echo's minutes | no | notes written as they come; one commit per quiet window (or one for "save past minutes") |
| Ingest: the vault's own skill turns queued sources into its pages | Echo doesn't know the vault's structure, taxonomy and rules — the vault's skill does | yes | one run per vault over everything queued, on a copy: on Prepare, or by the vault's rule at most every N sources / N hours, never during a recording; all changes in one review |
| A mail's own text (body, to/cc, attachment names) read through `ctx.m365.mailThread` | Recall keeps no message text by design (only facts with quotes); a vault's skill may need the mail itself | no | only when a batch is prepared, once per message in it — never on the event (the queue holds Recall's facts and routing) |
| On the app's start, the calls with minutes and Recall's mail since the last day seen (`echo.read('calls' \| 'sources', {since})`) go through the same routing as the events | Echo's events aren't replayed: a call or mail that came while the plugin wasn't running would never reach its vault | no | once a start; only what came since the last day seen, each only when its record or ledger doesn't have it already (a note never written again by a catch-up) |
| A queued call's minutes written into the vault's sources folder as a file (`echo/<date>-<slug>.md`: Echo's properties, then Echo's minutes as they are; transcript and chat only when the vault asks) | The vault's ingest skill reads files of its sources folder; the text stays Echo's | no | only when a batch is prepared (`prepare_sources`), once per call (the ledger remembers it, also once its file is deleted); one commit for the batch |
| Health's AI check | Contradictions and stale pages are about the vault's own text | yes | on the user's click only |
