#!/usr/bin/env bash
set -euo pipefail
dir="${1:?test directory}"
if [ -f "$dir/pid" ]; then kill "$(cat "$dir/pid")" 2>/dev/null || true; fi
