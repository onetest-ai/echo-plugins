#!/usr/bin/env bash
# The Retell plugin's functional cases' environment, never the user's own Echo, Claude or speech account:
#   ECHO_REPO=<an Echo checkout, built with `cargo build`> tests/fixtures/retell/up.sh <dir> <port>
#   tests/fixtures/retell/down.sh <dir>
# <dir> must not exist yet. It builds Echo's standard made-up data (Echo's tests/fixtures/make_data.py); puts the
# cases' fake Claude Code first (fake_claude.py — on Windows behind a small claude.exe built here with cargo, since a
# .cmd can't carry a long prompt); starts the fake services (fake_retell.py: a speech server that speaks the OpenAI API,
# and the made-up site docs.acme-test.example, reached through Echo's debug ECHOCTL_TEST_HOSTS) on <port>+1; makes the
# microphone a WAV (<dir>/mic.wav: quiet, a 2.5 s tone, quiet, another, quiet — "speech" to the fake's ear); installs
# this checkout's Retell from a local marketplace with its speech server set to the fake, and serves Echo's window at
# http://127.0.0.1:<port>. CLI steps run after `. <dir>/env` (`echoctl` is then the debug build).
set -euo pipefail
usage="usage: ECHO_REPO=<echo checkout> up.sh <dir> <port>"
dir="${1:?$usage}"; port="${2:?$usage}"
here="$(cd "$(dirname "$0")" && pwd)"
plugins="$(git -C "$here" rev-parse --show-toplevel)"
echo_repo="$(cd "${ECHO_REPO:?$usage}" && pwd)"
py=python3; command -v python3 > /dev/null 2>&1 || py=python      # Windows has `python`
windows=; case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) windows=1;; esac
bin="$echo_repo/target/debug/echoctl"; [ -n "$windows" ] && bin="$bin.exe"
[ -x "$bin" ] || { echo "build Echo first: (cd $echo_repo && cargo build -p echoctl)" >&2; exit 1; }
fport=$((port + 1))

"$py" "$echo_repo/tests/fixtures/make_data.py" "$dir" --set standard > /dev/null
dir="$(cd "$dir" && pwd)"

# The fake Claude Code in place of Echo's own (kept beside it as claude-echo): Retell's runs answered with made-up
# JSON, everything else as Echo's fake does (refused). Echo's must be the pure test fake, else nothing is set up.
if [ ! -f "$dir/bin/claude" ] || grep -qE 'exec [^ ]*claude|ANTHROPIC_BASE_URL' "$dir/bin/claude"; then echo "$dir/bin/claude isn't Echo's pure test fake: stopping" >&2; exit 1; fi
mv "$dir/bin/claude" "$dir/bin/claude-echo"
cp "$here/fake_claude.py" "$dir/bin/fake_claude.py"
if [ -n "$windows" ]; then
  cargo build --release -q --manifest-path "$here/fake-claude-launcher/Cargo.toml" --target-dir "$dir/.launcher"
  cp "$dir/.launcher/release/claude.exe" "$dir/bin/claude.exe"
else
  printf '#!/bin/sh\nexec python3 -I "$(dirname "$0")/fake_claude.py" "$@"\n' > "$dir/bin/claude"; chmod +x "$dir/bin/claude"
fi

# The microphone: 48 kHz mono, quiet 3 s · tone 2.5 s · quiet 9 s · tone 2.5 s · quiet 12 s (the fake hears each tone
# as one stretch of speech and writes it down as the next of its "transcripts").
"$py" -I - "$dir/mic.wav" <<'PY'
import math, struct, sys, wave
r, out = 48000, []
# a voice-like "tone" (a browser's noise suppression takes a steady sine for noise): harmonics of a pitch that drifts
# around 140 Hz, its loudness beating at a syllable's pace
for kind, sec in (("q", 3), ("t", 2.5), ("q", 9), ("t", 2.5), ("q", 12)):
    ph = 0.0
    for i in range(int(r * sec)):
        if kind == "q": out.append(0); continue
        t = i / r; f0 = 140 + 40 * math.sin(2 * math.pi * 3 * t); ph += 2 * math.pi * f0 / r
        v = sum(math.sin(h * ph) / h for h in range(1, 7)) * (0.55 + 0.45 * math.sin(2 * math.pi * 4 * t))
        out.append(int(7000 * v))
