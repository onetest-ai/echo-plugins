// GitHub — the host half. Reads GitHub for the repos and organisations you pick and keeps what it read, so Today's
// widgets answer at once and never wait on GitHub:
// - your sign-in: the one this computer already has (GitHub CLI, else git), which Echo hands it (`ctx.signin`,
//   `uses.signin`) — or, without one, one you make here: GitHub's device sign-in (a code you confirm on github.com)
//   with onetest-ai's OAuth app (a public client id; there is no secret), which Echo then keeps for it
//   (`ctx.signin.keep`, outside its store); held in memory only — never kept, shown, logged, or sent anywhere but
//   api.github.com;
// - what to show: the organisations and repos you pick in its section, found for you (`discover`: your
//   organisations, the repos you pushed to lately), kept in its store as `picks.json`; nothing picked = nothing
//   watched: the widgets ask you to pick (a thread's own repos still show on a widget set to that thread);
// - every 5 minutes (and on Refresh) one GraphQL query: each repo's default-branch checks, its open pull requests
//   and issues, and the pull requests waiting on your review — kept in its store as `state.json`;
// - widgets on Today: Repos (list), CI (status), GitHub at a glance (stats).
// It talks only to api.github.com (`uses.network`).

const API = 'https://api.github.com/graphql'
const EVERY = 300
/** Repos read per refresh at most, and the most recently pushed repos read for an organisation or user. */
const MAX_REPOS = 30
const PER_OWNER = 10
/** Below this many requests left, wait for GitHub's reset rather than spend the rest. */
const RESERVE = 50

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/
const NAME = /^[A-Za-z0-9._-]{1,100}$/

/** The `repos` setting → entries: `{kind: 'repo', owner, name}` or `{kind: 'owner', login}`, de-duplicated (case
 *  ignored), in order; what isn't one goes to `bad`. Takes lines or commas, and github.com links. */
export function parseEntries(text) {
  const entries = [], bad = [], seen = new Set()
  for (let raw of String(text || '').split(/[\n,]+/)) {
    raw = raw.trim()
    if (!raw) continue
    const s = raw.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '')
    const parts = s.split('/')
    let e = null
    if (parts.length === 1 && LOGIN.test(parts[0])) e = { kind: 'owner', login: parts[0] }
    else if (parts.length === 2 && LOGIN.test(parts[0]) && NAME.test(parts[1])) e = { kind: 'repo', owner: parts[0], name: parts[1] }
    if (!e) { bad.push(raw); continue }
    const key = entryName(e).toLowerCase()
    if (!seen.has(key)) { seen.add(key); entries.push(e) }
  }
  return { entries, bad }
}

export const entryName = (e) => (e.kind === 'repo' ? `${e.owner}/${e.name}` : e.login)

const REPO = `fragment R on Repository {
  nameWithOwner url
  defaultBranchRef { name target { ... on Commit { statusCheckRollup { state contexts(first: 50) { nodes {
    __typename
    ... on CheckRun { name conclusion status checkSuite { workflowRun { workflow { name } } } }
    ... on StatusContext { context state }
  } } } } } }
  pullRequests(states: OPEN) { totalCount }
  issues(states: OPEN) { totalCount }
}`
/** Every repo you can see — yours, your organisations', and ones you collaborate on. */
const MINE = 'affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]'
const REPOS = (first) => `repositories(first: ${first}, orderBy: {field: PUSHED_AT, direction: DESC}, isArchived: false`

/** One GraphQL query for all entries: {query, variables}. A repo is `r<i>`, an owner `w<i>` (its last-pushed repos)
 *  with `p<i>` / `i<i>` (its open PR and issue counts over all its repos); no entries → your last-pushed repos.
 *  `extra`: the threads' repos (owner/name), read as `x<i>` beside them, for a widget set to a thread. */
export function buildQuery(entries, extra = []) {
  const vars = [], fields = [], variables = {}
  entries.forEach((e, i) => {
    if (e.kind === 'repo') {
      vars.push(`$o${i}: String!`, `$n${i}: String!`)
      Object.assign(variables, { [`o${i}`]: e.owner, [`n${i}`]: e.name })
      fields.push(`r${i}: repository(owner: $o${i}, name: $n${i}) { ...R }`)
    } else {
      vars.push(`$l${i}: String!`, `$p${i}: String!`, `$i${i}: String!`)
      // `user:` finds a person's and an organisation's repos alike (`org:` only an organisation's).
      Object.assign(variables, { [`l${i}`]: e.login, [`p${i}`]: `user:${e.login} is:pr is:open archived:false`, [`i${i}`]: `user:${e.login} is:issue is:open archived:false` })
      fields.push(`w${i}: repositoryOwner(login: $l${i}) { login ${REPOS(PER_OWNER)}, ownerAffiliations: [OWNER]) { totalCount nodes { ...R } } }`)
      fields.push(`p${i}: search(query: $p${i}, type: ISSUE) { issueCount }`, `i${i}: search(query: $i${i}, type: ISSUE) { issueCount }`)
    }
  })
  extra.slice(0, MAX_REPOS).forEach((full, i) => {
    const [o, n] = full.split('/')
    vars.push(`$xo${i}: String!`, `$xn${i}: String!`)
    Object.assign(variables, { [`xo${i}`]: o, [`xn${i}`]: n })
    fields.push(`x${i}: repository(owner: $xo${i}, name: $xn${i}) { ...R }`)
  })
  const head = vars.length ? `query GitHub(${vars.join(', ')})` : 'query GitHub'
  const query = `${head} {
  viewer { login }
  rateLimit { remaining limit resetAt }
  reviews: search(query: "is:open is:pr review-requested:@me archived:false", type: ISSUE, first: 100) { issueCount nodes { ... on PullRequest { repository { nameWithOwner } } } }
  ${fields.join('\n  ')}
}
${REPO}`
  return { query, variables }
}

