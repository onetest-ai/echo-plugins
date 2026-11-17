# Knowledge plugin (`obsidian`) — functional cases

Run in order, on one environment, by an agent with Bash (the CLI), as Echo's own cases are (`onetest-ai/echo` →
`tests/app_profile.md`: made-up data, evidence for every PASS, clean up after):

```bash
ECHO_REPO=<an Echo checkout from main (0.9.15's primitives), built: cargo build> \
  tests/fixtures/obsidian/up.sh "$(mktemp -d)/ob" 47970   # prints base_url, env, vaults
# after 22:50 or before 06:00 the made-up day needs an earlier time: DATA_NOW=<YYYY-MM-DDTHH:MM> before up.sh
# TC-006 only, on an environment of its own: a user of Obsidian vaults 0.8.0, updated in the case
OBSIDIAN_FROM=0.8 ECHO_REPO=… tests/fixtures/obsidian/up.sh "$(mktemp -d)/ob8" 47972
. <dir>/env                                               # before every CLI step: echoctl = the debug build
tests/fixtures/obsidian/down.sh <dir>                     # after the last case
```

- The environment: Echo's standard data (Sam Rivera, Acme, Globex) with its fake `claude`, which refuses every run —
  so Claude's reading of a vault fails and a case writes the vault's description itself (`save`, then `confirm`); made-up
  vaults in `$VAULTS` (`acme-wiki`, `home-notes`; `acme-twin`, twin-shaped — its pages in `knowledge/`, an index
  `CATALOG.md`, a page template, an image, a hostile page — in a git repository of its own); the plugin installed from a copy of this checkout
  (`$MARKET`). With `OBSIDIAN_FROM=0.8`: Obsidian vaults 0.8.0 installed instead, both vaults connected, acme-wiki
  confirmed, its facts vault on with one note. Never the user's own Echo, vaults or Claude.
- A vault is connected without the folder picker: `ECHOCTL_PICK_FOLDER="$VAULTS/<vault>" echoctl plugin call obsidian
  add '{"wait":true}'` (a debug build only).
- `P="$ECHOCTL_HOME/.plugins/obsidian"` is what Echo laid out for Claude; `echoctl core` is what Echo's folder session
  starts with.
- Besides `echoctl`, a step may read files under `<dir>` (`cat`, `ls`, `grep`), run `tests/fixtures/obsidian/next.sh
  <dir>` (puts this checkout's version in `$MARKET` for `echoctl plugin update`), and look at the window with
  Playwright (headless). In the made-up vaults of `$VAULTS` only, a step may also do what the user's Obsidian or
  editor would — write, append to or remove a file (`printf`, `rm`), look at its bytes (`xxd`) — and ask git there
  (`git status`, `git log`, `git checkout -- <file>` to undo a step's change); `curl` the window's image route. Nothing
  else.
- The activity's cases (TC-030 on) are window cases: headless Playwright on `<base_url>` (never the user's browser, never
  a native dialog — *Choose…* in the Connect and New vault sheets is the system's folder picker: not pressed), light and
  dark at 1440×900. Their screens are compared with #17's (onetest-ai/echo-plugins#17 on #677's Echo), side by side,
  in `tests/reports/obsidian-knowledge-ui/`. "Ask the vault" opens the fake Claude in Echo's panel: never typed into.
