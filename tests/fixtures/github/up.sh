#!/usr/bin/env bash
# The GitHub plugin's functional cases' environment, never the user's own Echo:
#   ECHO_REPO=<an Echo checkout, built with `cargo build`> tests/fixtures/github/up.sh <dir> <port>
#   tests/fixtures/github/down.sh <dir>
# <dir> must not exist yet. It builds Echo's standard made-up data (Echo's tests/fixtures/make_data.py), starts the
# fake GitHub on <port>+1 with its own copy of state.json, puts the fake gh and git first on PATH (signed in as
# ada-acme with gh; git has no sign-in), installs this checkout's GitHub plugin from a local marketplace, and serves
# Echo's window at http://127.0.0.1:<port>. CLI steps run after `. <dir>/env` (`echoctl` is then the debug build).
set -euo pipefail
usage="usage: ECHO_REPO=<echo checkout> up.sh <dir> <port>"
dir="${1:?$usage}"; port="${2:?$usage}"
here="$(cd "$(dirname "$0")" && pwd)"
plugins="$(git -C "$here" rev-parse --show-toplevel)"
echo_repo="$(cd "${ECHO_REPO:?$usage}" && pwd)"
bin="$echo_repo/target/debug/echoctl"
[ -x "$bin" ] || { echo "build Echo first: (cd $echo_repo && cargo build)" >&2; exit 1; }
fport=$((port + 1))

python3 "$echo_repo/tests/fixtures/make_data.py" "$dir" --set standard > /dev/null
dir="$(cd "$dir" && pwd)"
cp "$here/state.json" "$dir/github-state.json"
# Dates by the run's own day (local), so "late" and "this week" mean the same whatever day the cases run: the assigned
# issue acme-test/api#21 (and its milestone in the thread's Work) was due yesterday.
python3 -I - "$dir/github-state.json" <<'PY'
import datetime, json, sys
p = sys.argv[1]; d = json.load(open(p))
yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
for r in d.get("assigned", []):
    if r.get("due"): r["due"] = yesterday
for repo in d["repos"].values():
    for i in repo.get("open_issues", []):
        if i.get("due"): i["due"] = yesterday
json.dump(d, open(p, "w"), indent=2)
PY
python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["token"], end="")' "$dir/github-state.json" > "$dir/gh-token"
: > "$dir/git-token"

# Everything a step needs, in the env file the data came with.
cat >> "$dir/env" <<EOF
export PATH="$here/bin:$echo_repo/target/debug:\$PATH"
export FAKE_GH_TOKEN_FILE="$dir/gh-token"
export FAKE_GIT_TOKEN_FILE="$dir/git-token"
export ECHOCTL_TEST_HOSTS="api.github.com=http://127.0.0.1:$fport"
export FAKE_GITHUB="http://127.0.0.1:$fport"
EOF

# Never this computer's real sign-in: the git and gh a run finds are the fakes, which say "no sign-in" when their
# files are empty — in every form Echo asks them (`git -c … credential fill`, `gh auth token --hostname …`).
(
  . "$dir/env"
  empty="$dir/.no-sign-in"; : > "$empty"
  [ "$(command -v git)" = "$here/bin/git" ] && [ "$(command -v gh)" = "$here/bin/gh" ] || { echo "the fake git/gh aren't first on PATH" >&2; exit 1; }
  printf 'protocol=https\nhost=github.com\n\n' | FAKE_GIT_TOKEN_FILE="$empty" git -c credential.interactive=false credential fill > /dev/null 2>&1
  [ $? = 128 ] || { echo "git credential fill didn't come from the fake: stopping before any real sign-in is read" >&2; exit 1; }
  FAKE_GH_TOKEN_FILE="$empty" gh auth token --hostname github.com > /dev/null 2>&1 && { echo "gh auth token didn't come from the fake" >&2; exit 1; }
  rm -f "$empty"
) || exit 1

nohup python3 -I "$here/fake_github.py" "$fport" "$dir/github-state.json" > "$dir/fake-github.log" 2>&1 &
echo $! > "$dir/fake-github.pid"

(
  . "$dir/env"
  # An Echo built from source may be older by its number than the release the plugin asks for (its features are in,
  # the release isn't out): install a copy whose `echo` is the built one, and say so.
  market="$plugins"
  built="$(echoctl --version | awk '{print $2}')"
  want="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("echo","").lstrip(">="))' "$plugins/plugins/github/echo-plugin.json")"
  if [ -n "$want" ] && [ "$(printf '%s\n%s\n' "$built" "$want" | sort -V | head -1)" != "$want" ]; then
    market="$dir/market"
    rsync -a --exclude .git --exclude tests "$plugins/" "$market/"
    python3 - "$market/plugins/github/echo-plugin.json" "$built" <<'PY'
import json, sys
p, built = sys.argv[1], sys.argv[2]
m = json.load(open(p)); m["echo"] = ">=" + built; json.dump(m, open(p, "w"), indent=2)
PY
    echo "Echo $built from source (the plugin asks for $want): installed from a copy with echo >=$built" > "$dir/install.log"
  fi
  echoctl plugin marketplace add "$market" --name local > /dev/null
  echoctl plugin install github --from local --yes >> "$dir/install.log"
  cd "$echo_repo"
  ECHOCTL_SERVE_IPC=1 nohup echoctl window --serve "$port" > "$dir/serve.log" 2>&1 &
  echo $! > "$dir/pid"
)
for _ in $(seq 40); do
  curl -s -o /dev/null "http://127.0.0.1:$port/" && curl -s -o /dev/null "http://127.0.0.1:$fport/_state" && break
  sleep 0.5
done
curl -s -o /dev/null "http://127.0.0.1:$port/" || { echo "the window didn't start: see $dir/serve.log" >&2; exit 1; }
echo "base_url=http://127.0.0.1:$port env=$dir/env github=http://127.0.0.1:$fport"
