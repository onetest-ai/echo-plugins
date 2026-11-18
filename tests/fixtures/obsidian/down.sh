#!/usr/bin/env bash
# Stop what up.sh started for <dir>: Echo's window and the fake web site. Remove <dir> yourself when the run is over.
set -u
dir="${1:?usage: down.sh <dir>}"
[ -f "$dir/pid" ] && kill "$(cat "$dir/pid")" 2> /dev/null || true
[ -f "$dir/web.pid" ] && kill "$(cat "$dir/web.pid")" 2> /dev/null || true
echo "stopped $dir"
