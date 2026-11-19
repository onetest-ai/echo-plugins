---
id: TC-038
title: The twin preset makes a new vault in an empty folder — its files filled in, its .gitignore, skills (Echo #776) and Obsidian's settings for knowledge/ (#781) too, one first commit by Echo, registered as twin@1 with commits on; the setting "global" offers the twin skill for the user's own Claude Code instead
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
| 1 | `obs starter_files` | The 24 files of the preset (#677's 23 and `knowledge/people/README.md`, Knowledge 1.1): `.claude/skills/process-inbox/SKILL.md`, `.claude/skills/twin/SKILL.md`, `AGENTS.md` … `gitignore`, `knowledge/.obsidian/app.json` … `raw_inbox/README.md` |
| 2 | `ECHOCTL_PICK_FOLDER="$VAULTS/my-twin" obs new_vault '{"name":"My twin","git":true,"minutes":"auto"}'` | `{"id": "my-twin", "git": "committed", "written": 24, …}`; `left_out` `[]` — all 24 written, `knowledge/.obsidian/app.json` and `templates.json` too (Echo #781); `skills` `{"where": "vault", "in_vault": [".claude/skills/process-inbox/SKILL.md", ".claude/skills/twin/SKILL.md"], "offer": null, "why": null}` |
| 3 | `(cd "$VAULTS/my-twin" && find . -path ./.git -prune -o -type f -print \| sort; git log --format='%cn \| %s'; git status --short; git ls-files \| grep '^\.')`; `cmp "$VAULTS/my-twin/.claude/skills/twin/SKILL.md" plugins/obsidian/starter/twin/.claude/skills/twin/SKILL.md && echo same`; `head -3 "$VAULTS/my-twin/README.md"`; `grep -c '{{vault' -r "$VAULTS/my-twin" --exclude-dir=.git` | 24 files (`.claude/skills/process-inbox/SKILL.md`, `.claude/skills/twin/SKILL.md`, `.gitignore`, AGENTS.md, CLAUDE.md, README.md, `knowledge/.obsidian/app.json`, `knowledge/.obsidian/templates.json`, knowledge/CATALOG.md … `knowledge/people/README.md` … log.md, raw_inbox/README.md); the five hidden ones in git; `same`: the skill as the plugin ships it; one commit `Echo (obsidian) \| Start the vault from Echo's twin starter`; nothing uncommitted; the README starts `# My twin` and names the owner as About me does ("Sam Rivera's knowledge vault"); no `{{vault.…}}` left |
| 4 | `obs view \| python3 -c 'import json,sys; v=[x for x in json.load(sys.stdin)["vaults"] if x["id"]=="my-twin"][0]; print(v["template"], v["commit"], v["minutes"]["mode"], v["detected"]["pages"], v["detected"]["index"], v["detected"]["notes"], v["detected"]["log"])'` | `twin@1 True auto knowledge knowledge/CATALOG.md knowledge/notes log.md` |
| 5 | `obs activity '{"id":"my-twin"}'` | One entry: `by` "starter", `kind` "new", `ref` "twin@1", its `commit` the first commit's id |
| 6 | `ECHOCTL_PICK_FOLDER="$VAULTS/acme-notes" obs new_vault '{"name":"Acme notes","minutes":"auto"}'`; the same for `globex-notes` ("Globex notes") | `git` "off", `written` 24 each (no git asked: commits off) |
| 7 | `ECHOCTL_PICK_FOLDER="$VAULTS/acme-wiki" obs new_vault '{"name":"Busy"}'` | Fails "… isn't empty — choose a new or empty folder"; acme-wiki unchanged |
| 8 | `echoctl plugin set obsidian skills global`; `mkdir -p "$VAULTS/scratch"`; `ECHOCTL_PICK_FOLDER="$VAULTS/scratch" obs new_vault '{"name":"Scratch"}' \| grep -A6 skills`; `ls "$VAULTS/scratch/.claude/skills" "$CLAUDE_CONFIG_DIR/skills" 2>&1`; `obs remove '{"id":"scratch"}'`; `echoctl plugin set obsidian skills vault` | `skills`: `{"where": "global", "in_vault": [".claude/skills/process-inbox/SKILL.md"], "offer": "twin", …}` — only `process-inbox` in the vault (Ingest needs it there); the twin skill is offered for your own Claude Code, never written by the host (nothing in the test's Claude Code folder; the window adds it on a click: TC-057) |
