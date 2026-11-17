# Inventory A — PR #677 integration surface (read-only)

Ref: `pr-677` vs `main` (merge-base). Line counts are added lines; "code/tests" approximate where tests are inline.
Destinations: CORE-PRIMITIVE / CORE-FIX / PLUGIN-JS / DUPLICATE / DROP / RULES-DOCS.

## 1. Table

### Engine pieces in my slice (knowledge/)

| File | Lines (code / tests) | What it does | Destination | Security notes |
|---|---|---|---|---|
| `knowledge/chat.rs` | 1132 / 892 (`chat/tests.rs`) | One long-lived `claude -p --input-format stream-json` process per conversation; event ring (KEEP 5000, CHUNK 500), long-poll `read`, `send`, `stop` (interrupt control_request, kill after 5 s), `permit`, MAX_LIVE 3 / IDLE 600 s sweep, resume via `--resume`, mode change = restart, profile lease via `terminal::hold`, close on sign-in / quit, `to_terminal`. | **CORE-PRIMITIVE** `ctx.claude.chat` (see §3). Vault-specific to strip: `Vault` type everywhere (→ granted folder + profile), Ask/Curate/Research → generic `{write, web}` flags, the hard-coded system prompt ("Echo Knowledge conversation…" → plugin-supplied `system` text, capped), `vault_args` plugin-dir, `v.ask.research` switch, `committed()` git commit at turn end (→ PLUGIN-JS on a `turn_end` event), `permits::record` activity log (→ PLUGIN-JS). | Never `--dangerously-skip-permissions`; `--permission-prompts host` + `--permission-prompt-tool stdio`; `--strict-mcp-config`; `--tools` excludes Bash/NotebookEdit/MCP; guard via `--settings` + env. **Missing vs. other guarded runs: no `ai::guard_ready` (MIN_CLAUDE) and no `ai::hooks_conflict` / admission (`notes::admit_child`)** — a policy that disables hooks would silently run it unguarded (allowed tools Read/Grep/Glob anywhere). Must be added when generalised. Others' words: text reaches HTML only via the page writer. |
| `knowledge/chat/permits.rs` | ~190 / ~530 | Permission card for Edit/Write: Echo's own diff of the file on disk vs. proposed input (not Claude's word), "clean before turn" tracking, activity line on allowed edit, git commit of files clean before the turn. | Split: **CORE-PRIMITIVE** (card + diff: it is the trust anchor, keep in host, generic over any folder); **PLUGIN-JS** (activity record, commit policy — needs a narrow `ctx.git` or a `uses.scripts` script). | Diff computed by host from disk; a file the user changed is never committed (keep the rule if commit moves to JS). |
| `knowledge/chat/attach.rs` | ~55 / ~58 | Attach a call's minutes (never transcript) to a message, framed as others' words; refuse a call on another AI profile unless "Attach anyway" (notice recorded). | **CORE-PRIMITIVE** as part of `chat.send({attach:[{call}]})` — the profile check is AGENTS critical rule "a call's text goes only to its pinned AI profile" and must stay in host. Alt: serve `ctx.echo.read('calls'/'minutes')` (already on the sheet, "not served yet") but then the profile check must still be host-side. | Profile pinning (claude-code-runs R1); minutes framed as untrusted. |
| `knowledge/chat/skills.rs` | ~130 / ~45 | Catalog of the profile's user skills/commands + the folder's skills (names, description, canonical read path), validates `/name` in a message; feeds prompt, `RUN_SKILLS`, `RUN_READ`. Uses `ai::system_config_dirs` (made `pub(crate)`). | **CORE-PRIMITIVE** (generic: "skills available to a conversation in folder F on profile P"); exposed as `ctx.claude.chat.skills(folder)` names/descriptions only. | Guard grants read-only access to exact canonical skill folders / command files; never writable. Personal skills reach the folder run: sheet must say so. |
| `knowledge/stream.rs` + `stream/tests.rs` + `testdata/stream/*` | 660 / 501 + ~850 fixtures | stream-json line → Echo events (text/thinking/tool/permission/denied/result/todo); bounded sizes, never panics; render throttle (tick). Text events carry `html` from `page::render_fragment` (vault index for wikilinks) + raw `md`; `tool_path` vault-relative; `steps_event` parses `.echo-ingest/steps.json` (ingest only); `domain_of` strict URL host parse for WebFetch "always this domain". | **CORE-PRIMITIVE** (parser is generic; shared by chat and folder runs). Generalise: emit `md` only (plugin renders with the safe writer, see minutes.rs row), paths relative to the run's folder, drop `steps_event` (ingest → plugin) or make it a generic "todo file" option. | Untrusted-text R3: text never becomes HTML except via safe writer. `domain_of` (ruling R27) is a security parser — keep. Line cap 32 MB, input caps. |
| `knowledge/transcript.rs` + tests + testdata | 83 / 110 + 20 | Rebuild events of a past conversation from Claude Code's `<cfg>/projects/*/<id>.jsonl`; strips Echo's own "(The pages this is about…" / "Minutes of" suffixes. | **CORE-PRIMITIVE** (part of chat history). Suffix markers become generic attachment markers. | Others' words, same parser. Id validated hex/`-` (`terminal::transcript`). |

