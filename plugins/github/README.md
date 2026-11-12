# GitHub

Your GitHub on Echo's Today: whether CI is passing, how many pull requests are open, and the reviews waiting on you —
for the repos and organisations you pick. Echo only reads GitHub; it never changes anything there.

- **No token to paste**: it reads GitHub with the sign-in this computer already has — the GitHub CLI's (`gh auth
  login`), else git's — which Echo hands it; held in memory only.
- **Its own Settings section** (Settings → From plugins → GitHub): pick what to show from your organisations and the
  repos you worked on lately (or add any repo), and see what Echo last read and when.
- **Widgets for Today** (Today → Edit): **GitHub repos** — a row per repo with its CI, open pull requests and reviews
  for you; **GitHub CI** — passing or failing across them, naming what fails; **GitHub at a glance** — CI failing, open
  pull requests, reviews for you. Each widget's ⚙ picks what it shows (open issues too), and may be set to a thread:
  then it shows that thread's repos.
- **A thread's repos** in its Profile (a GitHub row under its Sources): picked from the repos you worked on lately or
  added by name. Claude in Echo is told them while the thread is open.
- **GitHub's items in Echo's task lists**, with GitHub's mark: on Today → My work, the reviews asked of you, your pull
  requests with changes asked or checks failing, and the issues assigned to you (by their milestone's date; undated
  ones after the dated); in a thread's Work tab, its repos' open pull requests and issues. A link asks before it opens
  github.com. Nothing is written to GitHub.
- **Reads every 5 minutes**, in two requests, and keeps the answer, so Today never waits on GitHub; when GitHub is
  down or its hourly limit is used up, the last answer stays, dated.
- An organisation counts all its repos; the 10 pushed to last are listed.

It needs Echo 0.9.2 or later, and this computer signed in to GitHub: `gh auth login`, or git's credentials for
github.com. Organisations are listed when that sign-in may read
them (GitHub's `read:org`, which `gh` has).

`main.js` is its host half (sign-in, reading GitHub, the widgets' data, the work rows, a thread's repos), `client.js` its
client half (the Settings section, the thread's Profile row).

Part of the [Echo plugins](../../README.md) marketplace.
