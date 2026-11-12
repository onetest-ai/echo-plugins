---
id: TC-002
title: Signed in with the computer's GitHub CLI — the section names the account and where the sign-in comes from; GitHub is read with it
priority: critical
type: functional
requirements: [F-GH-02]
module: github
run: agent
platform: any
data: standard
tags: [github, signin]
---

# TC-002: The computer's GitHub CLI sign-in

## Preconditions
- The environment from `up.sh`: the fake `gh` signed in as ada-acme

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open `{{base_url}}/#settings/github:main` (Settings → From plugins → GitHub) | The section "GitHub": a row "@ada-acme", "With the GitHub CLI’s sign-in on this computer. Echo only reads GitHub; it never changes anything there.", "Ready ✓"; no field to paste a token; no "!" on GitHub in the Settings list |
| 2 | `echoctl plugin call github status` | `signedIn` true, `from` "gh", `login` "ada-acme" |
| 3 | `curl -s $FAKE_GITHUB/_log` | GraphQL requests seen (`query Discover`, `query GitHub`); the fake answered them (it answers 401 to any other token) |
