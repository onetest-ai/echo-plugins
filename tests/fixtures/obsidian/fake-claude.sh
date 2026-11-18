#!/bin/sh
# The Knowledge cases' fake Claude Code, put first on PATH by up.sh in front of Echo's own test fake (moved to
# `claude-echo` beside it): never a real Claude Code. An Ingest run — its prompt asks for a vault's ingest skill and its
# working folder is a copy of the vault in the plugin's store (`…/cache/snapshots/…`) — makes the edits `<dir>/fake-ingest.json`
# names (fake_ingest.py), in that copy only, and answers with a made-up result line; none there: it changes nothing.
# Anything else is Echo's fake's (`--version`, `auth status`, `<dir>/fake-answers.tsv`, else refused).
here="$(cd "$(dirname "$0")" && pwd)"
case "$*" in
  *"skill of this vault on these sources"*)
    case "$(pwd)" in */cache/snapshots/*) ;; *) echo "fake claude: an ingest run outside a copy of the vault" >&2; exit 1;; esac
    exec python3 -I "$here/fake_ingest.py" "$here/../fake-ingest.json";;
esac
exec "$here/claude-echo" "$@"
