#!/usr/bin/env bash
# The Scheduler plugin's functional cases' environment, never the user's own Echo or Claude:
#   ECHO_REPO=<an Echo checkout, built with `cargo build`> tests/fixtures/scheduler/up.sh <dir> <port>
#   tests/fixtures/scheduler/down.sh <dir>
# <dir> must not exist yet. It builds Echo's standard made-up data (Echo's tests/fixtures/make_data.py; its `claude` is
# the test fake, which refuses every run — but Echo writes the run's first log line, with the model it asked for,
# before Claude Code starts), installs this checkout's Scheduler from a local marketplace, puts one made-up routine in
# its store whose model is free text (`gateway-digest`, model `acme-gw/sonnet-large`, off), and serves Echo's window at
# http://127.0.0.1:<port>. Echo's jobs are on their defaults, two of them recorded as run today (`jobs-state.json`:
# Needs you now 3 times, Recall once). CLI steps run after `. <dir>/env` (`echoctl` is then the debug build); `$R` is the
# plugin's routines folder, `$RUNS` its runs.
set -euo pipefail
usage="usage: ECHO_REPO=<echo checkout> up.sh <dir> <port>"
dir="${1:?$usage}"; port="${2:?$usage}"
here="$(cd "$(dirname "$0")" && pwd)"
plugins="$(git -C "$here" rev-parse --show-toplevel)"
echo_repo="$(cd "${ECHO_REPO:?$usage}" && pwd)"
bin="$echo_repo/target/debug/echoctl"
[ -x "$bin" ] || { echo "build Echo first: (cd $echo_repo && cargo build)" >&2; exit 1; }

python3 "$echo_repo/tests/fixtures/make_data.py" "$dir" --set standard > /dev/null
dir="$(cd "$dir" && pwd)"

(
  . "$dir/env"
  case "${ECHOCTL_HOME:-}" in "$dir"/*) ;; *) echo "ECHOCTL_HOME isn't inside $dir: stopping" >&2; exit 1;; esac
  printf 'export PATH="%s:$PATH"\nexport R="%s"\nexport RUNS="%s"\n' "$echo_repo/target/debug" \
    "$ECHOCTL_HOME/.echo/plugins/scheduler/routines" "$ECHOCTL_HOME/.echo/plugins/scheduler/runs" >> "$dir/env"
)
(
  . "$dir/env"
  [ "$(command -v echoctl)" = "$bin" ] || { echo "the debug echoctl isn't first on PATH" >&2; exit 1; }
  case "${ECHOCTL_HOME:-}" in "$dir"/*) ;; *) echo "ECHOCTL_HOME isn't inside $dir: stopping" >&2; exit 1;; esac
  # An Echo built from source may be older by its number than the release the plugin asks for: install a copy whose
  # `echo` is the built one, and say so.
  market="$plugins"
  built="$(echoctl --version | awk '{print $2}')"
  want="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("echo","").lstrip(">="))' "$plugins/plugins/scheduler/echo-plugin.json")"
  if [ -n "$want" ] && [ "$(printf '%s\n%s\n' "$built" "$want" | sort -V | head -1)" != "$want" ]; then
    market="$dir/market"
    rsync -a --exclude .git --exclude tests "$plugins/" "$market/"
    python3 -c 'import json,sys; p,b=sys.argv[1],sys.argv[2]; m=json.load(open(p)); m["echo"]=">="+b; json.dump(m,open(p,"w"),indent=2)' "$market/plugins/scheduler/echo-plugin.json" "$built"
    echo "Echo $built from source (the plugin asks for $want): installed from a copy with echo >=$built" > "$dir/install.log"
  fi
  echoctl plugin marketplace add "$market" --name local > /dev/null
  echoctl plugin install scheduler --from local --yes >> "$dir/install.log"
  # A routine written before the model was picked from a list: its model is free text. Off, so it never runs by itself.
  mkdir -p "$R"
  printf -- '---\nname: Gateway digest\nschedule: weekdays 08:30\nprofile:\nmodel: acme-gw/sonnet-large\ntools: read\ndeliver:\nmail_to:\nskip_empty: true\nenabled: false\n---\nWhat changed in the Acme thread since yesterday?\n' > "$R/gateway-digest.md"
  # Echo's jobs as if two had run today (Echo's own record of them, made up): Needs you now three times, Recall once.
  today="$(date +%Y-%m-%d)"; at="$(date +%Y-%m-%dT%H:%M:%S%z | sed -E 's/([0-9]{2})([0-9]{2})$/\1:\2/')"
  printf '{"needs": {"last_run": "%s", "day": "%s", "runs_today": 3}, "brain_reader": {"last_run": "%s", "day": "%s", "runs_today": 1}}\n' "$at" "$today" "$at" "$today" > "$ECHOCTL_CONFIG_DIR/jobs-state.json"
  cd "$echo_repo"
  ECHOCTL_SERVE_IPC=1 nohup echoctl window --serve "$port" > "$dir/serve.log" 2>&1 &
  echo $! > "$dir/pid"
)
for _ in $(seq 40); do curl -s -o /dev/null "http://127.0.0.1:$port/" && break; sleep 0.5; done
curl -s -o /dev/null "http://127.0.0.1:$port/" || { echo "the window didn't start: see $dir/serve.log" >&2; exit 1; }
echo "base_url=http://127.0.0.1:$port env=$dir/env"
