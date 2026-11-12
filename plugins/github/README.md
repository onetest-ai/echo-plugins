# GitHub

Your GitHub on Echo's Today: whether CI is passing, how many pull requests are open, and the reviews waiting on you —
for the repos and organisations you pick. Echo only reads GitHub; it never changes anything there.

- **Its own Settings section** (Settings → From plugins → GitHub): sign in with a token, list your repos
  (`owner/repo`) and organisations, and see what Echo last read and when.
- **Widgets for Today** (Today → Edit): **GitHub repos** — a row per repo with its CI, open pull requests and reviews
  for you; **GitHub CI** — passing or failing across them, naming what fails; **GitHub at a glance** — CI failing, open
  pull requests, reviews for you. Each widget's ⚙ picks what it shows (open issues too).
- **Reads every 5 minutes**, in one request, and keeps the answer, so Today never waits on GitHub; when GitHub is
  down or its hourly limit is used up, the last answer stays, dated.
- An organisation counts all its repos; the 10 pushed to last are listed.

It needs Echo 0.9.0 or later, and a GitHub token: a
[fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) with read access to
Contents, Pull requests, Issues and Actions of the repos (or a classic token with `repo`). The `gh` CLI's sign-in can't
be used: a plugin can't run `gh`.

Coming next, with Echo's thread slot and work rows (onetest-ai/echo#464, onetest-ai/echo#85): a thread's repos in its
Profile, and GitHub's pull requests and issues in Today → My work and in each thread's Work tab.

`main.js` is its host half (sign-in, reading GitHub, the widgets' data), `client.js` its client half (the Settings
section).

Part of the [Echo plugins](../../README.md) marketplace.
