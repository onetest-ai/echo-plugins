---
id: TC-011
title: On real GitHub with your own gh sign-in — your organisations are found, and CI and counts match github.com
priority: high
type: functional
requirements: [F-GH-15]
module: github
run: person
platform: macos
data: none
tags: [github, real]
---

# TC-011: Real GitHub (a person, once per release)

## Preconditions
- A person's own computer, signed in with `gh auth login`; an Echo with `uses.signin`; the plugin installed from this checkout

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Settings → From plugins → GitHub | "@<you>", "With the GitHub CLI’s sign-in on this computer"; your organisations offered with their repo counts; your recent repos |
| 2 | Pick one organisation and one repo outside it; put the three widgets on Today | Each repo's CI, open PRs and reviews match its page on github.com (the default branch's last checks; Pull requests; "Review requests" in github.com/pulls) |
| 3 | `gh auth logout`; "Refresh now" | The section says to sign in; widgets keep the last answer, dated |
| 4 | `gh auth login` again; "Check again" | Signed in again |
