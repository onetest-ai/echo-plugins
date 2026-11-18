---
id: TC-060
title: Pages are read strictly — one that isn't UTF-8 is shown as Echo reads it and can't be edited; a version restored only when UTF-8; links resolved by how Echo says each was written
priority: high
type: functional
requirements: [F-OB-66]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, pages, encoding, links]
---

# TC-060: Pages read strictly, links as Echo reads them

## Preconditions
- `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`; acme-twin connected
  (`ECHOCTL_PICK_FOLDER="$VAULTS/acme-twin" obs add '{"wait":true}'`)
- A made-up page in another encoding, as an old editor would leave it: `printf -- '# \xcf\xf0\xe8\xe2\xe5\xf2\n' > "$VAULTS/acme-twin/knowledge/topics/legacy-1251.md"`
  (cp1251), and a page linking one page both ways: `printf -- '# Both\n\n[[acme]] and [Acme](../clients/acme.md) and [[Nowhere]].\n' > "$VAULTS/acme-twin/knowledge/topics/both.md"`;
  `obs reread '{"id":"acme-twin"}'`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs page '{"id":"acme-twin","path":"topics/legacy-1251.md"}' \| python3 -c 'import json,sys; p=json.load(sys.stdin); print(p["editable"], p["utf8"], repr(p["html"]))'` | `False False` and the page's HTML with U+FFFD where the bytes aren't UTF-8 — shown as Echo reads it, never editable; in the window its *Edit* is off, titled "Not UTF-8 text: shown as Echo reads it, read only" |
| 2 | `obs save_page '{"id":"acme-twin","path":"topics/legacy-1251.md","text":"# x\n","base":"<the page's base>"}'` | Fails "topics/legacy-1251.md isn't UTF-8 text, so Echo doesn't edit it"; `xxd` of the file unchanged |
| 3 | `obs page '{"id":"acme-twin","path":"topics/both.md"}' \| python3 -c 'import json,sys; print(json.load(sys.stdin)["html"])'` | Both links to acme lead to `#obsidian:knowledge/acme-twin/pages/clients/acme.md`; `Nowhere` is `<a class="md-missing" data-md-missing="Nowhere" …>` (a page not written yet) |
| 4 | The page in the window (`#obsidian:knowledge/acme-twin/pages/topics%2Fboth.md`), a click on *Nowhere* | Pages opens acme.md for the first two; *Nowhere* offers to create the page |
| 5 | TC-019's acme-history: restore `legacy.md`'s first version (not UTF-8) | Refused, "isn't UTF-8 text, so Echo doesn't restore it" (Echo's strict read) |
