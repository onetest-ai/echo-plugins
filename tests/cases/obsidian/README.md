# Knowledge plugin (`obsidian`) — functional cases

Run in order, on one environment, by an agent with Bash (the CLI), as Echo's own cases are (`onetest-ai/echo` →
`tests/app_profile.md`: made-up data, evidence for every PASS, clean up after):

```bash
ECHO_REPO=<an Echo checkout from main (0.10.0's primitives), built: cargo build> \
  tests/fixtures/obsidian/up.sh "$(mktemp -d)/ob" 47970   # prints base_url, env, vaults
# the cases name the standard data's calls as made on 2026-11-17: DATA_NOW=2026-11-17T20:00 before up.sh (always for TC-034 on)
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
- Run in order (TC-038 to TC-050, TC-036 and TC-047/048 in the window) on one environment of their own (`DATA_NOW=2026-11-17T20:00`: the cases name the standard data's calls as made on that day). The standard data's calls
  with minutes are the calls; its threads (`acme-rollout`, `acme-renewal`, `globex-pilot`) and clients (`acme`) route
  them. Its default AI profile is `work`.
- An event is told to the served window (the app: its plugins hear events there) with `echoctl plugin emit
  minutes_written --from <call>` (Echo builds the payload from the call, as it does when minutes are written) or
  `echoctl plugin emit sources_changed '<json>'` (a mail as Intake would tell it); the window takes it within a second.
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
- Run in order on one environment of their own (`DATA_NOW=2026-11-17T20:00`: the cases name the standard data's calls as made on that day): TC-030's preconditions
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
  test data's `recall/` folder as Echo keeps it; a step reads it with `echoctl brain taxonomy show`.
- A step may also rename a call with `echoctl title <call> <title>` (TC-036, TC-056: Echo keeps its stamp).
- TC-056 runs on an environment of its own (`SAME_SECOND=1 up.sh`: a made-up memo started in guest call 7's second, with the next stamp as Echo 0.10.0 gives it) and
  alone may write a vault's ledger as 1.0 before Echo #772 left it (`$S/vaults/<id>/ingest.json`, calls by folder).

### #17's journey and the 0.8 list cut short (TC-063 on)
- TC-063, TC-064, TC-065 and TC-066 each run on a fresh environment of their own, in that order; TC-068 on an
  `OBSIDIAN_FROM=0.8` environment of its own. TC-067 is a person's, on their own desktop and accounts, before a release.
- TC-064 uses the cases' fake Claude as TC-051 and TC-052 do (`<dir>/fake-ingest.json`, `<dir>/fake-answers.tsv`).
- TC-065 and TC-066 may turn the plugin off and on, remove it and install it again from `$MARKET`
  (`echoctl plugin disable | enable | remove | install obsidian --from local --yes`); TC-066 alone serves the window
  again with Echo's picker stand-ins (`ECHOCTL_PICK_FOLDER`, `ECHOCTL_PICK_FILES`, debug builds: no dialog opens) and
  checks they are in its environment before pressing *Choose…*.
- TC-068 alone writes the 0.8 plugin's `vaults.json` cut short before the update, as a crash would leave it.

### From #17 (Knowledge 0.1.1): what 1.0 no longer does, and why
onetest-ai/echo-plugins#17's four cases (`tests/cases/knowledge/TC-001`–`TC-004`) are TC-063–TC-067 here. What they
checked that the user's decisions for 1.0 removed (`.ai-run/reference/knowledge/INDEX.md`):

| #17 checked | Gone because |
|---|---|
| The Ask tab: a streamed reply with a personal or vault skill picked and a page attached; Ask can't write or run Bash; the default profile's reply, Stop and send again | No Ask tab: *Ask the vault* opens Claude Code in Echo's panel (`ctx.claude.session`), in the vault as its own project (TC-037, TC-064 step 3) |
| Curate (allow or deny each edit in Echo's own permission cards, a conversation stopped and resumed) and Research | Part of the Ask tab: the panel's Claude Code asks for its own permissions |
| A prompt handed to the vault's live terminal by vault key; raw terminal ids refused | The same: Echo's panel owns the session; the plugin only opens it |
| UI-only routes (mail, calls, preview, jobs, terminal resume) refused to the agent's `read` command | No such agent command: Claude in Echo runs only the plugin's ten reading commands without asking (TC-001, TC-002) |
| Echo's native Knowledge engine and service: Echo's own `#kn` routes and `echo://page` links, the service refused to an undeclared plugin, Echo's native jobs closed with the plugin | #677's engine is this plugin's JS on Echo's generic services; Knowledge's place is its own activity with its own routes (`#obsidian:knowledge/…`, TC-063 step 8) |
| Ask's conversation in the native terminal closed with the plugin's jobs when it is turned off | Echo's panel owns the session: a running one is the user's and stays, its tab goes once it ends (TC-066, TC-067) |
| Echo's own facts vault, its notes and pipeline | Deleted from 0.8 on (TC-006) |
| Recording or minutes starting Knowledge's own routine | No routine: Echo's events (`minutes_written`, `sources_changed`) and a queue (TC-044, TC-053) |
| The Obsidian plugin installed beside Knowledge, neither reading the other's store | One plugin: `obsidian` is Knowledge |
