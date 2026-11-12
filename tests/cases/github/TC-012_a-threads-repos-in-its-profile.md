---
id: TC-012
title: A thread's GitHub repos in its Profile — offered from the repos you worked on lately, added by name, taken off; kept per thread; Claude told while the thread is open
priority: high
type: functional
requirements: [F-GH-16, F-GH-17]
module: github
run: agent
platform: any
data: standard
tags: [github, threads]
---

# TC-012: A thread's repos

## Preconditions
- The environment from `up.sh`, signed in (gh); the standard data's threads Acme rollout (`acme-rollout`) and Globex pilot (`globex-pilot`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open `{{base_url}}/#project/acme-rollout/profile` | Under its Sources, a row "GitHub": "No repos yet: their pull requests and issues show in this thread’s Work, and Claude knows them here.", `+` chips for the repos you worked on lately (acme-test/api first) and "+ Another repo" |
| 2 | Click "+ acme-test/api" | A chip "acme-test/api ×" with GitHub's mark; acme-test/api no longer offered |
| 3 | "+ Another repo", type `acme-test`, Enter | "a thread's repo is written owner/repo: acme-test"; no chip added |
| 4 | `cat "$ECHOCTL_CONFIG_DIR/plugins/hints/github.json"` | A hint for thread `acme-rollout`: "This thread's GitHub repos: acme-test/api. Read their pull requests, issues and CI with the GitHub CLI (gh) when asked." |
| 5 | Open `{{base_url}}/#project/globex-pilot/profile` | Its GitHub row has no repos (each thread keeps its own) |
| 6 | Back on Acme rollout's Profile, add `acme-test/web` and take it off again (×) | The chip comes and goes; `echoctl plugin call github threadRepos '{"thread":"acme-rollout"}'` → `["acme-test/api"]` |