w = wave.open(sys.argv[1], "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(r)
w.writeframes(struct.pack("<%dh" % len(out), *out)); w.close()
PY

# PDFium, for a PDF's text (Echo loads it at run time): the caller's ECHOCTL_PDFIUM_DIR, else on Windows an installed
# Echo's (%LOCALAPPDATA%\Programs\echo\pdfium); on a Mac fetch it first: (cd $ECHO_REPO && scripts/fetch-pdfium.sh <dest>).
pdfium="${ECHOCTL_PDFIUM_DIR:-}"
if [ -z "$pdfium" ] && [ -n "$windows" ] && [ -f "${LOCALAPPDATA:-}/Programs/echo/pdfium/pdfium.dll" ]; then pdfium="$LOCALAPPDATA/Programs/echo/pdfium"; fi
[ -n "$pdfium" ] || echo "no PDFium (ECHOCTL_PDFIUM_DIR): the PDF case (TC-006) will fail" >&2

cat >> "$dir/env" <<EOF
export ECHOCTL_PDFIUM_DIR="$pdfium"
export PATH="$dir/bin:$echo_repo/target/debug:\$PATH"
export ECHOCTL_TEST_HOSTS="docs.acme-test.example=http://127.0.0.1:$fport"
export FAKE_RETELL="http://127.0.0.1:$fport"
export RETELL_FAKE_PYTHON="$(command -v "$py")"
export RETELL_MIC="$dir/mic.wav"
EOF

(
  . "$dir/env"
  # Never a real Claude Code: the `claude` Echo finds first is the fake.
  [ "$(claude --version 2>/dev/null)" = "2.1.400 (Claude Code, test fake)" ] || { echo "the fake claude isn't first on PATH: stopping" >&2; exit 1; }
  nohup "$py" -I "$here/fake_retell.py" "$fport" > "$dir/fake-retell.log" 2>&1 &
  echo $! > "$dir/fake-retell.pid"
  # An Echo built from source may be older by its number than the release the plugin asks for: install a copy whose
  # `echo` is the built one, and say so.
  market="$plugins"
  built="$(echoctl --version | awk '{print $2}')"
  want="$("$py" -c 'import json,sys; print(json.load(open(sys.argv[1])).get("echo","").lstrip(">="))' "$plugins/plugins/retell/echo-plugin.json")"
  if [ -n "$want" ] && [ "$(printf '%s\n%s\n' "${built%%-*}" "$want" | sort -V | head -1)" != "$want" ]; then
    market="$dir/market"; mkdir -p "$market/plugins"
    cp "$plugins/echo-marketplace.json" "$market/"; cp -R "$plugins/plugins/retell" "$market/plugins/"
    "$py" - "$market/plugins/retell/echo-plugin.json" "${built%%-*}" <<'PY'
import json, sys
p, built = sys.argv[1], sys.argv[2]
m = json.load(open(p)); m["echo"] = ">=" + built; json.dump(m, open(p, "w"), indent=2)
PY
    echo "Echo $built from source (the plugin asks for $want): installed from a copy with echo >=${built%%-*}" > "$dir/install.log"
  fi
  echoctl plugin marketplace add "$market" --name local > /dev/null
  echoctl plugin install retell --from local --yes >> "$dir/install.log"
  echoctl plugin set retell tts "http://127.0.0.1:$fport" > /dev/null
  cd "$echo_repo"
  ECHOCTL_SERVE_IPC=1 nohup echoctl window --serve "$port" > "$dir/serve.log" 2>&1 &
  echo $! > "$dir/pid"
)
for _ in $(seq 60); do
  curl -s -o /dev/null "http://127.0.0.1:$port/" && curl -s -o /dev/null "http://127.0.0.1:$fport/_state" && break
  sleep 0.5
done
curl -s -o /dev/null "http://127.0.0.1:$port/" || { echo "the window didn't start: see $dir/serve.log" >&2; exit 1; }
echo "base_url=http://127.0.0.1:$port env=$dir/env fakes=http://127.0.0.1:$fport mic=$dir/mic.wav"
