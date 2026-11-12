---
id: TC-001
title: Installed from a marketplace — the sheet says it uses the computer's GitHub sign-in, talks to api.github.com and adds 3 widgets; no plain settings card
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
| 1 | `cat <dir>/install.log` | The sheet lists "Runs its own code in Echo and in the Echo window, with your rights", a line saying it uses your sign-in to github.com on this computer (GitHub CLI or git), "Talks to api.github.com over HTTPS", "Adds 3 widgets you can put on Today"; "Installed GitHub 0.1.0" |
| 2 | `echoctl plugin list` | GitHub 0.1.0 installed from "local", enabled, no error |
| 3 | Open `{{base_url}}/#settings/plugins/github` | GitHub's page: its name, version, summary; **no** "Its settings" card and no input for a token anywhere on the page |
| 4 | `echoctl widget list` | `plugin:github:repos` (list), `plugin:github:ci` (status), `plugin:github:glance` (stats), part "GitHub" |
