---
id: TC-019
title: Claude in Echo is told what the GitHub plugin gives — its part laid out in .plugins/github/ (the widgets and how to read them, GitHub's rows, a thread's repos, where the user manages it) and its row in the core
priority: medium
type: functional
requirements: [F-GH-22]
module: github
run: agent
platform: any
data: standard
tags: [github, claude-code, sessions]
---

# TC-019: Claude in Echo is told the plugin is there

## Preconditions
- The environment from `up.sh`, signed in (gh), before TC-017 (the plugin installed); an Echo with a plugin's part for Claude (0.9.9, onetest-ai/echo#583)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `P="$ECHOCTL_HOME/.plugins/github"`; `ls -a "$P"`; `head -1 "$P/CLAUDE.md"`; `grep -c 'CLAUDE_PLUGIN_ROOT' "$P/CLAUDE.md"` | `$P` holds `CLAUDE.md`, `scripts` and Echo's `.echo-layout.json`; the file starts "# GitHub"; no `${CLAUDE_PLUGIN_ROOT}` left (0) |
| 2 | `grep -o "[^\`]*/scripts/echoctl widget show plugin:github:<widget>" "$P/CLAUDE.md"`; `grep -E '^  - `(repos|ci|glance)`' "$P/CLAUDE.md"`; `grep -c 'Settings → From plugins → GitHub' "$P/CLAUDE.md"` | The widgets' CLI is `$P/scripts/echoctl widget show plugin:github:<widget>` with `$P` written out; the widgets `repos`, `ci`, `glance` each with what it shows; the Settings section named (1) |
| 3 | `"$P/scripts/echoctl" widget show plugin:github:glance` (the launcher runs this build: `ECHOCTL_BIN="$(command -v echoctl)"` first) | The same `data` as `echoctl widget show plugin:github:glance` run directly (on a fresh environment, nothing picked: "Pick a repo to watch"; after TC-005: CI failing, open PRs, reviews for you from the fake GitHub) |
| 4 | `echoctl core` | The row `\| GitHub \| The user's GitHub as Echo reads it: CI, open pull requests and reviews for the repos they picked — the widgets' data, GitHub's rows in My work and a thread's Work, a thread's repos \| `.plugins/github/CLAUDE.md` \|` |

## Expected Final State
Unchanged: the plugin installed, its part laid out.
