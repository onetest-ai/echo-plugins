#!/usr/bin/env bash
# Stop what up.sh started for <dir>: Echo's window and the fake GitHub. Remove <dir> yourself when the run is over.
set -u
dir="${1:?usage: down.sh <dir>}"
for p in pid fake-github.pid; do
  [ -f "$dir/$p" ] && kill "$(cat "$dir/$p")" 2> /dev/null || true
done
echo "stopped $dir"
