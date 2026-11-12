---
id: TC-013
title: GitHub's items on Today → My work, with GitHub's icon — reviews asked of you, your PRs that need you, issues assigned to you; late first, undated last; a link asks before it opens
priority: high
type: functional
requirements: [F-GH-18]
module: github
run: agent
platform: any
data: standard
tags: [github, work, today]
---

# TC-013: GitHub on My work

## Preconditions
- TC-005 done (picks: acme-test, acme-labs/site) and TC-012 done (acme-rollout has acme-test/api); `<dir>/env` sets `ECHOCTL_TEST_OPEN_LOG_ONLY` (a link clicked twice goes to `<dir>/open.log`, never the browser)
- The fake's work (`/_state`): reviews asked of you on acme-test/api#7 "Fix login" and elsewhere-co/tool#3; your PRs acme-test/web#11 (changes asked), #12 (checks failing), #13 (fine); issues assigned acme-test/api#21 "Flaky test <b>" (milestone due yesterday) and acme-labs/site#22 "Tidy labels" (no milestone)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin call github refresh`; `echoctl work show` | Rows from `github`, each with `icon` `plugin/github/icon.svg`, only from the picks: `pr:acme-test/api#7` (review, `thread` acme-rollout), `pr:acme-test/web#11` "Speed up search — changes asked" (my PR), `pr:acme-test/web#12` "Bump deps — checks failing" (my PR), `issue:acme-test/api#21` (assigned, late), `issue:acme-labs/site#22` (assigned, no date); no #13; no `pr:elsewhere-co/tool#3` (elsewhere-co isn't picked); `errors` `{}` |
| 2 | Open `{{base_url}}/#today`, wait up to 5 s | My work: "Flaky test <b>" (the `<b>` as text) among the late, GitHub's mark beside it (tooltip "From GitHub"); the undated GitHub rows after every dated row |
| 3 | Click "Fix login" | "Open github.com in the browser? Click its title again · Cancel"; click again → `<dir>/open.log` gets `https://github.com/acme-test/api/pull/7`; nothing opens |
| 4 | `curl -s -X POST $FAKE_GITHUB/_state -d '{"review_requests": []}'`; `echoctl plugin call github refresh`; Today, wait up to 5 s | The review row is gone; the rest stay |
