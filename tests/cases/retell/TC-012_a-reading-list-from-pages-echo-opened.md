---
id: TC-012
title: A reading list is picked only from pages Echo opened — a page that is gone never in it — and kept in Library
priority: high
type: functional
requirements: [F-RT-13, F-RT-17]
module: retell
run: agent
platform: any
data: standard
tags: [retell, reading-lists, web]
---

# TC-012: A reading list is picked only from pages Echo opened — a page that is gone never in it — and kept in Library

## Preconditions
- The environment of TC-003

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | In the window's page: `lpack_make` `{topic: 'evaluating agents', size: 'short'}`; wait for `lpack_get` ready | Its items are pages of docs.acme-test.example that the fake served; `/posts/gone.html` was asked for and is not among them |
| 2 | `lpack_keep`; Library | A topic "Evaluating agents" with the items |
