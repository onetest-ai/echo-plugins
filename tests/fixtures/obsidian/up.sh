#!/usr/bin/env bash
# The Knowledge plugin's (`obsidian`) functional cases' environment, never the user's own Echo or vaults:
#   ECHO_REPO=<an Echo checkout, built with `cargo build`> [OBSIDIAN_FROM=0.8] tests/fixtures/obsidian/up.sh <dir> <port>
#   tests/fixtures/obsidian/next.sh <dir>     # OBSIDIAN_FROM=0.8 only: this checkout's version offered as the update
#   tests/fixtures/obsidian/down.sh <dir>
# SAME_SECOND=1 adds a made-up memo started in guest call 7's second, with the next stamp as Echo 0.10.0 gives it (TC-056).
# <dir> must not exist yet. It builds Echo's standard made-up data (Echo's tests/fixtures/make_data.py; its `claude` is
# the test fake, which refuses every run: Claude's reading of a vault fails, and a case writes its description), makes
# made-up vaults in <dir>/vaults (acme-wiki, home-notes; acme-twin, twin-shaped, and acme-history, both in git), installs this checkout's plugin from a local marketplace
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

# DATA_NOW (ISO local time) builds the data as of then — Echo's make_data refuses late in the evening without it.
python3 "$echo_repo/tests/fixtures/make_data.py" "$dir" --set standard ${DATA_NOW:+--now "$DATA_NOW"} > /dev/null
dir="$(cd "$dir" && pwd)"

# Two made-up vaults: Markdown notes only.
v="$dir/vaults"
mkdir -p "$v/acme-wiki/.obsidian" "$v/acme-wiki/Decisions" "$v/acme-wiki/People" "$v/home-notes/Trips"
printf -- '---\ntags: [decision]\n---\n# Rollout by region\n\nAcme rolls out by region, EU first. See [[Ada Lovelace]].\n' > "$v/acme-wiki/Decisions/Rollout by region.md"
printf -- '---\nrole: QA lead\n---\n# Ada Lovelace\n\nQA lead at Acme.\n' > "$v/acme-wiki/People/Ada Lovelace.md"
printf -- '# Lisbon\n\nThree days in May.\n' > "$v/home-notes/Trips/Lisbon.md"
# home-notes also keeps an inbox of clippings and a templates folder: a vault from 0.8 indexes them until the user
# confirms the shape Echo found; one connected in 1.0 leaves them out at once (TC-009, TC-020).
mkdir -p "$v/home-notes/Inbox" "$v/home-notes/templates"
printf -- '# A clipping\n\nA recipe to try.\n' > "$v/home-notes/Inbox/clip.md"
printf -- '# {{title}}\n' > "$v/home-notes/templates/note.md"

