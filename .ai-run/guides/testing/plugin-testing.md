# Plugin Testing

**Project**: Echo plugins (the onetest marketplace) · **Stack**: JavaScript ES modules, `node:test` (Node 22+), Echo's `echoctl` · **Scope**: the gates a plugin change passes, unit tests outside Echo, checking a plugin in a running Echo, acceptance

## Gates

Run from the repository root, fastest first.

| Gate | Run | Pass |
|---|---|---|
| syntax | `for f in plugins/*/*.js; do node --check "$f" || exit 1; done` | exit 0 |
| unit | `node --test 'tests/**/*.test.mjs'` | exit 0 |
| manifest | `echoctl plugin marketplace update local` then `echoctl plugin list` (see *In Echo*) | the changed plugin is listed with its new version, no error for it |
| in Echo | the changed plugin's commands and widgets, as in *In Echo* | each answers as the change intends |
| acceptance | the plugin issue's **Acceptance** lines, in the Echo window | each line holds, the failure lines too |

## Rules
- R1. Every gate passes before a change is called done or its PR opened; say in the PR which Echo version it was checked on and which acceptance lines were run. Evidence: `.ai-run/guides/plugins/plugin-development.md` (Versions and commits R4)
- R2. Use made-up data only — organisations and people like `acme-test`, `ada@acme.example` — in tests, fixtures, screenshots, PRs and issues; never a client's names, a real token or real call data. Evidence: `echo:.ai-run/guides/testing/testing.md` (R8)

## Unit tests (outside Echo)

### Rules
- R1. Put a plugin's tests in `tests/<id>/<topic>.test.mjs` using `node:test` and `node:assert/strict`, importing the plugin's pure exports from `../../plugins/<id>/main.js`; Node imports the host half as it is, because importing it runs nothing (every effect is inside `apply`). Evidence: `plugins/scheduler/main.js::parseSchedule`
- R2. Test first what turns outside data into Echo's: an API answer → rows, an API answer → widget data, settings text → what it means. Assert the widget data has its kind's shape (Echo's `plugin-authoring.md`, Host half R16) so a wrong shape fails here, not on Today. Evidence: `echo:.ai-run/guides/plugins/plugin-authoring.md`
- R3. Keep the network out of tests: a service's answers are fixtures in `tests/<id>/fixtures/` (JSON, made up, trimmed to the fields used), passed to the pure function. Evidence: R2 of *Rules* above
- R4. To test what `apply(ctx)` does (its commands, timers, store, `widgets.set`), call it with a fake `ctx` that records what it is given and answers `http.fetch` from fixtures. The first plugin to need one adds `tests/helpers/fake-ctx.mjs` and others reuse it; it fakes only names and shapes Echo's `PRELUDE` has, so a test can't pass on a service Echo doesn't give. Evidence: `echo:crates/echoctl/src/jshost.rs::PRELUDE`
- R5. Test only the client half's pure helpers; its sections and slots are checked in the window. Evidence: `plugins/telegram/client.js`

## In Echo

### Rules
- R1. Add this repository's folder as a marketplace once, and install from it: `echoctl plugin marketplace add <path to echo-plugins> --name local`, then `echoctl plugin install <id> --from local --yes`. Evidence: `echo:crates/echoctl/src/cli/plugin.rs::PluginCmd`
- R2. After a change: bump `version` (`X.Y.Z` — a `-dev.N` suffix alone is not an update), `echoctl plugin marketplace update local`, `echoctl plugin update <id> --yes`, then restart Echo so the window and the host load it. To go back to the same version, `echoctl plugin remove <id>` and install again; its settings and store stay unless `--delete-data`. Evidence: `echo:crates/echoctl/src/update.rs::newer`
- R3. Run its host commands from the terminal: `echoctl plugin call <id> status`, `echoctl plugin call <id> <command> '<json args>'`; set a setting with `echoctl plugin set <id> <key> <value>`. Only that plugin is loaded there (`ctx.terminal` is true) and its timers don't run. Evidence: `echo:crates/echoctl/src/cli/plugin.rs::Call`
- R4. Check a widget's data with `echoctl widget show plugin:<id>:<widget>`, put it on Today with `echoctl today add plugin:<id>:<widget>`, change its settings with `echoctl today set plugin:<id>:<widget> <key> <value>`, then look at it in the window in each size it takes and in light and dark. Evidence: `echo:crates/echoctl/src/cli/widget.rs::WidgetCmd`
- R5. Read what the plugin logged (`ctx.log`, and errors from its timers and events) in `<data folder>/.echo/app.log`, lines starting `plugin <id>:`; its store and settings are in `<data folder>/.echo/plugins/<id>/`. Evidence: `echo:crates/echoctl/src/jshost.rs` (`"log"`)

## Acceptance

### Rules
- R1. Each plugin issue has an **Acceptance** section of lines a person can check in Echo with a test account; write it before the code, and add a line for each failure the user can meet. Evidence: issue #2, issue #3
- R2. Always check the failure paths: no sign-in, a refused or expired credential, the service unreachable, the plugin throwing. Its section says why, its badge shows `!`, and Today and the rest of Echo still draw. Evidence: `echo#85` (Acceptance: "The plugin throws → Today draws")
- R3. Check removal too: `echoctl plugin remove <id>` takes its section, widgets, rows and slots out of the window. Evidence: `echo:.ai-run/guides/plugins/echo-plugins.md` (Plugin host R7)

### Read first
| When you are | Exemplar | Tests |
|---|---|---|
| writing a first unit test | `plugins/scheduler/main.js::parseSchedule` (a pure export) | no covering test yet |
| checking widgets end to end | `echo:tests/fixtures/plugins/plugins/widget-demo` | `echo:jshost::a_plugins_widgets_are_in_the_catalog_and_give_their_data_by_provide_and_set` |

`echo:` paths are in the Echo repository, `onetest-ai/echo`.