const FAILED = new Set(['FAILURE', 'TIMED_OUT', 'STARTUP_FAILURE', 'ACTION_REQUIRED', 'ERROR'])

/** A repo's default-branch checks: {ci: passing | failing | running | none, failing: [workflow or check names]}. */
export function ciOf(repo) {
  const rollup = repo && repo.defaultBranchRef && repo.defaultBranchRef.target && repo.defaultBranchRef.target.statusCheckRollup
  if (!rollup) return { ci: 'none', failing: [] }
  const ci = { SUCCESS: 'passing', FAILURE: 'failing', ERROR: 'failing', PENDING: 'running', EXPECTED: 'running' }[rollup.state] || 'none'
  const failing = []
  for (const n of (rollup.contexts && rollup.contexts.nodes) || []) {
    const bad = n.__typename === 'StatusContext' ? FAILED.has(n.state) : FAILED.has(n.conclusion)
    if (!bad) continue
    const wf = n.checkSuite && n.checkSuite.workflowRun && n.checkSuite.workflowRun.workflow
    const name = (wf && wf.name) || n.name || n.context
    if (name && !failing.includes(name)) failing.push(name)
  }
  return { ci, failing }
}

/** GitHub's answer → what the plugin keeps: the repos (in the entries' order, at most MAX_REPOS), totals over them,
 *  how each entry went, who is signed in and the rate left. `now` an ISO time. */
export function digest(answer, entries, now, extra = []) {
  const data = (answer && answer.data) || {}
  const missing = new Set(((answer && answer.errors) || []).filter((e) => e.type === 'NOT_FOUND' && e.path).map((e) => e.path[0]))
  const repos = [], seen = new Set(), checks = []
  const add = (r) => {
    if (!r || seen.has(r.nameWithOwner.toLowerCase()) || repos.length >= MAX_REPOS) return
    seen.add(r.nameWithOwner.toLowerCase())
    repos.push({ repo: r.nameWithOwner, url: r.url, ...ciOf(r), prs: r.pullRequests.totalCount, issues: r.issues.totalCount, reviews: 0 })
  }
  const counted = { prs: 0, issues: 0 }
  const owners = entries.filter((e) => e.kind === 'owner').map((e) => e.login.toLowerCase())
  entries.forEach((e, i) => {
    if (e.kind === 'repo') {
      const r = data[`r${i}`]
      if (!r) { checks.push({ entry: entryName(e), ok: false, why: missing.has(`r${i}`) ? 'not found, or your sign-in can’t see it' : 'not read' }); return }
      add(r)
      checks.push({ entry: entryName(e), ok: true, repos: 1 })
      // An organisation listed too counts this repo in its own totals.
      if (!owners.includes(e.owner.toLowerCase())) { counted.prs += r.pullRequests.totalCount; counted.issues += r.issues.totalCount }
    } else {
      const w = data[`w${i}`]
      if (!w) { checks.push({ entry: entryName(e), ok: false, why: missing.has(`w${i}`) ? 'no such organisation or user' : 'not read' }); return }
      for (const r of w.repositories.nodes) add(r)
      checks.push({ entry: entryName(e), ok: true, repos: w.repositories.totalCount })
      counted.prs += (data[`p${i}`] || {}).issueCount || 0
      counted.issues += (data[`i${i}`] || {}).issueCount || 0
    }
  })
  // Reviews waiting on you in the entries' repos and organisations (nothing picked: none; a thread's repos count theirs
  // below).
  const inScope = (full) => {
    const [owner] = full.toLowerCase().split('/')
    return owners.includes(owner) || entries.some((e) => e.kind === 'repo' && entryName(e).toLowerCase() === full.toLowerCase())
  }
  let reviews = 0
  const rv = data.reviews || { issueCount: 0, nodes: [] }
  for (const n of rv.nodes || []) {
    const full = n && n.repository && n.repository.nameWithOwner
    if (!full || !inScope(full)) continue
    reviews++
    const r = repos.find((x) => x.repo.toLowerCase() === full.toLowerCase())
    if (r) r.reviews++
  }
  // The threads' repos, by name (lower case), for a widget set to a thread; reviews for you counted in each.
  const threadRepos = {}
  extra.slice(0, MAX_REPOS).forEach((full, i) => {
    const r = data[`x${i}`]
    if (r) threadRepos[r.nameWithOwner.toLowerCase()] = { repo: r.nameWithOwner, url: r.url, ...ciOf(r), prs: r.pullRequests.totalCount, issues: r.issues.totalCount, reviews: 0 }
  })
  for (const n of rv.nodes || []) {
    const full = n && n.repository && n.repository.nameWithOwner
    const r = full && threadRepos[full.toLowerCase()]
    if (r) r.reviews++
  }
  const rate = data.rateLimit ? { remaining: data.rateLimit.remaining, limit: data.rateLimit.limit, resetAt: data.rateLimit.resetAt } : null
  return {
    at: now,
    login: (data.viewer && data.viewer.login) || '',
    rate,
    repos,
    threadRepos,
    checks,
    totals: {
      prs: counted.prs,
      issues: counted.issues,
      reviews,
      failing: repos.filter((r) => r.ci === 'failing').length,
      running: repos.filter((r) => r.ci === 'running').length,
    },
  }
}

