# Inventory C — obsidian 0.8.0 × Knowledge 0.1.1 (+ #677 engine): merge into one plugin `obsidian`, shown as "Knowledge"

Sources read: `echo-plugins@main:plugins/obsidian/{main.js,client.js,echo-plugin.json,README.md,agent/CLAUDE.md}`,
`tests/{cases/obsidian,feature-map/obsidian.json,obsidian/obsidian.test.mjs}`; `echo-plugins@pr-17:plugins/knowledge/*`,
`tests/{knowledge,cases/knowledge,fixtures/knowledge,feature-map/knowledge.json}`; `claudecho@pr-677`:
`knowledge/{mod,api,detect,scan,starter,export}.rs`, `plugins/knowledge.rs`, `ui/knowledge.js`,
`ui/app/34-plugin-knowledge.js`, `cli/knowledge.rs` (skimmed). Both PRs are OPEN; Echo `main` has no native Knowledge —
so no released user has #677 state, only obsidian 0.8 state (plus dev-build testers of #677).

---

## 1. obsidian 0.8.0 — feature inventory

### Manifest (`echo-plugin.json`)
- id `obsidian`, name "Obsidian vaults", v0.8.0, `echo >=0.9.9`; `agent: {summary, prefix: "kb"}`.
- `uses`: `folders {what: "Obsidian vaults"}` (read-only, no `folders.write`), `claude {}`, `echo.read [clients, threads,
  dictionary, sources]`, `echo.write [dictionary]`, `sessions {skills, read, hints, commands: [search, info, links,
  backlinks, resolve, tags, where, tasks, unresolved]}` (nine read commands run without asking; `rename_plan` asks).
- `settings: [{key: "knowledge", type: bool, default false}]`.

### User-visible (client.js)
- **Settings section `obsidian:main` ("Obsidian")** — vertical vault tabs ("Needs you" first, then "Vaults · N"; search box
  when >6), badge = vaults in review/failed/empty. Per vault: header (kind, for-whom chips + client/thread picker,
  notes count, "changed N ago", "kept in git", "a folder of notes" when no `.obsidian`), Browse button, "Open in
  Obsidian ↗" (`obsidian://open?path=`), ⋯ menu (Read it again, Rename… in place, Remove from Echo with confirm).
  Banners: analysing (spinner), failed (Try again), review ("Looks right" = confirm), empty (write it yourself /
  read again), proposed (Keep mine / Use the new one). "What's inside" bar of top folders (daily/templates marked "left
  alone"). "What Claude knows about it" card: When-line (≤250 chars, counter) + 5 parts (What it is / Where things are /
  How notes are written / What Claude can do / Leave alone), each click-to-edit. Empty-folder connect asks "Connect
  anyway?" (`unpick` gives the grant back on cancel).
- **Activity "Obsidian"** (`ctx.activities.add('vaults')`, route `#obsidian:vaults/<vault>/<path>`): 3-pane browser —
  left: vault switcher, note search, Files tree (foldable folders, counts, skipped folders dimmed) / Tags list; middle:
  open-note tabs (close ×) + Graph tab; note view (path, Open in Obsidian, title, properties grid with clickable
  `[[links]]`, rendered Markdown via `ctx.markdown` with wikilinks turned into buttons by a per-call marker); right:
  local graph (sigma via `ctx.ui.graph`), backlinks with line, tags, "In Echo" (client/thread of same name). Full graph:
  Links/Tags/Both, colour by Folder/Tag, find, legend, orphans hidden.
- **Knowledge slot tab `knowledge.tab` id `notes`** ("Notes", `#brain/obsidian:notes/echo/<path>`): same browser over
  the facts vault; off → "Turn it on"; empty → reading status, first-fill picker.
