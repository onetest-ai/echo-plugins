---
id: TC-038
title: The twin preset makes a new vault in an empty folder — its files filled in, one first commit by Echo, registered as twin@1 with commits on; what Echo can't write (hidden files, ~/.claude/skills) is said, never worked around
priority: high
type: functional
requirements: [F-OB-49]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, starter, twin, git]
---

# TC-038: The twin preset makes a vault in git

## Preconditions
- A fresh environment from `up.sh` (Echo built from source), `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`
- `mkdir -p "$VAULTS/my-twin" "$VAULTS/acme-notes" "$VAULTS/globex-notes"`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs starter_files` | The 23 files of #677's preset: `.claude/skills/process-inbox/SKILL.md`, `.claude/skills/twin/SKILL.md`, `AGENTS.md` … `gitignore`, `knowledge/.obsidian/app.json` … `raw_inbox/README.md` |
| 2 | `ECHOCTL_PICK_FOLDER="$VAULTS/my-twin" obs new_vault '{"name":"My twin","git":true,"minutes":"auto"}'` | `{"id": "my-twin", "git": "committed", "written": 18, …}`; `left_out` names the 5 hidden files (`.claude/skills/…`, `.gitignore`, `knowledge/.obsidian/…`), each "is hidden: a plugin changes notes, not other programs' files"; `skills` `{"where": "vault", "installed": false, "why": "Echo doesn't let a plugin write a vault's .claude folder"}` |
| 3 | `(cd "$VAULTS/my-twin" && find . -path ./.git -prune -o -type f -print \| sort; git log --format='%cn \| %s'; git status --short)`; `head -3 "$VAULTS/my-twin/README.md"`; `grep -c '{{vault' -r "$VAULTS/my-twin" --exclude-dir=.git` | 18 files (AGENTS.md, CLAUDE.md, README.md, knowledge/CATALOG.md … log.md, raw_inbox/README.md); one commit `Echo (obsidian) \| Start the vault from Echo's twin starter`; nothing uncommitted; the README starts `# My twin` and names the owner as About me does ("Sam Rivera's knowledge vault"); no `{{vault.…}}` left |
| 4 | `obs view \| python3 -c 'import json,sys; v=[x for x in json.load(sys.stdin)["vaults"] if x["id"]=="my-twin"][0]; print(v["template"], v["commit"], v["minutes"]["mode"], v["detected"]["pages"], v["detected"]["index"], v["detected"]["notes"], v["detected"]["log"])'` | `twin@1 True auto knowledge knowledge/CATALOG.md knowledge/notes log.md` |
| 5 | `obs activity '{"id":"my-twin"}'` | One entry: `by` "starter", `kind` "new", `ref` "twin@1", its `commit` the first commit's id |
| 6 | `ECHOCTL_PICK_FOLDER="$VAULTS/acme-notes" obs new_vault '{"name":"Acme notes","minutes":"auto"}'`; the same for `globex-notes` ("Globex notes") | `git` "off", `written` 18 each (no git asked: commits off) |
| 7 | `ECHOCTL_PICK_FOLDER="$VAULTS/acme-wiki" obs new_vault '{"name":"Busy"}'` | Fails "… isn't empty — choose a new or empty folder"; acme-wiki unchanged |
| 8 | `echoctl plugin set obsidian skills global`; `mkdir -p "$VAULTS/scratch"`; `ECHOCTL_PICK_FOLDER="$VAULTS/scratch" obs new_vault '{"name":"Scratch"}' \| grep -A3 skills`; `obs remove '{"id":"scratch"}'`; `echoctl plugin set obsidian skills vault` | `skills`: `{"where": "global", "installed": false, "why": "Echo doesn't let a plugin write your ~/.claude/skills"}` — nothing written outside the vault |