/** A failed answer in the user's words: {code: auth | rate | down | error, text}. */
export function problemOf(status, body, from = '') {
  let msg = ''
  try { msg = (JSON.parse(body || '{}').message || '') } catch { msg = '' }
  if (status === 401 && from === 'echo') return { code: 'auth', text: 'GitHub refused the sign-in you made in Echo — it may have been revoked. Sign out, then sign in again.' }
  if (status === 401) return { code: 'auth', text: 'GitHub refused this computer’s sign-in — it may have expired. Run gh auth login again, then Check again.' }
  if (status === 403 && /rate limit/i.test(msg)) return { code: 'rate', text: 'GitHub’s limit for this hour is used up; Echo tries again after it resets.' }
  if (status === 403) return { code: 'auth', text: 'GitHub refused: this computer’s sign-in can’t read this (it needs repo access; gh auth login gives it).' }
  if (status >= 500 || status === 0) return { code: 'down', text: 'GitHub didn’t answer; Echo tries again in 5 minutes.' }
  return { code: 'error', text: `GitHub answered ${status}${msg ? `: ${msg}` : ''}.` }
}

// GitHub's device sign-in (RFC 8628) with onetest-ai's OAuth app: its id is public, it has no secret.
export const CLIENT_ID = 'Ov23liJp2izMv6RZZS23'
export const SCOPES = 'repo read:org'
export const DEVICE_URL = 'https://github.com/login/device'

/** GitHub's answer to "a code, please": {code, device, expires, interval}, or null when it isn't one (the address shown
 *  is always DEVICE_URL, never one from the answer). */
export function deviceCodeOf(v) {
  const code = v && typeof v.user_code === 'string' && /^[A-Z0-9]{4,8}(-[A-Z0-9]{4,8})?$/.test(v.user_code) ? v.user_code : ''
  const device = v && typeof v.device_code === 'string' && /^[\x21-\x7e]{1,200}$/.test(v.device_code) ? v.device_code : ''
  if (!code || !device) return null
  const num = (x, d, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(x) ? x : d))
  return { code, device, expires: num(v.expires_in, 900, 60, 1800), interval: num(v.interval, 5, 1, 60) }
}

/** GitHub's answer while it waits for the code: {state: waiting | done | denied | expired | failed, token?, interval?,
 *  error?}. */
export function deviceStepOf(v, interval) {
  const e = v && v.error
  if (!e && v && typeof v.access_token === 'string' && /^[\x21-\x7e]{1,8000}$/.test(v.access_token)) return { state: 'done', token: v.access_token }
  if (e === 'authorization_pending') return { state: 'waiting' }
  // Slower, never faster than before (nor 0): GitHub's new interval, else 5 s more; 60 s at most.
  if (e === 'slow_down') return { state: 'waiting', interval: Math.min(60, Math.max(interval + 1, Number.isFinite(v.interval) ? v.interval : interval + 5)) }
  if (e === 'expired_token') return { state: 'expired' }
  if (e === 'access_denied') return { state: 'denied' }
  const said = String((v && (v.error_description || v.error)) || 'no reason given').replace(/[\x00-\x1f]/g, '').slice(0, 200)
  return { state: 'failed', error: said }
}

/** "10:42", or "Mon 10:42" when not today (local time). */
export function clock(iso, now = new Date()) {
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return d.toDateString() === now.toDateString() ? hm : `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]} ${hm}`
}

const SIGN_IN = 'Sign in to GitHub on this computer (gh auth login), then Refresh'
const CI_WORD = { passing: '✓ CI passing', failing: '✗ CI failing', running: '● CI running', none: 'no CI' }
const on = (params, key, dflt) => (params && typeof params[key] === 'boolean' ? params[key] : dflt)
const n = (count, one, many) => `${count} ${count === 1 ? one : many}`

/** Older than three refreshes, or the last refresh failed: say when it is from. */
function dated(st, now) {
  if (!st || !st.at) return ''
  const old = now - new Date(st.at).getTime() > 3 * EVERY * 1000
  return st.problem || old ? `as of ${clock(st.at, new Date(now))}` : ''
}

const totalsOf = (rows) => ({
  prs: rows.reduce((n, r) => n + r.prs, 0),
  issues: rows.reduce((n, r) => n + r.issues, 0),
  reviews: rows.reduce((n, r) => n + r.reviews, 0),
  failing: rows.filter((r) => r.ci === 'failing').length,
  running: rows.filter((r) => r.ci === 'running').length,
})

/** What a widget set to a thread shows: that thread's repos (as last read), totals over them; null when the thread has
 *  none. `names`: the thread's repos (owner/name). */
export function forThread(st, names) {
  if (!names || !names.length) return null
  if (!st || !st.at) return st
  const pool = [...Object.values(st.threadRepos || {}), ...(st.repos || [])]
  const rows = []
  for (const n of names) {
    const r = pool.find((x) => x.repo.toLowerCase() === String(n).toLowerCase())
    if (r && !rows.includes(r)) rows.push(r)
  }
  return { ...st, repos: rows, totals: totalsOf(rows), checks: [] }
}

const NO_THREAD_REPOS = 'No GitHub repos for this thread yet — add them in its Profile'
const NO_PICKS = 'Pick a repo or organisation to watch — Settings → From plugins → GitHub'
/** A widget with nothing picked to watch (and not set to a thread). */
export function noPicks(kind) {
  if (kind === 'list') return { items: [], empty: NO_PICKS }
  if (kind === 'status') return { state: 'warn', title: 'CI', text: NO_PICKS }
  return { items: [{ label: 'Pick a repo to watch', value: '—', tone: 'warn' }], note: 'Settings → From plugins → GitHub' }
}
/** A widget set to a thread with no repos. */
export function noThreadRepos(kind) {
  if (kind === 'list') return { items: [], empty: NO_THREAD_REPOS }
  if (kind === 'status') return { state: 'warn', title: 'CI', text: NO_THREAD_REPOS }
  return { items: [{ label: NO_THREAD_REPOS, value: '—' }] }
}

