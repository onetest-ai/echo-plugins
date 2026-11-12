# Plugin Development

**Project**: Echo plugins (the onetest marketplace) · **Stack**: JavaScript ES modules — host half on Echo's QuickJS plugin host, client half in Echo's window · **Scope**: how a plugin in this repository is laid out, looks, talks to outside services, is versioned and committed. The plugin API itself is Echo's and is documented there.

## Where the API is documented

### Rules
- R1. Learn the plugin API from Echo's own guide, `onetest-ai/echo` → `.ai-run/guides/plugins/plugin-authoring.md` (manifest, `uses`, host half, client half, widgets, publishing); this guide does not repeat it, so a change there needs no change here. Evidence: `echo:.ai-run/guides/plugins/plugin-authoring.md`
- R2. When that guide and Echo's code disagree, the code wins: the host half's `ctx` is `PRELUDE` in `crates/echoctl/src/jshost.rs`, the client half's slots are `SLOTS` in `crates/echoctl/ui/app/33-plugins-client.js`, manifest checks are `read_manifest` in `crates/echoctl/src/plugins.rs`. `docs/*-design.md` is intent and may be ahead of the code (a slot it names may not exist) or behind it. Evidence: `echo:crates/echoctl/src/jshost.rs::PRELUDE`
- R3. Check what the user's Echo really has before relying on it: `echoctl --version`, and the release that shipped the capability; set the manifest's `echo` (`">=X.Y.Z"`) to that release. Evidence: `plugins/obsidian/echo-plugin.json::echo`
- R4. When a plugin needs something Echo lacks (a slot, a `ctx` service, rows in an Echo view), open an issue in `onetest-ai/echo` and link it from the plugin's issue here; never reach around it — no reading Echo's DOM or globals, no writing Echo's files, no private endpoints. Evidence: `echo#85` (My work rows), linked from issue #2

## Layout

### Rules
- R1. One folder per plugin, `plugins/<id>/`, where `<id>` is the manifest's `id` and the `id` of its entry in `echo-marketplace.json` (`{id, source: "./plugins/<id>", categories}`); add it to the table in the root `README.md` in the same change. Evidence: `echo-marketplace.json`
- R2. The folder holds only what installs: `echo-plugin.json`, `main.js`, `client.js` (when it has UI), `README.md`, and files it reads with `ctx.package` (e.g. `templates/`). Tests, fixtures and scripts live outside it (`tests/<id>/`): everything in the folder is copied to the user's computer. Evidence: `plugins/scheduler/templates`
- R3. Start each half with a comment saying what it does, what it keeps (store files, settings) and which hosts it reaches. Evidence: `plugins/telegram/main.js` (header)
- R4. Keep the host half one file with no `import` (Echo's rule). Put its pure logic — parsing, mapping an API answer to rows or widget data, formatting — in named exports above `apply(ctx)`, and keep every effect inside `apply`, so tests can import the file. Evidence: `plugins/scheduler/main.js::parseSchedule`
- R5. Write the plugin's `README.md` as the others do: one paragraph of what the user gets, bullets of what it adds and where (in Echo's words: "Settings → From plugins → Telegram", "Today → My work"), what it needs (accounts, Echo version), a line naming what `main.js` and `client.js` do, and "Part of the [Echo plugins](../../README.md) marketplace." Evidence: `plugins/scheduler/README.md`

## Manifest

### Rules
- R1. Write `summary` as one sentence the user reads on the install sheet: what they get, not how it works. Evidence: `plugins/scheduler/echo-plugin.json::summary`
- R2. Ask in `uses` for the least that works: `network.hosts` names each host exactly (`api.github.com`, not a pattern); `echo.read` only the kinds read; no `claude` unless it runs Claude. Each line is one the user agrees to, and an update that adds one asks them again. Evidence: `plugins/telegram/echo-plugin.json::uses`
- R3. Keep an account's credential in a `secret` setting, entered in the plugin's own Settings section and checked against the service by a host command (`connect`) before it is kept; never show it back, log it, put it in a widget or a row, or send it to any host but its own service. Evidence: `plugins/telegram/main.js::connect`
- R4. Make anything that differs between users a setting (organisations, repos, projects, filters), never a constant in the code. Evidence: issue #2 (Settings: "which organisations or repos to read")

## Look and words (the same experience in every plugin)

