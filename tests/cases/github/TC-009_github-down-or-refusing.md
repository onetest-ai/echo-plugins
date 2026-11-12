---
id: TC-009
title: GitHub down or refusing the sign-in — the last answer stays, dated, the section says why; a renewed sign-in is picked up without the user
priority: high
type: functional
requirements: [F-GH-12]
module: github
run: agent
platform: any
data: standard
tags: [github, errors]
---

# TC-009: When GitHub fails

## Preconditions
- TC-008 done

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `curl -s -X POST $FAKE_GITHUB/_state -d '{"down": true}'`; "Refresh now" in the section | The read row: "GitHub didn’t answer; Echo tries again in 5 minutes." in red; the repo list still there |
| 2 | Today | GitHub CI keeps its state, its text ends "· as of HH:MM"; the glance's note "as of HH:MM"; GitHub repos keeps its rows |
| 3 | `curl -s -X POST $FAKE_GITHUB/_state -d '{"down": false, "token": "gho_renewedfaketoken000000000000000000"}'`; "Refresh now" | GitHub refuses the old token: the read row says "GitHub refused this computer’s sign-in — it may have expired. Run gh auth login again, then Check again." in red; the sign-in row offers "Check again"; GitHub in the Settings list shows "!" |
| 4 | `printf gho_renewedfaketoken000000000000000000 > "$FAKE_GH_TOKEN_FILE"` (gh renewed its sign-in); "Refresh now" | Read again with the new sign-in: "Ready ✓", no error, "as of" gone from the widgets |
