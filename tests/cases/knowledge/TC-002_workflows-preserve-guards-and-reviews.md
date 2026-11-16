---
id: TC-002
title: Knowledge workflows preserve guards and review decisions
priority: critical
type: functional
requirements: [F-KNP-04, F-KNP-05, F-KNP-06]
module: knowledge
run: agent
platform: [macos, windows]
data: synthetic Knowledge fixture and fake Claude
tags: [knowledge, plugins, guard]
---

| Action | Expected Result |
|---|---|
| Save synthetic call minutes to a vault, repeat, then change the saved note externally. | Receipt links work, repeat creates no duplicate, and regeneration preserves the user's edit. |
| Send Ask using fake Claude; choose a personal/vault skill and attach a page. | Streaming events and the reply appear; exact selected skill and context survive; Ask cannot write or use Bash. |
| Use the fixture's default AI profile on a synthetic vault, send a message, then stop and send again. | Both turns finish with an explicit simulated response; the default fixture cannot silently wait for a missing response script. No real model is contacted. |
| In Curate allow/deny an edit; stop and resume a conversation. | The native permission cards control writes and continuation retains the conversation. |
| Open the signed-out Microsoft 365 and synthetic call attachment pickers, then hand a prompt to a vault terminal using fake Claude. | Human UI pickers still work; the vault-keyed helper targets that vault's current live terminal. Raw terminal IDs and non-vault keys are refused. No real service is reached. |
| Add a synthetic source and prepare ingest changes with fake Claude. | Work happens on a scratch copy; the original vault stays unchanged until approval. |
| Approve/reject/edit changes, change a base externally, then apply. Leave one undecided while writing an edited change. | Only approved unchanged-base changes land; conflicts are visible and rejected changes stay absent. The Written card and the saved file both retain the exact user-approved text. |
| Run deterministic and fake AI health checks and inspect a fix. Apply a summary inserted after a heading which stays on the page. | Quotes are validated, fixes are diffs and changed bases cannot be overwritten. The applied insertion disappears from Health and cannot be applied twice. |

Real-account AI/Microsoft 365 and native Windows checks remain separate person gates.