### Rules
- R1. A plugin with anything to set up or show gets its own Settings section: `ctx.settings.section({id: 'main', label: <its name>, icon, badge, render})`; `badge()` is `'!'` while it needs the user (not set up, sign-in refused) and `''` otherwise. Evidence: `plugins/telegram/client.js::ctx.settings.section`
- R2. Build sections from Echo's pieces only: `ctx.ui.setCard`, `ctx.ui.setRow(title, text, controls)`, `ctx.ui.esc`, and Echo's classes — `btn primary` for the one next step, `btn ghost` for the rest, `set-sub` for a note, `error` for what went wrong, `set-ok` with "Ready ✓". No colours or fonts of the plugin's own; any CSS it adds is scoped under its own class prefix. Evidence: `plugins/telegram/client.js::render`
- R3. Draw a section from one host command, `status`, that says everything the section shows; show a skeleton while it loads, the error when it fails, and call `status` again after every action. Evidence: `plugins/telegram/main.js::status`, `plugins/telegram/client.js::load`
- R4. Present setup as steps, one row each: what it is, whether it is done, and the single action that does it. Anything that stops the plugin working says why in the user's words, on its row ("GitHub refused the token — it may have expired"), not only in the log. Evidence: `plugins/telegram/client.js::steps`
- R5. Draw icons as inline SVG, `viewBox="0 0 24 24"`, `fill="none" stroke="currentColor"`, round caps and joins, `aria-hidden="true"`, so they follow Echo's theme (a service's own mark, such as GitHub's, filled with `currentColor` instead); use the same icon for the plugin everywhere it appears (its section, its widgets, rows it adds). Evidence: `plugins/telegram/client.js::PLANE`
- R6. Add document listeners with `ctx.listen` (Echo takes them out when the plugin unloads), falling back to `document.addEventListener` for an older Echo, and mark the plugin's buttons with `data-<prefix>-<action>` attributes under its own prefix. Evidence: `plugins/telegram/client.js::listen`
- R7. Write to the user in the second person, plainly, in Echo's voice ("Your bot", "Kept on this computer only."); name Echo's places as the window names them. No API or HTTP terms on screen when a plain word exists. Evidence: `plugins/telegram/echo-plugin.json::settings`

## Outside services

### Rules
- R1. Reach a service only with `ctx.http.fetch` and check `status` on every answer; turn 401, 403, 404 and rate limits into a state `status` reports, so the section can say why. Evidence: `plugins/telegram/main.js::connect`
- R2. Fetch on the plugin's own timer (`ctx.every`) or on the user's action, keep the last answer in the store (`cache/` for what can be lost), and answer widgets and rows from it: a widget's provider has 5 s, and Today never waits on a service. Push a change with `ctx.widgets.set`. Evidence: `echo:.ai-run/guides/plugins/plugin-authoring.md` (Host half R15)
- R3. Treat the service's text (titles, names, branch names) as untrusted: through `ctx.ui.esc` or `ctx.markdown` in the window, plain text in widget data; an outside link only `https://` to the service's own host. Evidence: `echo:.ai-run/guides/security/untrusted-text.md`
- R4. Spend the service's rate limit carefully: one batched request per refresh where the API allows (GraphQL, search counts), conditional requests (`ETag` / `If-None-Match`) where it has them, refresh no more often than every 5 minutes unless the user asks, and back off when it says so. Evidence: no exemplar yet — the GitHub plugin (issue #2) is the first

## Versions and commits

### Rules
- R1. Bump `version` for every change a user would get: patch for fixes, minor for something new, and raise `echo` when it needs a newer Echo. Echo compares only `X.Y.Z` (a `-dev.N` suffix is ignored), so a change with the same `X.Y.Z` is never offered as an update. Evidence: `echo:crates/echoctl/src/update.rs::newer`
- R2. Write the commit subject as `<Name> <version>: <what changed, in the user's words>`; several plugins in one commit as `Scheduler 0.2.3, Telegram 0.3.1: …`; say `(needs Echo X.Y.Z)` when it does. Evidence: `git log` (`Scheduler 0.3.0: send a routine's answer to Echo's Today page`)
- R3. Do work of more than one commit on a branch `<plugin>-<topic>` and merge it as `Merge <branch>: <Name> <version> — <what it brings>`. Evidence: `git log` (`Merge obsidian-echo-knowledge-caps: Obsidian 0.7.0 — Knowledge`)
- R4. Before a change is done, pass the gates in `.ai-run/guides/testing/plugin-testing.md`. Evidence: `.ai-run/guides/testing/plugin-testing.md`

### Constraints
| Do not | Do instead | Evidence |
|---|---|---|
| Read or change Echo's DOM, globals or files from a plugin | Use `ctx` and the slots Echo lists; ask Echo for what is missing (an issue in `onetest-ai/echo`) | `echo:crates/echoctl/ui/app/33-plugins-client.js::SLOTS` |
| Put tests, fixtures or dev scripts in `plugins/<id>/` | `tests/<id>/` at the repository root | `plugins/scheduler` |
| Hard-code a user's organisation, repos, project or token | A setting (`secret` for credentials) | `plugins/telegram/echo-plugin.json::settings` |
| Fetch from a service inside a widget's `provide` and wait | Fetch on a timer, keep it, answer `provide` from the store, `ctx.widgets.set` on change | `echo:crates/echoctl/src/jshost.rs::widget_ask` |
| Copy Echo's API rules into this repository | Link `plugin-authoring.md` in Echo | `echo:.ai-run/guides/plugins/plugin-authoring.md` |

### Read first
| When you are | Exemplar | Tests |
|---|---|---|
| writing a sign-in and a setup section | `plugins/telegram/client.js`, `plugins/telegram/main.js::connect` | no covering test |
| running work on a schedule, with a list and detail section | `plugins/scheduler/main.js`, `plugins/scheduler/client.js` | no covering test |
| reading folders and Echo's data, giving Echo's sessions skills, adding a Knowledge tab | `plugins/obsidian/main.js`, `plugins/obsidian/client.js` | no covering test |
| adding Today widgets | `echo:tests/fixtures/plugins/plugins/widget-demo` (one widget of each kind) | `echo:jshost::a_plugins_widgets_are_in_the_catalog_and_give_their_data_by_provide_and_set` |

`echo:` paths are in the Echo repository, `onetest-ai/echo`.
