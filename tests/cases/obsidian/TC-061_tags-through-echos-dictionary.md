---
id: TC-061
title: Tags through Echo's dictionary — Health's tag fix offers the dictionary's tag first, an Ingest run's pages take the dictionary's names (said on the change), the vault's taxonomy winning; nothing added to the dictionary
priority: high
type: functional
requirements: [F-OB-67]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, knowledge, health, ingest, dictionary, tags]
---

# TC-061: Tags through Echo's dictionary

## Preconditions
- `. <dir>/env`, `obs() { echoctl plugin call obsidian "$@"; }`; acme-twin connected
  (`ECHOCTL_PICK_FOLDER="$VAULTS/acme-twin" obs add '{"wait":true}'`), its taxonomy `meeting, client, concept`
- `up.sh`'s made-up dictionary (Settings → Vocabulary): Concept (also "idea"), Client (also "customer"), Control Plane
  (also "CP", spelled "controlplane"); `echoctl intake taxonomy show | grep -c '"name"'` counts them
- A page the user wrote with tags the taxonomy doesn't allow: `printf -- '---\ntitle: Plan\ntags: [idea, customer]\n---\n# Plan\n\nSee [[acme]].\n' > "$VAULTS/acme-twin/knowledge/topics/plan.md"`
- For the Ingest run (`<dir>/fake-ingest.json`, the cases' fake Claude Code): `{"write": {"knowledge/topics/ship.md": "---\ntitle: Ship the rollout\ntags: [idea, customer]\n---\n# Ship the rollout\n\nThe #controlplane ships in May.\n"}, "changes": {"changes": [{"path": "knowledge/topics/ship.md", "why": "The page the rollout plan describes", "quotes": [{"source": "<a source of the vault>", "text": "…"}]}]}}`

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `obs health '{"id":"acme-twin"}' \| grep -o 'unknown_tag:knowledge/topics/plan.md:#[a-z]*'` | `#idea` and `#customer`: tags the taxonomy doesn't allow |
| 2 | `obs health_finding '{"id":"acme-twin","key":"unknown_tag:knowledge/topics/plan.md:#idea"}' \| python3 -c 'import json,sys; print([(c["choice"], c["label"]) for c in json.load(sys.stdin)["choices"]])'` | First `('tag:concept', "Use #concept — Concept in Echo's dictionary")`, then `#meeting`, `#client` (the one it already is left out), *Open the taxonomy to add it* |
| 3 | The finding in the window (Health → *A tag the taxonomy doesn't allow* → plan.md's #idea) | Its fix's choices list *Use #concept — Concept in Echo's dictionary* first; nothing is written until a choice is fixed |
| 4 | `obs ingest_go '{"id":"acme-twin","sources":["<a source>"],"wait":true}'`; `obs ingest_changes '{"id":"acme-twin","run":"<run>"}'` → ship.md's `retagged`; `obs ingest_text … ship.md` | `retagged` `idea → concept` and `customer → client` (each with its term); the run's text `tags: [concept, client]` — `#controlplane` left (the taxonomy allows no tag for it: Health's to say) |
| 5 | The run in the window (`#obsidian:knowledge/acme-twin/ingest/<run>`) | ship.md's change says "Tags as Echo's dictionary names them: #idea → #concept, #customer → #client." under its diff |
| 6 | `echoctl intake taxonomy show \| grep -c '"name"'` | The same count as before: Knowledge only reads the dictionary |
| 7 | Remove plan.md (`rm "$VAULTS/acme-twin/knowledge/topics/plan.md"`) and `<dir>/fake-ingest.json`; discard the run | — |