/** The Repos widget (`list`): a row per repo — CI, open PRs, reviews for you, open issues as `params` say. */
export function reposWidget(st, params = {}, signedIn = true) {
  if (!signedIn) return { items: [], empty: SIGN_IN }
  if (!st || !st.at) return { items: [], empty: 'Reading GitHub…' }
  const items = st.repos.map((r) => {
    const bits = []
    if (on(params, 'ci', true)) bits.push(r.ci === 'failing' && r.failing.length ? `${CI_WORD.failing}: ${r.failing.slice(0, 2).join(', ')}` : CI_WORD[r.ci])
    if (on(params, 'prs', true)) bits.push(n(r.prs, 'open PR', 'open PRs'))
    if (on(params, 'reviews', true) && r.reviews) bits.push(n(r.reviews, 'review for you', 'reviews for you'))
    if (on(params, 'issues', false)) bits.push(n(r.issues, 'open issue', 'open issues'))
    return { title: r.repo, sub: bits.join(' · ') }
  })
  // Failing first, then running; otherwise the entries' order.
  const rank = { failing: 0, running: 1 }
  const order = st.repos.map((r, i) => [rank[r.ci] ?? 2, i])
  const sorted = order.sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([, i]) => items[i])
  // A list has no note: how old it is shows on CI and the glance.
  return { items: sorted, empty: st.problem ? st.problem.text : 'No repos — add yours in Settings → From plugins → GitHub', actions: [{ label: 'Refresh', command: 'refresh', args: {} }] }
}

/** A repo's Actions page, only for a name GitHub could have (owner/repo of plain characters): a link is never built
 *  from text GitHub sent that could be anything else. */
export const actionsUrl = (full) => (/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/.test(full || '') ? `https://github.com/${full}/actions` : '')

/** The CI widget (`status`): the worst of the repos' default-branch checks. */
export function ciWidget(st, signedIn = true, now = Date.now()) {
  if (!signedIn) return { state: 'warn', title: 'CI', text: SIGN_IN }
  if (!st || !st.at) return { state: 'warn', title: 'CI', text: 'Reading GitHub…' }
  const failing = st.repos.filter((r) => r.ci === 'failing')
  const running = st.repos.filter((r) => r.ci === 'running')
  const withCi = st.repos.filter((r) => r.ci !== 'none')
  let state = 'ok', text
  if (failing.length) {
    state = 'bad'
    text = `${failing.length} failing: ${failing.slice(0, 3).map((r) => (r.failing.length ? `${r.repo} · ${r.failing[0]}` : r.repo)).join(', ')}${failing.length > 3 ? ', …' : ''}`
  } else if (running.length) {
    state = 'warn'
    text = `${n(running.length, 'repo', 'repos')} running, the rest passing`
  } else text = withCi.length ? `All passing (${n(withCi.length, 'repo', 'repos')})` : 'No checks on these repos'
  const when = dated(st, now)
  const out = { state, title: 'CI', text: when ? `${text} · ${when}` : text, actions: [{ label: 'Refresh', command: 'refresh', args: {} }] }
  if (failing.length === 1 && actionsUrl(failing[0].repo)) out.open = actionsUrl(failing[0].repo)
  return out
}

/** GitHub at a glance (`stats`, at most 4): failing CI, open PRs, reviews for you, open issues as `params` say. */
export function glanceWidget(st, params = {}, signedIn = true, now = Date.now()) {
  if (!signedIn) return { items: [{ label: 'Sign in to GitHub', value: '—', tone: 'warn' }] }
  if (!st || !st.at) return { items: [{ label: 'Reading GitHub…', value: '…' }] }
  const t = st.totals
  const items = []
  if (on(params, 'ci', true)) items.push({ label: 'CI failing', value: t.failing, tone: t.failing ? 'bad' : 'good' })
  if (on(params, 'prs', true)) items.push({ label: 'Open PRs', value: t.prs })
  if (on(params, 'reviews', true)) items.push({ label: 'Reviews for you', value: t.reviews, ...(t.reviews ? { tone: 'warn' } : {}) })
  if (on(params, 'issues', false)) items.push({ label: 'Open issues', value: t.issues })
  const out = { items: items.slice(0, 4), open: 'https://github.com/pulls/review-requested' }
  const when = dated(st, now)
  if (when) out.note = when
  return out
}

/** What there is to pick from: your organisations (with how many repos each) and the repos you pushed to lately. */
export const DISCOVER = `query Discover {
  viewer { login
    organizations(first: 100) { nodes { login name repositories(isArchived: false) { totalCount } } }
    ${REPOS(30)}, ${MINE}) { totalCount nodes { nameWithOwner pushedAt } }
  }
}`

export function discovered(answer, now) {
  const v = answer && answer.data && answer.data.viewer
  if (!v) return null
  return {
    at: now,
    login: v.login,
    orgs: v.organizations.nodes.map((o) => ({ login: o.login, name: o.name || '', repos: o.repositories.totalCount })),
    repos: v.repositories.nodes.map((r) => ({ repo: r.nameWithOwner, pushedAt: r.pushedAt })),
    // Organisations need GitHub's read:org; a sign-in without it sees none (the section says so).
    allRepos: v.repositories.totalCount,
  }
}

/** Your picks with one turned on or off (case ignored), in a stable order: organisations first, then repos. */
export function toggled(picks, entry, on) {
  const { entries } = parseEntries(entry)
  if (entries.length !== 1) throw new Error(`not a repo or an organisation: ${entry} (write owner/repo, or an organisation’s name)`)
  const name = entryName(entries[0])
  const rest = (picks || []).filter((p) => p.toLowerCase() !== name.toLowerCase())
  const next = on ? [...rest, name] : rest
  if (next.length > MAX_REPOS) throw new Error(`${MAX_REPOS} at most`)
  return [...next.filter((p) => !p.includes('/')), ...next.filter((p) => p.includes('/'))]
}

const SIGN_IN_HOST = 'github.com'

const PER_THREAD_REPO = 20
const MAX_ROWS = 200

