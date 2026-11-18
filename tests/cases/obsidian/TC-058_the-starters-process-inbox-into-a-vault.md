---
id: TC-058
title: A vault without an ingest skill gets the starter's process-inbox on the user's word — its text shown first, written whole into .claude/skills/process-inbox/, found at once; never over one that is there
priority: high
type: functional
requirements: [F-OB-41]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, ingest, skills, window]
---

# TC-058: The starter's process-inbox into a vault

## Preconditions
- `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`; acme-wiki (no skills of its own) connected:
  `ECHOCTL_PICK_FOLDER="$VAULTS/acme-wiki" obs add '{"wait":true}'`; `<base_url>` the window; headless Playwright

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `#obsidian:knowledge/acme-wiki/ingest` | The foot: "This vault has no ingest skill, so nothing can be prepared yet." with *Add the starter's process-inbox…* |
| 2 | *Add the starter's process-inbox…* | The sheet: "Echo writes only .claude/skills/process-inbox/SKILL.md." and the skill's whole text (`name: process-inbox`, its description…) |
| 3 | *Add process-inbox* | "process-inbox is in the vault: .claude/skills/process-inbox/SKILL.md."; *Prepare changes* is there; `cmp "$VAULTS/acme-wiki/.claude/skills/process-inbox/SKILL.md" plugins/obsidian/starter/twin/.claude/skills/process-inbox/SKILL.md && echo same` → `same` |
| 4 | `obs ingest_queue '{"id":"acme-wiki"}' \| grep -A3 '"skill"'`; `obs activity '{"id":"acme-wiki"}' \| grep -B2 -A3 process-inbox` | `skill` `{"name": "process-inbox", "path": ".claude/skills/process-inbox/SKILL.md", …}` — found without reading the folder again by hand; an activity line `by` "starter", `kind` "new" |
| 5 | `obs ingest_skill '{"id":"acme-wiki"}'` | Fails "This vault already has a process-inbox skill"; the file as it was |
