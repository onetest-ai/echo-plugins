---
id: TC-004
title: Knowledge works in the native desktop with the user's connected services
priority: critical
type: functional
requirements: [F-KNP-01, F-KNP-04, F-KNP-05, F-KNP-06]
module: knowledge
run: person
platform: [macos, windows]
data: isolated test vault and accounts the person explicitly chooses
tags: [knowledge, plugins, native, accounts]
---

Run after the synthetic TC-001..003 journey passes, using the matching Echo build and Knowledge package. Record
macOS and Windows separately; a cross-compile or hosted browser cannot pass the native desktop steps.

| Action | Expected Result |
|---|---|
| Install Knowledge through Settings → Plugins in an isolated native Echo instance; open all seven tabs. | The installed client and stylesheet load, controls work, and there are no plugin errors. |
| Connect a test folder through the system picker; add a test file through the picker and by dragging it onto Ingest. | The chosen paths reach the native engine; connecting leaves existing notes unchanged; imported files enter the selected vault only. |
| Open an `echo://page` link and open a note in Obsidian when Obsidian is installed. | Native routing opens the expected vault/page; the optional Obsidian action resolves the same note. |
| Use the explicitly chosen signed-in AI profile for Ask, Curate, Research, Ingest and Health. Allow and deny a harmless proposed test edit. | Real streaming/protocol events work, the pinned profile is used, and native permissions/review decisions control writes. |
| With Microsoft 365 explicitly connected for the test, import a made-up mail and Teams source. | Selected source content is imported into the chosen vault; failure or no sign-in has a clear message. |
| Continue an Ask conversation in the native terminal, then disable Knowledge. | The terminal opens the correct vault/session and closes with the plugin's native jobs; user files remain. |

Do not include real meeting text, tokens or account identities in retained evidence. Real recording/capture qualification
is covered by Echo's existing person cases and is not established by this plugin case.
