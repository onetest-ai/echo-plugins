#!/usr/bin/env bash
set -euo pipefail
plugins="$(cd "$(dirname "$0")/../../.." && pwd)"
echo_repo="${ECHO_REPO:-$(dirname "$plugins")/echo}"
dir="${1:?usage: up.sh <new test dir> <port>}"
port="${2:?usage: up.sh <new test dir> <port>}"
export ECHO_REPO="$echo_repo"
python3 "$echo_repo/tests/fixtures/make_data.py" "$dir" --set small --ai fake > /dev/null
dir="$(cd "$dir" && pwd)"
(
  . "$dir/env"
  export ECHO_REPO="$echo_repo"
  case "$ECHOCTL_HOME" in "$dir"/*) ;; *) echo 'refusing non-test data' >&2; exit 1;; esac
  python3 "$plugins/tests/fixtures/knowledge/seed.py" "$dir"
  mkdir -p "$dir/market"
  cp -R "$plugins/plugins" "$dir/market/plugins"
  cp "$plugins/echo-marketplace.json" "$dir/market/echo-marketplace.json"
  "$echo_repo/target/debug/echoctl" plugin marketplace add "$dir/market" --name knowledge-local > /dev/null
  "$echo_repo/target/debug/echoctl" plugin install knowledge --from knowledge-local --yes > "$dir/install.log"
  cd "$echo_repo"
  ECHOCTL_PICK_FILES="$dir/import/selected.md" ECHOCTL_PICK_FOLDER="$dir/vaults/connected-notes" ECHOCTL_SERVE_IPC=1 nohup target/debug/echoctl window --serve "$port" > "$dir/serve.log" 2>&1 &
  echo $! > "$dir/pid"
)
for _ in $(seq 40); do curl -s -o /dev/null "http://127.0.0.1:$port/" && break; sleep 0.5; done
curl -s -o /dev/null "http://127.0.0.1:$port/"
echo "base_url=http://127.0.0.1:$port env=$dir/env"