/** Search qualifiers for the picks and the threads' repos (`user:login`, `repo:owner/name` — GitHub ORs them), in
 *  groups that fit GitHub's 256-character query beside the longest search (49 characters): one search each. At most
 *  `max` groups; what doesn't fit goes in one last group of '' (searched without qualifiers, filtered here). */
export function pickScopes(entries, threadRepos = [], max = 4) {
  const quals = [], seen = new Set()
  const add = (q) => { const k = q.toLowerCase(); if (!seen.has(k)) { seen.add(k); quals.push(q) } }
  for (const e of entries) add(e.kind === 'repo' ? `repo:${e.owner}/${e.name}` : `user:${e.login}`)
  for (const full of threadRepos) if (!inPicks(entries, full)) add(`repo:${full}`)
  const groups = []
  let cur = ''
  for (const q of quals) {
    if (cur && cur.length + 1 + q.length > 180) { groups.push(cur); cur = '' }
    cur = cur ? `${cur} ${q}` : q
  }
  if (cur) groups.push(cur)
  return groups.length > max ? [...groups.slice(0, max - 1), ''] : groups
}

/** Is `full` (owner/name) one of the picks — the repo, or a repo of a picked organisation or user? */
export function inPicks(entries, full) {
  const f = String(full || '').toLowerCase(), owner = f.split('/')[0]
  return entries.some((e) => (e.kind === 'repo' ? `${e.owner}/${e.name}`.toLowerCase() === f : e.login.toLowerCase() === owner))
}

/** The work query: what waits on you in the repos and organisations you picked (reviews asked of you, your PRs with
 *  changes asked or checks failing, issues assigned to you) — nothing picked, none of it — and each thread repo's open
 *  PRs and issues (`t<i>`). {query, variables}. */
export function buildWorkQuery(threadRepos = [], entries = []) {
  const vars = [], fields = [], variables = {}
  // What waits on you in the picks and in the threads' repos (each row goes to My work or to its thread: `workRows`).
  pickScopes(entries, threadRepos.slice(0, MAX_REPOS)).forEach((scope, g) => {
    vars.push(`$qr${g}: String!`, `$qm${g}: String!`, `$qa${g}: String!`)
    Object.assign(variables, {
      [`qr${g}`]: `is:open is:pr review-requested:@me archived:false ${scope}`.trim(),
      [`qm${g}`]: `is:open is:pr author:@me archived:false ${scope}`.trim(),
      [`qa${g}`]: `is:open is:issue assignee:@me archived:false ${scope}`.trim(),
    })
    fields.push(
      `rv${g}: search(query: $qr${g}, type: ISSUE, first: 50) { nodes { ... on PullRequest { number title url repository { nameWithOwner } } } }`,
      `my${g}: search(query: $qm${g}, type: ISSUE, first: 50) { nodes { ... on PullRequest { number title url isDraft reviewDecision repository { nameWithOwner } commits(last: 1) { nodes { commit { statusCheckRollup { state } } } } } } }`,
      `asg${g}: search(query: $qa${g}, type: ISSUE, first: 50) { nodes { ... on Issue { number title url repository { nameWithOwner } milestone { dueOn } } } }`,
    )
  })
  threadRepos.slice(0, MAX_REPOS).forEach((full, i) => {
    const [o, n] = full.split('/')
    vars.push(`$to${i}: String!`, `$tn${i}: String!`)
    Object.assign(variables, { [`to${i}`]: o, [`tn${i}`]: n })
    const by = `first: ${PER_THREAD_REPO}, orderBy: {field: UPDATED_AT, direction: DESC}`
    fields.push(`t${i}: repository(owner: $to${i}, name: $tn${i}) { nameWithOwner pullRequests(states: OPEN, ${by}) { nodes { number title url isDraft } } issues(states: OPEN, ${by}) { nodes { number title url milestone { dueOn } } } }`)
  })
  const query = `query Work${vars.length ? `(${vars.join(', ')})` : ''} {
  viewer { login }
  rateLimit { remaining limit resetAt }
  ${fields.join('\n  ')}
}`
  return { query, variables }
}

/** A GitHub page we link to: only https://github.com/… of plain characters. */
const pageUrl = (u) => (/^https:\/\/github\.com\/[A-Za-z0-9._\/-]+$/.test(u || '') ? u : undefined)
const titled = (t) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, 300) || '(no title)'
/** A milestone's due date as YYYY-MM-DD. */
const dueOf = (m) => (m && /^\d{4}-\d{2}-\d{2}/.test(m.dueOn || '') ? m.dueOn.slice(0, 10) : undefined)

/** The work answer → Echo's rows: `me` (Today → My work) and `threads` {thread id: rows} (its Work tab). `threads`:
 *  [{thread, value: [owner/name]}] (ctx.threads.list('repos')); a "me" row in a thread's repo names that thread, so it
 *  shows there too (once). */
