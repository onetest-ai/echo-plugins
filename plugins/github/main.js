// GitHub — the host half. Reads GitHub for the repos and organisations you pick and keeps what it read, so Today's
// widgets answer at once and never wait on GitHub:
// - your sign-in: the one this computer already has (GitHub CLI, else git), which Echo hands it (`ctx.signin`,
//   `uses.signin`); held in memory only — never kept, shown, logged, or sent anywhere but api.github.com;
// - what to show: the organisations and repos you pick in its section, found for you (`discover`: your
//   organisations, the repos you pushed to lately), kept in its store as `picks.json`; nothing picked = the repos
//   you pushed to last;
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
 *  with `p<i>` / `i<i>` (its open PR and issue counts over all its repos); no entries → your last-pushed repos. */
export function buildQuery(entries) {
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
  if (!entries.length) fields.push(`mine: viewer { ${REPOS(PER_OWNER)}, ${MINE}) { nodes { ...R } } }`)
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
export function digest(answer, entries, now) {
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
  if (!entries.length && data.mine) for (const r of data.mine.repositories.nodes) add(r)
  if (!entries.length) for (const r of repos) { counted.prs += r.prs; counted.issues += r.issues }
  // Reviews waiting on you: all of them with no entries, else those in the entries' repos and organisations.
  const inScope = (full) => {
    const [owner] = full.toLowerCase().split('/')
    return !entries.length || owners.includes(owner) || entries.some((e) => e.kind === 'repo' && entryName(e).toLowerCase() === full.toLowerCase())
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
  if (!entries.length) reviews = Math.max(reviews, rv.issueCount || 0)
  const rate = data.rateLimit ? { remaining: data.rateLimit.remaining, limit: data.rateLimit.limit, resetAt: data.rateLimit.resetAt } : null
  return {
    at: now,
    login: (data.viewer && data.viewer.login) || '',
    rate,
    repos,
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
export function problemOf(status, body) {
  let msg = ''
  try { msg = (JSON.parse(body || '{}').message || '') } catch { msg = '' }
  if (status === 401) return { code: 'auth', text: 'GitHub refused this computer’s sign-in — it may have expired. Run gh auth login again, then Check again.' }
  if (status === 403 && /rate limit/i.test(msg)) return { code: 'rate', text: 'GitHub’s limit for this hour is used up; Echo tries again after it resets.' }
  if (status === 403) return { code: 'auth', text: 'GitHub refused: this computer’s sign-in can’t read this (it needs repo access; gh auth login gives it).' }
  if (status >= 500 || status === 0) return { code: 'down', text: 'GitHub didn’t answer; Echo tries again in 5 minutes.' }
  return { code: 'error', text: `GitHub answered ${status}${msg ? `: ${msg}` : ''}.` }
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

export function apply(ctx) {
  const read = (path) => { try { const t = ctx.store.read(path); return t ? JSON.parse(t) : null } catch { return null } }
  let state = read('state.json')
  let picks = read('picks.json') || []
  let found = read('discovery.json')
  let running = null
  // The sign-in Echo gave: in memory only, asked for again when GitHub refuses it.
  let signin = null, signinAt = 0

  const save = (st) => { state = st; ctx.store.write('state.json', JSON.stringify(st)) }
  const savePicks = (list) => { picks = list; ctx.store.write('picks.json', JSON.stringify(list)) }

  /** The computer's sign-in to GitHub, from Echo: {token, from} or null; looked up again after a minute when none. */
  const getSignin = async (fresh) => {
    if (!ctx.signin) return null
    if (signin && !fresh) return signin
    if (!signin && !fresh && Date.now() - signinAt < 60000) return null
    signinAt = Date.now()
    try { signin = await ctx.signin.get(SIGN_IN_HOST) } catch (e) { ctx.log(`sign-in: ${e.message}`); signin = null }
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
      let res
      try { res = await askSigned(buildQuery(entries)) } catch {
        save({ ...(state || {}), problem: { code: 'down', text: 'GitHub can’t be reached from this computer; Echo tries again in 5 minutes.', at: now } })
        return state
      }
      if (res.none) {
        if (state && state.at) save({ ...state, problem: { code: 'auth', text: 'This computer isn’t signed in to GitHub any more.', at: now } })
        return state
      }
      const r = res.r
      if (r.status !== 200) {
        save({ ...(state || {}), problem: { ...problemOf(r.status, r.body), at: now } })
        return state
      }
      let answer
      try { answer = JSON.parse(r.body) } catch { answer = null }
      if (!answer || !answer.data) {
        const msg = answer && answer.errors && answer.errors[0] && answer.errors[0].message
        save({ ...(state || {}), problem: { code: 'error', text: `GitHub couldn’t answer${msg ? `: ${msg}` : ''}.`, at: now } })
        return state
      }
      save(digest(answer, entries, now))
      return state
    })().finally(() => { running = null })
    return running
  }

  /** What there is to pick from; asked again when older than 10 minutes, or when the section asks. */
  const discover = async (force) => {
    if (!force && found && Date.now() - new Date(found.at).getTime() < 600000) return found
    const res = await askSigned({ query: DISCOVER })
    if (res.none) return found
    if (res.r.status !== 200) throw new Error(problemOf(res.r.status, res.r.body).text)
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

  const signedIn = () => !!signin || !!(state && state.at && !(state.problem && state.problem.code === 'auth'))
  ctx.widgets.provide('repos', ({ params } = {}) => reposWidget(state, params, signedIn()))
  ctx.widgets.provide('ci', () => ciWidget(state, signedIn()))
  ctx.widgets.provide('glance', ({ params } = {}) => glanceWidget(state, params, signedIn()))

  if (!ctx.terminal) ctx.every(EVERY, () => refresh('timer'))
}