# A twin-shaped vault (Knowledge 1.0's cases, TC-008 on): its pages in knowledge/ (Obsidian's settings there), an index
# CATALOG.md with a table per section, a tag taxonomy, dated notes, a page template, an image, a hostile page, a
# sources folder, rules for agents and a skill — and a git repository of its own (plain `git init`, a made-up author,
# none of the computer's git settings; nothing is fetched or pushed).
t="$v/acme-twin"
mkdir -p "$t/knowledge/.obsidian" "$t/knowledge/clients" "$t/knowledge/notes" "$t/knowledge/topics" "$t/knowledge/templates" "$t/knowledge/img" "$t/raw_inbox" "$t/.claude/skills/ingest"
printf '{"useMarkdownLinks": true, "newLinkFormat": "relative"}' > "$t/knowledge/.obsidian/app.json"
printf -- '# Knowledge Catalog\n\n> Last update: 2026-01-01\n\n## Clients\n\n| File | Description | Date Added |\n|------|-------------|------------|\n| [acme.md](clients/acme.md) | Acme Corp | 2026-01-02 |\n\n## Notes\n\n| File | Description | Date Added |\n|------|-------------|------------|\n| [2026-01-01-kickoff.md](notes/2026-01-01-kickoff.md) | Kickoff | 2026-01-01 |\n\n## Topics\n\n| File | Description |\n|------|-------------|\n| [rollout.md](topics/rollout.md) | Rollout by region |\n\n## Activities\n\nNone yet.\n' > "$t/knowledge/CATALOG.md"
printf -- '# Tags\n\n```\nmeeting, client, concept\n```\n' > "$t/knowledge/TAG_TAXONOMY.md"
printf -- '---\ntitle: Acme Corp\ntags: [client]\n---\n# Acme Corp\n\nA made-up client. Kickoff: [[2026-01-01-kickoff]]. Plan: [[rollout|the rollout]]. Not written yet: [[Pricing model]].\n\n![[chart.png]]\n' > "$t/knowledge/clients/acme.md"
printf -- '---\ntitle: Kickoff\ndate: 2026-01-01\ntags: [meeting]\n---\n# Kickoff\n\nWith [Acme](../clients/acme.md) and Ada Lovelace.\n' > "$t/knowledge/notes/2026-01-01-kickoff.md"
printf -- '---\ntitle: Weekly sync\ntags: [meeting]\n---\n# Weekly sync\n\nThe Control Plane ships in May.\n' > "$t/knowledge/notes/2026-01-08-weekly.md"
printf -- '---\ntitle: Rollout by region\ntags: [concept]\n---\n# Rollout by region\n\nEU first, then the US. See [[acme]].\n' > "$t/knowledge/topics/rollout.md"
printf -- '# Hostile\n\n<script>alert(1)</script>\n\nLinks: [js](javascript:alert(1)) [file](file:///etc/passwd) [web](https://acme.example/plan) <img src=x onerror=alert(1)> #stray-tag\n\n`[[not a link]]`\n' > "$t/knowledge/topics/hostile.md"
printf -- '---\ntitle: {{title}}\ndate: {{date}}\ntags: [concept]\n---\n# {{title}}\n\n' > "$t/knowledge/templates/page.md"
printf '\x89PNG\r\n\x1a\n' > "$t/knowledge/img/chart.png"
printf -- '%%PDF-1.4 made up\n' > "$t/raw_inbox/deck.pdf"
printf -- '# Rules for agents\n' > "$t/AGENTS.md"
printf -- '---\nname: ingest\ndescription: Adds a source to the vault\n---\n# Ingest\n' > "$t/.claude/skills/ingest/SKILL.md"
# A folder linked inside the vault: `customers` is `clients` (TC-018).
ln -s clients "$t/knowledge/customers"
(
  cd "$t"
  export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0
  git init -q --initial-branch=main
  git config user.name "Sam Rivera" && git config user.email "sam@acme.example" && git config commit.gpgsign false
  git add -A && git commit -q -m "The twin, made up"
)
# acme-history: a vault in git whose pages' older versions can't be restored by Echo — one not UTF-8, one over 2 MB
# (TC-019). Its pages are its root.
h="$v/acme-history"
mkdir -p "$h"
printf -- '# Caf\xe9 notes\n' > "$h/legacy.md"
python3 -I -c 'import sys; open(sys.argv[1], "w").write("# Archive\n" + "an old line of the archive\n" * 100000)' "$h/archive.md"
printf -- '# Current\n' > "$h/current.md"
(
  cd "$h"
  export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0
  git init -q --initial-branch=main
  git config user.name "Sam Rivera" && git config user.email "sam@acme.example" && git config commit.gpgsign false
  git add -A && git commit -q -m "Old pages"
  printf -- '# Café notes\n' > legacy.md
  printf -- '# Archive\n\nTrimmed.\n' > archive.md
  git commit -q -am "In UTF-8, trimmed"
)

# The cases' fake Claude Code (fake-claude.sh) in front of Echo's own test fake (moved to bin/claude-echo): an Ingest
# run makes the edits <dir>/fake-ingest.json names, in its copy of the vault only (fake_ingest.py); anything else is
# Echo's fake's. Echo's must be the pure test fake (no `exec` of a real Claude Code: `--ai local|virtual` data), else
# nothing is set up.
if [ ! -f "$dir/bin/claude" ] || grep -qE 'exec [^ ]*claude|ANTHROPIC_BASE_URL' "$dir/bin/claude"; then echo "$dir/bin/claude isn't Echo's pure test fake: stopping" >&2; exit 1; fi
mv "$dir/bin/claude" "$dir/bin/claude-echo"
cp "$here/fake-claude.sh" "$dir/bin/claude"
cp "$here/fake_ingest.py" "$dir/bin/fake_ingest.py"
chmod +x "$dir/bin/claude"