### guard.rs (+871 code / +964 tests)

| Hunk group | What | Destination | Security |
|---|---|---|---|
| `Decision {Allow, Ask, Deny}`, `decide()`, `ask_answer()` (hook prints `permissionDecision: "ask"`; exit 2 if it can't print) | Lets the guard *ask* (host card) instead of only allow/deny. | **CORE-PRIMITIVE** (generic; prerequisite for any interactive guarded run). | Exit 0 without the printed answer would mean allow — the "can't pass the question → deny" branch must stay. |
| `settings_for(scope, exe)` / `guard_hooks()` | Per-run `--settings` file carrying the guard hook + scope in `env` (outranks the folder's own `.claude/settings.json` env). | **CORE-PRIMITIVE** (refactor of `settings()`; generic). | Note: no `claudeMdExcludes` — folder's CLAUDE.md is loaded deliberately. |
| `RUN_VAULT`, `RUN_CHAT`, `RUN_SOURCES`, `VAULT_WHO`, `VaultScope`, `VaultMode {Chat(Ask/Curate/Research), Ingest, Lint{findings}}`, `from_vars` | Scope from env: root canonical dir; chat mode; sources folder (never written); ingest copy must be `…/ingest/<run>/vault`; lint run dir must be outside root, writes only `findings.json`. | **CORE-PRIMITIVE** generalised as `FolderScope` (see §2). | Scope only from env Echo set (untrusted-text R5); malformed ⇒ nothing allowed. |
| `VaultScope::judge/write/writable/readable/rel/plain_rel/base` | Read/Grep/Glob inside root (not `.git`, not `.obsidian/plugins`), own `tool-results`; Edit/Write per mode (Curate: Ask; Ingest: allow in copy; Lint: only findings); Skill only named; Agent only without `isolation`; WebSearch allow / WebFetch ask in Research; Bash and everything else denied. | **CORE-PRIMITIVE** (generic folder rules). Vault-specific: `.obsidian/plugins` read-hiding, `.obsidian` in `machinery`, `.echo-ingest/{changes,steps}.json`, `raw_inbox` default. | Symlink write refusal; Windows plain-name rule; case folding. |
| Path & glob prover: `vault_path`, `bent`, `plain`, `fold/lower/under`, `readings/safe/alternatives/parse_glob/names_git/whole_match/name_match/takes/absolute`, `plugin_folders/files_under` (DIRS_MAX 50k, FILES_MAX 20k), `around_plugins`, `in_plugins`, `machinery`, `instruction_file` | Refuses network/UNC/NT paths before any FS call, `~`, `..`, invisible/odd whitespace; glob safe subset that the guard can prove never reaches `.git` or a hidden folder; Grep `!` pruning analysis. | **CORE-PRIMITIVE** (security-critical, generic). Generalise `in_plugins`/`around_plugins` from the literal `.obsidian/plugins` to a scope-supplied list of hidden folders (`RUN_HIDE`). | This is the heart of the PR's security work; keep with all its tests (~960 lines). |
| minutes-run `Edit|Write`: refuse `instruction_file` | Extra check in the existing minutes-run write arm. | **DROP** (or trivial hardening in the fix PR): the next line already allows only `notes.md` / action list in the call folder, neither is an instruction file. | — |
| `command()` refusal signer for `vault/ingest/lint` | Who-prefix on stderr; chat uses `VAULT_WHO` to tell guard refusals from Claude Code's own (to detect "this Claude Code doesn't hand prompts to Echo"). | Generic (`FOLDER_WHO`). | — |
| `own_results(call)` | Allows reading the session's own `<transcript>/tool-results/` (from hook input `transcript_path`, `session_id` must match stem). | **CORE-PRIMITIVE**. | Trusts Claude Code's hook input fields (not model-controlled) — OK, keep the stem check. |

### terminal.rs (~+230 code / ~+170 tests)

| Hunk | What | Destination | Security |
|---|---|---|---|
| `Term.session`, `open_with(.., session)`, `live_session(id)`, `listed()`, `remember()`/`transcript()`/`new_uuid()` made `pub(crate)`, `claude_folder_of()` | Track which Claude conversation a terminal runs so a conversation is never live in both chat and panel. | **CORE-PRIMITIVE** (generic, small). | One process per conversation. |
| `hold(profile, lease)` extracted; `HELD` counts chat processes | Profile leases for non-PTY processes. | **CORE-PRIMITIVE** (generic). | Sign-in closes every holder. |
| `close_all()` calls `knowledge::chat/ingest/lint::close_all`; `close_vaults()` | Quit / plugin-off stop. | Generic `claude::chat::close_all()` + `close_owner(plugin_id)`. No Knowledge names in core. | — |
| `start_folder`: `--add-dir` every vault on that profile outside home (`folder_vault_dirs`) | Echo-folder session can read vaults. | **DUPLICATE** of `ctx.sessions.read` (plugin-granted folders for Echo's sessions). | Widening the folder session's reach — must go through the existing grant path. |
| `vault_store_key`, `start_vault`, `vault_args`, `vault_plugin` (+ `defang::skill_files`, per-hash folder, atomic rename), `prune_vault_plugins` (called from `tray::run`) | Interactive Claude panel in a vault folder on its profile; managed profile gets the folder's skills as a defanged `--plugin-dir` + "read the rules" system prompt; never `project` setting source. | **CORE-PRIMITIVE** `ctx.sessions.openFolder` / panel kind `claude-folder:<plugin>:<grant>` (see §4). Defang + per-hash plugin dir stays in core (security). Rules prompt → plugin-supplied text. | **`start_vault` adds `--dangerously-skip-permissions` when the user's folder-session switch is on** — an unguarded, permission-less session in a plugin-chosen folder; combined with the client ctx `terminal.input` (UI row below) a plugin can type into it ⇒ arbitrary command execution. Generic version must never skip permissions for plugin-started sessions and must not expose `pty_input`. On a *system* profile Claude Code loads the folder's own `.claude/settings.json` (hooks!) — verify/decide. |
| `vault_resume_command`, `resume_command` | `cd '<root>' && claude --resume <id>` for system profile only; id hex-validated, root shell-quoted. | **CORE-PRIMITIVE** (generic over a folder). | Quoting + id validation must stay; managed profiles excluded (keys). |

### Other modified Rust files

| File | Lines | What | Destination | Security / notes |
|---|---|---|---|---|
| `ai.rs` `Profile::claude_dir()` | +10 | Profile's Claude Code folder (managed: own; else `CLAUDE_CONFIG_DIR` or `~/.claude`). | CORE-PRIMITIVE helper (with chat PR). | — |
| `ai.rs` `term_group` / `finish_stop_group` / `escalate` split | +35 | Non-blocking TERM now, KILL after 3 s in background (Echo quitting can't wait). | Goes with chat PR (refactor, not a bug fix on main). | Process-group kill semantics unchanged for existing callers. |
| `ai.rs` fake claude: chat / ingest / lint modes | +60 | Test fake playing stream-json scripts, control_request/response, `_apply`, `_findings`. | CORE-PRIMITIVE (test infra, rename modes to generic `folder`/`chat`). | Test-only. |
| `ai/policy.rs` | 1 | `system_config_dirs` → `pub(crate)`. | With skills catalog. | — |
| `signin.rs` | +6 / +53 | Sign-in closes chats, ingest runs, AI checks on the profile. | Generic "close every lease holder" (chat primitive PR). | Profile exclusivity during sign-in. |
| `app.rs` `choose_files` | +46 | Native multi-file picker (osascript / PowerShell), `ECHOCTL_PICK_FILES` in debug. | **CORE-PRIMITIVE** `ctx.system.pickFiles(prompt)` — capability `uses.files.pick`; sheet: "Asks you to pick files and reads only the ones you pick". Return opaque picks, read via `ctx.system.readFile(pick)`. | AppleScript string escaped via `applescript_str`; PowerShell `'` doubled. |
| `attention.rs` | +94 | Inbox items: minutes not saved to vault, new-calls rule failure, ingest changes waiting, failed ingest runs; quiet sweep. | **DUPLICATE** of `ctx.inbox.set/clear` → PLUGIN-JS. | — |
| `minutes.rs` `page_html` / `wikilinks_as_links` / `body_mode` | +105 | Safe Markdown writer with caller-decided links/images, `[[wikilinks]]`, Obsidian line breaks. | **CORE-PRIMITIVE** extension of existing `ctx.markdown(md)` → `ctx.markdown(md, {breaks, wikilinks, link})` where links resolve to plugin routes or https only. Also needed client-side for chat text. | untrusted-text R3: raw HTML escaped; hrefs only echo-link / https / plugin route; keep `rel=noopener`. |
| `notes.rs` / `notes/auto.rs` `calls_transcribing` extract; `with_vaults` notify text | +32 | Refactor for ingest's "wait for transcription"; "saved to <vault>" in notification. | `calls_transcribing`: DROP (only ingest uses it) or keep in a primitive if a plugin needs "transcribing" state. Notify text: **DUPLICATE** (`minutes_written` event + plugin's own notice). | — |
| `notes::notify_outcome`, `watch.rs` | +3 | Call `plugins::knowledge::minutes_written` (starts export). | **DUPLICATE** of `minutes_written` event → PLUGIN-JS. | — |
| `links.rs` `call_dir` stamp fallback | +5 code, +11 test, 1 test changed | `echo://call/<old-name>` still opens after a retitle (by 17-char stamp). | **CORE-FIX** (own PR, has test `renamed_call_link_still_opens`; existing `read` test expectation changes). | `run_limited` check still applied after resolution — verify in review. |
| `links.rs` `Link::Page` + `brain/mcp.rs` | +30 | `echo://page/<vault>/<path>` link; Recall refuses it. | **CORE-PRIMITIVE** generic `echo://plugin/<id>/<route>` (opens plugin route in window only; never `read`). Or DROP. | Path cleaned (`clean`), `..` refused. |
| `graph.rs` `mail_item` HTML→text | +5 | A body that arrives as HTML is made text before quote-trimming. | **CORE-FIX** (own PR; **no test in the diff** — add one). | Others' words: avoids HTML reaching text pipeline. |
| `graph.rs` `conversation_with_files`, `attachment_names`, `conversation_raw` | +30 | Mail thread + attachment names (ingest source). | CORE-PRIMITIVE only if a plugin needs mail: new `ctx.echo.read('mail', id)` kind (R8) — else part of plugin via CLI. | Contents never read, names only. |
| `jshost.rs` / `service_async.rs` `knowledge.read`; `jshost::sync_some` → `knowledge::sync_lifecycle` | +4 | Catch-all host service + lifecycle hook. | **DROP** (catch-all `uses.knowledge`; Knowledge hook in generic lifecycle). Generic replacement: `ctx.onUnload` / existing plugin stop paths stop the plugin's own chats/runs by owner id. | — |
| `plugins.rs` (`knowledge::stop` in install/set_enabled/remove), `plugins/capabilities.rs`, `plugins/knowledge.rs` (156) | ~+160 | `uses.knowledge` capability; authorizes `api/kn` reads; stops runs on disable; starts minutes export only while enabled. | **DROP**. Replace by generic "a plugin's chats/runs/sessions stop when it is disabled/updated/removed" in `scripts::stop_plugin`-style `claude::stop_owner(id)`. | — |
| `cli/knowledge.rs` (456) + `cli/mod.rs` + `main.rs` | +465 | `echoctl knowledge list/detect/add/set/new/pages/read/check/lint/index-add/save-minutes/ingest/twin`. | **PLUGIN-JS** (plugin commands via `echoctl plugin call obsidian <cmd>`, `uses.sessions.commands`). Nothing vault-specific in core CLI. | — |
| `tray.rs` | +2 | `prune_vault_plugins` at start. | With the session primitive (generic prune of generated skill plugin dirs). | — |
| `window/mod.rs` | ~+100 / +43 | `knowledge::route/handle` dispatch; macOS drag-drop handler while page "takes drops" (`kn_drops`), page told names only; export adds `/api/kn`. | Drag-drop → **CORE-PRIMITIVE** `ctx.ui.onFileDrop(fn)` (client half; names only, paths held host-side as a pick usable by `ctx.system.readFile`); capability shares `uses.files.pick`. Routes/export: DROP. | Names only to page (test `dropped_files_reach_the_page_by_their_names_only`) — keep. macOS only. |
| `window/knowledge.rs` (78) | new | `/api/kn*`, `/api/kn-plugin/<id>/read`, `kn_*` IPC (pick, reveal, obsidian://, drops, jobs). | **DROP** (native routes). | **Hole:** `kn_*` IPC is authorized only when the message carries a `plugin` field, and `/api/kn/*` is served with no plugin check at all — the "plugin gate" is cosmetic. |
| `window/calendar.rs` `cached_meetings` | +10 | Last-fetched calendar as meetings (Home suggestions). | CORE-PRIMITIVE small: `ctx.echo.read('meetings')` (R8). | No new M365 calls. |
| `window/call.rs` | +2 | `call_detail.knowledge` field. | **PLUGIN-JS** via existing `call.menu` slot / a call chip slot. | — |
| `window/terminals.rs` | +2 | `claude-vault` terminal kind. | Generic `claude-plugin-folder` kind (session primitive). | — |
| `window/assets.rs` | +3 | Serves `ui/knowledge.js`. | DROP. | — |

### UI (crates/echoctl/ui)

| File | Lines | What | Destination | Security |
|---|---|---|---|---|
| `knowledge.js` (61) + `knowledge.test.mjs` (57) + `index.html` | new | `#kn/...` router + `Kn` registry of hooks (view, overlay, callChip, callMenuItems, countdownLine, paletteActions, askView, drops, tick…). | **DROP** as Knowledge-specific. Generic needs: plugin activity routes (exist: `#<plugin>:<id>/<route>`), slots for call chip / minutes hint / palette (palette exists; add `call.chip` slot per R7 if needed). | — |
| `app/34-plugin-knowledge.js` (46) | new | `knowledgePluginCtx`: `read`, `send(kn_*|open_url|sign_in)`, `register`, `tabs`, `profiles`, `context` (selected call, threads, clients), `closeCallMenu`, `refreshCall`, `terminal.{input,get,open,start,restart,view,saved}`. | DROP; generic parts: `profiles()` → `ctx.ai.profiles()` (names/kinds only); `context()` → existing `ctx.echo.read('threads'/'clients')`; `terminal.*` → session primitive **without `input`**. | **`terminal.input` = pty_input into a Claude session** (prompt/command injection; with skip-permissions, code exec). Must not survive. |
| `app/33-plugins-client.js` | +24 | `pluginCtx(id, caps)`; `onUnload`, `listenWindow`, `ui.patch`, `ui.stylesheet(path)`; cleanup in `unloadPlugin`. | **CORE-PRIMITIVE** (generic client helpers; R7: owned under id, removed on unload). | stylesheet path regex + `..` refusal; served from the installed package only. |
| `app/06-workbench.js` | 1 | Removes `when` on the Knowledge activity (always shown). | **DROP** (regression: shows Knowledge with neither Recall nor plugin). | — |
| `app/08-data.js`, `14-call.js`, `16-terminals.js`, `17-minutes.js`, `50-brain.js`, `53-brain-people.js`, `60-palette.js`, `90-render.js`, `92-comments.js`, `99-refresh.js` | ~+45 | `Kn.*` hook calls; `data-term-vault`; `kn-edit` typing guard. | DROP (replaced by slots / generic terminal `extra`). `data-term-*` generalisation goes with session primitive. | — |
| `thread-slot.test.mjs` | 1 | Passes `Kn` stub. | DROP with the above. | — |

### Repo / docs / rules

| File | Lines | What | Destination |
|---|---|---|---|
| `.ai-run/guides/design/knowledge.md` | 1119 | Full design spec (K-numbers, rulings, D-numbers) inside `guides/`. | **RULES-DOCS: must not be in guides** (guides = rules only; design/history goes to the issue/PR). Move to the plugin repo or the PR description. |
| `.ai-run/guides/design/README.md` | 3 | Index of design notes. | DROP. |
| `AGENTS.md` | +1 | Task-classifier row "Knowledge vaults" → design/knowledge.md. | DROP (needs a `Rules:` PR and points at a design doc). |
| `.ai-run/reference/plugins/plugin-api.md` | +27 | `uses.knowledge`, § Native Knowledge, client ctx additions (`onUnload`, `listenWindow`, `ui.patch`, `ui.stylesheet`). | Keep only the generic client-ctx lines (same PR as that primitive); rest DROP. |
| `.ai-run/reference/security/untrusted-text.md` | +5 | R1a/R1b "Knowledge vault runs" — **rules written into a reference**. | RULES-DOCS: real rules → a `Rules:` PR to the security guide, written for the generic folder run. |
| `.ai-run/reference/architecture/architecture.md` | +12 | Where Knowledge code goes. | DROP / rewrite for primitives. |
| `.ai-run/reference/development/dev-workflow.md` | +8/-3 | Notes that `--no-tray` can't open a native window. | Small docs fix (reference; no Rules PR) — can ride with the Makefile or fix PR. |
| `.ai-run/reference/window/window-ui.md` | +2 | knowledge.js bridge. | DROP. |
| `README.md` | +16 | User docs for Knowledge. | Plugin repo's README; core README gets one line when the plugin ships. |
| `docs/obsidian-design.md` | +5 | "Superseded" banner. | DROP (internal docs aren't committed per user memory). |
| `tests/12-knowledge.md` (337), `tests/cases/plugins/TC-060…`, `tests/scenarios/S-35…`, `tests/feature-map/areas/know.json`, `tests/README.md` | ~410 | Manual cases for Knowledge. | Rewrite: core cases per primitive (folder run guard, chat, pick files, drop); Knowledge cases move to plugin repo. TC-060 (plugin lifecycle) is the closest to reusable. |
| `Makefile` | 101 | Dev targets mirroring guides. | Own optional PR or DROP (unrequested; user decides). |
| `scripts/check-mod.sh` | +2 | Runs `knowledge.test.mjs`. | DROP with knowledge.js. |
| `.gitignore` | +2 | `.idea`, `tasks`. | DROP (personal). |
| `crates/echoctl/templates/knowledge/twin/**` | ~700 | Starter vault + skills. | PLUGIN-JS (plugin package files; copy via `ctx.fs.write` into a granted folder). |

## 2. guard.rs: what VaultScope enforces, and the generic folder-scoped run

**Enforced today (env set by Echo, never from the call):**
- Scope: `RUN_MODE` ∈ vault|ingest|lint; `RUN_VAULT` (abs, canonical dir), `RUN_CHAT` ask|curate|research, `RUN_SKILLS` (exact names), `RUN_READ` (abs canonical skill dirs/command files), `RUN_SOURCES` (relative, Normal components only; required for chat/ingest), `RUN_DIR` (ingest: must be `…/ingest/<run>/vault`; lint: must be outside the vault). Anything missing/malformed ⇒ deny all.
- Reads (Read/Grep/Glob): only inside root, or exact skill paths, or the session's own `tool-results`; never `.git` (any case), never `.obsidian/plugins/**` (tokens); search globs restricted to a provable safe subset (literal, `*`, whole-segment `**`, flat braces), no `~`/`..`, no segment that could spell `.git`, Grep may not end in `**`, Glob `**` from root refused; Grep/Glob that would enter `.obsidian/plugins` refused unless pruned with `!name`; Grep/Glob with `file_path` refused.
- Paths: refused by text before any FS call — UNC/`//host`/`\\?\UNC`/NT `\??\`, `~`, `..`, invisible/Cf chars, non-space whitespace, trim-changing; dangling links refused; Windows device names/streams/trailing dot.
- Writes: Curate ⇒ **Ask** (host card) for any plain-named file inside root except instruction files (`CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`, `.claude/**`, any case), machinery (`.mcp.json`, `.agents`, `.git`, `.obsidian`) and the sources folder; never through a symlink. Ask/Research ⇒ deny. Ingest ⇒ allow inside the copy (same exclusions) plus `.echo-ingest/{changes,steps}.json`. Lint ⇒ only `<RUN_DIR>/findings.json`.
- Other tools: `Skill` only Echo-named (not in lint); `Agent` only in chat and only without `isolation` (sub-agent calls are also hooked); `WebSearch` allow / `WebFetch` **ask** only in Research; `Bash` and everything else (MCP, NotebookEdit, unknown) denied.
- Answer: exit 0 / exit 2 + `<who>: <why>` / stdout `permissionDecision: "ask"` (fails closed if it can't print).

**Generic form — `RUN_MODE=folder` (`FolderScope`), any plugin with the capability:**
- Env: `ECHOCTL_RUN_ROOT` (canonical granted folder, via `grants::resolve`, or an Echo-made scratch copy of it), `ECHOCTL_RUN_WRITE` = `none` | `ask` | `all` (only for an Echo-made scratch copy) | `result:<abs file outside root>`, `ECHOCTL_RUN_WEB` = `none` | `search` | `ask` (search allowed + every fetch asked), `ECHOCTL_RUN_PROTECT` (relative folders never written: plugin-declared, e.g. its sources/inbox; always plus the built-in instruction + machinery set), `ECHOCTL_RUN_HIDE` (folder *names* never read or searched, e.g. `.obsidian/plugins`; the existing `around_plugins` prover parameterised by name pair instead of the literal), `ECHOCTL_RUN_SKILLS`, `ECHOCTL_RUN_READ`.
- `Ingest` becomes `write=all` on a host-made copy (host checks the copy lives under Echo's scratch area for that run — same structural check as today); the review/apply of the copy's diff is plugin JS using `ctx.fs.write` on the granted folder (writable grant). `Lint` becomes `write=result:<file>` (file under Echo's run dir, outside root, read back by the host and returned).
- Keep: decide/ask/deny, `settings_for` per-run settings, own-results, all path/glob code and tests (rename `vault` → `root`).
- Must add (missing in PR): `ai::guard_ready` (MIN_CLAUDE), `ai::hooks_conflict` (policy that disables hooks ⇒ refuse), admission (`notes::admit_child`-style), profile pinning, and decide on `claudeMdExcludes`/system-profile project settings (a granted folder's `.claude/settings.json` hooks would run on a *system* profile — the guard can't stop non-tool hooks).
- Capability (R1): `uses.claude.folder: {write: "none"|"ask"|"copy"|"result", web: "none"|"search"|"ask", hide: [names], protect: [rel]}` — sheet (Echo's words): "Runs Claude Code on your AI profile in a folder you gave it: it reads only that folder [and the skills you have], runs no commands [, shows you every change before it is made | works on a copy whose changes you review | writes only its result] [, searches the web and asks you before opening each page]." Requires `uses.folders` for the grant.
- API: extend `ctx.claude.run({folder: grant, write, web, skills, prompt, …}) → {result, events?}` for one-shot runs (ingest/lint); chat below for interactive.

## 3. Interactive chat as a generic `ctx.claude.chat`

Yes — `chat.rs`, `stream.rs`, `transcript.rs`, permits' card/diff and skills are generic once `Vault` is replaced by (granted folder, pinned profile, owner plugin). Contract proposal (client half; host does process + guard):
- `ctx.claude.chat.start({folder, profile?, write: "none"|"ask", web: "none"|"search"|"ask", title, system?}) → id` (title never passed as `--name` on a wrapper profile; `system` capped, appended after Echo's own guard text).
- `send(id, text, {attach: [{call, anyway?}], files: [rel]})` — TEXT_MAX 20 000; call minutes only, profile check host-side; refused while busy, while live in a terminal, or when MAX_LIVE are answering.
- `read(id, from, waitMs) → {events, next, live, busy, waiting}`; events: `user`, `text{block, md, done}`, `thinking`, `tool{id,name,verb,target,detail,path,readonly}`, `permission{request, tool, path|url, domain, diff|why}`, `answered`, `denied`, `result{tokens, cost, seconds, stop}`, `error{text, action?}`, `notice{kind}`, `todo`. Text is Markdown only; plugin renders with `ctx.markdown`/client safe writer.
- `answer(id, request, {allow, always, message})` — `always` = rest of conversation for edits / per-domain for fetch (guard still judges each).
- `stop(id)`, `list(folder)`, `history(id)` (transcript), `toTerminal(id)`, `skills(folder)`.
- Events to host half: `turn_end {id, edited: [rel]}` so the plugin can commit/record activity.
- Lifecycle in core: MAX_LIVE, IDLE sweep, KEEP/CHUNK, close on sign-in, quit, and **plugin disabled/updated/removed (by owner id)**.
- Capability: `uses.claude.chat` (or `claude.folder` with `chat: true`) — sheet: "Holds conversations with Claude Code on your AI profile in a folder you gave it, shown in its page; [each edit and web page waits for your yes]".

## 4. terminal.rs pieces needed generically

- `Term.session` + `live_session` + `listed` + `remember` pub — one process per conversation across panel/chat.
- `hold()` lease for non-PTY holders.
- `start_vault` → `start_in_folder(owner_plugin, grant, profile, pick)`, store key `<profile>:plugin:<id>:<grant>`; **never** add `--dangerously-skip-permissions` for a plugin-started folder session (today it follows the user's folder switch); `vault_args`/`vault_plugin` → generic "folder skills as defanged `--plugin-dir` for managed profiles" (+ `prune` at start); the rules prompt becomes plugin text.
- `resume_command(folder, id)` generic (system profile only, quoted, id validated).
- Client ctx: `ctx.sessions.panel({folder, label})` to open/start/restart/view; no `input`.
- `folder_vault_dirs` → DUPLICATE of `ctx.sessions.read`.

## 5. Pure fixes / items unrelated to Knowledge

| Item | Real fix on main? | Test? |
|---|---|---|
| `graph::mail_item` HTML body → text | **Yes** (a body that comes as HTML is quote-trimmed as raw HTML today). Own PR. | No test in diff — add one. |
| `links::call_dir` stamp fallback (renamed call links) | **Yes**. Own PR. | `renamed_call_link_still_opens`; changes `read` test fixture name. |
| dev-workflow reference `--no-tray` note | Docs fix (reference). | n/a |
| Model aliases for local profiles (`p.model()` in chat/ingest/lint args) | **No** — main already resolves aliases (`terminal.rs`, `livenotes`); the PR's own new code adopts it. Keep inside the chat/run primitive. | in-PR tests |
| Wrapper session-name privacy (`--name` omitted on wrapper) | **No** — main passes `--name` nowhere; new code only. Keep the rule in the chat primitive. | `main_refresh_..._keeps_wrapper_names_private` |
| `ai::term_group/finish_stop_group/escalate` | Refactor for non-blocking stop; no bug on main. Ships with chat primitive. | via chat tests |
| `signin` closes chats/runs | Only meaningful with chat. Ships with chat primitive (generic lease holders). | `sign_in_closes_chats_runs_and_checks` (rewrite generic) |
| guard minutes-run `instruction_file` write check | Redundant. DROP. | — |
| `notes::calls_transcribing` extraction | Refactor only. DROP unless a primitive needs it. | — |
| `06-workbench.js` `when` removal | Regression — DROP. | — |
| `.gitignore`, `Makefile` | Not fixes. DROP / optional. | — |

## 6. Key risks

1. **Chat runs skip the guarded-run admission** (`guard_ready` MIN_CLAUDE, `hooks_conflict` policy check, admission). With hooks disabled by policy the run is unguarded. Fix in the generic primitive.
2. **`terminal.input` in the client ctx** lets a plugin type into a Claude session; `start_vault` adds `--dangerously-skip-permissions` when the folder switch is on ⇒ plugin → arbitrary commands. Neither survives.
3. **System-profile runs in a granted folder load its `.claude/settings.json` (hooks, permissions)** — SessionStart-style hooks would run commands the guard never sees. Decide (`--setting-sources user` + defanged `--plugin-dir` for all kinds, or refuse folders with project hooks).
4. **`window/knowledge.rs` gate is cosmetic**: `/api/kn/*` and `kn_*` IPC without a `plugin` field skip `authorize`.
5. **Obsidian specifics inside the guard** (`.obsidian/plugins`, `.obsidian` machinery, `.echo-ingest`, `raw_inbox`) must become scope data, keeping the glob prover and its tests intact.
6. **Rules in the wrong place**: 1119-line design doc in `guides/`, rules (R1a/R1b) in a reference, AGENTS row — all need a `Rules:` PR rewritten for the primitives.
7. Attaching minutes must keep the host-side profile check (AGENTS critical rule); a plain `ctx.echo.read('calls')` would bypass it.

## 7. Proposed ordered core PRs

| # | PR | Est. size (code + tests) |
|---|---|---|
| 1 | Fix: mail body that arrives as HTML is made text (`graph::mail_item`) + test | ~10 + ~25 |
| 2 | Fix: a call link with a retitled call's old name opens it (stamp fallback) + test | ~10 + ~15 |
| 3 | Docs: dev-workflow `--no-tray` note (reference) — optional Makefile separately if the user wants it | ~10 / (101) |
| 4 | Client ctx helpers: `onUnload`, `listenWindow`, `ui.patch`, `ui.stylesheet` + node test + plugin-api lines | ~30 + ~40 |
| 5 | Pick and drop files: `ctx.system.pickFiles`, `ctx.ui.onFileDrop` (macOS), capability `files.pick`, picks opaque, names-only to page | ~120 + ~80 |
| 6 | Safe Markdown with links: `ctx.markdown(md, {breaks, wikilinks, link})` (minutes writer `page_html`), client-side too | ~110 + ~60 |
| 7 | `Rules:` PR — folder-scoped guarded runs and chats (security + plugins guides), before 8–10 | docs ~60 |
| 8 | Guard: `Decision`/ask, `settings_for`, `FolderScope` (root/write/web/protect/hide/skills/read), path + glob prover, own results; capability `claude.folder`; extend `ctx.claude.run({folder,…})` for one-shot runs (copy / result modes) incl. `guard_ready` + `hooks_conflict` + admission | ~1000 + ~1000 |
| 9 | `ctx.claude.chat` primitive: process, stream parser, transcript history, permission cards with host diff, skills catalog, minutes attach with profile check, leases/sign-in/quit/plugin-off stop, fake-claude chat mode | ~1700 + ~1500 (+ ~870 fixture lines) |
| 10 | Folder session panel for plugins: `start_in_folder`, defanged skills plugin dir + prune, resume command, `Term.session`; no `input`, never skip permissions | ~250 + ~200 |
| 11 | Small reads: `ctx.echo.read('meetings')` (cached calendar), optional `('mail', id)` with attachment names; optional `echo://plugin/<id>/<route>` link | ~80 + ~60 |

Everything else (vault engine, CLI `knowledge`, attention items, notify text, call chip, routes, templates, UI `Kn` hooks) moves to the `obsidian` plugin's JS on top of 4–11 plus existing `ctx.fs.*`, `ctx.inbox`, `minutes_written`, slots.
