# Retell plugin — functional cases

Run in order by an agent with Bash (the CLI) and the window through Playwright, as Echo's own cases are
(`onetest-ai/echo` → `tests/app_profile.md`: made-up data, evidence for every PASS, clean up after):

```bash
ECHO_REPO=<an Echo checkout, built: cargo build -p echoctl> \
  tests/fixtures/retell/up.sh "$(mktemp -d)/rt" 47960      # prints base_url, env, fakes, mic
. <dir>/env                                               # before every CLI step: echoctl = the debug build
tests/fixtures/retell/down.sh <dir>                       # after the last case
```

- The environment: Echo's standard data (Sam Rivera, Acme, Globex). Never the user's own Echo, Claude Code or speech
  account:
  - **Claude Code** is `fake_claude.py` (on Windows behind `claude.exe`, a launcher up.sh builds): it tells Retell's runs
    apart by their prompt and answers with made-up JSON built from what the prompt holds; anything else is refused as
    Echo's own fake refuses it. Each run is a line of `<dir>/fake-claude.log` — its `kind` (`sort`, `write`, `check`,
    `terms`, `mark`, `doc`, `ask`, `qacheck`, `candidates`, `pick`, `quiz`, `checkq`, `talk`, `judge`,
    `review`, `cards`, `suggest`), `tools` (`""`: no tools), `pictures`, `resume`. The two runs on files, `write` and
    `check`, start in a folder of `$S/work/`: the fake reads the files there and writes its answers there, as Claude
    Code would; their lines add `mode` (the permission mode Echo gave), `skip`, `cwd` and `files` (what the folder held).
  - **The speech server** is `fake_retell.py` at `$FAKE_RETELL` (Retell's setting "tts" is set to it): the OpenAI API
    as Retell uses it — models, speech (an MP3 of silence about as long as the text), the Realtime transcription
    socket (each loud stretch of the microphone written down as the next of its `transcripts`). `curl $FAKE_RETELL/_state`
    shows its state and `-X POST -d '{…}'` changes it (`"speech": "up" | "down" | "key"`, `"transcripts": [..]`);
    `$FAKE_RETELL/_log` lists what was asked (whether a Bearer was sent and was the key — never the key), `/_reset`
    clears it.
  - **The web** is the made-up site `https://docs.acme-test.example` (the same fake, through Echo's debug
    `ECHOCTL_TEST_HOSTS`): `/posts/agent-evals.html` (an article with a newsletter footer, related posts and a picture,
    `/img/loop.png`), `/posts/long-guide.html` (about 60,000 characters in twenty chapters), `/posts/fact-trap.html`,
    `/posts/hostile.html`, `/posts/js-only.html`, `/posts/observability.html`, `/posts/limits.html`,
    `/files/eval-guide.pdf` (two pages), `/posts/gone.html` (404).
  - **The microphone** is `$RETELL_MIC` (`<dir>/mic.wav`): quiet 3 s, a voice-like tone 2.5 s, quiet 9 s, a tone 2.5 s,
    quiet 12 s. Open the window in a browser started with `--use-fake-ui-for-media-stream
    --use-fake-device-for-media-stream --use-file-for-fake-audio-capture=$RETELL_MIC%noloop
    --autoplay-policy=no-user-gesture-required`.
- The plugin's view: `{{base_url}}/#retell:retell` (Listen · Library · Practice); its voice section:
  `{{base_url}}/#settings/retell:main`. `$S` is its store, `$ECHOCTL_HOME/.echo/plugins/retell/` (`index.json`,
  `articles/<id>/…`, `quiz/`, `talks/`, `phrases.json`).
- Work the plugin does in the background (the queue, the voice) runs in the served window's Echo: start it from the
  window (Add, buttons) or with `fetch('/api/plugin/retell/call/<command>', {method: 'POST', body: JSON.stringify({args})})`
  in the window's page — never `echoctl plugin call` for a command that goes on after it answers (that runs in its own
  process, which ends with the call). `echoctl plugin call retell start '{"wait":true}' --file <path>` is the way to hand
  a file without the system's picker: it waits until the file's text is taken out.
- Environments: TC-001–TC-016, TC-020 and TC-021 run on one, in order (each reads what the earlier left only where its Preconditions say);
  TC-017 removes the plugin: run it last. TC-018 and TC-019 are a person's.
- Besides `echoctl`, the window and `curl` to the fakes, a step may read files under `<dir>` (`cat`, `ls`, `grep`,
  `python3 -c` to read JSON). Nothing else.
