#!/usr/bin/env bash
# The Knowledge plugin's (`obsidian`) functional cases' environment, never the user's own Echo or vaults:
#   ECHO_REPO=<an Echo checkout, built with `cargo build`> [OBSIDIAN_FROM=0.8] tests/fixtures/obsidian/up.sh <dir> <port>
#   tests/fixtures/obsidian/next.sh <dir>     # OBSIDIAN_FROM=0.8 only: this checkout's version offered as the update
#   tests/fixtures/obsidian/down.sh <dir>
# <dir> must not exist yet. It builds Echo's standard made-up data (Echo's tests/fixtures/make_data.py; its `claude` is
# the test fake, which refuses every run: Claude's reading of a vault fails, and a case writes its description), makes
# two made-up vaults in <dir>/vaults (acme-wiki, home-notes), installs this checkout's plugin from a local marketplace
# (<dir>/market, a copy), and serves Echo's window at http://127.0.0.1:<port>. CLI steps run after `. <dir>/env`
# (`echoctl` is then the debug build); a vault is connected with
# `ECHOCTL_PICK_FOLDER=$VAULTS/<vault> echoctl plugin call obsidian add '{"wait":true}'`.
# OBSIDIAN_FROM=0.8 installs Obsidian vaults 0.8.0 instead (this repository's commit 6481be6) as a user of it has it:
# both vaults connected, acme-wiki described and confirmed, its Knowledge (the facts vault) on with one note and its
# pipeline's state; `next.sh` then puts this checkout's version in the marketplace for `echoctl plugin update`.
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

printf 'export PATH="%s:$PATH"\nexport VAULTS="%s"\nexport MARKET="%s"\n' "$echo_repo/target/debug" "$v" "$dir/market" >> "$dir/env"
from="${OBSIDIAN_FROM:-}"
case "$from" in ''|0.8) ;; *) echo "OBSIDIAN_FROM: 0.8 or nothing" >&2; exit 1;; esac

(
  . "$dir/env"
  [ "$(command -v echoctl)" = "$bin" ] || { echo "the debug echoctl isn't first on PATH" >&2; exit 1; }
  case "${ECHOCTL_HOME:-}" in "$dir"/*) ;; *) echo "ECHOCTL_HOME isn't inside $dir: stopping" >&2; exit 1;; esac
  # The marketplace: a copy of this checkout (or of 0.8.0), whose `echo` is the built Echo's when that is older by its
  # number than the release the plugin asks for (its features are in, the release isn't out) — said in install.log.
  market="$dir/market"
  if [ "$from" = 0.8 ]; then
    mkdir -p "$market"
    git -C "$plugins" archive 6481be6 echo-marketplace.json plugins | tar -x -C "$market"
  else
    "$here/next.sh" "$dir" > /dev/null
  fi
  "$here/next.sh" --echo-only "$dir" >> "$dir/install.log"
  echoctl plugin marketplace add "$market" --name local > /dev/null
  echoctl plugin install obsidian --from local --yes >> "$dir/install.log"
  if [ "$from" = 0.8 ]; then
    # As a 0.8 user has it: both vaults connected (the fake claude can't describe them), acme-wiki described and
    # confirmed; Knowledge on, with its facts vault's one note and its pipeline's state.
    for x in acme-wiki home-notes; do ECHOCTL_PICK_FOLDER="$v/$x" echoctl plugin call obsidian add '{"wait":true}' > /dev/null; done
    echoctl plugin call obsidian save '{"id":"acme-wiki","key":"when","text":"Decisions on Acme projects and who made them"}' > /dev/null
    echoctl plugin call obsidian confirm '{"id":"acme-wiki"}' > /dev/null
    echoctl plugin set obsidian knowledge true > /dev/null
    s="$ECHOCTL_HOME/.echo/plugins/obsidian"
    mkdir -p "$s/vault/Clients" "$s/vault/_echo" "$s/knowledge"
    printf -- '---\ntags: [type/client, client/acme]\n---\n# Acme\n\n- [what] Acme rolls out by region, EU first.\n' > "$s/vault/Clients/Acme.md"
    printf -- '# What this vault keeps\n' > "$s/vault/_echo/Rules.md"
    printf -- '- [[Acme]]\n' > "$s/vault/index.md"
    printf '{"Acme":{"type":"client","written":true}}' > "$s/knowledge/things.json"
    printf '[]' > "$s/knowledge/queue.json"
    echoctl plugin call obsidian echo_reindex > /dev/null
  fi
  cd "$echo_repo"
  ECHOCTL_SERVE_IPC=1 nohup echoctl window --serve "$port" > "$dir/serve.log" 2>&1 &
  echo $! > "$dir/pid"
)
for _ in $(seq 40); do curl -s -o /dev/null "http://127.0.0.1:$port/" && break; sleep 0.5; done
curl -s -o /dev/null "http://127.0.0.1:$port/" || { echo "the window didn't start: see $dir/serve.log" >&2; exit 1; }
echo "base_url=http://127.0.0.1:$port env=$dir/env vaults=$v"
