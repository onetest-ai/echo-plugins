# Knowledge (the plugin `obsidian` 1.0) — the port's reference

Everything about the Knowledge plugin lives in this repository; Echo's core keeps only generic slots and services
(its own section was Recall since onetest-ai/echo#753; the collection is Intake, Settings → Intake, since onetest-ai/echo#812). The tracking PR is #22 (`knowledge-1.0` → `main`).

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
- **Calls and mail come in from Echo's events**, not a routine: `minutes_written`, `sources_changed` (Intake on),
  each source routed thread → client → default vault, queued or prepared per the vault's rule, every change reviewed;
  a catch-up from `ctx.echo.read('sources', {since})` on start.
- From the handoff, still standing: the 0.8 facts vault deleted; minutes routed thread → client → default with
  auto/ask/off per vault (migrated vaults `ask`); Echo's dictionary normalises tags; the twin preset kept, its skills
  in the vault or global (a plugin setting); a vault is a nested Claude Code project; no ledger ids, made-up data
  only; the first commit of the port authored by Vadim Vlasenko.

## Rule: nothing Echo already did is done again; any reprocessing is justified and batched (the user, 2026-11-17)
Knowledge takes Echo's results as they are — through its events and `ctx.echo.read` (a call's facts, resolved
participants, threads and client, AI profile, the minutes by section, transcript and chat, a mail as Intake stored it
without quotes, sender trust, dedup, the calendar with Echo's threads). It never fetches, parses or routes them again.
Whatever it does on top of them is listed here with its reason; anything new needs a row before it is built.

| What Knowledge does after Echo | Why Echo's result isn't enough | Model? | How it is batched |
|---|---|---|---|
| An event (`minutes_written`, `sources_changed`) puts the source in its vault's queue | Echo doesn't know vaults; routing thread → client → default vault is the plugin's | no | per event: queue only, no write into the vault |
| A call's minutes become a vault note (its folder, file name, properties, index row, `log.md` line) | The vault keeps notes in its own shape; the content stays Echo's minutes | no | notes written as they come; one commit per quiet window (or one for "save past minutes") |
| Ingest: the vault's own skill turns queued sources into its pages | Echo doesn't know the vault's structure, taxonomy and rules — the vault's skill does | yes | one run per vault over everything queued, on a copy: on Prepare, or by the vault's rule at most every N sources / N hours, never during a recording; all changes in one review |
| A mail's own text (body, to/cc, attachment names) read through `ctx.m365.mailThread` | Intake keeps no message text by design (only facts with quotes); a vault's skill may need the mail itself | no | only when a batch is prepared, once per message in it — never on the event (the queue holds Intake's facts and routing) |
| On the app's start, the calls with minutes and Intake's mail since the last day seen (`echo.read('calls' \| 'sources', {since})`) go through the same routing as the events | Echo's events aren't replayed: a call or mail that came while the plugin wasn't running would never reach its vault | no | once a start; only what came since the last day seen (moved on only when both reads answered), each only when its record or ledger doesn't have it already (a note never written again by a catch-up) |
| A queued call's minutes written into the vault's sources folder as a file (`echo/<date>-<slug>.md`: Echo's properties, then Echo's minutes as they are; transcript and chat only when the vault asks) | The vault's ingest skill reads files of its sources folder; the text stays Echo's | no | only when a batch is prepared (`prepare_sources`), once per call (the ledger remembers it, also once its file is deleted); one commit for the batch |
| Echo's people (`echo.read('people')`: places, `reports_to`, `reports`) become person pages, `<pages>/people/<Name>.md` (Echo's properties only — origin, echo, reports_to, reports, threads — merged into the user's page; a new page's index row; a `log.md` line a batch) | The vault keeps people as pages of its own, where the user and Ingest write about them; Echo doesn't know vaults, and has no people-changed event to follow | no | in batches only, never per event, a page written only when Echo's properties changed, one commit of Echo's files a batch: with a call's minutes note (its participants, in the note's batch and commit) when the vault's minutes are Automatic; the catch-up on start at most once a day (Automatic vaults); `people_sync` / Settings → People on the user's click (any mode; the only one that writes a deleted page again) |
| Health's AI check | Contradictions and stale pages are about the vault's own text | yes | on the user's click only |

## Done (2026-11-18)
The port is complete in `knowledge-1.0` (tracking PR #22 → `main`); Knowledge 1.0.0 needs Echo 0.10.0.
- #20 one registry, from Obsidian vaults 0.8 (vaults kept, minutes on Ask, the facts vault deleted)
- #21 the engine's pure parts from #677 · #24 detect, index, search, pages, history, graph, checks, activity
- #28 minutes routed thread → client → default, sources, the twin preset, the vault rows; events into a queue
- #29 Health's fixes, AI checks, Ingest runs with review · #27 #17's UI as the plugin's own activity "Knowledge"
- #25, #26 the rule above (reprocessing justified and batched; a mail's text read only when a batch is prepared)
- #30 Scheduler 0.8.0 (Auto or skip every check; needs Echo 0.10.0)
- #31 Echo core's new APIs adopted (stamps, vault and global skills, web pages, strict reads, hidden folders) and tags
  through Echo's dictionary
- #23 this reference
- #32 step 9: #17's cases on this plugin's fixture (TC-063–TC-067; what 1.0 dropped is in
  `tests/cases/obsidian/README.md`, *From #17*), the 0.8 list cut short (TC-068), the full Knowledge and Scheduler
  suites as the release gate. #17 and onetest-ai/echo#677 close with it.

## Done (2026-11-18, after 1.0)
- Knowledge 1.1.0 (`knowledge-people`): Echo's people as person pages in the vault, routed thread → client → default
  as minutes are, batched by the rule's row above (needs Echo 0.10.1: onetest-ai/echo#813's places and reporting line).
  Choices within the user's decision: a person's threads are their places, then the open threads they were seen in
  (no role); a people folder is the pages folder's own `people` (any case), else `people/` in it — Echo's detection
  names none; a link (`reports_to`, `reports`) is `[[<file stem>|<name>]]` to the page as it is named now, else the
  name; manual `save_minutes` into an Ask vault writes no person pages (Ask and Off: only on Update); the twin preset
  gets `knowledge/people/README.md` and a People table.
- Its review (same branch): the page's heading is the name as text (`mdText`); the index cell is made as a note's row
  is (`catalogCell`: one line, `|` as `/` — no more, as for the notes); a page of the user's with the person's file
  name and no `echo:` is left alone by the automatic batches and adopted by `people_sync`; Echo's properties are
  compared by value; a blank or comment line inside Echo's `threads:` block belongs to it; one index write, one activity
  row and a breath of Echo's host every 25 pages a batch, rows a stopped run owed kept in the ledger (`unindexed`).
- **The AI-profile gate on person pages.** A thread's place goes into a vault only when the thread's AI profile is
  known and is the vault's, as a call's minutes go only to a vault on their profile. `echo.read('threads')` gives no
  profile, `ctx.threads` holds only the plugin's own values, and a mail source's profile is its threads' only when
  they agree; the most direct source a plugin has is calls — each carries the `profile` Echo pinned on it
  (`ai::call_profile_id`). One `echo.read('calls', {limit: 500})` a run (each read of calls is Echo computing People
  once; a run is a save's batch, an Update, or the catch-up over every vault), grouped by thread: a thread's profile is
  known when its newest calls in it alone (20 at most) all have one. Otherwise — two profiles, or no call in the newest
  500 — it is unknown and its place goes into no vault (Settings → People says how many threads were left out).
  `reports_to` / `reports` name only people with a place in the vault, so no one's name crosses to a vault on another
  profile. When onetest-ai/echo#818 lands (a thread's own profile in `echo.read('threads')`), the gate uses it and the
  calls read goes.
