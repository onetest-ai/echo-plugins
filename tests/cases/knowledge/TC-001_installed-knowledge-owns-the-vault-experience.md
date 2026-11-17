---
id: TC-001
title: Installed Knowledge owns the complete vault experience
priority: critical
type: functional
requirements: [F-KNP-01, F-KNP-02, F-KNP-03]
module: knowledge
run: agent
platform: [macos, windows]
data: synthetic Knowledge fixture
tags: [knowledge, plugins, migration]
---

| Action | Expected Result |
|---|---|
| Build Echo and install Knowledge from this marketplace in an isolated synthetic environment. | Package checks pass; the permission sheet describes the native vault operations and guarded AI runs. |
| Open Knowledge and connect the synthetic vault. | Home, Pages, Graph, Ask, Ingest, Health and Settings are available; connecting changes no vault files. |
| Read/search a page, follow a link and inspect the graph. Locate and toggle the switch named exactly `Show isolated pages`. | Titles, links, backlinks and graph match the fixture; hostile content stays text. The visible count badge remains, while the switch has a plain spoken label and toggles its checked state. |
| Call the plugin's agent `read` command for tree/page/health; try direct and encoded m365, calls, preview, jobs and terminal-resume routes. | Vault views work. UI-only routes are refused as not agent-readable before dispatch; no mail/chat, call text or terminal command is returned. |
| Open the vault's thread/client picker. | Existing choices show their names; the client context contains only project id/name/group and client id/name, with no notes, people, sources or briefs. |
| Edit and save a page; change it externally before a second save. | The first save persists; the second offers conflict handling and preserves the external edit. |
| Open each of the seven tabs and its main action. | No browser exceptions or broken controls; the installed plugin supplies the client files. |
| Open an existing #kn route and echo://page link. | The installed Knowledge view opens the same vault/page. |

The native Rust engine is retained. This case verifies a complete plugin-owned client, not removal of that engine.
