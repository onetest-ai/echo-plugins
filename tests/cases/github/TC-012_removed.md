---
id: TC-012
title: Removed — its section and widgets leave Echo
priority: medium
type: functional
requirements: [F-GH-14]
module: github
run: agent
platform: any
data: standard
tags: [github, uninstall]
---

# TC-012: Removing the plugin (last)

## Preconditions
- The other agent cases done

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin remove github`; restart the served window (`tests/fixtures/github/down.sh <dir>` kills it; start it again as `up.sh` does, or end the run here and check with the CLI) | "Removed GitHub" |
| 2 | `echoctl widget list`; `echoctl today show` | No `plugin:github:` widget in the catalog; Today's layout may still list them — Echo keeps a widget's place while its plugin is off or gone — and Today draws nothing for them |
| 3 | `{{base_url}}/#settings` (after the restart) | No "GitHub" under "From plugins" |
