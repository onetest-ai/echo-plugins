#!/usr/bin/env bash
# Stop what up.sh started for <dir>: Echo's window and the fake services. Remove <dir> yourself when the run is over.
# On Windows (Git Bash) a pid up.sh kept is the shell's: the program behind it is stopped by its Windows pid, with
# its children (`taskkill /T`), since `kill` doesn't reach a native program there.
set -u
dir="${1:?usage: down.sh <dir>}"
for p in pid fake-retell.pid; do
  [ -f "$dir/$p" ] || continue
  pid="$(cat "$dir/$p")"
  if [ -r "/proc/$pid/winpid" ]; then taskkill //F //T //PID "$(cat "/proc/$pid/winpid")" > /dev/null 2>&1 || true; fi
  kill "$pid" 2> /dev/null || true
done
echo "stopped $dir"
