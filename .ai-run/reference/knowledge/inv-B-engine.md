# Inventory B: PR #677 Knowledge domain engine (`crates/echoctl/src/knowledge/`, minus chat/stream/transcript)

Source: `git show pr-677:…` (extracted read-only to `scratchpad/pr677/`). Line counts: code / tests (inline `mod tests`
plus the external `*_tests.rs` or `<mod>/tests.rs`). Total for this slice: about 11.9k code lines and 7.0k test lines,
plus 23 twin template files.

Legend. **Dest**: PLUGIN-JS (`obsidian` plugin host half `main.js`, or `client.js` where noted), CORE-PRIMITIVE, or
DROP. **NEW:x** means the service `x` does not exist yet. A proposed generic name is given; the deduplicated list is
in §3. **Diff**: porting effort to JS (S, M or L).

## 1. Module table

| Module | Code / tests | What it does | Echo core it calls | Persistent state | Dest + ctx services | Diff, blockers |
|---|---|---|---|---|---|---|
| `mod.rs` | 553 / 163 | Vault registry: `Vault {id,name,root,profile,detected,overrides,minutes:MinutesRule,git:GitRule,ask,ingest:IngestRule,template,added_at}`. Calls: add (detect only, writes nothing in the vault), set (≈20 keys, validated), remove, reread. Refuses nested, duplicate, home-folder and data-folder roots. Refuses changes from headless runs. Imports the old `obsidian` plugin's granted folders. | `paths::state_dir/home/write_atomic`, `app::FileLock`, `recorder::slugify`, `ai::default_id`, `ai::Settings` (profile names), `notes::headless`, `grants::folders("obsidian")` | `<state>/knowledge/vaults.json` (pretty JSON) under `vaults.lock`. `<state>/knowledge/<id>/` is the per-vault cache folder. | PLUGIN-JS: `ctx.store` (vaults.json), `ctx.system.pickFolder`, `ctx.fs.folders/forget`, `ctx.profiles()`. **NEW:** `ctx.store.update` (lock + re-read; app and CLI both write). The headless refusal already exists (`read_only_here`). | **S.** Canonicalising paths and the nested/overlap checks need **NEW:** `ctx.fs.stat` / realpath, or `pickFolder` can enforce them. |
| `api.rs` | 717 / 376 | The window's `/api/kn/*` routes and `kn_*` actions, the folder/file picker handshake, drag-drop, and background jobs that the page polls. | `calls::resolve_call/stamp_of/by_stamp`, `app::choose_folder/choose_files`, `brain::enabled`, `paths::calls_dir` | in-memory job table | **DROP.** It becomes `ctx.command(...)` handlers plus `client.js`. Jobs become async commands with progress in `ctx.store`. **NEW:** `ctx.system.pickFiles`, and dropped files handed to the host half (client drop → file tokens). | S (glue). The 13 route tests are a checklist of commands. |
| `activity.rs` | 127 / 87 | Append-only activity log (`Entry {at,path,kind:new/edit/commit,by,ref,plus,minus,commit,also[]}`), last 2000 lines kept. Read by Home's "What's new". | `paths::write_atomic`, `app::FileLock` | `<cache>/activity.jsonl` under `activity.lock` | PLUGIN-JS: `ctx.store` (+ **NEW:** `ctx.store.update` or append-with-lock) | S |
| `catalog.rs` | 169 / 81 | Pure text logic for index (CATALOG.md) tables: finds the notes table, inserts a row in date order, updates "Last update:", escapes cells, `table_of_row`, `insert_row` (run rows into the table as it is now). | none | none | PLUGIN-JS (pure) | S. All 7 tests port as node tests. |
| `checks.rs` | 251 / 55 | Deterministic health checks: unindexed pages, broken links, isolated pages, pages without properties, disallowed tags, index rows pointing to missing pages, usual-folder properties (80% of folders with ≥5 pages), duplicate titles, oversized index (bytes/rows). Taxonomy tag parsing; `meeting_tag`. | none (Index, Vault) | none | PLUGIN-JS (pure, over the index). It needs `ctx.fs.walk` (exists) to check whether non-page link targets exist. | S |
| `defang.rs` | 270 / 107 | Before a vault's skill goes into a Claude run, strips frontmatter keys that widen the run (`hooks`, `allowed-tools`, `permissionMode`, in any case or spelling). Removes `` !`cmd` `` preprocessing (iterated to a fixed point). Drops `hooks/` and `hooks.json`. Treats unreadable frontmatter as text. Reports what it left out. | none | none | **CORE-PRIMITIVE.** Security gate on untrusted text that a plugin hands to a Claude run. It belongs in core's `ctx.claude.run({skills})` path (the same family as the package-skill checks), so no plugin can skip it. The plugin only shows the "left out" line. | Logic is S. The 6 tests stay in Rust. |
| `detect.rs` | 243 / 74 | Reads a folder's shape: pages root (`.obsidian` within 2 levels, else knowledge/wiki/pages/docs/vault holding ≥60% of .md files, else the root), index (CATALOG/INDEX/index/Home/README), notes folder and naming style (date-slug or "date title"), templates (`.obsidian/templates.json`), taxonomies, schema (AGENTS/CLAUDE.md), skills (`.claude/skills`, `.claude/commands`, `.agents/skills`), sources (raw_inbox…), staging, ledgers, log.md, Obsidian app.json settings, counts. Walk is capped at 60k entries. | `fm` | none (result stored in the registry) | PLUGIN-JS: `ctx.fs.list` (+ hidden dot folders), `ctx.fs.read` (`.obsidian/*.json`), `ctx.fs.walk` | S–M. `fs.list` returns no size or mtime. Check that dot paths are readable with `fs.read`. |
| `diff.rs` | 90 / 59 | Line diff (LCS after trimming the common prefix and suffix). Falls back to "all removed / all added" above the size caps. Builds hunks and counts. | none | none | PLUGIN-JS (pure) | S. Watch the 5 s slice: the cell cap must stay. |
| `evidence.rs` | 56 / 56 | "Came from" check: a quote of ≥3 normalised words must appear as one contiguous run in the source. Finds the lines it spans. Recognises text-source extensions. | `ledger::norm` | none | PLUGIN-JS. Port `ledger::norm` exactly (lowercase, curly quotes to `'`, alphanumeric/`_`/`'` runs). | S. Port all 4 tests, including the Cyrillic one. |
| `export.rs` | 841 / 739 | Turns a call's minutes into a vault note, with no model. Builds frontmatter (title, date, meeting+platform, tag, participants, duration, client as a wikilink, threads, `source: echo://call/…`, `origin: echo`, `echo_call`, summary) and the body from `notes.md`, plus transcript and chat if enabled. Names the file per the vault's naming, inserts the index row, appends the log line, commits when allowed. Never overwrites a note the user edited (sha check): result is kept, new-note or replace. Applies rules: mode auto/ask/off, scope all/calls/some(clients, threads), strict profile routing with "anyway". Has past-minutes backfill (one commit), preview, sample, and the new-calls rule (`ingest.calls` add/prepare starts an ingest run). Hooks: `minutes_written`, call chip (targets, failure, stale, rule_failure). | `calls::read_json/all_calls/stamp_of/resolve_call`, `memo::is_memo`, `projects::of_call/clients`, `ai::call_profile_id`, `attention::stale`, `recorder::slugify`, `app::FileLock` | **`<call>/knowledge.json`** (the call folder: `{choice, saved[{vault,path,sha256,at,how,state,index,commit,anyway}], failed[], rule_failed[]}`) under `<call>/.knowledge.lock`. `<cache>/save.lock` serialises a vault's saves. | PLUGIN-JS: `ctx.on('minutes_written')`, `ctx.echo.read('source','call:…')` (gives notes, title, date, threads, profile, transcript), `ctx.echo.read('clients')`. **NEW:** extend the `source` payload with `started_at`/`ended_at`, `app` (platform), attendees, memo flag, `chat` text, and the thread's client name; **NEW:** `ctx.echo.read('calls', {q, since, limit})` (named on the sheet, not served) for past-minutes backfill, the picker and the sample. The per-call record moves to `ctx.store` keyed by call stamp (a plugin can't write into a call folder). Call-chip UI needs a call slot (`ctx.slots.add`, if a call-row slot exists) plus `ctx.inbox.set` for failures. | **M.** Blockers: richer call facts; call list; a UI slot on calls. 36 acceptance tests, all worth porting (see §5). |
| `extract.rs` | 904 / 299 | Web page to Markdown source. Fetches with `curl` (https only, GET, no cookies, ≤5 https redirects, 5 MB, 20 s, html/text/md). Own small HTML parser: main is the largest `<article>`, else `<main>`, else `<body>`. Drops nav, scripts, header, footer, aside and forms. Keeps headings, paragraphs, lists, https links, code and tables. Escapes text with `md_text` so it can never become markup. Refuses short pages. | `app::NoWindow` (curl spawn) | temp body file | PLUGIN-JS for the parser. Fetching via `ctx.http.fetch` needs **NEW:** fetching a URL the user just typed, on any https host (the `network.hosts` grant is static). `ctx.http.fetch` doesn't follow redirects, so the plugin follows them itself and checks each is https. | **M.** The parser is about 600 lines of hand-written Rust and ports directly (no libraries). Has 15 tests with fixtures in `testdata/web/*.html`. |
| `fixture.rs` | 0 / 64 | Test helpers: a twin-shaped vault, snapshots, a fake call. | | | DROP (rewrite as node test helpers) | |
| `fm.rs` | 204 / 70 | Frontmatter reader for the subset Obsidian writes (scalars, quoted strings, inline and block lists, comments, Cyrillic). Anything else is kept raw. Never rewrites. | none | none | PLUGIN-JS (pure). Note: there is no YAML library in the host half. | S. Port all 6 tests. |
| `git.rs` | ~255 / ~131 | Restricted git: program lookup, `run` with timeout (TERM then KILL, drains both pipes), `info` (top, branch, dirty count, busy merge/rebase), `identity`, `init` on main, `first_commit`, `dirty(paths)` (unknown counts as dirty), `blocked`, `commit_paths` (literal pathspecs, only Echo's files, hooks run, never push/pull/amend/--no-verify). | `app::find_program`, `app::NoWindow` | none | **CORE-PRIMITIVE.** It spawns processes, needs a verb allowlist, literal pathspecs, timeouts and confinement to granted folders. A plugin can't spawn git (`ctx.scripts` needs an interpreter and a skill folder, and isn't verb-limited). Proposed **NEW:** `ctx.git.*` (see §3). The plugin keeps the policy: when to commit, messages, and the dirty-before rule. | Core keeps the module. Its 6 tests stay in Rust. |
| `health.rs` | 1113 / 510 | Health: findings with stable keys (code checks + AI findings that still hold), score over §5.7 categories with weights, per-day score history (90 days), ignore list. Fixes are computed as diffs and written only over the text they were computed on: relink to closest page (edit distance ≤2, ≤⅓ changed), retag, unlink, add properties, add index rows. Fix-all applies only certain fixes, one commit, log line, under the vault's save lock. Code checks cached per revision. | `paths::write_atomic`, `app::FileLock` | `<cache>/health.json` `{history:[{day,score,categories}], ignored:[key], ai:{at,run,cost,kept,dropped}}` under `health.lock` | PLUGIN-JS: `ctx.store`, `ctx.fs.readMany/write`; **NEW:** `ctx.fs.write` with an `ifSha` compare-and-swap (base check) or a stat/mtime check; **NEW:** `ctx.git.*`; **NEW:** `ctx.store.update`; sha256 (**NEW:** `ctx.crypto.sha256`, or JS) | **L** by size, but pure logic. The 5 s slice: compute over an index already in memory; edit distance is bounded. 18 acceptance tests. |
| `home.rs` | 750 / 496 | Home tab. What's new (last N days): merges Echo's activity lines, git commits Echo didn't make and uncommitted changes Echo didn't write, else mtimes. Echo's own writes are recognised within a slack. Git read in the background, cached by git-file stamps, with ready/pending/failed/none states. Ask suggestions (≤4): next meeting a client page is about (title or attendee domain, skipping own domains and webmail), newest note, action-items folder, a Health contradiction. Health card, Coming in (ingest), Most linked (hubs), vault card, fresh-vault 3 steps. | `window::cached_meetings`, `watch::agenda`, `meeting::MeetingContext/Person`, `config::Config` (me), `graph::account`, `terminal::live_session`, `guard::RUN_CHAT` | none (reads caches) | PLUGIN-JS + `client.js`. **NEW:** `ctx.echo.read('calendar', {from, to})` (cached events with attendee addresses, never a fetch); **NEW:** `ctx.echo.read('me')` (name plus own mail domains / M365 account); **NEW:** `ctx.git.log/status` (read-only, async). Conversations come from the other inventory (chat). | **M.** Git stamping (reading `.git/HEAD` and index mtimes) can be replaced by asking `ctx.git` for HEAD, with a cache. 12 tests. |
| `ingest.rs` | 1296 / 1359 (incl. review) | Ingest runs. Picks the vault's ingest skill (setting, else `process-inbox`, else one named inbox/ingest). Makes a scratch copy of the vault (skips .git, node_modules and dot folders except .claude/.agents/.obsidian without plugins/; skips non-md files over 20 MB, links, and the sources folder except picked files) plus `bases.json` sha map and `base/` index+log. Builds a defanged plugin of the skill. Runs headless Claude on the vault's profile under the guard in ingest mode (writes only in the copy; tools without Bash, web or MCP), with a 20-min cap. Waits while a call is recorded or transcribed. Takes one-run-per-vault `run.lock`, a profile lease, and a stop/close_profile/close_all. Stream log `log.jsonl`. `forget_session` deletes the run's Claude session files. Tidies (30-day failed runs, LISTED). Status/value/waiting (Needs you)/requeue. | `ai::ready/prepare_claude/Profile/term_group/finish_stop_group/lease`, `guard::settings_for/RUN_MODE/RUN_DIR/RUN_SOURCES/RUN_SKILLS/in_plugins`, `paths`, `app::FileLock/process_alive`, `ps` (pid check), `stream::Parser` (other inventory), `terminal::hold` | `<cache>/ingest/run.lock`; `<cache>/ingest/<run>/{vault/, bases.json, base/, plugin/, settings.json, prompt.md, log.jsonl, review.json}`; runs in the ledger `<cache>/ingest.json` | Split. **CORE-PRIMITIVE / NEW:** a guarded, scoped Claude run: `ctx.claude.run({profile, cwd: <scratch or granted folder>, write: [scratch], read: [...], tools: [...], skills: [{files}] (core defangs), timeout, stream → onEvent/log, waitForCalls: true, forgetSession: true})` returning `{runId}` with `ctx.claude.status/stop`. **NEW:** `ctx.fs.snapshot(root, {exclude, include, maxBytes})` → a scratch folder under the plugin cache, readable through `ctx.fs.*` with the scratch as a root (a copy of 5000 pages has to run off-slice; the test copies 5000 pages). Everything else (skill choice, prompt, ledger, tidy, status, requeue) is PLUGIN-JS on `ctx.store`. | **L.** Blockers: today `ctx.claude.run` only runs as the folder session with `dir` in the store. It has no cwd in a granted folder, no write scope, no tool list, no stream, no stop, no lease or call-wait. A process spawn can't happen in JS. |
| `ingest/review.rs` | 715 / (in ingest tests) | When a run ends: walks the copy against `bases.json` to find created or changed files. Refuses unwritable paths (instruction files, tools' files, sources). Shows each change's diff and quotes from the run's `.echo-ingest/changes.json`, checked by `evidence` against the run's own sources. A rejected new page also drops its index rows and log lines (D28). User decisions: approve, reject, edit, take (stored in `review.json`). Writes approved changes: index/log "adds only" changes are re-applied as row inserts or appended lines onto the current file; other files only if the vault still matches the base; then one commit of clean files, activity lines, sources marked Done, copy deleted. Discard. | `paths`, plus `catalog, diff, evidence, export, git, page, scan, sources, activity` | `review.json` (lock + re-read + atomic) | PLUGIN-JS: `ctx.fs.walk/readMany` on the scratch root, `ctx.fs.write` with **NEW** `ifSha`/`createNew`, **NEW** `ctx.git.commit`, `ctx.store` | **M–L.** Hashing thousands of files needs `ctx.crypto.sha256` (or `walk` returning sha). The "writable" list (guard rules) must match core's guard: expose it through **NEW** `ctx.fs.isInstructionFile(path)`, or keep a copy in the plugin. |
| `links.rs` | 193 / 77 | Obsidian link resolution: relative Markdown links, wikilinks by path then by name (shortest path), percent-decoding, normalisation that never leaves the vault. Edges, backlinks, graph JSON (links, tags or both modes; hubs = the index page plus pages linking to >40% of pages). | `scan` | none | PLUGIN-JS (pure) | S |
| `lint.rs` | 735 / 588 | AI checks. A guarded read-only Claude run in the vault itself on the vault's profile. Tools `Read,Grep,Glob,Write`; the only write is its own `findings.json` outside the vault. Scope: ≤300 pages (when there are more, pages changed in the last 30 days plus the pages they link to). Each finding is kept only if every quote is on its page (`evidence`) and its fix's `old` text appears exactly once. Keeps at most 200; kept findings are re-checked each time Health computes. One check per vault, stop, close. | `ai`, `guard::settings_for`, `ledger::norm`, `app::process_alive`, `ingest` run machinery, `stream` | `<cache>/lint/run.lock`; `<cache>/lint/<run>/{settings.json, prompt.md, log.jsonl, run.json, findings.json, kept.json}` (last 10 kept); `health.json.ai` | PLUGIN-JS for policy and the finding checks. The run itself needs the same **NEW** guarded scoped run (cwd = granted vault, read-only there, write = run dir). | **M.** Same blocker as ingest. 14 tests; the finding-validation ones port as node tests. |
| `page.rs` | 735 / 447 | Pages. Path check `inside` (relative, no `..`, no drive or device names, canonical stays in the vault). Editable and source classification. Read to safe HTML with links (`#kn:`, `#kn-new:`, asset route), backlinks with context lines, local graph, `obsidian://` URI. Save only over base sha256 (CRLF kept, 2 MB edit cap). Create from a template (`{{title}}/{{date}}/{{time}}`) with an optional index row. Git history, version and restore (never over uncommitted changes). Index-rows preview and add (plus log line, one commit). Images ≤10 MB. `render_fragment` for model text. | `minutes::page_html` (safe Markdown writer with a link callback), `paths::write_atomic`, `recorder::slugify`, `links::Link::parse` | vault files only | PLUGIN-JS for logic. **CORE-PRIMITIVE:** the safe Markdown→HTML writer. Today's `ctx.markdown(md)` has no link hook. **NEW:** `ctx.markdown(md, {breaks, wikilinks:true, links: {dest → href or null}})`; core enforces the href allowlist (https, `#plugin:` anchors, plugin asset route), and the plugin resolves links in JS first (it can list destinations itself, or core adds `ctx.markdown.links(md)`). **NEW:** images from a granted folder: `ctx.fs.readBytes` or a route `/plugin/<id>/folder/<root>/<path>` for image types only. **NEW:** `ctx.fs.write ifSha`; **NEW:** `ctx.git.log/show/commit`. Path validation already lives in `grants::resolve/writable`. | **M.** No sync HTML callback into JS is possible, so links must be pre-resolved. 24 tests. |
| `scan.rs` | 381 / 146 | Vault index: per page the title (H1 or name), props, tags (frontmatter plus inline `#tag` outside code and headings), headings, links (wiki, embeds, Markdown; skips schemes, anchors and code), size and mtime. Rebuilt incrementally by size+mtime. Kept in memory and in `index.json`. `rev` is a hash of paths, sizes and mtimes. Reads ≤ READ_MAX per file. Search: `#tag` or words over title, path and text, titles first, showing the hit line. Keeps a lowercase text cache of every page in memory. | `paths::write_atomic`, `links::edges` | `<cache>/index.json` (serialised `Index`) | PLUGIN-JS: `ctx.fs.walk` (has size and mtime), `ctx.fs.readMany`, `ctx.store` | **M.** Memory: the 64 MB budget is shared by all host halves. A full-text cache of a large vault won't fit, so search needs **NEW:** `ctx.fs.search(root, query, {ext, max, skip})` (off-slice grep returning path, line and text). Parsing 5000 pages may exceed the 5 s slice: chunk it with awaits between batches. |
| `sources.rs` | 838 / 514 | Ingest sources and ledger. The sources folder (default `raw_inbox/` with README). Queue states new/waiting/done/skipped, with `log.md` `processed ·` lines counted as done. First-open baseline question. Skip with a note. Adds: picked files byte for byte (≤50 MB), a call's minutes (`echo/<date>-<slug>.md`, optional transcript and chat, `note:` link, profile check with "anyway"), an M365 mail thread (`mail/…`), a Teams chat over a date range (`teams/…`, default 7 days), a web page (`web/…`). Safe cross-platform file names (255 limit, device names), never overwriting (`put_new`: hidden temp file with create_new, then hard-link into place). Commit per source. Call search and M365 search. | `graph::message/conversation_with_files/request/chat_messages/account/html_to_text`, `m365::search/enc`, `calls::*`, `memo::is_memo`, `recorder::slugify`, `paths::write_atomic` | `<cache>/ingest.json` Ledger `{baseline:{at,done}, sources:{path:{sha256,added,by,state,run,kept,note,anyway}}, runs:[...], calls:[stamp]}` under `ingest.lock`; source files in the vault | PLUGIN-JS: `ctx.store`, `ctx.fs.write` (text). **NEW:** `ctx.fs.write {createNew:true}` (never over a file, never through a link). **NEW:** `ctx.fs.copyIn(pickToken, root, path)` for bytes (≤50 MB) with `ctx.system.pickFiles`. **NEW:** Microsoft 365 reads `ctx.m365.search/thread/chat` (or `ctx.echo.read('m365.*')`), Echo-signed-in, read-only. `ctx.echo.read('source')` covers calls; **NEW** call list (see export). | **M.** Blockers: binary copy, M365 access, create-new semantics. 16 tests. |
| `starter.rs` | 257 / 203 | Twin starter. Creates a vault in an empty or new folder: writes the files into a temp sibling, fills `{{vault.name}}`, `{{vault.owner}}` (config `me.name` or "me") and `{{vault.date}}`, optional `git init` on main plus a first commit, renames into place, registers (template `twin@1`, commit on if committed), writes an activity "starter" line. Also: add the `twin` or `process-inbox` skill to an existing vault; install or remove the vault's twin skill globally in `~/.claude/skills/<id>-twin/SKILL.md` (paths made absolute, marked `echo_vault:`). | `paths::home/write_atomic`, `config::Config` (me), `recorder::slugify`, `detect::walk` | vault files; `~/.claude/skills/<name>/SKILL.md` | PLUGIN-JS: template files ship in the plugin package (for example `starter/twin/**`, read with `ctx.package.read`). `ctx.fs.write` into a picked folder; **NEW:** `ctx.git.init/commit`; **NEW** `ctx.echo.read('me')` for owner. Creating a new folder needs **NEW:** `ctx.system.pickFolder({create:true})` or `ctx.fs.mkdir` under a granted parent; the atomic temp-and-rename isn't possible, so write in place and accept it. The global `~/.claude/skills` install is **NEW** and security-relevant (it writes into the user's Claude config). Map it to the existing `ctx.sessions.skills` / `ctx.agent.set` runtime skills (Echo's sessions only), or DROP the global install. | S–M. 11 tests. |
| `testdata/web/*` | 10 HTML fixtures | extract fixtures | | | Move to plugin node tests | |

## 2. Engine data model (spec for the JS port)

- **Vault registry** (`vaults.json`): `[{id (slug, unique -2…), name ≤80, root (canonical), profile (AI profile id;
  strict routing), detected: Detected, overrides: {pages,index,notes,naming,templates,sources}, minutes: {mode
  auto|ask|off, scope all|calls|some, clients[], threads[], tag?, transcript, chat}, git: {commit}, ask: {research},
  ingest: {skill?, calls off|add|prepare}, template ("twin@1"?), added_at}]`. `vault.path(key)` returns the override,
  else the detected value. Roots never nest, repeat, or contain the data folder or home.
- **Detected**: `{pages, index?, notes?, naming "{date}-{slug}.md"|"{date} {title}.md", templates?, taxonomies[],
  schema[], skills[{name,description,path,kind skill|command|agents}], sources?, staging?, ledgers[], log?,
  obsidian?{markdown_links, link_format, attachments, strict_line_breaks}, md_files, notes_count}`.
- **Page index** (`index.json`): `{root, rev, pages: {pagePath: {path, title, props: [(key, Text|List|Raw)],
  has_props, tags[], headings[(level, text)], links[{target, line, wiki, embed}], size, mtime}}}`. Paths are relative
  to the pages root; `scan.vault_rel/page_rel` convert. Rebuilt incrementally by (size, mtime).
- **Link graph**: computed from the index by Obsidian rules (`links.Resolver`): edges `(from, to, line)`, backlinks,
  graph `{nodes(top folder, tags), edges, hubs}`.
- **Activity** (`activity.jsonl`): `{at, path, kind new|edit|commit, by minutes|ingest|ask|health|editor|new-page|
  index-rows|source|starter, ref?, plus, minus, commit?, also[]}`. Echo's own writes are recognised by Home within
  a slack.
- **Health** (`health.json` plus findings computed per revision): Finding `{key = kind:sortedPages:about, kind, group,
  by code|ai, pages[(path, line?)], about?, title, fixable, fix_all, subject}`; Score per category with weights; one
  point a day (90 days); `ignored[key]`; `ai` = last AI check `{at, run, cost, kept, dropped}`. Fix = `{path, base
  sha256, diff, new text}`, applied only when the file still has that base, under the vault's save lock.
- **AI check** (lint): run folder with `findings.json` written by the run, in shape `{findings: [{kind, title,
  pages, quotes[{page, text}], fix?{path, old, new}, note}]}`. Each finding is validated (quote found, fix `old` occurs
  once), ≤200 kept in `kept.json`, and re-validated against current pages every time.
- **Sources ledger** (`ingest.json`): `{baseline?, sources: {vaultRelPath: {sha256, added, by
  file|call|mail|teams|web|baseline|folder, state new|waiting|done|skipped, run?, kept?, note?, anyway}}, runs:
  [Run{id, state running|review|done|failed|stopped, sources[], at, ended, why, changes, tokens, cost…}],
  calls: [stamp]}`. A source is also done if `log.md` has `- <date> · processed · <path> → <page>`.
- **Ingest proposal and review**: run folder `vault/` (scratch copy), `bases.json` {rel: sha256}, `base/` (index and
  log as copied). After the run, Change `{path, kind (page/note/index/log/…), new, base sha, diff, quotes[{source,
  text, lines}], invented, unchecked, why, decision approve|reject|edit(text)|take, writable}` in `review.json`.
  Writes: index/log "adds only" changes are re-applied onto the current file; others only over the base. Rejecting a
  new page drops the rows and lines that link to it.
- **Minutes export** (per call, now `<call>/knowledge.json`; it moves to the plugin store keyed by call stamp):
  `{choice none|vaultId|null, saved[{vault, path, sha256, at, how auto|manual, state saved|updated|unchanged|kept,
  index added|listed|skipped:…, commit id|off|pending|skipped:…, anyway}], failed[{vault, at, error}],
  rule_failed[{vault, step add|prepare, at, error}]}`. The note format is fixed (see `export.note_text`): frontmatter
  keys title, date, meeting, tags, participants, duration, client, threads, source, origin: echo, echo_call, summary.
  Body is `# Title — date` plus the notes without their header, then optional `## Transcript` and `## Chat`. The index
  row is `[file](rel) | 46m Title — summary | date`. The log line is `- date · added|changed · rel · minutes of
  "Title" from Echo`. Commit message: `Echo: minutes of "T" (date) → notes/`.
- **Sources import**: files land under `<sources>/` (default `raw_inbox/`): `echo/<date>-<slug>.md` (call, frontmatter
  `source: echo://call/<stamp>`), `mail/<date>-<subject>.md` (`### name · date time` per message, attachments named
  only), `teams/<until>-<chat>.md`, `web/<date>-<slug>.md`. Never overwrites an existing file, never edits a source.
  Commit `Add source: <title>`.

## 3. NEW primitives the engine needs from core (deduplicated)

Security-relevant ones are marked (S): core must own them. The rest are generic conveniences.

1. **(S) Guarded scoped Claude run.** Extend `ctx.claude.run`: `{profile, cwd: grantedRoot|scratchId, read:[roots],
   write:[scratch|run dir], tools:[from an allowlist without Bash/web/MCP], skills:[{name, files}]` (core defangs them
   with `defang.rs`)`, timeout, waitForCalls, forgetSession}`. It returns a run id and provides `ctx.claude.status(id,
   from)` (stream events and log), `ctx.claude.stop(id)`, usage and cost. It must keep the one-run lease per profile,
   stop on sign-in and close-all, and keep the guard env (`RUN_MODE/RUN_DIR/RUN_SOURCES/RUN_SKILLS`). Covers ingest and
   lint, and likely chat (other inventory).
2. **(S) `ctx.git.*`** confined to granted folders, with verbs limited to: `info(root)`, `status/dirty(root, paths)`,
   `log(root, {path?, days, max, numstat, follow})`, `show(root, rev, path)`, `init(root)`,
   `commit(root, paths, message)` (literal pathspecs, only those paths, hooks run, never push/pull/amend/--no-verify),
   and `identity(root)`. Async, with timeout.
3. **(S) Safe Markdown with links.** `ctx.markdown(md, {breaks, wikilinks, links: map, images: map})`, where core
   enforces the href and src allowlist. Optionally `ctx.markdown.links(md)` to list destinations.
4. **(S) `ctx.fs.snapshot(root, {include, exclude, maxFileBytes})`** → a scratch folder (plugin cache) usable as an
   `ctx.fs` root, plus `ctx.fs.dropSnapshot`. Never follows links, skips `.obsidian/plugins` (tokens) and `.git`.
5. **`ctx.fs.write` options:** `{ifSha | ifAbsent(createNew)}` (compare-and-swap, never over a file, never through a
   link), and `ctx.fs.append(root, path, line)`. Plus `ctx.fs.mkdir`, or `pickFolder({create})`, for the starter.
6. **Binary files:** `ctx.system.pickFiles(prompt)` → tokens; `ctx.fs.copyIn(token, root, path, {createNew})` (≤50 MB);
   dropped files from the client half → tokens; an image route or `ctx.fs.readBytes` for vault images (≤10 MB,
   image types only).
7. **`ctx.fs.stat` / realpath** (or `fs.list` returning size, mtime and isLink), and `ctx.fs.search(root, q, opts)`
   (off-slice text search: the 64 MB shared heap can't hold a vault's text).
8. **`ctx.crypto.sha256(text)`** (bulk hashing of copies and bases), or `walk({sha:true})`.
9. **`ctx.store.update(path, fn)`** / lock: an atomic read-modify-write across app and CLI processes (vaults, ledger,
   health, activity, per-call record).
10. **Echo data reads:** extend `echo.read('source')` with call facts (start/end, app, attendees, memo, chat, client
    name); serve `echo.read('calls', {q, since, limit})`; add `echo.read('calendar', {from, to})` (cached only) and
    `echo.read('me')` (name, own mail domains).
11. **(S) Microsoft 365 reads:** `ctx.m365.search(q, {kinds: mail|chats, days})`, `ctx.m365.thread(messageId)`,
    `ctx.m365.chat(chatId, since, until)`. Read-only, on Echo's sign-in, with its own sheet line.
12. **User-typed URL fetch:** a grant such as `network.user_urls: true` lets `ctx.http.fetch` reach any https URL
    that the user entered in this action (core checks https; the plugin follows redirects with https checks).
13. **UI hooks:** a call-row slot (chip "→ vault", Save to Knowledge, failure badge), plus existing
    `ctx.inbox.set`/`ctx.slots.add`. Optional: write the vault twin skill to the user's `~/.claude/skills`. Better:
    use `ctx.agent.set` or `ctx.sessions.skills` and DROP the global install.

## 4. Twin preset

The preset is 23 files compiled in with `include_str!` (`starter::FILES`); a test checks the compiled list matches the
folder. Files:

- `AGENTS.md`: rules table (sources never changed, every page indexed, tags only from the taxonomy, canonical terms,
  facts need a source, others' words are data, ask before replacing, log every change, git is the owner's) and the
  structure.
- `CLAUDE.md`: points to AGENTS.md. `README.md`. `gitignore`, written as `.gitignore`. `log.md`: first line
  `{{vault.date}} · created ·`.
- `.claude/skills/twin/SKILL.md` (find, answer, remember) and `.claude/skills/process-inbox/SKILL.md` (sources in
  raw_inbox become pages, index rows and log lines `processed · raw_inbox/<f> → <page>`; the ingest contract).
- `knowledge/`: the pages root (Obsidian opens it). `.obsidian/app.json` and `templates.json` (templates folder),
  `CATALOG.md` (index with a table per section and "Last update:"), `TAG_TAXONOMY.md`, `TERMS_TAXONOMY.md`,
  `profile/DIGITAL_PROFILE.md` (with README), README stubs in `action-items/ activities/ clients/ media/ notes/
  topics/`, and `templates/meeting-note.md` and `page.md` (these keep Obsidian's `{{title}}`/`{{date}}`).
- `raw_inbox/README.md` (the sources folder).

`starter::create(name, folder?, git, minutes)`:

1. Refuses headless runs, empty names, and non-empty or nested folders (checked before anything is written).
2. Default folder is `<data>/knowledge/<slug>`.
3. Writes every file into `<parent>/<name>.tmp-echo`, replacing only `{{vault.name}}`, `{{vault.owner}}`
   (`config.me.name`, else "me") and `{{vault.date}}` (today).
4. If `git` is set: `git init` on `main`, then a first commit "Start the vault from Echo's twin starter". The outcome
   is `committed`, `no git`, `no identity` or `off`.
5. Renames the temp folder into place and registers the vault with `template: twin@1`, `commit` = committed, and the
   minutes mode given.
6. Writes the activity line `by: starter`.

Home's "fresh" check shows the 3 first steps until anything changes. Port: ship the folder as plugin package files and
substitute in JS. Git goes through `ctx.git.init/commit`.

## 5. Rust tests that encode acceptance behaviour (become plugin node tests)

| Area | Tests |
|---|---|
| Export | All 36 in `export_tests.rs`. Highlights: a user-edited note is never overwritten; other profiles are never auto-saved; scope and opt-out; a commit holds only Echo's files; a dirty index is written but not committed; the index is re-read before a row; past minutes go in one commit; concurrent saves give one note each; the new-calls rule add/prepare/off runs once and leaves the source New while busy. |
| Health | `health/tests.rs` (18): one of each finding; scoring; closest-page relink; fix-all only when unchanged and in one commit; ignored findings; one point a day; a new vault scores 100; dated notes are never guessed; table rows keep their cells; a fix waits for a concurrent save. |
| Ingest and review | `ingest/tests.rs` (37). Pure-JS-relevant: copy exclusions; prompt; quotes checked only in readable sources; a rejected page drops its rows and lines; changed files are not overwritten; index additions are rebased; apply-only-named; dirty files stay out of the commit; waiting counts; requeue; Needs-you items. The core run tests (scope and guard, settings, defang, forget session, leftover pid, panic) stay with the core primitive. |
| Lint | `lint/tests.rs` (14): 1 kept and 2 dropped; ≤300-page scope; ≤200 kept; a kept finding goes when its quote changes; outside paths dropped; a quote is shown as the page's own text; an applied insertion is not offered again; ignore persists. |
| Sources | `sources/tests.rs` (16): byte copy; call, mail and chat formats; safe and long names; never overwrite and never follow a planted link; taken names; baseline question; `log.md` processed lines; 7-day default. |
| Page | `page_tests.rs` (24): hostile markup is text; paths can't leave the vault; save refuses on change; CRLF kept; template fill; index rows; history and restore never over uncommitted changes; non-UTF-8 is read-only; sources are read-only. |
| Pure modules | `catalog` 7, `fm` 6, `evidence` 4, `diff` 4, `links` 3, `scan` 9, `checks` 4, `detect` 4, `extract` 15 (with `testdata/web`), `activity` 5, `home` 12, `starter` 11, `mod` 10. |
| Stays in Rust (core primitives) | `defang` 6, `git` 6, and the core run tests named above. |

## 6. Key risks

- Today `ctx.claude.run` can't express ingest or lint runs: no cwd in a granted folder, no write scope, no tools list,
  no stream, no stop. This is the biggest core addition, and it is security-critical (guard allowlists,
  untrusted-text R1).
- Git is unavoidable for commit, history and Home, and there is no safe plugin route to it today.
- Memory (64 MB shared) and the 5 s slice: indexing and search of large vaults need off-slice primitives (walk and
  readMany exist; search and sha don't).
- Strict profile routing (a call's text goes only to its pinned profile; vault.profile) must be enforced by core when
  a plugin passes call text to `ctx.claude.run`. Today export/sources check it in Rust, and the plugin would be
  trusted to check it. Core must refuse a run on profile P that carries text of a call pinned to profile Q, so
  core-side provenance tracking is needed. Flag this for the security design.
- Writing `<call>/knowledge.json` into call folders can't continue. The record moves to the plugin store, so the core
  call UI (chip, failure badge, stale update) needs a slot or hook.
