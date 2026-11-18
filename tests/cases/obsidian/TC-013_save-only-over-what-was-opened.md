---
id: TC-013
title: An edit is saved only over the text it was opened with: a change made meanwhile is a conflict, never written over; CRLF is kept; a page that isn't UTF-8 is read only; each save is in the activity log
priority: critical
type: functional
requirements: [F-OB-14, F-OB-20]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, edit]
---

# TC-013: Save only over what was opened

## Preconditions
- The environment from `up.sh` (Echo built from source), `. <dir>/env`, and `obs() { echoctl plugin call obsidian "$@"; }`
- `T="$VAULTS/acme-twin"` (twin-shaped, its pages in `knowledge/`, a git repository), `W="$VAULTS/acme-wiki"` (its pages
  at its root, no git)

- TC-008 done; acme-twin's `commit` off (its default)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `B=$(obs page '{"id":"acme-twin","path":"topics/rollout.md"}' \| python3 -c 'import json,sys; print(json.load(sys.stdin)["base"])')`; then, as Obsidian would, `printf -- '---\ntitle: Rollout by region\ntags: [concept]\n---\n# Rollout by region\n\nEU first, then the US, then APAC. See [[acme]].\n' > "$T/knowledge/topics/rollout.md"` | — |
| 2 | `obs save_page "{\"id\":\"acme-twin\",\"path\":\"topics/rollout.md\",\"text\":\"# Mine\\n\",\"base\":\"$B\"}"`; `cat "$T/knowledge/topics/rollout.md"` | `{"conflict": true, "base": <another sha>, "text": <the file with "then APAC">}`; the file is still Obsidian's |
| 3 | `save_page` again with `base` from step 2's answer and `text` "…EU first, then the US. See [[acme]].\nAPAC in 2027.\n" | `{"path": "topics/rollout.md", "pages": "knowledge", "base": <a new sha>, "commit": "off"}`; the file has the new text |
| 4 | `printf '# A\r\n\r\nline\r\n' > "$W/crlf.md"`; read its `base` with `obs page`, `save_page` `text` "# A\n\nline two\n"; `xxd "$W/crlf.md"` | Saved; every line still ends `0d 0a` |
| 5 | `printf '# Caf\xe9\n' > "$W/latin.md"`; `obs page '{"id":"acme-wiki","path":"latin.md"}'`; `save_page` with its `base` | `editable` false, `utf8` false, `text` null, `html` the page as Echo reads it (U+FFFD for the byte: `<h1>Caf�</h1>`, TC-060); the save fails "latin.md isn't UTF-8 text, so Echo doesn't edit it"; `xxd` shows `e9` still |
| 6 | `obs activity '{"id":"acme-twin"}'`; `obs activity '{"id":"acme-wiki"}'` | acme-twin: one line `{path: "knowledge/topics/rollout.md", kind: "edit", by: "editor", plus: 2, minus: 1, commit: null}` (the conflict wrote nothing); acme-wiki: one line for crlf.md |
| 7 | `(cd "$T" && git checkout -- knowledge/topics/rollout.md)`; `rm "$W/crlf.md" "$W/latin.md"` | The vaults as they were |
