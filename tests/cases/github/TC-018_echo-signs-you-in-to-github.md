---
id: TC-018
title: Without a GitHub sign-in on the computer, "Sign in with GitHub" — the plugin runs GitHub's device sign-in (a code and github.com/login/device), Echo keeps the sign-in, GitHub is read once it is confirmed, says when GitHub refuses it, signs out; a refusal or a cancel leaves no sign-in; the token is never in the plugin's store
priority: high
type: functional
requirements: [F-GH-21, F-GH-02]
module: github
run: agent
platform: any
data: standard
tags: [github, signin, device]
---

# TC-018: Signed in here, kept by Echo

## Preconditions
- The environment from `up.sh` on an Echo that keeps a sign-in a plugin made and has `ctx.ui.copy` (onetest-ai/echo#488); TC-001 passed (the plugin installed and picks made in TC-005 are fine either way)
- No sign-in on the computer: `mv "$FAKE_GH_TOKEN_FILE" "$FAKE_GH_TOKEN_FILE.off"; : > "$FAKE_GIT_TOKEN_FILE"`; the fake GitHub's `device` is "pending" (`curl -s -X POST $FAKE_GITHUB/_state -d '{"device": "pending"}'`)
- Open `{{base_url}}/#settings/github:main` and press "Check again": the row "Sign in to GitHub" with "Sign in with GitHub"

**Changes:** `$ECHOCTL_CONFIG_DIR/signin/` (Echo's own sign-in), the fake GitHub's state

## Test Data

| Field | Value |
|---|---|
| The fake GitHub's code | `WDJB-MJHT` |
| Its token once confirmed | the state's `device_token` (`gho_acmedevice…`, made up) |
| The plugin's OAuth app | `Ov23liJp2izMv6RZZS23` (onetest-ai; public, no secret) |

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Note the count of `curl -s $FAKE_GITHUB/_log` entries; click "Sign in with GitHub" | The row becomes "Enter this code on GitHub" — "**WDJB-MJHT** at github.com/login/device — waiting for you to confirm it there (15 minutes at most)." — with "Copy code & open GitHub" and "Cancel"; nothing opened or copied yet (`$ECHOCTL_TEST_OPEN_LOG` empty); `_log` has a `/login/device/code` entry with `client_id` `Ov23liJp2izMv6RZZS23` and fields `client_id`, `scope`, then `/login/oauth/access_token` entries (`client_id`, `device_code`, `grant_type`) about one every 2 seconds; no `/graphql` entry since the click |
| 2 | Click "Copy code & open GitHub" | `$ECHOCTL_TEST_OPEN_LOG` has `copied: WDJB-MJHT` and `https://github.com/login/device` (nothing else; test data never touches the clipboard or the browser); the row adds "Copied"; the code is still shown |
| 3 | `curl -s -X POST $FAKE_GITHUB/_state -d '{"device": "approved"}'` (the user confirms on GitHub); wait up to 10 s | The row reads "@ada-acme" — "With the sign-in you made in Echo. Echo only reads GitHub; it never changes anything there." — "Ready ✓" and "Sign out"; the repos and "Last read" show again; `_log` has `/graphql` entries after it; the access-token entries stop |
| 4 | `ls -l "$ECHOCTL_CONFIG_DIR/signin/"`; `grep -rl "$(curl -s $FAKE_GITHUB/_state \| python3 -c 'import json,sys;print(json.load(sys.stdin)["device_token"])')" "$ECHOCTL_HOME" "$ECHOCTL_CONFIG_DIR/plugins" <dir>/*.log` | `github.com.json`, `-rw-------`; nothing found (the token is in Echo's file only: not the plugin's store, not a log) |
| 5 | `echoctl widget show plugin:github:ci` | The CI status as in TC-006 (read with Echo's sign-in), not "sign in" |
| 6 | `curl -s -X POST $FAKE_GITHUB/_state -d '{"device_token": "gho_acmedevicerevoked0000000000000000000"}'` (GitHub no longer takes the one Echo keeps); press "Refresh now" | The read row says "GitHub refused the sign-in you made in Echo — it may have been revoked. Sign out, then sign in again."; "Check again" and "Sign out" |
| 7 | Click "Sign out" | The row is "Sign in to GitHub" with "Sign in with GitHub" again; `$ECHOCTL_CONFIG_DIR/signin/github.com.json` is gone |
| 8 | `curl -s -X POST $FAKE_GITHUB/_state -d '{"device": "denied"}'`; click "Sign in with GitHub"; wait up to 5 s | The code shows, then "GitHub said no — not signed in." under the row with "Sign in with GitHub"; no `github.com.json` |
| 9 | `curl -s -X POST $FAKE_GITHUB/_state -d '{"device": "pending"}'`; click "Sign in with GitHub", then "Cancel"; `curl -s -X POST $FAKE_GITHUB/_state -d '{"device": "approved"}'`; wait 3 s | "Sign in to GitHub" with "Sign in with GitHub"; no `github.com.json`; no new access-token entry in `_log` after the cancel |

## Expected Final State
No sign-in kept by Echo; the fake's `device` "approved" with a token nobody holds.

## Teardown
- `curl -s -X POST $FAKE_GITHUB/_state -d '{"device": "pending", "device_token": "gho_acmedevice00000000000000000000000000"}'`; `mv "$FAKE_GH_TOKEN_FILE.off" "$FAKE_GH_TOKEN_FILE"`; press "Check again" ("With the GitHub CLI’s sign-in on this computer")

## Notes
- Only the fake GitHub is reached: `up.sh` maps both api.github.com and github.com to it (`ECHOCTL_TEST_HOSTS`), and the gh and git first on PATH are the fakes. A real token anywhere is a FAIL.
- The device sign-in is the plugin's (the section asks the host half every 2 s; it asks GitHub no more often than GitHub said; the address shown is always github.com/login/device). Echo only keeps the sign-in: its own rules (0600, outside the plugin's store, refused in a read-only routine) are Echo's case onetest-ai/echo TC-025.
