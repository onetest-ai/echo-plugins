---
id: TC-017
title: Removing the plugin with its data takes its store
priority: high
type: functional
requirements: [F-RT-19]
module: retell
run: agent
platform: any
data: standard
tags: [retell, remove]
---

# TC-017: Removing the plugin with its data takes its store

## Preconditions
- Run last

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin remove retell --delete-data` | Removed; `$S` is gone |