- **`knowledge.settings` slot "Notes"** (else rows on the plugin's own card): on/off, "Reading N sources / N couldn't be
  read — Try again", "Read what was said before" (since 30/90/180 days/all, counted via dry run, priced at $0.03/source).
- **Plugin card** (`ctx.settings.add`): "Vaults: N connected — Open". **Palette**: "Obsidian: vaults", "Obsidian: connect a
  vault". **Inbox**: `review:<id>` item "Check what Claude will be told about <vault>" → `settings/obsidian:main`.
- Polls `view` every 2.5 s while busy; `knowledge_wake` nudge 5 s after load then every 60 s.

### Claude-visible
- `ctx.agent.set`: summary "The user's notes: Knowledge…; and N Obsidian vaults — names" + ≤20 entries: `knowledge`
  first (when on and holding notes; guide names facts-vault root, `_echo/Rules.md`, `index.md`, tag scheme
  `type/ client/ topic/`, points to `mcp__echo__read_link`/`search_sources`/`find_people`), then one entry per confirmed
  vault (name = slug of id, reserved `guides|scripts|knowledge`; summary = When-line; guide = folder + description path to
  Read as data — never the description text). Newest vaults kept past 20.
- `agent/CLAUDE.md` (package how-to): finding a vault, wikilink/tag/frontmatter conventions, the index commands with
  arg shapes, `rename_plan` rules, "Adding to a vault" rules (knowledge only, vault's own shape, ask before rewriting),
  Knowledge read-only, where the user manages it.
- `ctx.sessions.skills([])` (removes old `obsidian-vaults` skill), `ctx.sessions.read(roots)` (folder session may read
  confirmed vault folders still granted), `ctx.view.hints` (client/thread pages point to its vault + description path).
- Catalog file `vaults.md` (grouped by for-whom; facts vault under "Echo's own").

### Commands (`ctx.command`, also `echoctl plugin call obsidian …`)
- Vault admin: `view {window}`, `add {wait, root, anyway}` (picker → `check` for empty → connect; id = slug, never
  `echo`; analysis in background), `unpick {root}`, `analyse {id, wait}`, `save {id,key,text}`, `take_proposed {id,take}`,
  `belongs {id, belongs[]}`, `confirm {id}`, `rename {id,name}`, `remove {id}` (forgets grant, drops description/
  proposed/index), `find {q}` (catalog search).
- Browser: `browse {id}`, `note {id,path}` (HTML + marker + wikilinks + backlinks + local graph + in_echo + prop_links),
  `graph {id, mode: links|tags|both}`.
- Index (Claude): `search {vault,q,tag?,folder?,limit?}` (weighted title40/alias30/heading15/tag10/property8/path5 +
  backlink bonus), `info`, `links`, `backlinks {limit}`, `resolve {link, from?}`, `tags {prefix?}`, `where {tag?, prop?,
  value?, folder?}` (link-aware values), `tasks {status, note?, folder?, tag?}`, `unresolved`, `rename_plan {vault, note,
  to, apply?}` (line-by-line edit plan preserving link style; `apply` only on the facts vault).
- Facts vault: `knowledge {on}`, `echo_reindex`, `knowledge_fill {since, thread, kind, limit, dry}`, `knowledge_wake`,
  `knowledge_retry`, `ingest {source, force, patch}`, `forget_source {id}`, `knowledge_status`.

### Analysis (description for Claude)
- Survey (no model): walk `.md` (≤50k), top/sub-folder counts, latest mtime, `.obsidian` daily/templates/attachments/
  community-plugins, git, frontmatter keys / tags / link density from ≤400 note heads; 30 sample heads round-robin
  across top folders (daily/templates skipped).
- One `ctx.claude.run({tools:'none', timeout:10})` → JSON {kind, when, what, where, how, can, leave, belongs[]} with
  Echo's clients/open threads; written to `description.md`, or `proposed.md` when the user already has one. States
  `analysing → review|ready|failed|empty`; `confirmed` flag; stale-analysis recovery after 11 min.

### Index engine (JS, in plugin)
- Per vault `vaults/<id>/index.json` v2: `{v, root, built_at, files[], notes:[{p,s,m,t,props,al,tg,hd,bk,ln,tk}]}`;
  incremental by mtime/size via `ctx.fs.walk` (≤100k) + `readMany` in 200-file batches; Obsidian semantics: frontmatter
  props (inline lists, `- ` lists), aliases, tags (frontmatter + inline, nested), masking of code/comments/math,
  wikilinks with `#heading`/`^block`/`|alias`, Markdown links, links in properties, headings, block ids, tasks; resolve
  by path then shortest/same-folder name; backlinks.

### Facts-vault pipeline ("Knowledge" switch)
- Store `vault/` (Clients|Organisations|Products|Initiatives|Documents/<Name>.md, `_echo/Rules.md`, `_echo/Types/*.md`,
  `_echo/Dictionary.md`, `index.md`, `log.md`), index `vaults/echo/index.json`.
- State `knowledge/{things,pending,removed,sources,queue,failed}.json`, `knowledge/dictionary.hash`, `render.version`.
- Events heard: `minutes_written {id}` → enqueue+drain; `sources_changed {changed[], removed[]}` → forget/enqueue.
  `ctx.echo.read('source', id)` / `('sources', {since,thread,kind,limit})`.
- Per source one `ctx.claude.run({model:'sonnet', tools:'none', profile: src.profile})` (strict routing: `profile:null`
  → skipped); patch applied deterministically: quote must be in source/transcript, categories/relations whitelisted,
  dedupe, supersede → History (restored if superseding source dropped), ≤30 obs/note, candidate becomes note at 2nd
  source, user-deleted observations remembered, user sections/tags kept, client seeding from Echo clients,
  topics (≤3, reuse), dictionary sync both ways (`ctx.echo.read('dictionary')`, `ctx.echo.dictionary.add`), moments
  (`?t=` from transcript turns), echo:// links.

---

## 2. Knowledge 0.1.1 (pr-17) + #677 engine — feature inventory

### Package
- Manifest: id `knowledge`, `uses: {knowledge: {}, sessions: {commands: [status, read]}}`, agent prefix `kn`.
- `main.js` (6 lines): `status` → `ctx.knowledge.read('api/kn')`, `read {route}` → `ctx.knowledge.read('api/kn/'+route)`
  (native allowlist: views `tree|page|find|graph|checks|health|health/<key>|history|version`; refuses `jobs*`, m365,
  calls, preview, chat, ingest, kn-resume).
- `client.js` (14 lines): imports `view.js`, loads `knowledge.css` (`ctx.ui.stylesheet`), `ctx.knowledge.register(view)`,
  settings section "Knowledge vaults" (`view.settingsVaults()`), plugin card "Open Knowledge".
- `agent/CLAUDE.md`: status/read only; edits, Ask/Curate/Research, sources, ingest review, Health fixes are user actions.
- `model.js` (1072 lines): pure functions in named `// ── kn-* … // end of the … block` blocks (tested by extraction).
- `view.js` (3572 lines): the whole client; `knowledge.css` (974 lines).

### Seven tabs (route `#kn/<vault>/<tab>/<path>`)
- **Home**: vault card (→ Settings), Ask box (≤4 suggestions, `@` mentions; "new vault knows only starter pages"), What's
  new (14 days, All/New pages/Notes, 12 rows), Health card (score, delta, top 3 Needs-you, fixable by kind, "code checks
  only"), Coming in (changes waiting by run, new sources by kind, run going), Most linked, Continue (Ask conversations,
  mode, terminal), new-vault welcome ("Your twin is ready": 3 steps incl. Record a call per minutes rule).
- **Pages**: tree (folders/counts; filters all/recent/unindexed; index page marked), page view (safe HTML from Rust
  `page::render`, properties, links/backlinks rail, history + version view via git, Restore), editor with preview
  (`kn_preview`), drafts in localStorage (`echo.kn.draft:<vault>:<path>`, per base sha), conflict compare (line diff)
  on external change, New page (folder, template, index row), "Add index rows", Reveal in Finder, Open in Obsidian.
- **Graph**: own canvas force layout (Barnes-Hut, drag, labels plan, search hits), hide index hubs, "Show isolated pages"
  switch with count, tags as nodes, colour, local graph by depth, folders legend toggle; >5000 pages starts local.
- **Ask**: guarded Claude Code conversations in the vault folder on the vault's AI profile — modes Ask / Curate (edits
  with permission cards allow/deny/always) / Research (web, if enabled); streaming events (thinking/text/tools/permission/
  todo/notice/result), tool rows fold, `/skill` menu (profile + vault skills), `@page` and call attachments (mismatch →
  "Attach anyway"), stop, resume, hand-off to terminal panel (`kn_chat_terminal`, `claude --resume` line), Save answer as
  page / Add to page under dated heading, Copy.
- **Ingest**: sources queue grouped From Echo / Mail & Teams / Web / Files with states new/preparing/review/failed/done/
  skipped and filters; Add a source sheet (files via picker or drag-drop, a call with transcript/chat, M365 mail or
  Teams chat with day range, https web page); first-open baseline question ("N files already in raw_inbox/ — processed?");
  Prepare changes = Claude run with the vault's ingest skill on a scratch copy (no commands, no web), live steps/tool
  rows; review cards (New page/Edit/Index/Log/Taxonomy) with diff, quotes validated against sources (invented counted),
  Approve/Reject/Edit/Take, Approve the rest, Write N approved (only unchanged bases; optional commit), Finish/Discard,
  Run again, requeue, skip; add starter `process-inbox` skill.
- **Health**: code checks (not_in_index, broken, isolated, no_props, unknown_tag, meeting_tag_missing, dead_row,
  usual_prop, duplicate_title, oversized_index) + AI checks via `kn_lint` (contradiction, possible_duplicate, stale,
  link_to_add, missing_summary; findings kept only when quotes are on the pages), groups Needs you/Should fix/Tidy,
  filters all/needs/code/ai, ignore/show ignored, 30-day score trend, finding detail with diff fix (`base`+`sha`),
  Fix all sheet, fix summary incl. commit.
- **Settings** (per vault): Structure (name; overrides pages/index/notes(+naming)/sources; Read again), Meeting minutes
  (mode auto/ask/off; scope all/calls/some + clients/threads; tag; include transcript/chat; Preview; Save past minutes),
  Ingest (skill; new-calls rule off/add/prepare), Ask (Research on/off; Conversations), Schema & vocabulary
  (AGENTS/CLAUDE.md, TAG/TERMS taxonomies), Skills (run in Claude, twin add / install globally to `~/.claude/skills/<name>`
  / remove), Git & AI (git info, commit switch, AI profile, "inside Echo's data folder" warning, index cache size,
  Rebuild), Remove from Echo.
- **Outside the tabs**: header switcher (vaults, Connect a folder…, Start a new vault…, Recall, "From plugins" =
  `knowledge.tab` slot tabs); Connect sheet (picker; empty folder → "Start a vault here"; minutes, commit, profile);
  New vault sheet (twin starter tree preview, git, minutes auto/ask); **call page integration** — Knowledge chip on a call
  (will/saved/kept/failed/stale/off/removed; choose vault or none), ⋯ menu "Save to Knowledge…/Open in <vault>",
  countdown line "Then saved to …", save sheet (new note / replace / anyway); palette actions; `kn_import_plugin`
  ("Connect the Obsidian plugin's vaults": reads obsidian's folder grants, adds each with `minutes: ask`).

### Native engine (#677) features worth porting
- Registry `<home>/.echo/knowledge/vaults.json` `{vaults:[Vault]}` under file lock, atomic write. `Vault = {id, name,
  root, profile, detected: Detected, overrides{pages,index,notes,naming,templates,sources}, minutes: {mode, scope,
  clients[], threads[], tag?, transcript, chat}, git: {commit}, ask: {research}, ingest: {skill?, calls}, template
  ("twin@1"|null), added_at}`. `Detected = {pages, index?, notes?, naming, templates?, taxonomies[], schema[], skills[{name,
  description, path, kind}], sources?, staging?, ledgers[], log?, obsidian?{markdown_links, link_format, attachments,
  strict_line_breaks}, md_files, notes_count}`. Refuses data folder, disk/home roots, nested/duplicate vaults.
- Per-vault cache `<home>/.echo/knowledge/<id>/`: `index.json` (scan), `health.json` (+history, ignored), `lint/`,
  `ingest/` + `ingest.json`, `chat/`, `activity.jsonl`. Per call `<call>/knowledge.json` (save record). Vault-side:
  starter files, `raw_inbox/`, ingest notes `.echo-ingest/{steps,changes}.json` in the scratch copy. Global
  `~/.claude/skills/<name>/SKILL.md` (twin install).
- Minutes export (`export.rs`): by rule after `minutes_written` (auto), or manual; note in notes folder with naming,
  index row, log line, commit if allowed; user-changed note never overwritten (kept/new/replace); profile mismatch guard;
  past minutes backfill; preview/sample. Twin starter (`starter.rs`): 23 compiled-in files, `{{vault.*}}` filled,
  optional git init, template `twin@1`.
- CLI `echoctl knowledge list|detect|add|set|reread|remove|new|pages|read|check|lint|index-add|save-minutes|ingest
  (add/…)|twin` — native; in a JS world these become `echoctl plugin call obsidian …`.

---

## 3. Overlap matrix

| Feature | obsidian 0.8 | Knowledge 0.1.1/#677 | Verdict |
|---|---|---|---|
| Connect an existing folder (picker, no writes) | yes (`add`, empty → ask) | yes (Connect sheet, empty → start vault here) | MERGE: Knowledge's sheet (profile/minutes/commit) + obsidian's grant model (`ctx.system.pickFolder`, `unpick` on cancel) and its id rules |
| Start a new vault (twin starter) | no | yes | KEEP-from-knowledge (twin = the starter preset) |
| Vault registry | plugin store `vaults.json` (id, root, state, confirmed, kind, belongs, inside…) | native `.echo/knowledge/vaults.json` (profile, detected, overrides, minutes, git, ask, ingest, template) | MERGE: one JS record = obsidian fields ∪ native fields, in the plugin store; keep obsidian ids |
| Structure detection (pages root, index, notes, naming, taxonomies, schema, skills, sources, ledgers, log, obsidian link settings) + overrides | survey only (folders, daily/templates, keys, tags) | yes | KEEP-from-knowledge (port `detect`), feed the survey from it |
| Description for Claude (When + 5 parts, Claude analysis, review/confirm, proposed) | yes | no (only schema files + agent `read`) | KEEP-from-obsidian; show it as a section of the vault's Settings tab ("For Claude") + Inbox review |
| belongs (client/thread) → window hints + catalog grouping | yes | no (minutes scope clients/threads is a different thing) | KEEP-from-obsidian |
| Claude entries (`ctx.agent.set`), catalog `vaults.md`, `sessions.read`, `view.hints`, skill removal | yes | no (just status/read) | KEEP-from-obsidian |
| Index of a vault (links/backlinks/tags/props/aliases/headings/blocks/tasks) | JS, `vaults/<id>/index.json` v2 | Rust `scan.rs` (title, props, tags, headings, links) | MERGE: obsidian's JS index is the richer one (aliases, blocks, tasks, md links, props links) — extend it with what scan adds (`has_props`, `in_index`, rev) and use it for tree/graph/find/health |
| Claude index commands search/info/links/backlinks/resolve/tags/where/tasks/unresolved/rename_plan | yes (granted without asking) | `status`, `read {route}` (tree/page/find/graph/checks/health/history/version) | MERGE: keep obsidian's nine + rename_plan unchanged; add `status` and read-only `checks`/`health`/`history`/`version` (adding to `sessions.commands` asks again on update) |
| Browse: file tree, note view, tabs, local graph, backlinks | Activity "Obsidian" (sigma) | Pages tab (editor, history, conflicts) + rail | KEEP-from-knowledge (Pages); DROP obsidian's activity browser (keep its "In Echo" rail item and `obsidian://` open as additions) |
| Full graph | sigma via `ctx.ui.graph`, links/tags/both, colour folder/tag | own canvas force sim, isolated/hubs/depth/legend toggles | KEEP-from-knowledge |
| Editing pages, new page, index rows, history/restore | no (read only) | yes | KEEP-from-knowledge (needs `folders.write`) |
| Ask / Curate / Research conversations | no | yes | KEEP-from-knowledge |
| Ingest (sources → scratch run → review → write) | no | yes | KEEP-from-knowledge |
| Health (code + AI checks, fixes) | `unresolved` only | yes | KEEP-from-knowledge |
| Minutes export rules + call chip/⋯/countdown | no | yes | KEEP-from-knowledge |
| Facts vault (Echo's own, `vault/` in store) | yes | no | DROP: replaced by a twin vault (minutes export auto + Ingest of calls/mail with review) |
| Facts pipeline (events `minutes_written`/`sources_changed`, queue, per-source Sonnet patch, quote check, supersede/History, candidates, removed-memory) | yes | Ingest new-calls rule `add`/`prepare` + review; AI Health stale/contradiction | DROP; replaced by minutes export + `ingest.calls` + Health AI checks. Note what is lost: automatic mail (Recall `sources_changed`) feeding — Ingest takes mail only by hand; auto-apply without review |
| First fill (read what was said before, priced) | yes | Save past minutes (by rule) + add sources by hand | DROP; replaced by "Save past minutes" |
| Dictionary sync (`echo.read dictionary`, `echo.write dictionary`, `_echo/Dictionary.md`) | yes | TERMS_TAXONOMY.md in twin (vault-owned) | DROP (flag: loses two-way link between Echo dictionary and notes; decide) |
| `knowledge` setting / switch, Notes tab (`knowledge.tab`), Notes card (`knowledge.settings`) | yes | no | DROP (settings key retired; slots unused or reused for a vault entry) |
| Agent entry `knowledge` (facts) | yes | — | DROP; twin vaults get ordinary per-vault entries |
| Recall in the switcher, "From plugins" tabs | n/a | yes | KEEP-from-knowledge (it is the window's Knowledge section) |
| Settings → From plugins card / section | "Obsidian" section, card | "Knowledge vaults" section, card | MERGE: one section "Knowledge" listing vaults (settingsVaults) with needs-review badge |
| Palette, Inbox | 2 palette items, Inbox review | palette actions (connect/new/…) | MERGE |
| Open in Obsidian | `obsidian://open?path=` link | `kn_obsidian` native | MERGE (one action) |
| Reveal in Finder, drag-drop files, terminal panel per vault, sign-in, open_url | no | native | KEEP-from-knowledge (needs core primitives) |

---

## 4. Migration obsidian 0.8 → merged `obsidian` ("Knowledge")

### State that exists today (plugin store `<home>/.echo/plugins/obsidian/`, core grants keyed by id `obsidian`)
- `vaults.json`: `[{id, name, root, state: analysing|review|ready|failed|empty, confirmed, error, started_at, added_at,
  kind, analysed_at, model, notes, latest, git, is_vault, inside:[{name,n,skip}], belongs:[{client}|{thread}]}]`.
- `vaults/<id>/description.md` (six `## ` sections), `vaults/<id>/proposed.md`, `vaults/<id>/index.json` (index v2).
- `vaults.md` (catalog), `runs/<id>/`, `runs/knowledge/` (claude run dirs).
- Facts vault: `vault/**` (+ `vaults/echo/index.json`), `knowledge/{things,pending,removed,sources,queue,failed}.json`,
  `knowledge/dictionary.hash`, `knowledge/render.version`.
- Plugin setting `knowledge` (bool). Folder grants (`ctx.fs.folders()` = every connected root). Inbox items
  `review:<id>`. Agent entries under `.plugins/obsidian/<entry>/` (rebuilt by `publish`). No client localStorage.
- Native #677 (dev builds only): `<home>/.echo/knowledge/vaults.json`, `<home>/.echo/knowledge/<id>/…`, per-call
  `knowledge.json`, Knowledge drafts `echo.kn.draft:*` and `echo.kn.vault` in localStorage.

### What to carry over (on first load of the merged version — a one-time, idempotent migration in `main.js`)
1. Each `vaults.json` entry → merged record: keep `id`, `name`, `root`, `belongs`, `kind`, `confirmed`, `state`,
   `added_at`; run detection to fill `detected`; set **`minutes.mode = "off"` (or `"ask"`) — never the native default
   `auto`** (else the update starts writing notes into users' existing vaults); `profile` = default profile;
   `git.commit = false`; `ask.research` default; `ingest.calls = "off"`; `template = null`. (Native
   `import_plugin_vaults` used `ask`.)
2. Keep `vaults/<id>/description.md` / `proposed.md` as they are (same paths) — the Claude entries and Inbox review keep
   working unchanged; agent entry names stay (`nameFor(id)`).
3. Index caches: keep `vaults/<id>/index.json` if the merged index stays v2-compatible, else bump `IX_VERSION` and let it
   rebuild (cheap, incremental). Native `index.json` is a different format — not carried.
4. Grants: unchanged (same plugin id). Writing into vaults needs `folders.write` → adding it asks again on update
   (`plugin-api.md`: an update adding a `uses` line asks again); until accepted, vaults stay read-only (Pages edit,
   Ingest write, Health fix, minutes export, twin creation must degrade).
5. Retire the `knowledge` setting: ignore it; drop `knowledge/queue.json` and `failed.json`; stop listening to
   `sources_changed` (keep `minutes_written` only for minutes export).
6. Native #677 testers: optional one-time import of `<home>/.echo/knowledge/vaults.json` (match by root; native
   `profile/minutes/git/ask/ingest/overrides/template` win for those fields). Call `knowledge.json` records stay where
   they are if the JS export keeps that file name/format. Ask/lint/ingest/chat caches: drop or leave (decide).

### The old facts vault — options (needs a user decision)
- (a) **Export to a plain connected vault**: copy `vault/**` to a folder the user picks (or `~/echo/knowledge/echo-facts`),
  connect it with `minutes: off`, keep its notes and echo:// links; facts pipeline stops. Safe; the user keeps the
  history. Its `_echo/` folder and `index.md`/`log.md` remain as plain files.
- (b) **Convert into a twin vault**: new twin (starter), map `Clients/` → `knowledge/clients/`, `Organisations|Products|
  Initiatives|Documents/` → `knowledge/topics/` (or new folders), `index.md` → `knowledge/CATALOG.md` rows, `log.md` →
  `log.md`, tags `type/ client/ topic/` → TAG_TAXONOMY entries, `_echo/Dictionary.md` → TERMS_TAXONOMY. Most work;
  produces the "one Knowledge" story. Could be done by a one-off Ingest run on the old notes as sources (with review).
- (c) **Leave in the plugin store as a read-only legacy vault** — NOT recommended: it sits inside Echo's data folder
  (native warns "Inside Echo's data folder"), and removing the plugin deletes its store, i.e. the user's facts.
- (d) Delete (only with an explicit yes).
- Recommendation: (a) by default, offered once in the UI ("Echo's old Knowledge notes: keep them as a vault…"),
  only when `vault/` has notes; (b) as a follow-up via Ingest.

### Flags for the user
- F1 Facts-vault fate (above). F2 Description-for-Claude kept and shown where (vault Settings section vs separate)?
  F3 Default minutes rule for migrated vaults (off vs ask). F4 Drop automatic mail→Knowledge (Recall `sources_changed`)?
  Ingest has no auto mail. F5 Drop Echo-dictionary sync (`echo.write dictionary`)? F6 Permission sheet on update will
  ask again for new lines (`folders.write`, plus whatever primitives Ask/Ingest/M365/web need) — acceptable?
  F7 Agent prefix `kb` (obsidian) vs `kn` (knowledge) — keep `kb` (stable for existing entries). F8 Native #677
  registry import for dev testers — needed or not. F9 Removing a vault: obsidian drops description/index; native keeps
  folder — same; confirm that "remove" also drops Health/Ask/ingest caches.

---

## 5. view.js / model.js reuse vs coupling

### model.js — reusable as-is (pure, no I/O)
All blocks: kn-route, kn-calls-rule, kn-tabs, kn-switcher, kn-chip, kn-tree, kn-graph, kn-force, kn-prompt, kn-draft
(localStorage only), kn-diff, kn-chat, kn-poll, kn-tools, kn-skills, kn-mention, kn-health, kn-ingest, kn-ingest-poll,
kn-home. Data shapes they expect are the contract below (findings `{key, kind, by, group, title, why, fixable, fix_all,
pages}`, sources `{path, kind, title, state, meta}`, runs `{id, state, sources, to_answer, changes, kept, cost, waiting}`,
chat events `{type, n, block, done, md, html, …}`, call.knowledge `{record{saved[], choice}, vaults[], targets[], stale[],
failure, profile}`). The route prefix `kn/` may need to change for a plugin-owned activity (`obsidian:…`) — only
knParseRoute/knRouteOf.

### view.js — coupled
- Host surface `ctx.knowledge.*` (defined only in the native window, `knowledgePluginCtx`): `read(path)`, `send({cmd})`
  (only `kn_*`, `open_url`, `sign_in`), `register(view)` (native `Kn` host calls `view/after/tick/load/route/active/home/
  title/overlay/callChip/callMenuItems/countdownLine/settingsVaults/paletteActions/askView/askLabel/feedQueued/dropped/
  syncDrops/vaultId/setSource/editing/resume`), `context()` (recall, notice, selected call, call.knowledge, projects/
  clients), `profiles()`, `tabs()` (knowledge.tab slots), `refreshCall()`, `closeCallMenu()`, `terminal.{get, open,
  start, restart, view, saved, input}` (vault-keyed `claude:vault:<id>`).
- Job pattern: `run(cmd)` = `send({cmd})` then polls `api/kn/jobs?since=` for `{jobs:[{op, done, error, value}], last}`.
  In a JS engine this collapses to `await ctx.call(cmd, args)`; `run()` is the single seam to replace.
- Rendering hooks into Echo core pages (call chip, call ⋯ menu, countdown line, drops, terminal panel, notice) need
  generic slots/primitives in core; `call.menu` exists, the chip/countdown/drops/terminal do not as generic APIs.
- Page HTML comes from Rust `page::render` / defang (safe writer) — JS port must use `ctx.markdown` (Echo's safe writer)
  and keep wikilink handling like obsidian's marker approach.
- Reusable mostly as-is: the rendering/HTML functions and event handlers, if `get`/`send`/`run` and the `S` shim are
  re-pointed at plugin commands.

### Route/action contract the JS engine must provide (read routes `api/kn…` → commands)
Reads:
- `api/kn` → `{vaults:[vault_value], recall, home, default_profile, plugin_vaults, git}`
- `api/kn/pick` → last picked folder/files `{seq, path?, files?, empty?, refused?, detected?}`
- `api/kn/jobs?since=` (disappears with direct calls)
- `api/kn-resume?vault=` → `{command}` (claude --resume line)
- `api/calls?limit=40&q=` (core, call picker)
- `api/kn/<v>/tree` → `{vault, index, pages:[{path,title,tags,mtime,in_index}]}`
- `…/rev` → `{rev}`; `…/page?path=` → page (props, html, links, backlinks, base sha, text…); `…/find?q=`;
  `…/graph?mode=` → `{nodes, edges, hubs}`; `…/checks`; `…/health` / `…/health?fixes=<kind>` / `…/health/<key>?choice=`;
  `…/home`; `…/rows?paths=`; `…/history?path=`; `…/version?path=&rev=`; `…/asset` (images, bytes); `…/sample`;
  `…/twin-text?name=`; `…/settings` (vault summary, skills, has_twin, global_twin(_name), tags, terms, tag_file,
  meeting_tag, index_bytes, pages, cache_bytes, past, templates, in_home, ingest_skill, ingest_found);
  `…/preview?call=&stem=`; `…/ingest`; `…/ingest/<run>?from=`; `…/ingest/<run>/changes`; `…/ingest/<run>/text?path=`;
  `…/lint/<run>?from=`; `…/calls?q=`; `…/m365?q=`; `…/chats`; `…/chat/<conv>?from=` (25 s long poll);
  `…/skills`.
Actions (`kn_*`): `kn_pick`, `kn_pick_files`, `kn_drops`, `kn_add`, `kn_new`, `kn_set`, `kn_remove`, `kn_reread`,
`kn_import_plugin` (obsolete after merge), `kn_preview`, `kn_save_page`, `kn_new_page`, `kn_restore`, `kn_index_add`,
`kn_save_minutes`, `kn_call_choice`, `kn_past`, `kn_twin {op: add|global|global_remove}`, `kn_source_add {kind: files|
call|mail|chat|web}`, `kn_source_skip`, `kn_baseline`, `kn_ingest_run {sources|again}`, `kn_ingest_stop`, `kn_change
{decision: approve|reject|edit|take}`, `kn_ingest_apply`, `kn_ingest_discard`, `kn_ingest_requeue`, `kn_ingest_skill`,
`kn_fix`, `kn_fix_all`, `kn_ignore`, `kn_lint`, `kn_lint_stop`, `kn_chat_send`, `kn_chat_permit`, `kn_chat_stop`,
`kn_chat_terminal`, `kn_reveal`, `kn_obsidian`, plus `open_url`, `sign_in`.
Core primitives this implies (beyond today's ctx): vault writes with base-sha conflict (`folders.write` exists),
git (status/commit/log/show), streaming Claude Code session with permission callbacks + resume + terminal hand-off,
scratch-copy runs, file picker for files + drop events, M365 search/read (signin), https fetch→main text, call
minutes/transcript/chat read, `minutes_written` event (exists), global `~/.claude/skills` write (twin global install).

---

## 6. Tests

- `tests/knowledge/knowledge.test.mjs` (1354 lines, ~95 tests): extracts the named `kn-*` blocks from model.js+view.js
  and tests them as pure functions — routes, switcher, call chip states, tree/filters, graph filters + force layout +
  labels, drafts, line diff, Ask turns/tool rows/poll merging/keys/mentions/skills/answer-into-page, Health lists/trend/
  Fix all/summaries/AI rows, Ingest queue/review/run view/add-source args (never a path)/drops/first-open, Home cards.
  Also 3 source lints: listeners registered through ctx (no app globals), no `confirm/alert/prompt`, no duplicate
  function names. **Carries over almost entirely** (re-point the file paths to `plugins/obsidian/`); the "keeps the app
  globals behind ctx" test needs updating to whatever host surface replaces `ctx.knowledge`.
- `tests/cases/knowledge/TC-001` (install, seven tabs, read/search/graph, isolated switch label, agent `read` allowlist
  refusing m365/calls/preview/jobs/terminal routes, client picker limited context, edit+conflict, #kn and echo://page
  routes) — carries over; agent part changes to obsidian's command names; #kn route expectations depend on new route.
- `TC-002` (minutes export idempotent + user edit kept, Ask fake streaming / skill+page context / no write, default
  profile fake reply, Curate allow/deny + resume, M365/call pickers, terminal hand-off by vault key, Ingest on scratch,
  approve/reject/edit/conflict/write, Health deterministic + fake AI + fix once) — carries over as behaviour; plumbing
  (job polling) changes.
- `TC-003` (disable keeps draft and stops jobs, unavailable state, undeclared plugin refused, no auto export while
  disabled, enable without restart, remove/reinstall keeps vault files/registry/receipts, coexistence with obsidian) —
  carry over except the last row (coexistence) and "native registry"; becomes "update obsidian 0.8 → merged keeps
  vaults, descriptions, grants" (new migration case).
- `TC-004` (person: native desktop, real profile, M365) — carries over.
- Fixtures `tests/fixtures/knowledge/{up,down,seed,curl}.sh/py` — seed uses `echoctl knowledge new/set` (native CLI) →
  rewrite to `echoctl plugin call obsidian …`; fake Claude/curl reusable.
- Obsidian side: `tests/obsidian/obsidian.test.mjs` (7 tests on `agentPart`/`apply` publish) and cases TC-001..003, 005
  (agent entries, confirm gating, change propagation, hostile When-line) — KEEP (feature kept). TC-004 (facts entry
  while on) — DROP with the facts vault. Feature map: keep F-OB-01/02/03/05/06/07, drop F-OB-04; add F-KNP-01..08 under
  the obsidian map (F-KNP-03 "existing links and registry" → "existing obsidian vaults carried over"; F-KNP-08 native
  capability → whatever capability gates the new primitives). New cases needed: migration 0.8 → merged (vaults,
  descriptions, grants, minutes default off, facts-vault option), and permission re-ask on update.
