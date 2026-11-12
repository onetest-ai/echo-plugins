---
id: TC-001
title: Installed from a marketplace — the sheet says it uses the computer's GitHub sign-in, talks to api.github.com, tells Claude about a thread, adds items to My work and threads' Work and 3 widgets; no plain settings card
priority: high
type: functional
requirements: [F-GH-01, F-GH-02]
module: github
run: agent
platform: any
data: standard
tags: [github, install]
---

# TC-001: The install sheet and the install

## Preconditions
- The environment from `tests/fixtures/github/up.sh` (it installed the plugin; its sheet is in `<dir>/install.log`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `cat <dir>/install.log` | The sheet lists "Runs its own code in Echo and in the Echo window, with your rights", "Talks to api.github.com and github.com over HTTPS", "Tells Claude what it knows about the client or thread open in the window", "Gets the sign-in saved on this computer for github.com (GitHub CLI or git): it can act as you there and send it to the places it talks to; it may sign you in to github.com itself and have Echo keep that sign-in for it" (an Echo before onetest-ai/echo#488 says only the part before the ";"), "Adds its items to Today → My work and to threads' Work", "Adds 3 widgets you can put on Today"; "Installed GitHub 0.2.1" (on an Echo built from source older by its number than the plugin asks, `up.sh` says it installed a copy matching it) |
| 2 | `echoctl plugin list` | GitHub 0.2.1 installed from "local", enabled, no error |
| 3 | Open `{{base_url}}/#settings/plugins/github` | GitHub's page: its name, version, summary; **no** "Its settings" card and no input for a token anywhere on the page |
| 4 | `echoctl widget list` | `plugin:github:repos` (list), `plugin:github:ci` (status), `plugin:github:glance` (stats), part "GitHub" |
