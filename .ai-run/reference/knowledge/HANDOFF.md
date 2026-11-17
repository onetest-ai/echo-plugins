# Knowledge migration — handoff to the plugins session (2026-11-17)

You own the plugin side of merging the outside Knowledge work (Vadim Vlasenko's onetest-ai/echo#677 + onetest-ai/echo-plugins#17)
into Echo. Echo's core side is done: every primitive the plugin needs is merged on onetest-ai/echo `main` (the microphone #723
is the only one still open and Knowledge doesn't need it). This file is the whole brief; the user's decisions below are final.

## Goal
The marketplace plugin **`obsidian`** becomes **1.0, shown as "Knowledge"** (same id, so installed 0.8 users update in place).
It absorbs Knowledge 0.1.1 (#17's client) and the vault engine of #677 (Rust in `crates/echoctl/src/knowledge/*`), rewritten as
plugin JS on top of Echo's generic primitives. **No `uses.knowledge`, no native `/api/kn`, no `Kn.*` hooks** — those are dropped.

## The user's decisions (2026-11-17)
1. Old 0.8 **facts vault** (Echo's own `vault/` in the plugin store, its pipeline, first fill, Notes tab, slot card): **deleted
   outright**, no export.
2. **Mail → Knowledge** returns as the plugin's own **routine** (manifest `routines`, core #730): off until the user switches it on.
3. **Echo's dictionary stays**: it normalizes the vault's tags/terms (the twin's TAG_TAXONOMY / TERMS_TAXONOMY) via
   `ctx.echo.dictionary`.
4. **Minutes export routes by thread/client**: each thread or client has a Knowledge vault (a default one, or its own) —
   thread's vault → client's vault → the default; a call in two threads with different vaults goes into **both**. The per-vault
   "scope" rules of #677 go. Export mode per vault auto/ask/off; **migrated 0.8 vaults get `ask`**, never auto. The setting lives
   on the thread/client page via a plugin slot (like `thread.profile`).
5. **The `twin` starter preset is kept** (23 files in #677 `crates/echoctl/templates/knowledge/twin/**`) as the vault preset;
   its skills install either in the vault's own `.claude/skills` (nested-project rule) **or globally — a plugin setting the
   user picks**.
6. **Ask (the chat UI of #677/#17) goes to a separate Chat plugin, LOW priority** — not part of Knowledge. "Ask the vault" =
   `ctx.claude.session({folder})` (core #724): an interactive Claude Code session in Echo's panel, in the vault as its own project.
7. **A vault is a nested Claude Code project**: runs in it load its CLAUDE.md, skills, hooks (`--setting-sources user,project`).
   Don't port #677's guard/VaultScope/skill "defang" — Echo's `ctx.claude.run({folder, mode})` (core #710) replaces them.
8. **Don't over-secure**: local, roughly trusted computer; lean on Claude Code's own permissions. Runs follow the user's
   routines setting (Auto default; `acceptEdits` where the model has no auto mode; Skip by the user's choice).
9. **No ledger ids to the user, made-up data only (acme.example), no real names** in code/tests/docs.
10. **Credit**: Vadim's ideas — the FIRST commit of the port in echo-plugins is authored
    `Vadim Vlasenko <33458204+vadimvlasenko@users.noreply.github.com>` (merged with a merge commit; no co-author trailers needed).
    #677 and #17 stay open as reference until the port lands, then close them with links.

## Core primitives to build on (all in Echo's `main`; API: claudecho `.ai-run/reference/plugins/plugin-api.md`, also `echoctl plugin guide`)
- **Files** (§ Folders and files): `ctx.system.pickFolder/pickFiles`, file handles (`ctx.files.read`, `ctx.fs.copyIn`),
  `ctx.onFileDrop` (macOS), `ctx.fs.write {ifSha, createNew}`, `append`, `mkdir`, `stat`, `search` (Rust, off the 5 s slice),
  `walk {sha}`, `snapshot` (copy into store cache), `ctx.store.update`, `ctx.crypto.sha256`; images of a granted folder at
  `/plugin/<id>/folder/<root>/<path>`.
- **Markdown** (§ Client half): `ctx.markdown(md, {breaks, links, images})` + `ctx.markdown.links(md)` — wikilinks, embeds,
  links pre-resolved by the plugin, allowlist enforced by Echo; missing pages as `a.md-missing[data-md-missing]`.
- **Git** (§ Folders and files): `ctx.git.info/status/log/show/init/commit` (only through Echo; the repo's own settings run nothing).
- **Claude**: `ctx.claude.run({folder, path?, mode: read|edit|copy})` (§ Claude runs) for Ingest/Health/AI checks (copy mode =
  a snapshot the plugin diffs and applies after review); `ctx.claude.session({folder, path?, mode})` for "ask the vault".
- **Echo data** (§ Echo's data): `ctx.echo.read('source'|'calls'|'calendar'|'me'|…)`, `ctx.echo.dictionary`; events
  `minutes_written` etc. (§ Events); **Microsoft 365 read-only** `ctx.m365.search/mailThread/chat` (§ Microsoft 365);
  a page the user types: `ctx.http.askAddress()` (`network.ask`).
- **Window** (§ Client half): `ctx.call(command, args, {files})` (POST, ≤ 4 MB), `onUnload`, `listenWindow`, `ui.patch`,
  `ui.stylesheet(path)`, slots incl. `call.row`, `thread.profile`, `knowledge.tab`, activities, panels, palette.
- **Routines** (§ Routines): manifest `routines` (prompt file in the package), user switches on; runs recorded with Echo's jobs.
- **Network**: `ctx.http.fetch/stream`, `ctx.net.websocket` to user-listed addresses (not needed for Knowledge itself).

## Sources to port from
- **Engine (Rust → JS)**: in the claudecho repo, `git fetch origin pull/677/head:pr-677`, then `git show pr-677:crates/echoctl/src/knowledge/<file>`.
  The inventory maps each module to ctx services and lists its tests to port: `docs/local/knowledge-merge/inv-B-engine.md`
  (in the claudecho repo). Data model = §2 there (the spec for the JS port).
- **Client**: echo-plugins `pr-17` ref (`plugins/knowledge/view.js` 3.5k, `model.js` 1k pure functions — reusable as is,
  `knowledge.css`); its ~95 node tests in `tests/knowledge/knowledge.test.mjs`; its route/action contract (~30 reads, ~40 `kn_*`
  actions) is listed in `docs/local/knowledge-merge/inv-C-plugins.md` §5 — re-plumb those onto the plugin's own commands.
- **Merge map** obsidian 0.8 ⟷ Knowledge (what to keep from which, migration): `inv-C-plugins.md` §3–§4.
- Keep from obsidian 0.8: the vault description for Claude (review + confirm), client/thread links, agent entries + catalog,
  hints, the JS index and its 10 session commands (`search, info, links, backlinks, resolve, tags, where, tasks, unresolved,
  rename_plan`).

## Suggested order (each a PR in echo-plugins, cases first)
1. Merged registry (obsidian ids + #677's Vault fields) in the plugin store; 0.8 → 1.0 migration (minutes `ask`; the facts vault
   removed; `folders.write` added → the update asks again); remove the old facts pipeline.
2. Pure modules + their tests (catalog, fm, diff, links, evidence, checks, `model.js`).
3. detect, scan/search (on `fs.search`), pages (Markdown, git history/restore, `ifSha` saves, conflicts), graph, activity.
4. Minutes export by thread/client vault (+ the thread/client slot), sources (files, calls, M365, typed web page), twin preset.
5. Health, lint/AI checks, Ingest with review — on `ctx.claude.run({mode: 'copy'})` + snapshot diff.
6. Client (#17's seven tabs minus Ask → "Ask the vault" opens `ctx.claude.session`), designs (see below), Knowledge tab.
7. The mail → Knowledge routine; dictionary tag normalization.
8. Scheduler: echo-plugins#19 (no "Read only"; Auto / Skip per routine).
9. Cases: #17's TC-001/002/004 rewritten on plugin fixtures, a 0.8 → 1.0 update case; close #677/#17.

## Designs
The user designs on a canvas first ("design on canvas first; inline not separate sections; icons; no nag bars; Echo tokens
everywhere"). Show the screens (Home, Pages, Graph, Ingest review, Health, Settings, the connect/new-vault sheets, the
thread/client vault row) as distinct directions before building UI, and get the user's pick.

## Process
- echo-plugins' own README/CLAUDE/rules; plugin authoring rules in claudecho `.ai-run/guides/plugins/plugin-authoring.md`.
- Tests first; functional runs on served Echo data from claudecho (`tests/fixtures/serve.sh`, `target/debug/echoctl` built
  from current main); never source a served `env` in the same Bash call as test runners; **only one agent per Mac drives the
  Playwright MCP at a time** (the claudecho session on this Mac also uses it — coordinate by message).
- An independent review before each merge; PR bodies without claude.ai session links.
- Report progress to the claudecho session ("claudecho-d2") by message when PRs land or a core gap shows up — core gaps
  are fixed there.