printf 'export PATH="%s:$PATH"\nexport VAULTS="%s"\nexport MARKET="%s"\n' "$echo_repo/target/debug" "$v" "$dir/market" >> "$dir/env"
# A made-up web site on this computer only (fake_web.py) for a web page as a source, on <port>+1 (listed as the user's
# site in a case: `web_sites`) and <port>+2 (not listed: Echo's box gives its address — ECHOCTL_ASK_ADDRESS, a debug
# build's answer to `ctx.http.askAddress`, never a dialog).
web1=$((port + 1)); web2=$((port + 2))
python3 -I "$here/fake_web.py" "$web1" "$web2" --log "$dir/web.log" > /dev/null 2>&1 &
echo $! > "$dir/web.pid"
printf 'export FAKE_WEB="http://127.0.0.1:%s"\nexport FAKE_WEB_OTHER="http://127.0.0.1:%s"\nexport ECHOCTL_ASK_ADDRESS="http://127.0.0.1:%s/rollout.html"\n' "$web1" "$web2" "$web2" >> "$dir/env"
# A made-up dictionary (Recall → Dictionary) in the test data's Recall folder, as Echo keeps it: terms with other names
# and spellings, for tags through Echo's dictionary (TC-061). The standard data has none.
home="$(. "$dir/env" && printf '%s' "$ECHOCTL_HOME")"
case "$home" in "$dir"/*) ;; *) echo "ECHOCTL_HOME isn't inside $dir: stopping" >&2; exit 1;; esac
mkdir -p "$home/recall/taxonomy"
cat > "$home/recall/taxonomy/current.json" <<'JSON'
{"version": 1, "layers": {"shared": {"name": "Your practice"}}, "topics": [], "terms": [
  {"name": "Concept", "kind": "term", "synonyms": ["idea"], "variants": []},
  {"name": "Client", "kind": "term", "synonyms": ["customer"], "variants": []},
  {"name": "Control Plane", "kind": "product", "synonyms": ["CP"], "variants": ["controlplane"]}
], "aliases": {}, "history": []}
JSON
# SAME_SECOND=1 (TC-056 on an environment of its own): a made-up memo started in the same second as the standard data's
# guest call 7, as Echo 0.10.0 makes it — the next free stamp (`…_143001`), its real start in its meta — a copy of the
# call's folder, retitled "Guest memo", kind memo.
if [ "${SAME_SECOND:-}" = 1 ]; then
  g="$(ls "$home/calls" | grep -- '-guest-call-7$' | head -1)"
  [ -n "$g" ] || { echo "no guest call 7 in the data: stopping" >&2; exit 1; }
  next="$(python3 -I -c 'import datetime,sys; print((datetime.datetime.strptime(sys.argv[1], "%Y-%m-%d_%H%M%S") + datetime.timedelta(seconds=1)).strftime("%Y-%m-%d_%H%M%S"))' "${g%-guest-call-7}")"
  m="$home/calls/$next-guest-memo"
  cp -R "$home/calls/$g" "$m"
  python3 -I -c 'import json,sys; p=sys.argv[1]; m=json.load(open(p)); m["title"]="Guest memo"; m["kind"]="memo"; json.dump(m, open(p, "w"), indent=2)' "$m/meta.json"
fi
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
    "$here/next.sh" "$dir" >> "$dir/install.log"
  fi
  if [ "$from" = 0.8 ]; then "$here/next.sh" --echo-only "$dir" >> "$dir/install.log"; fi
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
    mkdir -p "$s/vault/Clients" "$s/vault/_echo" "$s/knowledge" "$s/runs/knowledge/2026-10-03"
    printf -- 'Acme rolls out by region.\n' > "$s/runs/knowledge/2026-10-03/answer.md"
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
# Its own window, not another one on that port: the process is still there.
{ curl -s -o /dev/null "http://127.0.0.1:$port/" && kill -0 "$(cat "$dir/pid")" 2> /dev/null; } || { echo "the window didn't start (is port $port taken?): see $dir/serve.log" >&2; exit 1; }
for _ in $(seq 20); do curl -s -o /dev/null "http://127.0.0.1:$web1/_log" && break; sleep 0.25; done
echo "base_url=http://127.0.0.1:$port env=$dir/env vaults=$v web=http://127.0.0.1:$web1 web_other=http://127.0.0.1:$web2"