export function workRows(answer, threads = [], entries = null) {
  const data = (answer && answer.data) || {}
  // My work: only what is in the picks (the search was scoped to them; checked again here). What is only in a
  // thread's repo goes to that thread's Work alone (`onlyThread`).
  const picked = (full) => !entries || inPicks(entries, full)
  const onlyThread = {}
  const threadOf = (full) => {
    const hit = threads.find((t) => (t.value || []).some((r) => r.toLowerCase() === String(full).toLowerCase()))
    return hit ? hit.thread : undefined
  }
  const row = (id, title, kind, full, url, more = {}) => {
    const r = { id, title: titled(title), kind, where: full }
    const u = pageUrl(url)
    if (u) r.url = u
    const t = threadOf(full)
    if (t) r.thread = t
    for (const [k, v] of Object.entries(more)) if (v !== undefined) r[k] = v
    return r
  }
  const me = [], ids = new Set()
  // A row for My work if it is in the picks, else for its thread's Work if it is in a thread's repo, else none.
  const push = (_, r) => {
    if (ids.has(r.id)) return
    const list = picked(r.where) ? me : r.thread ? (onlyThread[r.thread] = onlyThread[r.thread] || []) : null
    if (list && list.length < MAX_ROWS) { ids.add(r.id); list.push(r) }
  }
  // Each search may come in groups (`rv0`, `rv1`, … — the picks split to fit GitHub's query length).
  const nodesOf = (name) => Object.keys(data).filter((k) => new RegExp(`^${name}\\d*$`).test(k)).flatMap((k) => (data[k] && data[k].nodes) || [])
  for (const n of nodesOf('rv')) {
    if (!n || !n.repository) continue
    push(me, row(`pr:${n.repository.nameWithOwner}#${n.number}`, n.title, 'review', n.repository.nameWithOwner, n.url))
  }
  for (const n of nodesOf('my')) {
    if (!n || !n.repository) continue
    const c = n.commits && n.commits.nodes && n.commits.nodes[0] && n.commits.nodes[0].commit
    const checks = c && c.statusCheckRollup && c.statusCheckRollup.state
    const failing = checks === 'FAILURE' || checks === 'ERROR'
    const asked = n.reviewDecision === 'CHANGES_REQUESTED'
    if (!failing && !asked) continue
    const why = asked && failing ? 'changes asked, checks failing' : asked ? 'changes asked' : 'checks failing'
    push(me, row(`pr:${n.repository.nameWithOwner}#${n.number}`, `${titled(n.title)} — ${why}`, 'my PR', n.repository.nameWithOwner, n.url))
  }
  for (const n of nodesOf('asg')) {
    if (!n || !n.repository) continue
    push(me, row(`issue:${n.repository.nameWithOwner}#${n.number}`, n.title, 'assigned', n.repository.nameWithOwner, n.url, { due: dueOf(n.milestone) }))
  }
  // Each thread's repos: their open PRs and issues (`t<i>` in the order of the query's repos).
  const byRepo = {}
  for (const [k, v] of Object.entries(data)) {
    if (!/^t\d+$/.test(k) || !v) continue
    const full = v.nameWithOwner
    const rows = []
    for (const n of (v.pullRequests.nodes || [])) rows.push({ id: `pr:${full}#${n.number}`, title: titled(n.title), kind: n.isDraft ? 'draft PR' : 'PR', where: full, ...(pageUrl(n.url) ? { url: n.url } : {}) })
    for (const n of (v.issues.nodes || [])) {
      const r = { id: `issue:${full}#${n.number}`, title: titled(n.title), kind: 'issue', where: full, ...(pageUrl(n.url) ? { url: n.url } : {}) }
      const due = dueOf(n.milestone)
      if (due) r.due = due
      rows.push(r)
    }
    byRepo[full.toLowerCase()] = rows
  }
  const out = {}
  for (const t of threads) {
    const rows = [], seen = new Set()
    // What waits on you there first (a review asked, your PR, an issue assigned — even beyond its 20 latest), then
    // the repos' open PRs and issues.
    for (const r of onlyThread[t.thread] || []) { seen.add(r.id); rows.push(r) }
    for (const full of t.value || []) for (const r of byRepo[String(full).toLowerCase()] || []) {
      if (!seen.has(r.id) && rows.length < MAX_ROWS) { seen.add(r.id); rows.push(r) }
    }
    out[t.thread] = rows
  }
  return { me, threads: out }
}

/** The threads' repos, once each (owner/name), at most MAX_REPOS. */
export function threadRepoNames(threads = []) {
  const out = [], seen = new Set()
  for (const t of threads) for (const r of t.value || []) {
    const k = String(r).toLowerCase()
    if (!seen.has(k) && out.length < MAX_REPOS) { seen.add(k); out.push(r) }
  }
  return out
}

