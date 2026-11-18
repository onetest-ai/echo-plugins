---
id: TC-046
title: Sources the user adds — files handed over copied as they are (never over a file, a safe name, (2) for a taken one), the folder made with its README, a call (another profile only "anyway"); a web page only by its address, with Echo's own reader (TC-059); the first open's question; a skip
priority: medium
type: functional
requirements: [F-OB-51]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, ingest, sources]
---

# TC-046: Sources the user adds

## Preconditions
- TC-045 done, `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`
- A made-up file to hand over: `mkdir -p "$VAULTS/handoff" && printf 'Made-up brief.\n' > "$VAULTS/handoff/Q3: brief?.txt"`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `rm -r "$VAULTS/globex-notes/raw_inbox"`; `obs reread '{"id":"globex-notes"}' > /dev/null`; `obs sources '{"vault":"globex-notes"}' \| grep -E '"(folder\|exists\|create)"'` | `"folder": "raw_inbox"`, `"exists": false`, `"create": "Echo will create raw_inbox/ with a README"` |
| 2 | `obs add_source '{"vault":"globex-notes","kind":"file"}' --file "$VAULTS/handoff/Q3: brief?.txt"` twice | `added[0].path` `raw_inbox/Q3- brief-.txt`, then `raw_inbox/Q3- brief- (2).txt`; `committed` "off" |
| 3 | `ls "$VAULTS/globex-notes/raw_inbox"`; `cmp "$VAULTS/handoff/Q3: brief?.txt" "$VAULTS/globex-notes/raw_inbox/Q3- brief-.txt" && echo same` | `Q3- brief- (2).txt`, `Q3- brief-.txt`, `README.md` (the preset's); `same`: byte for byte |
| 4 | `obs add_source '{"vault":"globex-notes","kind":"call","call":"2026-11-16_140000-globex-pilot-kickoff","transcript":true}'` | `path` `raw_inbox/echo/2026-11-16-globex-pilot-kickoff.md`; it ends with `## Transcript` and Echo's transcript |
| 5 | `obs set '{"id":"globex-notes","key":"profile","value":"system"}'`; `obs add_source '{"vault":"globex-notes","kind":"call","call":"2026-11-16_140000-globex-pilot-kickoff"}'`; the same with `"anyway":true`; `obs set '{"id":"globex-notes","key":"profile","value":""}'` | First `mismatch` `{"call": "work", "vault": "system"}` with its words, nothing written; then a source `… (2).md` (`anyway` kept in the ledger) |
| 6 | `obs add_source '{"vault":"globex-notes","kind":"web","url":"acme.example/notes"}'` | Fails "a web page by its address: http:// or https://" — nothing fetched (a page Echo reads: TC-059) |
| 7 | `printf 'old\n' > "$VAULTS/my-twin/raw_inbox/old-notes.txt"`; `obs sources '{"vault":"my-twin"}' \| grep -A3 '"offer"'`; `obs baseline '{"vault":"my-twin","done":true}'`; `obs sources '{"vault":"my-twin"}' \| grep '"offer"'` | The first open asks about the 1 file already there (`offer` `{"count": 1, "folder": "raw_inbox"}`); `{"marked": 1, "done": true}`; then `"offer": null` |
| 8 | `obs skip_source '{"vault":"globex-notes","path":"raw_inbox/Q3- brief- (2).txt","note":"A copy"}'`; `obs skip_source '{"vault":"globex-notes","path":"raw_inbox/README.md"}'`; `obs skip_source '{"vault":"globex-notes","path":"../my-twin/log.md"}'` | `{"path": "raw_inbox/Q3- brief- (2).txt", "state": "skipped"}`; the README and the path outside are refused |
| 9 | `rm -r "$VAULTS/handoff"` | — |
