#!/usr/bin/env bash
# This checkout's plugin into the environment's marketplace (<dir>/market, a copy — never this repository), then the
# marketplace read again, so `echoctl plugin update obsidian` finds it:
#   tests/fixtures/obsidian/next.sh <dir>
# `--echo-only`: only set the copy's `echo` to the built Echo's when the built one is older by its number (its features
# are in, the release isn't out), and say so. Run after `. <dir>/env` (up.sh does it for itself).
set -euo pipefail
only=""
[ "${1:-}" = "--echo-only" ] && { only=1; shift; }
dir="$(cd "${1:?usage: next.sh [--echo-only] <dir>}" && pwd)"
here="$(cd "$(dirname "$0")" && pwd)"
plugins="$(git -C "$here" rev-parse --show-toplevel)"
market="$dir/market"
. "$dir/env"
case "${ECHOCTL_HOME:-}" in "$dir"/*) ;; *) echo "ECHOCTL_HOME isn't inside $dir: stopping" >&2; exit 1;; esac
if [ -z "$only" ]; then
  mkdir -p "$market"
  rsync -a --delete --exclude .git --exclude tests --exclude '.playwright-mcp' "$plugins/plugins/" "$market/plugins/"
  cp "$plugins/echo-marketplace.json" "$market/"
fi
m="$market/plugins/obsidian/echo-plugin.json"
built="$(echoctl --version | awk '{print $2}')"
want="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("echo","").lstrip(">="))' "$m")"
if [ -n "$want" ] && [ "$(printf '%s\n%s\n' "$built" "$want" | sort -V | head -1)" != "$want" ]; then
  python3 -c 'import json,sys; p,b=sys.argv[1],sys.argv[2]; m=json.load(open(p)); m["echo"]=">="+b; json.dump(m,open(p,"w"),indent=2)' "$m" "$built"
  echo "Echo $built from source (the plugin asks for $want): the marketplace's copy says echo >=$built"
fi
if [ -z "$only" ] && echoctl plugin marketplace list 2> /dev/null | grep -q '"local"'; then
  echoctl plugin marketplace update local > /dev/null
fi
echo "$market: $(python3 -c 'import json,sys; m=json.load(open(sys.argv[1])); print(m["name"], m["version"])' "$m")"