export function apply(ctx) {
  const read = (path) => { try { const t = ctx.store.read(path); return t ? JSON.parse(t) : null } catch { return null } }
  let state = read('state.json')
  let picks = read('picks.json') || []
  let found = read('discovery.json')
  let running = null
  // The sign-in Echo gave: in memory only, asked for again when GitHub refuses it.
  let signin = null, signinAt = 0

  const save = (st) => { state = st; ctx.store.write('state.json', JSON.stringify(st)) }
  // The threads' repos (ctx.threads, kept by Echo per thread): [{thread, value: [owner/name]}].
  const threads = () => { try { return (ctx.threads && ctx.threads.list('repos')) || [] } catch (e) { ctx.log(`thread repos: ${e.message}`); return [] } }
  const reposOf = (thread) => { try { return (ctx.threads && ctx.threads.get(thread, 'repos')) || [] } catch { return [] } }
  /** A line for Claude while a thread is open: its repos (uses.sessions.hints). */
  const hint = () => {
    if (!ctx.view || !ctx.view.hints) return
    try {
      ctx.view.hints(threads().filter((t) => (t.value || []).length).map((t) => ({
        thread: t.thread,
        text: `This thread's GitHub repos: ${t.value.join(', ')}. Read their pull requests, issues and CI with the GitHub CLI (gh) when asked.`,
      })))
    } catch (e) { ctx.log(`hints: ${e.message}`) }
  }
  const savePicks = (list) => { picks = list; ctx.store.write('picks.json', JSON.stringify(list)) }

  /** The computer's sign-in to GitHub, from Echo: {token, from} or null; looked up again after a minute when none. */
  const getSignin = async (fresh) => {
    if (!ctx.signin) return null
    if (signin && !fresh) return signin
    if (!signin && !fresh && Date.now() - signinAt < 60000) return null
    signinAt = Date.now()
    // After GitHub refused it, Echo is asked to look again rather than give the sign-in it kept (its minute).
    try { signin = await ctx.signin.get(SIGN_IN_HOST, fresh ? { fresh: true } : undefined) } catch (e) { ctx.log(`sign-in: ${e.message}`); signin = null }
    return signin
  }
  const ask = (t, body) => ctx.http.fetch(API, {
    method: 'POST',
    headers: { Authorization: `bearer ${t}`, 'Content-Type': 'application/json', 'User-Agent': 'echo-github-plugin' },
    body: JSON.stringify(body),
  })
  /** Ask GitHub with the sign-in; refused once → look the sign-in up again (it may have been renewed) and retry. */
  const askSigned = async (body) => {
    let s = await getSignin(false)
    if (!s) return { none: true }
    let r = await ask(s.token, body)
    if (r.status === 401) {
      s = await getSignin(true)
      if (s) r = await ask(s.token, body)
    }
    return { r }
  }

  /** Read GitHub once (one at a time); keeps the last good answer and says what went wrong beside it. */
  const refresh = (why) => {
    if (running) return running
    running = (async () => {
      const rate = state && state.rate
      if (why !== 'user' && rate && rate.remaining < RESERVE && Date.now() < new Date(rate.resetAt).getTime()) return state
      const { entries } = parseEntries(picks.join('\n'))
      const now = new Date().toISOString()
      // Nothing picked and no thread with repos: nothing to read (the widgets ask to pick; My work has no GitHub rows).
      if (!entries.length && !threadRepoNames(threads()).length) { await readWork(threads()); return state }
      let res
      try { res = await askSigned(buildQuery(entries, threadRepoNames(threads()))) } catch {
        save({ ...(state || {}), problem: { code: 'down', text: 'GitHub can’t be reached from this computer; Echo tries again in 5 minutes.', at: now } })
        return state
      }
      if (res.none) {
        if (state && state.at) save({ ...state, problem: { code: 'auth', text: 'This computer isn’t signed in to GitHub any more.', at: now } })
        return state
      }
      const r = res.r
      if (r.status !== 200) {
        save({ ...(state || {}), problem: { ...problemOf(r.status, r.body, signin && signin.from), at: now } })
        return state
      }
      let answer
      try { answer = JSON.parse(r.body) } catch { answer = null }
      if (!answer || !answer.data) {
        const msg = answer && answer.errors && answer.errors[0] && answer.errors[0].message
        save({ ...(state || {}), problem: { code: 'error', text: `GitHub couldn’t answer${msg ? `: ${msg}` : ''}.`, at: now } })
        return state
      }
      const ts = threads(), extra = threadRepoNames(ts)
      save(digest(answer, entries, now, extra))
      await readWork(ts)
      return state
    })().finally(() => { running = null })
    return running
  }

  /** What waits on you and on each thread (Echo's work rows), read after the widgets' query; a failure keeps the last
   *  rows (Echo marks them "not updated" if they get old). Echo is told to ask again. */
  const readWork = async (ts) => {
    try {
      const { entries } = parseEntries(picks.join('\n'))
      if (!entries.length && !threadRepoNames(ts).length) {
        // Nothing to look in: no rows, and GitHub isn't asked.
        if (state && state.work && ((state.work.me || []).length || Object.keys(state.work.threads || {}).length)) save({ ...state, work: { at: new Date().toISOString(), me: [], threads: {} } })
        else return
      } else {
      const res = await askSigned(buildWorkQuery(threadRepoNames(ts), entries))
      if (res.none || res.r.status !== 200) return
      const answer = JSON.parse(res.r.body)
      if (!answer || !answer.data) return
      save({ ...state, work: { at: new Date().toISOString(), ...workRows(answer, ts, entries) } })
      }
    } catch (e) { ctx.log(`work: ${e.message}`); return }
    if (ctx.work) { try { ctx.work.changed() } catch (e) { ctx.log(`work.changed: ${e.message}`) } }
  }

  /** What there is to pick from; asked again when older than 10 minutes, or when the section asks. */
  const discover = async (force) => {
    if (!force && found && Date.now() - new Date(found.at).getTime() < 600000) return found
    const res = await askSigned({ query: DISCOVER })
    if (res.none) return found
    if (res.r.status !== 200) throw new Error(problemOf(res.r.status, res.r.body, signin && signin.from).text)
    let answer
    try { answer = JSON.parse(res.r.body) } catch { answer = null }
    const d = discovered(answer, new Date().toISOString())
    if (!d) throw new Error('GitHub didn’t say what you can see')
    found = d
    ctx.store.write('discovery.json', JSON.stringify(d))
    return found
  }

  ctx.command('status', async () => {
    const s = await getSignin(false)
    let sources = null
    if (!s && ctx.signin && ctx.signin.sources) { try { sources = await ctx.signin.sources(SIGN_IN_HOST) } catch { sources = null } }
    return {
      echoCanSignIn: !!ctx.signin,
      // This Echo can keep a sign-in made here (GitHub's device sign-in, run by this plugin).
      canKeep: !!(ctx.signin && ctx.signin.keep),
      signedIn: !!s,
      from: (s && s.from) || '',
      sources,
      login: (state && state.login) || (found && found.login) || '',
      picks,
      checks: (state && state.checks) || [],
      at: (state && state.at) || '',
      problem: (state && state.problem) || null,
      rate: (state && state.rate) || null,
      list: (state && state.repos) || [],
      totals: (state && state.totals) || null,
      busy: !!running,
    }
  })

  ctx.command('discover', async ({ force } = {}) => discover(!!force))

  ctx.command('pick', async ({ entry, on } = {}) => {
    savePicks(toggled(picks, String(entry || ''), on !== false))
    await refresh('user')
    return picks
  })

  ctx.command('refresh', async () => { await getSignin(true); await refresh('user'); return true })

  // Signing in here (no sign-in on this computer): GitHub's device sign-in, run by this plugin — GitHub gives a code,
  // the section shows it with DEVICE_URL, you confirm it there; the section asks `signinPoll` every 2 s and this asks
  // GitHub no more often than it said. The device code stays in this memory; the sign-in goes to Echo to keep.
  let pending = null, ended = ''
  const keeper = () => {
    if (!ctx.signin || !ctx.signin.keep) throw new Error('This Echo can’t keep a GitHub sign-in made here yet — update Echo, or run gh auth login')
    return ctx.signin
  }
  const form = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  const toGitHub = async (path, fields) => {
    const r = await ctx.http.fetch(`https://github.com/${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'echo-github-plugin' },
      body: form(fields),
    })
    let v = null
    try { v = JSON.parse(r.body) } catch { v = null }
    return { status: r.status, v: v && typeof v === 'object' ? v : {} }
  }
  ctx.command('signinStart', async () => {
    keeper()
    const { status, v } = await toGitHub('login/device/code', { client_id: CLIENT_ID, scope: SCOPES })
    const c = deviceCodeOf(v)
    if (!c) throw new Error(`GitHub didn’t give a code (${status}${v.error ? `: ${String(v.error_description || v.error).replace(/[\x00-\x1f]/g, '').slice(0, 120)}` : ''})`)
    const now = Date.now()
    pending = { code: c.code, device: c.device, interval: c.interval, next: now + c.interval * 1000, until: now + c.expires * 1000 }
    ended = ''
    return { code: c.code, url: DEVICE_URL, expires_in: c.expires }
  })
  ctx.command('signinPoll', async () => {
    if (!pending) return { state: ended || 'none' }
    const now = Date.now()
    const waiting = () => ({ state: 'waiting', code: pending.code, url: DEVICE_URL })
    if (now >= pending.until) { pending = null; ended = 'expired'; return { state: ended } }
    if (now < pending.next) return waiting()
    const p = pending
    let step
    try {
      const { v } = await toGitHub('login/oauth/access_token', { client_id: CLIENT_ID, device_code: p.device, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' })
      step = deviceStepOf(v, p.interval)
    } catch { step = { state: 'waiting' } }  // not reached this time: asked again at the next turn
    if (pending !== p) return { state: ended || 'none' }  // cancelled meanwhile
    if (step.interval) p.interval = step.interval
    p.next = Date.now() + p.interval * 1000
    if (step.state === 'waiting') return waiting()
    pending = null
    if (step.state !== 'done') { ended = step.state; return step.error ? { state: ended, error: step.error } : { state: ended } }
    keeper().keep(SIGN_IN_HOST, step.token)
    ended = 'done'
    signin = null
    await getSignin(true)
    found = null
    refresh('user')
    return { state: 'done' }
  })
  ctx.command('signinCancel', () => { const was = !!pending; pending = null; ended = ''; return was })
  ctx.command('signOut', async () => {
    keeper().forget(SIGN_IN_HOST)
    signin = null
    ended = ''
    // The computer's own sign-in, if there is one, is used again.
    await getSignin(true)
    found = null
    if (signin) await refresh('user')
    else if (state && state.at) save({ ...state, problem: { code: 'auth', text: 'Signed out of GitHub.', at: new Date().toISOString() } })
    return true
  })

  // A thread's repos (its Profile row): read, and one turned on or off (owner/repo only).
  ctx.command('threadRepos', ({ thread } = {}) => reposOf(String(thread || '')))
  ctx.command('threadPick', async ({ thread, entry, on } = {}) => {
    thread = String(thread || '')
    const { entries } = parseEntries(String(entry || ''))
    if (entries.length !== 1 || entries[0].kind !== 'repo') throw new Error(`a thread's repo is written owner/repo: ${entry}`)
    const name = entryName(entries[0])
    const rest = reposOf(thread).filter((r) => r.toLowerCase() !== name.toLowerCase())
    const next = on === false ? rest : [...rest, name]
    if (next.length > 12) throw new Error('12 repos a thread at most')
    ctx.threads.set(thread, 'repos', next.length ? next : null)
    hint()
    await refresh('user')
    return next
  })

  const signedIn = () => !!signin || !!(state && state.at && !(state.problem && state.problem.code === 'auth'))
  // A widget set to a thread shows that thread's repos; none set → your picks; nothing picked → it asks you to pick.
  // The sign-in is looked up first (Echo may ask before the first read has): never "Sign in" while there is one.
  const scoped = async (params, kind, draw) => {
    await getSignin(false)
    if (!params || !params.thread) return signedIn() && !parseEntries(picks.join('\n')).entries.length ? noPicks(kind) : draw(state)
    // A thread with no repos says so; one with repos shows them (or "Reading GitHub…" before the first good read).
    const names = reposOf(params.thread)
    return names.length ? draw(forThread(state, names)) : signedIn() ? noThreadRepos(kind) : draw(null)
  }
  ctx.widgets.provide('repos', ({ params } = {}) => scoped(params, 'list', (st) => reposWidget(st, params, signedIn())))
  ctx.widgets.provide('ci', ({ params } = {}) => scoped(params, 'status', (st) => ciWidget(st, signedIn())))
  ctx.widgets.provide('glance', ({ params } = {}) => scoped(params, 'stats', (st) => glanceWidget(st, params, signedIn())))

  // Today → My work and the threads' Work tabs: from what was last read, never waiting on GitHub.
  if (ctx.work) {
    ctx.work.provide(async ({ scope, thread } = {}) => {
      const w = state && state.work
      if (w) await getSignin(false)
      if (!w || !signedIn()) return []
      if (scope === 'thread') return (w.threads && w.threads[thread]) || []
      // Only what is in the picks now (rows read before a pick was taken off, or by an older version, drop out at once).
      const { entries } = parseEntries(picks.join('\n'))
      return (w.me || []).filter((r) => inPicks(entries, r.where))
    })
  }
  hint()

  if (!ctx.terminal) ctx.every(EVERY, () => refresh('timer'))
}
