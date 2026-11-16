---
id: TC-003
title: Disabling and removing Knowledge retain user vaults
priority: critical
type: functional
requirements: [F-KNP-07, F-KNP-08]
module: knowledge
run: agent
platform: [macos, windows]
data: synthetic Knowledge fixture
tags: [knowledge, plugins, lifecycle]
---

| Action | Expected Result |
|---|---|
| Open a page, make an unsaved edit, then disable Knowledge. | The draft is retained; listeners/styles/overlays and native jobs are cleaned up. |
| Visit Knowledge routes while disabled and try its native plugin service from an undeclared plugin. | An actionable unavailable state appears; unauthorized service access is refused. |
| Generate synthetic minutes while disabled. | No Knowledge automatic export/ingest starts; recording/minutes and Recall remain independent. |
| Enable Knowledge without restarting the served window. | All tabs return once; the existing registry, receipts and draft remain usable. |
| Remove and reinstall the package. | User-owned vault files, native registry and receipts survive; no duplicate handlers or automatic writers. |
| Install the existing Obsidian plugin alongside Knowledge. | Its separate features continue to work; neither plugin reads the other's private store. |
