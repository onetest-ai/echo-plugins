# GitHub plugin — functional cases

Run in order, on one environment, by an agent with Playwright (the window) and Bash (the CLI), as Echo's own cases are
(`onetest-ai/echo` → `tests/app_profile.md`: made-up data, evidence for every PASS, clean up after):

```bash
ECHO_REPO=<an Echo checkout with ECHOCTL_TEST_HOSTS and uses.signin, built: cargo build> \
  tests/fixtures/github/up.sh "$(mktemp -d)/gh" 47960   # prints base_url, env, github
. <dir>/env                                             # before every CLI step: echoctl = the debug build
tests/fixtures/github/down.sh <dir>                     # after the last case
```

- The environment: Echo's standard data (Sam Rivera, Acme, Globex), the plugin installed from this checkout, the fake
  GitHub (`tests/fixtures/github/fake_github.py`, state `<dir>/github-state.json`: viewer ada-acme, organisations
  acme-test and acme-labs) at `$FAKE_GITHUB`, the fake `gh` signed in (`$FAKE_GH_TOKEN_FILE`), the fake `git` with no
  sign-in (`$FAKE_GIT_TOKEN_FILE` empty). Never the user's own Echo, GitHub or credentials.
- Besides `echoctl`, a step may `curl` the fake GitHub's `/_state` (read or change it) and `/_log`, and write or
  remove the fake sign-ins' files. Nothing else.
- The plugin reads GitHub when Echo starts it, every 5 minutes, and on Refresh: after changing the fake, a case presses
  Refresh (the section's "Refresh now", a widget's "Refresh") or runs `echoctl plugin call github refresh`.
- `run: person` cases (TC-011) are for a person with their own GitHub sign-in, once per release of the plugin.
