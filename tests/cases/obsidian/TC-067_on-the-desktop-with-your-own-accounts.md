---
id: TC-067
title: In the native desktop with your own accounts — the system's pickers and a file dropped on Ingest, Open in Obsidian, Ask the vault, an Ingest run and AI checks on your signed-in Claude Code, mail and Teams from your Microsoft 365
priority: critical
type: functional
requirements: [F-OB-71]
module: obsidian
run: person
platform: [macos, windows]
data: an isolated test vault and the accounts the person chooses
tags: [obsidian, knowledge, native, accounts, from-17]
---

# TC-067: On the desktop with your own accounts (a person, once per release)

From onetest-ai/echo-plugins#17's `tests/cases/knowledge/TC-004`: the parts no headless window or fake can run.
TC-066 runs the rest with Echo's stand-ins. Record macOS and Windows separately; keep no real meeting text, token or
account name in the evidence.

## Preconditions
- The Echo release Knowledge asks for (0.10.0 or later), installed on the person's computer, a data folder of its own
  for the test; a made-up vault (a copy of `tests/fixtures/obsidian`'s acme-twin is fine) and no real notes
- Obsidian installed (for step 3); a Claude Code signed in on an AI profile chosen for the test; Microsoft 365 connected
  for the test (step 6)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Settings → Plugins → Knowledge → *Install*; open each tab | The sheet as TC-001 says; the activity and its stylesheet load; no plugin error |
| 2 | *Connect a folder…* → *Choose…* (the system's picker) → the test vault | The folder chosen reaches Knowledge; "nothing in its folder changed" holds (`git status` clean) |
| 3 | Ingest → *Add a source* → *Files* → *Choose…* a made-up file; then drag another made-up file onto Ingest | Both land in that vault's `raw_inbox/` only, as they were |
| 4 | ⋯ → *Open in Obsidian*; a page → *Obsidian* | Obsidian opens the vault, then that page |
| 5 | *Ask the vault*; ask "What is in this vault?" | Claude Code in Echo's panel, in the vault as its own project, on the test's AI profile; it reads only and asks before anything else |
| 6 | Ingest → *Add a source* → *Mail or Teams*: a made-up mail and a Teams chat the person sent themselves for the test | Each added as a source of that vault; signed out, the sheet says to sign in |
| 7 | *Prepare changes* on the added sources; approve one change, reject one | The run on a copy on the profile chosen; only the approved change written, in one commit |
| 8 | Health → *Run AI checks* | A check on the signed-in profile; each kept finding's quotes are on its pages; *Stop* ends it |
| 9 | With the panel's session open, Settings → Plugins → Knowledge → off | The running session stays (it is yours) and its tab goes once it ends; Knowledge leaves the window; the vault's files stay |

## Clean up
Remove the test vault from Knowledge; delete the test data folder; sign the test profile out if it was made for this.
