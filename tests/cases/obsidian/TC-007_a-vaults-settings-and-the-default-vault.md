---
id: TC-007
title: A vault's settings are checked as set (minutes, AI profile, its folders), one vault is the default for minutes, removing it leaves none; a folder inside, around or the same as a vault isn't connected
priority: high
type: functional
requirements: [F-OB-09, F-OB-10]
module: obsidian
run: agent
platform: any
data: standard
tags: [obsidian, settings]
---

# TC-007: A vault's settings and the default vault

## Preconditions
- The environment from `up.sh`, `. <dir>/env`; acme-wiki connected (`ECHOCTL_PICK_FOLDER="$VAULTS/acme-wiki" echoctl
  plugin call obsidian add '{"wait":true}'`)

## Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | `echoctl plugin call obsidian view` | acme-wiki with `minutes.mode` "ask", `profile` null, `commit` false, `overrides` {}, `template` null; `default` null |
| 2 | `echoctl plugin call obsidian set '{"id":"acme-wiki","key":"minutes","value":"auto"}'`; then `value` "sometimes" | The first answers the vault with `minutes.mode` "auto"; the second fails "minutes: auto, ask or off" |
| 3 | `set` `key` "profile", `value` "nobody" | Fails "no AI profile “nobody”" |
| 4 | `set` `key` "pages", `value` "Decisions"; then "Nope"; then `key` "notes", `value` "../x" | `overrides.pages` "Decisions"; then "“Nope” isn't in this vault"; then "“../x” must be a path inside the vault" |
| 5 | `set` `key` "scope", `value` "all" | Fails "no setting “scope”" (minutes follow the thread's or client's vault, not a per-vault scope) |
| 6 | `echoctl plugin call obsidian default '{"id":"acme-wiki"}'`; `view` | `{"default": "acme-wiki"}`; `view` says `default` "acme-wiki" |
| 7 | `ECHOCTL_PICK_FOLDER="$VAULTS/acme-wiki/Decisions" echoctl plugin call obsidian add '{"wait":true}'`; `ECHOCTL_PICK_FOLDER="$VAULTS" … add`; `ECHOCTL_PICK_FOLDER="$VAULTS/acme-wiki" … add` | "This folder is inside “<its name>”, which is connected already"; "This folder holds “<its name>”, which is connected already" (its name as `view` shows it); `{"id": "acme-wiki", "already": true}` |
| 8 | `echoctl plugin call obsidian remove '{"id":"acme-wiki"}'`; `view`; `ls "$ECHOCTL_HOME/.echo/plugins/obsidian/vaults"` | `true`; no vaults, `default` null; no `acme-wiki` folder left |

## Expected Final State
No vault connected; no default.
