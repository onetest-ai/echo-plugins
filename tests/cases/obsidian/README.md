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

### Minutes into vaults, sources and the twin preset (TC-038 on)
- Run in order (TC-038 to TC-050, TC-036 and TC-047/048 in the window) on one environment of their own (`DATA_NOW=<today>T20:00` late in the day). The standard data's calls
  with minutes are the calls; its threads (`acme-rollout`, `acme-renewal`, `globex-pilot`) and clients (`acme`) route
  them. Its default AI profile is `work`.
- An event is told to the served window (the app: its plugins hear events there) with `echoctl plugin emit
  minutes_written --from <call>` (Echo builds the payload from the call, as it does when minutes are written) or
  `echoctl plugin emit sources_changed '<json>'` (a mail as Recall would tell it); the window takes it within a second.
  The served window must be the environment's own (`lsof -nP -iTCP:<port> -sTCP:LISTEN` shows the pid in `<dir>/pid`).
- A step may also make an empty folder in `$VAULTS` (`mkdir`, the user's own new folder for a vault), hand a made-up
  file to a command (`--file`), and read the plugin's store (`$S="$ECHOCTL_HOME/.echo/plugins/obsidian"`, `cat`);
  TC-049 alone sets the day the catch-up last looked (`$S/seen.json`), as an earlier start would have left it.
- Microsoft 365 is Echo's fake (onetest-ai/echo#774, debug builds; Echo's `tests/app_profile.md`), for this run of
  TC-038 on only, so nothing else of Echo reads it: before serving the window, `python3 "$ECHO_REPO/tests/fixtures/fake_graph.py"
  <port> --log <dir>/graph.log &` (its pid in `<dir>/graph.pid`) and `echo "export ECHOCTL_TEST_GRAPH=http://127.0.0.1:<port>"
  >> <dir>/env`; then serve the window from that env. Stop it by its pid at the end. A step may read and empty
  `<dir>/graph.log` (what Echo asked of it).

### Health's fixes, AI checks and Ingest runs (TC-034, TC-051 on)
- Run in order on one environment of their own (`DATA_NOW=<today>T20:00` late in the day): TC-030's preconditions
  (acme-twin connected, commit on, the default vault), then TC-034, TC-051, TC-052, TC-053, TC-054.
- Claude Code is never a real one. `up.sh` puts the cases' fake (`tests/fixtures/obsidian/fake-claude.sh`) first on
  PATH in front of the data's own test fake (`<dir>/bin/claude-echo`) and refuses to when the data's fake isn't the
  pure one: an Ingest run (its prompt asks for a vault's ingest skill, its working folder a copy of the vault in the
  plugin's store) makes, in that copy only, the edits `<dir>/fake-ingest.json` names (`fake_ingest.py`); anything else
  is the data's fake's — an AI check answers from `<dir>/fake-answers.tsv` by a phrase of its prompt, else it is refused.
  A step may write and remove `<dir>/fake-ingest.json` and append to `<dir>/fake-answers.tsv`. A scenario `{"hang": true}`
  runs until stopped (its pid in `<dir>/fake-running.pid`; a step may `ps` it).
- Echo's own word that a call transcribes (TC-051): a step may write a call's `.transcribing` marker naming a `sleep` it
  started, then `kill` that process and remove the marker (by its literal path), as Echo's `plugins/TC-217` does.
- In acme-twin a step may also commit the user's own edits made in the step before (`git -C "$T" commit -qam …`), as
  their git would.
- Window steps with headless Playwright; never the user's browser. `<dir>/serve.log` lines starting `plugin obsidian:` are
  the plugin's.

### Echo core's newer APIs and tags through the dictionary (TC-055 on)
- Run after TC-038 on the minutes environment (TC-055 to TC-061, in order); each case says which vaults it connects.
- **The web** is a fake site on this computer only (`tests/fixtures/obsidian/fake_web.py`, started by `up.sh`): the same
  made-up pages on `$FAKE_WEB` (`<port>+1`, the site a case lists in the plugin's `web_sites`) and `$FAKE_WEB_OTHER`
  (`<port>+2`, not listed). Echo's own box for an address (`ctx.http.askAddress`) is answered in this development build
  by `ECHOCTL_ASK_ADDRESS` (`up.sh` sets it to `$FAKE_WEB_OTHER/rollout.html` for the window; a CLI step may set its own,
  empty for a cancel) — no dialog opens. A step may `curl` the fake's pages and `/_log` (what Echo asked), and
  `curl -X DELETE …/_log`. Nothing reaches the internet: a picture on another host is refused by Echo unreached.
- **Your own Claude Code** is the test's (`$CLAUDE_CONFIG_DIR`, inside `<dir>`): on test data Echo adds a plugin's skill
  only there, and refuses when it isn't set. Check it is inside `<dir>` and `ECHOCTL_TEST_OPEN_LOG_ONLY` is set before any
  step that installs a skill; a step may write and remove a made-up skill of the user's own there (TC-057).
- **Echo's dictionary** is `up.sh`'s made-up one (Concept, Client, Control Plane with their other names), written into the
  test data's Recall folder as Echo keeps it; a step reads it with `echoctl brain taxonomy show`.
- A step may also rename a call with `echoctl title <call> <title>` (TC-056: Echo keeps its stamp).
