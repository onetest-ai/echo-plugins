#!/usr/bin/env bash
# The Obsidian plugin's functional cases' environment, never the user's own Echo or vaults:
#   ECHO_REPO=<an Echo checkout, built with `cargo build`> tests/fixtures/obsidian/up.sh <dir> <port>
#   tests/fixtures/obsidian/down.sh <dir>
# <dir> must not exist yet. It builds Echo's standard made-up data (Echo's tests/fixtures/make_data.py; its `claude` is
# the test fake, which refuses every run: Claude's reading of a vault fails, and a case writes its description), makes
# two made-up vaults in <dir>/vaults (acme-wiki, home-notes), installs this checkout's Obsidian plugin from a local
# marketplace, puts one made-up note in its Knowledge vault (read in only once a case turns Knowledge on), and serves
# Echo's window at http://127.0.0.1:<port>. CLI steps run after `. <dir>/env` (`echoctl` is then the debug build); a
# vault is connected with `ECHOCTL_PICK_FOLDER=$VAULTS/<vault> echoctl plugin call obsidian add '{"wait":true}'`.
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

# Two made-up vaults: Markdown notes only.
v="$dir/vaults"
mkdir -p "$v/acme-wiki/.obsidian" "$v/acme-wiki/Decisions" "$v/acme-wiki/People" "$v/home-notes/Trips"
printf -- '---\ntags: [decision]\n---\n# Rollout by region\n\nAcme rolls out by region, EU first. See [[Ada Lovelace]].\n' > "$v/acme-wiki/Decisions/Rollout by region.md"
printf -- '---\nrole: QA lead\n---\n# Ada Lovelace\n\nQA lead at Acme.\n' > "$v/acme-wiki/People/Ada Lovelace.md"
printf -- '# Lisbon\n\nThree days in May.\n' > "$v/home-notes/Trips/Lisbon.md"

printf 'export PATH="%s:$PATH"\nexport VAULTS="%s"\n' "$echo_repo/target/debug" "$v" >> "$dir/env"

(
  . "$dir/env"
  [ "$(command -v echoctl)" = "$bin" ] || { echo "the debug echoctl isn't first on PATH" >&2; exit 1; }
  case "${ECHOCTL_HOME:-}" in "$dir"/*) ;; *) echo "ECHOCTL_HOME isn't inside $dir: stopping" >&2; exit 1;; esac
  # An Echo built from source may be older by its number than the release the plugin asks for (its features are in,
  # the release isn't out): install a copy whose `echo` is the built one, and say so.
  market="$plugins"
  built="$(echoctl --version | awk '{print $2}')"
  want="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("echo","").lstrip(">="))' "$plugins/plugins/obsidian/echo-plugin.json")"
  if [ -n "$want" ] && [ "$(printf '%s\n%s\n' "$built" "$want" | sort -V | head -1)" != "$want" ]; then
    market="$dir/market"
    rsync -a --exclude .git --exclude tests "$plugins/" "$market/"
    python3 -c 'import json,sys; p,b=sys.argv[1],sys.argv[2]; m=json.load(open(p)); m["echo"]=">="+b; json.dump(m,open(p,"w"),indent=2)' "$market/plugins/obsidian/echo-plugin.json" "$built"
    echo "Echo $built from source (the plugin asks for $want): installed from a copy with echo >=$built" > "$dir/install.log"
  fi
  echoctl plugin marketplace add "$market" --name local > /dev/null
  echoctl plugin install obsidian --from local --yes >> "$dir/install.log"
  # Knowledge's own vault, as the plugin writes it: one made-up note, read in by `echo_reindex` once Knowledge is on.
  k="$ECHOCTL_HOME/.echo/plugins/obsidian/vault"
  mkdir -p "$k"
  printf -- '---\ntags: [type/organisation, client/acme]\n---\n# Acme\n\n- Acme rolls out by region, EU first.\n' > "$k/Acme.md"
  cd "$echo_repo"
  ECHOCTL_SERVE_IPC=1 nohup echoctl window --serve "$port" > "$dir/serve.log" 2>&1 &
  echo $! > "$dir/pid"
)
for _ in $(seq 40); do curl -s -o /dev/null "http://127.0.0.1:$port/" && break; sleep 0.5; done
curl -s -o /dev/null "http://127.0.0.1:$port/" || { echo "the window didn't start: see $dir/serve.log" >&2; exit 1; }
echo "base_url=http://127.0.0.1:$port env=$dir/env vaults=$v"
