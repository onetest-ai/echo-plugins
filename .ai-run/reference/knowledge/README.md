# Knowledge merge — inventory summary (2026-11-17)

Source: onetest-ai/echo#677 + onetest-ai/echo-plugins#17 (Vadim Vlasenko), kept open as reference.
Target: core = generic plugin primitives only; the vault engine = JS in the `obsidian` plugin (shown as "Knowledge"),
which absorbs Knowledge 0.1.1 and replaces the old facts vault. First port commit authored
`Vadim Vlasenko <33458204+vadimvlasenko@users.noreply.github.com>`.

Detailed slices: `inv-A-integration.md` (guard, chat, terminal, window), `inv-B-engine.md` (knowledge/* modules, data
model = the port's spec, tests to port), `inv-C-plugins.md` (obsidian 0.8 vs Knowledge, overlap, migration, route contract).

## Core PRs (order)

| # | PR | Size | S |
|---|---|---|---|
| F1 | Mail HTML body → text before quote trim (`graph::mail_item`) + test | ~35 | |
| F2 | Retitled call link opens by its stamp (`links::call_dir`) | ~25 | |
| P1 | Client ctx: `onUnload`, `listenWindow`, `ui.patch`, `ui.stylesheet` | ~70 | |
| P2 | Files: `ctx.system.pickFiles`, file drop to the page (names only), `copyIn` bytes ≤50 MB, read vault images | ~250 | |
| P3 | fs/store: `fs.write {ifSha, createNew}`, `append`, `mkdir`, `stat`/realpath, `fs.search`, `fs.snapshot`; `store.update` under a lock; `crypto.sha256` | ~400 | snapshot |
| P4 | `ctx.markdown` with wikilinks and a core-checked link/image map | ~170 | S |
| P5 | `ctx.git.*` (info, dirty, log, show, init, commit): verb allowlist, literal pathspecs, timeouts | ~300 | S |
| R | `Rules:` PR: folder-scoped guarded runs and chats; call text to its pinned profile inside plugin runs | docs | S |
| P6 | Guarded folder run: `ctx.claude.run({folder, write: none/ask/copy/result, web, protect, hide, skills})`; core applies `defang` to skills; `guard_ready`, `hooks_conflict`, admission, lease, recording wait, session-file cleanup | ~2000 | S |
| P7 | `ctx.claude.chat`: start/send/read/answer/stop/list/history/toTerminal, permission cards with core-made diffs, ≤3 live, idle stop, closed on sign-in/quit/plugin off | ~3200 | S |
| P8 | Plugin folder session in a terminal: no `input` from plugins, never skips permissions | ~450 | S |
| P10 | Plugin routines: a plugin provides its own routines in the one routine shape (`source: "plugin:<id>"`), run as guarded runs, shown/tuned in Scheduler | ? | S |
| P9 | Reads: `echo.read` calls/calendar/me/richer source; read-only `ctx.m365` search/thread/chat; a fetch grant for a URL the user typed; call-row slot | ~400 | m365, fetch |

Dropped from #677: `uses.knowledge`, `plugins/knowledge.rs`, `/api/kn` + `kn_*`, `window/knowledge.rs`,
`ui/knowledge.js`, `34-plugin-knowledge.js`, lifecycle hooks, attention items (→ `ctx.inbox`), the workbench `when`
change (regression), `Makefile`, `.ai-run/guides/design/knowledge.md`, AGENTS row.

Security issues in #677 to not carry over: chat skips guard_ready/hooks_conflict/admission; plugin `terminal.input` +
`--dangerously-skip-permissions` on vault terminals; `/api/kn` served without plugin check; folder's own
`.claude/settings.json` hooks may run outside the guard (to verify); Obsidian names hard-coded in the guard.

## Plugin port (`obsidian` → 1.0 "Knowledge")

1. Merged registry (obsidian ids + native fields) in the plugin store; migration from 0.8.
2. Pure modules (catalog, fm, diff, links, evidence, checks, model.js) — node tests ported first.
3. detect, scan (+ obsidian's richer JS index), page, graph, activity.
4. export (minutes rules), sources, extract, starter/twin (templates as package files).
5. health, lint, ingest + review on P6/P7.
6. Client: view.js re-plumbed from `ctx.knowledge` to plugin commands; obsidian's description/links/agent entries kept.
7. Cases: Knowledge TC-001/002/004 rewritten on plugin fixtures; new 0.8 → 1.0 update case; obsidian TC-004/F-OB-04 dropped.

## Decisions (user, 2026-11-17)

1. Old facts vault: deleted, no export. Its pipeline, first fill and Notes tab go.
2. Mail → Knowledge: the plugin's own routine → NEW core P10 "plugin routines" (`source: "plugin:<id>"`, Scheduler shows them).
3. Echo dictionary kept: normalizes tags (twin's TAG_TAXONOMY / TERMS_TAXONOMY) via existing `ctx.echo.dictionary`.
4. Minutes default for migrated vaults: `ask`. Export routes by thread/client: thread's vault → client's vault →
   default vault (setting on the thread/client, via a plugin slot), replacing per-vault scope rules.
9. Ask (chat UI) → its own Chat plugin on `ctx.claude.chat` (P7); Knowledge hands it a folder + context.
5. Vault = nested Claude project: cwd = vault, `--setting-sources user,project` → its CLAUDE.md, skills, hooks load
   (verified, Claude Code 2.1.326; `user` alone loads none). Echo's guard stays as `--settings` PreToolUse (both fire;
   its deny wins). Replaces #677's defang + skills-as-plugin copy → P6 shrinks.
6. Skills install place: vault's `.claude/skills` (nested rule) or global — a plugin-level user choice.
7. Permission re-ask on update: assumed accepted.
8. Client `ctx.call(command, args)` carries attachments (picked/dropped files as handles) → part of P2.

## P11 — network for trusted hosts (user, 2026-11-17)
User-listed addresses (`network.hosts_from`): plain http to any listed name (row warning outside private ranges);
self-signed https pinned by fingerprint on the user's yes (changed cert refused until agreed again); `ctx.http.stream`
(SSE/chunked), `ctx.net.websocket` in the host half; binary bodies via file handles; larger than 10 MB. Own sheet line.
After P3 (shared jshost files).
P11 layers: (A) window half — user-listed addresses of enabled plugins added to the window CSP (connect-src, media-src,
ws/wss) so the browser's WebSocket/fetch streams/EventSource/WebRTC/AudioContext work; JSON-RPC = plugin JS. (B) host
half `ctx.net.websocket` + `ctx.http.stream`. Mic: `uses.microphone` (sheet line), user's click in the plugin's view
only, recording indicator on, closed with view/plugin; never timers/events/host half.

## For the Rules: PR (after all primitives)
- File handles only (never paths; copied in only via copyIn) — user yes 2026-11-17.
- Folder-scoped guarded runs and chats.
- echo-plugins R6: add `fs.search`, `fs.snapshot` (and `copyIn`) to the off-slice services for bulk file work.
- echo-plugins Constraints row: plain http to any user-listed address (warning outside own network), not "only inside";
  a rule: the window CSP lists only enabled plugins' user-listed addresses, built through `window_csp` (#693).
- untrusted-text R2/R21: plugin "installs and updates" → "installs, updates and changes" (set/enable/disable/remove,
  marketplace changes) are refused in every run Echo started (#699).
- P1b (new, #found in #700): window half → host half args over 64 KB (ctx.call/markdown in a request body). Needed
  for the page editor.
- echo-plugins: a plugin reaches git only through `ctx.git` (`jshost::git::spawn`), never a script running git (#704).
- Rules for P6 (#710) + permission settings: claude-code-runs R6 exception (a plugin's folder run loads that folder's
  project settings; refused when they could route the run); echo-plugins R9 names folder runs (fixed tools per mode,
  edit only with folders.write, prompts skipped only by the user's setting); untrusted-text R20/R21 (folder runs as a
  4th kind; routines/Yolo/folder session permission settings: Auto default, Skip by the user's choice).
- Rules for P11b (#722): echo-plugins network constraint covers ctx.net.websocket + ctx.http.stream (listed addresses
  only); new row: only the user trusts a certificate (window/CLI, kept outside the store, `plugins::pins`);
  untrusted-text R2: certificate trust among plugin changes refused in every run.
- Rules for P11c (#723): echo-plugins mic gate rule; capture R12: a plugin's mic is not a recording and never runs
  beside one; window/security: the webview grants no capture but a plugin's mic opening.
- Rules for P8 (#724): echo-plugins R9 adds the interactive path (`terminal::start_plugin`) beside claudejob::run;
  untrusted-text R20 lists a plugin's folder session on the folder session's setting.
- Rules for #746: R22 client twin ("a plugin keeps only its own values per client through plugins::client_values,
  never a client field Echo or the user set"); R7 names client.profile beside thread.profile (shared row helpers).
