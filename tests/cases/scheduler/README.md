# Scheduler plugin — functional cases

Run in order, on one environment, by an agent with Bash (the CLI) and the window through Playwright, as Echo's own
cases are (`onetest-ai/echo` → `tests/app_profile.md`: made-up data, evidence for every PASS, clean up after):

```bash
ECHO_REPO=<an Echo checkout, built: cargo build> \
  tests/fixtures/scheduler/up.sh "$(mktemp -d)/sch" 47990   # prints base_url, env
. <dir>/env                                                # before every CLI step: echoctl = the debug build
tests/fixtures/scheduler/down.sh <dir>                     # after the last case
```

- The environment: Echo's standard data (Sam Rivera, Acme, Globex) with its fake `claude`, which refuses every run —
  a run fails, but Echo has written its log's first line, with the model it asked Claude Code for, before. Never the
  user's own Echo or Claude.
- The plugin's section: `{{base_url}}/#settings/scheduler:main`. `$R` is its routines folder (`<id>.md`), `$RUNS` its
  runs (`<id>/<stamp>/log.txt`).
- One routine is there from the start: `gateway-digest` ("Gateway digest", off), its model free text
  (`acme-gw/sonnet-large`).
- A run without the window: `echoctl plugin call scheduler run_wait '{"id":"<id>","deliver":false}'`.
- Besides `echoctl` and the window, a step may read files under `<dir>` (`cat`, `ls`, `grep`). Nothing else.
