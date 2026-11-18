---
id: TC-057
title: The twin skill for every Claude Code session — shown first, added to your own Claude Code only on your click (Install, Update…, Remove), one name a vault, never over a skill that is there already, its record forgotten when Echo no longer has it; on test data only in the test's own Claude Code folder
priority: high
type: functional
requirements: [F-OB-64, F-OB-41]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, skills, twin, window]
---

# TC-057: The twin skill in your own Claude Code, on a click

## Preconditions
- TC-038 done (my-twin has its own `.claude/skills/twin`), `. <dir>/env`; `<base_url>` the window; headless Playwright
- Before any step: `case "$CLAUDE_CONFIG_DIR" in "<dir>"/*) ;; *) exit 1;; esac` and `ECHOCTL_TEST_OPEN_LOG_ONLY` set — Echo writes a
  plugin's skill only into the test's own Claude Code folder on test data (it refuses when none is set); never `~/.claude`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `#obsidian:knowledge/my-twin/settings` → Skills | The row "Use /twin from any Claude Code session": "A copy of this vault's twin skill with its paths, in ~/.claude/skills/my-twin/ — shown first, yours to remove.", *Install…* |
| 2 | *Install…* | The sheet "Use /twin from any Claude Code session": Name `my-twin`, "This vault's own twin skill, its paths made absolute to the vault…", the whole file: `name: my-twin`, the description, a line "Echo's copy of the twin skill of the vault “My twin” (my-twin)", paths `<the vault>/knowledge/…`; *Install* |
| 3 | *Install* | "/my-twin is in your Claude Code: ~/.claude/skills/my-twin/SKILL.md."; the row: "installed as /my-twin", *Update…*, *Remove*; `cat "$CLAUDE_CONFIG_DIR/skills/my-twin/SKILL.md"` is the file shown; `cat "$ECHOCTL_CONFIG_DIR/plugins/claude-skills.json"` `{"my-twin": "obsidian"}`; `ls ~/.claude/skills/my-twin` — no such folder |
| 4 | *Remove* | "/my-twin is out of your Claude Code."; the row offers *Install…* again; `$CLAUDE_CONFIG_DIR/skills` empty, the record `{}` |
| 5 | A made-up skill of the user's own: `mkdir -p "$CLAUDE_CONFIG_DIR/skills/my-twin"` and a `SKILL.md` in it ("Mine."); *Install…* → *Install* | The sheet says "your Claude Code has a skill “my-twin” already: Knowledge doesn't change it"; the user's file as it was; then remove that made-up folder by its literal path |
| 6 | `echoctl plugin set obsidian skills global`; `mkdir -p "$VAULTS/solo"`; New vault in the window is the system's folder picker (not pressed): `ECHOCTL_PICK_FOLDER="$VAULTS/solo" echoctl plugin call obsidian new_vault '{"name":"Solo"}'`, then `#obsidian:knowledge/solo/settings`; `echoctl plugin set obsidian skills vault` | `skills.offer` "twin" and no `.claude/skills/twin` in the vault; its Settings → Skills has the row with *Install…* (the vault made from the twin preset) |
| 7 | my-twin: *Install…* → *Install* (as /my-twin), then *Update…*, the name typed `my-notes`, *Install* | The sheet says "Installed now as /my-twin: Install takes that one out and adds /my-notes."; after it "/my-notes is in your Claude Code…"; `ls "$CLAUDE_CONFIG_DIR/skills"` only `my-notes`, Echo's record `{"my-notes": "obsidian"}` — one name a vault |
| 8 | acme-notes (a twin-preset vault): *Install…*, the name `my-notes` | "/my-notes is My twin's twin skill already: choose another name."; *Install* off; its own default is `acme-notes-twin` (never another vault's) |
| 9 | `echoctl plugin remove obsidian` (data kept) — Echo takes its skills out; `echoctl plugin install obsidian --from local --yes`; my-twin's folder given again (`ECHOCTL_PICK_FOLDER="$VAULTS/my-twin" obs add '{"wait":true}'` → `"already": true`); my-twin → Skills | The row still says "installed as /my-notes" (Knowledge's own record kept with its data); *Remove* → "/my-notes was no longer in your Claude Code (removed with the plugin, or by you): forgotten here." and *Install…* again — Echo's "isn't a skill Knowledge added" understood |
