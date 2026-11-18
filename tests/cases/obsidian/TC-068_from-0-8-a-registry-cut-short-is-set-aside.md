---
id: TC-068
title: From Obsidian vaults 0.8 with a list of vaults cut short — the update still deletes the facts vault and writes nothing over the list; the next change sets it aside, byte for byte, says so, and starts the list again
priority: high
type: functional
requirements: [F-OB-08, F-OB-70]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, update, migration, registry]
---

# TC-068: From 0.8 — a list of vaults cut short is set aside, never written over

## Preconditions
- An environment of its own: `OBSIDIAN_FROM=0.8 ECHO_REPO=… up.sh "$(mktemp -d)/ob8" <port>`, `. <dir>/env`,
  `obs() { echoctl plugin call obsidian "$@"; }`, `S="$ECHOCTL_HOME/.echo/plugins/obsidian"`,
  `P="$ECHOCTL_HOME/.plugins/obsidian"`
- The 0.8 list cut short, as a crash or a full disk leaves it (this case alone writes it, before the update):
  `head -c 40 "$S/vaults.json" > <dir>/cut.json`; `cp <dir>/cut.json "$S/vaults.json"`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$S/vaults.json"` | It fails: the list can't be read |
| 2 | `tests/fixtures/obsidian/next.sh <dir>`; `echoctl plugin update obsidian --yes` | "Updated Knowledge to 1.0.0" |
| 3 | `obs view \| python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d["vaults"]), d["default"])'`; `cmp "$S/vaults.json" <dir>/cut.json && echo same`; `ls "$S" \| grep -c 'vaults.json.bad'` | `0 None`: no vault can be read; `same`: the list is still the cut one, not written over; `0`: nothing set aside yet (nothing was written) |
| 4 | `test -e "$S/vault" \|\| echo gone`; `test -e "$S/knowledge" \|\| echo gone`; `ls "$S/vaults" "$S/runs"`; `echoctl core \| grep -ci 'knowledge ·'` | `gone` twice: 0.8's facts vault and its state are deleted all the same; `vaults` holds `acme-wiki` (its description) and no `echo`; `runs` holds `acme-wiki` and `home-notes`, no `knowledge`; `0`: Claude has no vault entry, none can be read |
| 5 | `ECHOCTL_PICK_FOLDER="$VAULTS/acme-wiki" obs add '{"wait":true}'`; `ls "$S" \| grep 'vaults.json'` | The vault's id `acme-wiki`; on its stderr "plugin obsidian: [info] vaults.json couldn't be read: kept as vaults.json.bad-<ms>, the list of vaults starts again"; `vaults.json` and one `vaults.json.bad-<ms>` |
| 6 | `cmp "$S"/vaults.json.bad-* <dir>/cut.json && echo kept`; `python3 -c 'import json,sys; print([v["id"] for v in json.load(open(sys.argv[1]))])' "$S/vaults.json"` | `kept`: the cut list is set aside byte for byte; the new list `['acme-wiki']` |
| 7 | `obs view` | acme-wiki again, under its old id: its 0.8 description ("Decisions on Acme projects and who made them") is found again, not confirmed until the user says so |
| 8 | `obs view` again; `ls "$S" \| grep -c 'vaults.json.bad'` | acme-wiki listed; still `1`: a list that reads well is never set aside |

## Expected Final State
Knowledge 1.0.0; the cut 0.8 list kept as `vaults.json.bad-<ms>`; a new list with acme-wiki; 0.8's facts vault gone.
