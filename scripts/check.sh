#!/usr/bin/env bash
# The repository's gates before a commit, fastest first; exit 1 when any fails (each still runs, to name them all):
#   scripts/check.sh                       # echoctl from $ECHOCTL, else PATH
#   ECHOCTL=<echo checkout>/target/debug/echoctl scripts/check.sh
# - syntax: `node --check` each plugin's halves;
# - package: `echoctl plugin check --json plugins/*` (Echo's checks of each package, as an install does them), and a
#   part for Claude in Echo in every plugin (`agent.summary` in its manifest and `agent/CLAUDE.md`);
# - unit: `node --test 'tests/**/*.test.mjs'`;
# - map: `python3 -I tests/tools/feature-map.py check`.
# The functional cases are not here: .ai-run/guides/testing/plugin-testing.md says which to run.
# echoctl runs on empty scratch folders (ECHOCTL_HOME, ECHOCTL_CONFIG_DIR), never on the caller's Echo: `plugin check`
# needs no data, and a development build under Claude Code refuses to run without them.
set -uo pipefail
# A relative $ECHOCTL is the caller's: made absolute before the cd below.
case "${ECHOCTL:-}" in ""|/*) ;; *) ECHOCTL="$PWD/$ECHOCTL" ;; esac
cd "$(dirname "$0")/.."
failed=""
fail() { failed="$failed $1"; }

echo "== syntax"
for f in plugins/*/*.js; do node --check "$f" || fail "syntax:$f"; done

echo "== package"
echoctl="${ECHOCTL:-$(command -v echoctl || true)}"
if [ -z "$echoctl" ] || [ ! -x "$echoctl" ]; then
  echo "echoctl not found: set ECHOCTL to an Echo build that has \`plugin check\` (cargo build -p echoctl), or put it on PATH" >&2
  fail package
else
  # An Echo built from source (`…/target/debug/echoctl`) may be older by its number than the release a plugin asks for
  # (its features are in main, the release isn't out): that plugin is checked as a copy whose `echo` is the built one,
  # and said so. An installed Echo is never stood in for.
  folders=(plugins/*)
  ahead="$(mktemp -d)"
  scratch="$(mktemp -d)"
  mkdir "$scratch/home" "$scratch/config"
  run_echoctl() { ECHOCTL_HOME="$scratch/home" ECHOCTL_CONFIG_DIR="$scratch/config" "$echoctl" "$@"; }
  case "$echoctl" in
    */target/debug/echoctl)
      built="$(run_echoctl --version | awk '{print $2}')"
      repo="${echoctl%/target/debug/echoctl}"
      for i in "${!folders[@]}"; do
        f="${folders[$i]}"
        want="$(python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1])).get("echo","").lstrip(">="))' "$f/echo-plugin.json" 2> /dev/null || true)"
        # Only for a release not out yet: a released one (its tag in the build's repository) needs a build that new.
        if [ -n "$want" ] && [ "$(printf '%s\n%s\n' "${built%%-*}" "$want" | sort -V | head -1)" != "$want" ] \
          && [ -z "$(git -C "$repo" tag -l "v$want" 2> /dev/null)" ]; then
          cp -R "$f" "$ahead/"
          python3 -I -c 'import json,sys; p,b=sys.argv[1],sys.argv[2]; m=json.load(open(p)); m["echo"]=">="+b; json.dump(m,open(p,"w"),indent=2)' "$ahead/$(basename "$f")/echo-plugin.json" "${built%%-*}"
          folders[$i]="$ahead/$(basename "$f")"
          echo "$(basename "$f"): asks for Echo $want, checked as the source build $built (not released yet)"
        fi
      done ;;
  esac
  out="$(run_echoctl plugin check --json "${folders[@]}")"
  code=$?
  # Its JSON: {ok, problems: [{id, file, what}], plugins: [{id, folder, ok}]}; plus: every plugin has its part for
  # Claude — `agent.summary` and `agent/CLAUDE.md` (`agent` may hold only a prefix).
  printf '%s' "$out" | python3 -I -c '
import json, os, sys
try:
    r = json.load(sys.stdin)
except ValueError:
    print("echoctl plugin check gave no JSON: is it an Echo with `plugin check`?"); sys.exit(1)
bad = 0
for p in r.get("plugins", []):
    mine = [x for x in r.get("problems", []) if x.get("id") == p["id"]]
    try:
        a = json.load(open(p["folder"] + "/echo-plugin.json", encoding="utf-8")).get("agent")
        summary = isinstance(a, dict) and isinstance(a.get("summary"), str) and a["summary"].strip() != ""
    except (OSError, ValueError, AttributeError):
        summary = True  # echoctl names a manifest it cannot read
    if not summary:
        mine.append({"file": "echo-plugin.json", "what": "no “agent.summary”: every plugin here has a part for Claude in Echo (agent.summary, agent/CLAUDE.md)"})
    if not os.path.isfile(os.path.join(p["folder"], "agent", "CLAUDE.md")) and not any(x.get("file") == "agent/CLAUDE.md" for x in mine):
        mine.append({"file": "agent/CLAUDE.md", "what": "missing: every plugin here has a part for Claude in Echo (agent.summary, agent/CLAUDE.md)"})
    print("%s (%s): %s" % (p["id"], p["folder"], "ok" if not mine else "%d problem%s" % (len(mine), "" if len(mine) == 1 else "s")))
    for x in mine:
        print("  - %s: %s" % (x.get("file") or p["folder"], x["what"]))
    bad += len(mine)
others = [x for x in r.get("problems", []) if x.get("id") not in {p["id"] for p in r.get("plugins", [])}]
for x in others:
    print("  - %s %s: %s" % (x.get("id", ""), x.get("file", ""), x["what"]))
sys.exit(1 if bad or others or not r.get("ok") else 0)
' && [ "$code" = 0 ] || fail package
  rm -rf "$ahead" "$scratch"
fi

echo "== unit"
log="$(mktemp)"
if node --test 'tests/**/*.test.mjs' > "$log" 2>&1; then grep -E '^ℹ (tests|pass|fail) ' "$log"; else cat "$log"; fail unit; fi
rm -f "$log"

echo "== map"
python3 -I tests/tools/feature-map.py check || fail map

if [ -n "$failed" ]; then
  echo "FAILED:$failed" >&2
  exit 1
fi
echo "all gates passed"
