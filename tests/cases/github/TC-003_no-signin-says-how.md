---
id: TC-003
title: No GitHub sign-in on the computer — the section says how to sign in, Check again picks it up; widgets ask to sign in; GitHub isn't asked meanwhile
priority: high
type: functional
requirements: [F-GH-03, F-GH-02]
module: github
run: agent
platform: any
data: standard
tags: [github, signin]
---

# TC-003: Signed out, then signed in again

## Preconditions
- The environment from `up.sh`; TC-002 passed

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `mv "$FAKE_GH_TOKEN_FILE" "$FAKE_GH_TOKEN_FILE.off"`; note the count of `curl -s $FAKE_GITHUB/_log` entries; in the section press "Refresh now" | The sign-in row becomes "Sign in to GitHub" — "Echo uses the GitHub sign-in this computer already has (`gh auth login`), or sign in here: you confirm a code on github.com, and Echo keeps that sign-in for this plugin." — with "Sign in with GitHub" and "Check again" (an Echo that can't keep a sign-in, before onetest-ai/echo#488: "Sign in to GitHub on this computer" — "Echo uses the sign-in you already have here. Run `gh auth login` in a terminal, then check again." — with "Check again" only); GitHub in the Settings list shows "!" |
| 2 | `echoctl widget show plugin:github:ci` | `data.text` asks to sign in to GitHub on this computer (gh auth login); `state` "warn" |
| 3 | `curl -s $FAKE_GITHUB/_log` | No new request since step 1 |
| 4 | `mv "$FAKE_GH_TOKEN_FILE.off" "$FAKE_GH_TOKEN_FILE"`; press "Check again" | "@ada-acme", "Ready ✓"; the "!" is gone |
| 5 | Put a made-up token in the fake git's file and take gh's away: `cp "$FAKE_GH_TOKEN_FILE" "$FAKE_GIT_TOKEN_FILE"; mv "$FAKE_GH_TOKEN_FILE" "$FAKE_GH_TOKEN_FILE.off"`; press "Check again" | Signed in, "With git’s sign-in to github.com on this computer" |
| 6 | Put them back: `mv "$FAKE_GH_TOKEN_FILE.off" "$FAKE_GH_TOKEN_FILE"; : > "$FAKE_GIT_TOKEN_FILE"`; "Check again" | "With the GitHub CLI’s sign-in on this computer" |
