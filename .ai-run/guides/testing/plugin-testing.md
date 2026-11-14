# Plugin Testing

**Project**: Echo plugins (the onetest marketplace) · **Stack**: JavaScript ES modules; Echo built from source (`echoctl`); functional cases run by an agent (Playwright + the CLI); `node:test` · **Scope**: the gates, functional cases and the map, the environment they run in, unit tests

Plugins are tested as Echo is: `onetest-ai/echo` → `.ai-run/guides/testing/testing.md` and `tests/app_profile.md`. Where this guide is silent, those rules hold.

## Gates

Run from the repository root, fastest first. `scripts/check.sh` runs syntax, package, unit and map in one go (`echoctl`
from `$ECHOCTL`, else `PATH`: an Echo with `plugin check`) — run it before every commit; it exits non-zero when any fails.

| Gate | Run | Pass |
|---|---|---|
| all but functional and person | `scripts/check.sh` (`ECHOCTL=<echo checkout>/target/debug/echoctl scripts/check.sh`) | exit 0 |
| syntax | `for f in plugins/*/*.js; do node --check "$f" \|\| exit 1; done` | exit 0 |
| package | `echoctl plugin check --json plugins/*`, and `agent` in every manifest (both in `scripts/check.sh`) | no problem named: each package passes Echo's install checks and has its part for Claude |
| unit | `node --test 'tests/**/*.test.mjs'` | exit 0 |
| map | `python3 -I tests/tools/feature-map.py check` | exit 0: every feature has a case, every case names known features |
| functional | the `run: agent` cases of what the change touched, in an environment from `tests/fixtures/<plugin>/up.sh` (Echo built from source) | each PASS with evidence (the command's output, a Playwright snapshot); a report in `tests/reports/` (git-ignored) |
| person | the plugin's `run: person` cases, by a person with real accounts | before a release of the plugin; listed in the PR as done or still to do |

## Rules
- R1. A change in behaviour starts from acceptance criteria, and each one has a **functional case** run against a real Echo. A unit test is never the proof that a plugin works: it checks pure logic on a fake `ctx`, and it passes where Echo would refuse the manifest, never call the command, or draw nothing. Evidence: `echo:.ai-run/guides/testing/testing.md` (R1)
- R2. A change is done when the gates above pass for what it touched; the PR names the Echo commit or version the cases ran on, the cases run and their results, and the person cases still to do. Evidence: `.ai-run/guides/plugins/plugin-development.md` (Versions and commits R4)
- R3. Test data is made up — Echo's standard data set, fake services with made-up organisations and people (`acme-test`, `ada-acme`) — in cases, fixtures, reports, PRs and issues; never a real account, token, organisation or the user's own data. Evidence: `echo:.ai-run/guides/testing/testing.md` (R8)

## Functional cases and the map

### Rules
- R1. One behaviour per case: `tests/cases/<plugin>/TC-NNN_<slug>.md`, numbered in the order they run, with Echo's frontmatter (`id`, `title`, `priority`, `type: functional`, `requirements`, `module: <plugin>`, `run: agent | person`, `platform`, `data`, `tags`) and a steps table of Action and Expected Result quoting what the user sees. A `README.md` beside them says how to start the environment and what the cases may do besides `echoctl`. Evidence: `tests/cases/github/README.md`
- R2. What the plugin does is its functional map, `tests/feature-map/<plugin>.json` (`F-<PREFIX>-NN`: title, priority, `check: agent | person`); each case names its features in `requirements`; a change in behaviour updates the map and its cases in the same PR. IDs are never reused. Evidence: `tests/tools/feature-map.py::load`
- R3. `run: agent` is anything the served window or the CLI can show on made-up data with fake services; `run: person` is what needs a real account or service (the real GitHub with a person's own sign-in), an install on a clean machine, or Windows. Every critical feature has an agent case. Evidence: `tests/cases/github/TC-011_on-real-github.md`
- R4. Cases change with behaviour: a text the plugin shows, renamed or removed, is searched in all of `tests/cases/` and every case quoting it is updated in the same PR. Evidence: `echo:.ai-run/guides/testing/testing.md` (R7)
- R5. Always cover, with a case each: the failure paths the user meets (no sign-in, refused, service down — the section says why and Today still draws), untrusted text from the service shown as text (a hostile name in the fake's data), secrets never shown or kept, and removal. Evidence: `tests/cases/github/TC-004_the-signin-is-never-kept-or-shown.md`

## The environment

### Rules
- R1. Never the user's own Echo, data, accounts or credentials: cases run on an Echo checkout built from source (`ECHO_REPO`, `cargo build`), its standard made-up data in a fresh folder, its own `ECHOCTL_HOME` / `ECHOCTL_CONFIG_DIR`, served with `echoctl window --serve <port>`; the plugin installed into that environment from this checkout's marketplace. Evidence: `tests/fixtures/github/up.sh`
- R2. Each plugin has `tests/fixtures/<plugin>/up.sh <dir> <port>` and `down.sh <dir>`: make the data (Echo's `tests/fixtures/make_data.py --set standard`), start the fake services, append what steps need to `<dir>/env` (PATH with the debug `echoctl` first), install the plugin, serve the window; print `base_url`, `env` and the fakes' addresses. CLI steps run after `. <dir>/env`. Evidence: `tests/fixtures/github/up.sh`
- R3. A plugin's outside service is a fake in `tests/fixtures/<plugin>/` with made-up data, whose state a case reads and changes while it runs (`/_state`, and `/_log` to show what was asked); Echo sends the plugin's host to it through its debug-only `ECHOCTL_TEST_HOSTS` (`api.github.com=http://127.0.0.1:<port>`). A sign-in on the computer is a fake tool first on PATH (`gh`, `git credential`) answering from a file in `<dir>`, so a case signs in and out by writing and removing it — and the real credentials of the machine are never reached. Evidence: `tests/fixtures/github/fake_github.py`, `tests/fixtures/github/bin/gh`
- R4. A case may run `echoctl` (after `. <dir>/env`), the window through Playwright (the repository's `.mcp.json` gives Claude Code its browser tools; Echo's `tests/auto` has Playwright for scripts), `curl` to the fakes, and write or remove the fake sign-ins' files — nothing else, no edits to the repository. Stop everything with `down.sh` and close the browser's tab when the run ends. Evidence: `echo:tests/app_profile.md` (Rules 4, 7)
- R5. Read what the plugin logged in `<dir>/serve.log` (lines starting `plugin <id>:`); its store is `$ECHOCTL_HOME/.echo/plugins/<id>/`. Evidence: `echo:crates/echoctl/src/jshost.rs` (`"log"`)

## Unit tests (a supplement)

### Rules
- R1. Unit-test the pure logic that turns outside data into Echo's — an API answer → widget data or rows, parsing what the user typed — with `node:test` in `tests/<plugin>/`, importing the plugin's exports from `../../plugins/<plugin>/main.js` (importing runs nothing: effects are inside `apply`). Evidence: `tests/github/github.test.mjs`
- R2. Test `apply(ctx)` with `tests/helpers/fake-ctx.mjs`, which fakes only names and shapes Echo's `PRELUDE` has; add a service to it in Echo's shape when a plugin needs one. Evidence: `tests/helpers/fake-ctx.mjs`
- R3. Keep the network out of unit tests: a service's answers are fixtures in `tests/<plugin>/fixtures/`, made up and trimmed to the fields used. Evidence: `tests/github/fixtures/answer.json`

### Read first
| When you are | Exemplar | Tests |
|---|---|---|
| writing a functional case | `tests/cases/github/TC-005_pick-what-to-show.md` | `python3 -I tests/tools/feature-map.py check` |
| faking a service and a sign-in | `tests/fixtures/github/fake_github.py`, `tests/fixtures/github/bin/gh` | `tests/cases/github/TC-003_no-signin-says-how.md` |
| writing a unit test | `tests/github/github.test.mjs` | exemplar is a test |

`echo:` paths are in the Echo repository, `onetest-ai/echo`.
