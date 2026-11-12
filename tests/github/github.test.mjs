import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseEntries, buildQuery, ciOf, digest, problemOf, deviceCodeOf, deviceStepOf, DEVICE_URL, pickScope, inPicks, reposWidget, ciWidget, glanceWidget, discovered, toggled, actionsUrl, forThread, noThreadRepos, buildWorkQuery, workRows, threadRepoNames, apply } from '../../plugins/github/main.js'
import { fakeCtx } from '../helpers/fake-ctx.mjs'

const answer = JSON.parse(readFileSync(new URL('./fixtures/answer.json', import.meta.url), 'utf8'))
const REPOS = 'acme-test\nacme-test/api\nacme-labs/site\nacme-test/gone'
const NOW = '2026-11-12T09:00:00.000Z'
const state = () => digest(answer, parseEntries(REPOS).entries, NOW)

test('entries: repos, organisations, links; duplicates and junk out', () => {
  const { entries, bad } = parseEntries('acme-test/api, https://github.com/acme-test/web.git\nACME-TEST/API\n acme-test \nnot a repo\na/b/c')
  assert.deepEqual(entries, [
    { kind: 'repo', owner: 'acme-test', name: 'api' },
    { kind: 'repo', owner: 'acme-test', name: 'web' },
    { kind: 'owner', login: 'acme-test' },
  ])
  assert.deepEqual(bad, ['not a repo', 'a/b/c'])
  assert.deepEqual(parseEntries('').entries, [])
})

test('query: names go in variables, never in the text; nothing picked reads no repos', () => {
  const { query, variables } = buildQuery(parseEntries('acme-test\nacme-labs/site').entries)
  assert.match(query, /w0: repositoryOwner\(login: \$l0\)/)
  assert.match(query, /r1: repository\(owner: \$o1, name: \$n1\)/)
  assert.ok(!query.includes('acme'))
  assert.deepEqual(variables, { l0: 'acme-test', p0: 'user:acme-test is:pr is:open archived:false', i0: 'user:acme-test is:issue is:open archived:false', o1: 'acme-labs', n1: 'site' })
  const none = buildQuery([])
  assert.match(none.query, /^query GitHub \{/)
  assert.ok(!/mine: viewer|repositories\(/.test(none.query.split('fragment')[0]), 'no fallback to your last-pushed repos')
  assert.deepEqual(none.variables, {})
})

test('CI: the rollup in plain words, failing workflows named once', () => {
  const api = answer.data.w0.repositories.nodes[0]
  assert.deepEqual(ciOf(api), { ci: 'failing', failing: ['deploy'] })
  assert.deepEqual(ciOf(answer.data.w0.repositories.nodes[1]), { ci: 'running', failing: [] })
  assert.deepEqual(ciOf(answer.data.w0.repositories.nodes[2]), { ci: 'none', failing: [] })
  assert.deepEqual(ciOf(answer.data.r2), { ci: 'passing', failing: [] })
})

test('digest: repos once, counts not doubled, reviews in scope, missing entries said', () => {
  const st = state()
  assert.equal(st.login, 'ada-acme')
  assert.deepEqual(st.repos.map((r) => r.repo), ['acme-test/api', 'acme-test/web', 'acme-test/docs', 'acme-labs/site'])
  assert.deepEqual(st.repos.map((r) => r.reviews), [1, 1, 0, 0])
  // The organisation's own counts (11 PRs, 30 issues) + acme-labs/site's; acme-test/api is inside the organisation.
  assert.deepEqual(st.totals, { prs: 12, issues: 35, reviews: 2, failing: 1, running: 1 })
  assert.deepEqual(st.checks, [
    { entry: 'acme-test', ok: true, repos: 14 },
    { entry: 'acme-test/api', ok: true, repos: 1 },
    { entry: 'acme-labs/site', ok: true, repos: 1 },
    { entry: 'acme-test/gone', ok: false, why: 'not found, or your sign-in can’t see it' },
  ])
  assert.deepEqual(st.rate, { remaining: 4812, limit: 5000, resetAt: '2026-11-12T10:00:00Z' })
})

test('problems in the user’s words', () => {
  assert.equal(problemOf(401, '{"message":"Bad credentials"}').code, 'auth')
  assert.match(problemOf(401, '', 'gh').text, /gh auth login/)
  assert.match(problemOf(401, '', 'echo').text, /Sign out, then sign in again/)
  assert.equal(problemOf(403, '{"message":"API rate limit exceeded for user"}').code, 'rate')
  assert.equal(problemOf(403, '{"message":"Resource not accessible"}').code, 'auth')
  assert.equal(problemOf(502, '').code, 'down')
  assert.equal(problemOf(422, '{"message":"odd"}').text, 'GitHub answered 422: odd.')
})

// The shapes Echo draws (Echo: .ai-run/guides/plugins/plugin-authoring.md, Host half R16, R17).
const isList = (d) => Array.isArray(d.items) && d.items.every((i) => typeof i.title === 'string' && (i.sub === undefined || typeof i.sub === 'string') && i.link === undefined)
const isStatus = (d) => ['ok', 'warn', 'bad'].includes(d.state) && typeof d.title === 'string' && (d.text === undefined || typeof d.text === 'string') && (d.open === undefined || /^https:\/\//.test(d.open))
const isStats = (d) => Array.isArray(d.items) && d.items.length <= 4 && d.items.every((i) => typeof i.label === 'string' && (i.tone === undefined || ['good', 'warn', 'bad'].includes(i.tone)))
const actionsOk = (d) => d.actions === undefined || (d.actions.length <= 3 && d.actions.every((a) => a.label && a.command))

test('Repos widget: failing first, what the settings ask for', () => {
  const now = Date.parse(NOW) + 60000
  const d = reposWidget(state(), {}, true, now)
  assert.ok(isList(d) && actionsOk(d))
  assert.deepEqual(d.items.map((i) => i.title), ['acme-test/api', 'acme-test/web', 'acme-test/docs', 'acme-labs/site'])
  assert.equal(d.items[0].sub, '✗ CI failing: deploy · 4 open PRs · 1 review for you')
  assert.equal(reposWidget(state(), { ci: false, prs: false, reviews: false, issues: true }).items[3].sub, '5 open issues')
  assert.match(reposWidget(null, {}, false).empty, /gh auth login/)
})

test('CI widget: the worst state, the failing repo opens its Actions', () => {
  const now = Date.parse(NOW) + 60000
  const d = ciWidget(state(), true, now)
  assert.ok(isStatus(d) && actionsOk(d))
  assert.equal(d.state, 'bad')
  assert.equal(d.text, '1 failing: acme-test/api · deploy')
  assert.equal(d.open, 'https://github.com/acme-test/api/actions')
  const green = { ...state(), repos: state().repos.filter((r) => r.ci === 'passing' || r.ci === 'none') }
  assert.equal(ciWidget(green, true, now).text, 'All passing (1 repo)')
  // Old, or the last read failed: dated.
  assert.match(ciWidget({ ...green, problem: { code: 'down', text: 'x' } }, true, now).text, /· as of \d\d:\d\d$/)
  assert.equal(ciWidget(null, false).state, 'warn')
})

test('glance widget: up to four numbers, tones where they matter', () => {
  const now = Date.parse(NOW) + 60000
  const d = glanceWidget(state(), {}, true, now)
  assert.ok(isStats(d))
  assert.deepEqual(d.items, [
    { label: 'CI failing', value: 1, tone: 'bad' },
    { label: 'Open PRs', value: 12 },
    { label: 'Reviews for you', value: 2, tone: 'warn' },
  ])
  assert.equal(glanceWidget(state(), { issues: true }, true, now).items.length, 4)
  assert.equal(d.note, undefined)
})

test('picks: one on or off, organisations first, junk refused', () => {
  assert.deepEqual(toggled([], 'acme-test/api', true), ['acme-test/api'])
  assert.deepEqual(toggled(['acme-test/api'], 'acme-test', true), ['acme-test', 'acme-test/api'])
  assert.deepEqual(toggled(['acme-test', 'acme-test/api'], 'ACME-TEST/API', false), ['acme-test'])
  assert.deepEqual(toggled(['acme-test'], 'https://github.com/acme-labs/site', true), ['acme-test', 'acme-labs/site'])
  assert.throws(() => toggled([], 'not a repo', true), /not a repo or an organisation/)
})

const found = { data: { viewer: { login: 'ada-acme',
  organizations: { nodes: [{ login: 'acme-test', name: 'Acme Test', repositories: { totalCount: 14 } }] },
  repositories: { totalCount: 52, nodes: [{ nameWithOwner: 'acme-test/api', pushedAt: '2026-11-11T10:00:00Z' }, { nameWithOwner: 'ada-acme/notes', pushedAt: '2026-11-01T10:00:00Z' }] } } } }

test('discovery: your organisations and the repos you pushed to lately', () => {
  assert.deepEqual(discovered(found, NOW), {
    at: NOW, login: 'ada-acme', allRepos: 52,
    orgs: [{ login: 'acme-test', name: 'Acme Test', repos: 14 }],
    repos: [{ repo: 'acme-test/api', pushedAt: '2026-11-11T10:00:00Z' }, { repo: 'ada-acme/notes', pushedAt: '2026-11-01T10:00:00Z' }],
  })
  assert.equal(discovered({ errors: [{}] }, NOW), null)
})


/** Requests of the widgets' query only (each refresh also asks the work query). */
const mains = (ctx) => ctx.requests.filter((r) => JSON.parse(r.opts.body).query.startsWith('query GitHub')).length
// The host half, with a fake ctx: the computer's sign-in from Echo, GitHub's answers from fixtures.
const ok = (body) => ({ status: 200, body: JSON.stringify(body) })
const GH = { token: 'gho_' + 'x'.repeat(36), from: 'gh' }
/** The fixture's entries, picked. */
const PICKED = { 'picks.json': JSON.stringify(REPOS.split('\n')) }
const github = (opts) => {
  const q = JSON.parse(opts.body).query
  return ok(q.startsWith('query Discover') ? found : answer)
}

test('signed in on this computer: GitHub is read with that sign-in; the token never leaves the host half', async () => {
  const ctx = fakeCtx({ signin: GH, store: PICKED, fetch: (url, opts) => {
    assert.equal(url, 'https://api.github.com/graphql')
    assert.equal(opts.method, 'POST')
    assert.equal(opts.headers.Authorization, `bearer ${GH.token}`)
    return github(opts)
  } })
  apply(ctx)
  await ctx.run('refresh')
  const s = await ctx.run('status')
  assert.deepEqual([s.signedIn, s.from, s.login, s.list.length], [true, 'gh', 'ada-acme', 4])
  assert.ok(ctx.signins.every((h) => h.startsWith('github.com')), ctx.signins.join())
  const d = await ctx.run('discover')
  assert.equal(d.orgs[0].login, 'acme-test')
  for (const out of [s, d, await ctx.widget('repos'), await ctx.widget('ci'), await ctx.widget('glance')]) {
    assert.ok(!JSON.stringify(out).includes(GH.token), 'the token is never shown')
  }
  assert.ok(!Object.values(ctx.files).some((f) => f.includes(GH.token)), 'the token is never kept')
  assert.equal((await ctx.widget('ci')).state, 'bad')
})

test('not signed in on this computer: nothing is fetched, the section says how, widgets ask to sign in', async () => {
  const ctx = fakeCtx({ signin: null, sources: { gh: false, git: true }, fetch: () => { throw new Error('should not fetch') } })
  apply(ctx)
  await ctx.tick()
  const s = await ctx.run('status')
  assert.deepEqual([s.echoCanSignIn, s.signedIn, s.sources.gh], [true, false, false])
  assert.equal(ctx.requests.length, 0)
  assert.match((await ctx.widget('repos')).empty, /gh auth login/)
})

test('an Echo without ctx.signin: the section says to update Echo', async () => {
  const ctx = fakeCtx({})
  apply(ctx)
  const s = await ctx.run('status')
  assert.deepEqual([s.echoCanSignIn, s.signedIn], [false, false])
})

test('GitHub refuses the sign-in: it is looked up again once (renewed), then the refusal is said', async () => {
  let n = 0
  const tokens = ['gho_old' + 'x'.repeat(32), 'gho_new' + 'x'.repeat(32)]
  const ctx = fakeCtx({ store: PICKED, signin: () => ({ token: tokens[Math.min(n++, 1)], from: 'gh' }), fetch: (url, opts) => (opts.headers.Authorization.includes('gho_old') ? { status: 401, body: '{"message":"Bad credentials"}' } : github(opts)) })
  apply(ctx)
  await ctx.tick()
  assert.equal((await ctx.run('status')).list.length, 4)
  assert.equal(mains(ctx), 2)
  assert.ok(ctx.signins.includes('github.com (fresh)'), 'a refused sign-in is looked up again, not taken from what Echo kept')
})

test('device sign-in answers: only a code and device code of plain characters; the address is never GitHub’s to choose', () => {
  assert.deepEqual(deviceCodeOf({ device_code: 'dev-1', user_code: 'WDJB-MJHT', verification_uri: 'https://evil.example/', expires_in: 900, interval: 5 }), { code: 'WDJB-MJHT', device: 'dev-1', expires: 900, interval: 5 })
  assert.deepEqual(deviceCodeOf({ device_code: 'd', user_code: 'ABCD-1234', expires_in: 99999, interval: 0 }), { code: 'ABCD-1234', device: 'd', expires: 1800, interval: 1 })
  for (const bad of [null, {}, { device_code: 'd', user_code: '<b>x</b>' }, { device_code: 'a b', user_code: 'ABCD-1234' }, { error: 'unauthorized_client' }]) assert.equal(deviceCodeOf(bad), null)
  assert.equal(DEVICE_URL, 'https://github.com/login/device')
  assert.deepEqual(deviceStepOf({ error: 'authorization_pending' }, 5), { state: 'waiting' })
  assert.deepEqual(deviceStepOf({ error: 'slow_down', interval: 10 }, 5), { state: 'waiting', interval: 10 })
  assert.deepEqual(deviceStepOf({ error: 'slow_down' }, 5), { state: 'waiting', interval: 10 })
  // At GitHub's 60 s already, slow_down stays at 60 (never more, never a failure).
  assert.deepEqual(deviceStepOf({ error: 'slow_down' }, 60), { state: 'waiting', interval: 60 })
  assert.deepEqual(deviceStepOf({ error: 'slow_down', interval: 600 }, 60), { state: 'waiting', interval: 60 })
  // GitHub's interval of 0 or less, or one under ours: never faster than before.
  assert.deepEqual(deviceStepOf({ error: 'slow_down', interval: 0 }, 5), { state: 'waiting', interval: 6 })
  assert.deepEqual(deviceStepOf({ error: 'slow_down', interval: -5 }, 1), { state: 'waiting', interval: 2 })
  assert.deepEqual(deviceStepOf({ error: 'slow_down', interval: 3 }, 5), { state: 'waiting', interval: 6 })
  assert.deepEqual(deviceStepOf({ error: 'expired_token' }, 5), { state: 'expired' })
  assert.deepEqual(deviceStepOf({ error: 'access_denied' }, 5), { state: 'denied' })
  assert.deepEqual(deviceStepOf({ error: 'incorrect_client_credentials', error_description: 'The client_id\nis wrong' }, 5), { state: 'failed', error: 'The client_idis wrong' })
  assert.deepEqual(deviceStepOf({ access_token: 'gho_x', scope: 'repo' }, 5), { state: 'done', token: 'gho_x' })
  assert.equal(deviceStepOf({ access_token: 'gho x' }, 5).state, 'failed')
})

/** A made-up GitHub for the device sign-in and the API: `answers.token` is what the token endpoint says next. */
const deviceGitHub = (answers) => (url, opts) => {
  if (url === 'https://github.com/login/device/code') { answers.asked.push(opts.body); return { status: 200, body: JSON.stringify({ device_code: 'dev-1', user_code: 'WDJB-MJHT', verification_uri: 'https://github.com/login/device', expires_in: 900, interval: 1 }) } }
  if (url === 'https://github.com/login/oauth/access_token') { answers.asked.push(opts.body); return { status: 200, body: JSON.stringify(answers.token) } }
  assert.equal(opts.headers.Authorization, `bearer ${answers.api}`)
  return github(opts)
}

test('without a sign-in on the computer: sign in here (GitHub’s device sign-in), Echo keeps it, GitHub is read with it; sign out', async () => {
  const TOKEN = 'gho_madehere' + 'x'.repeat(29)
  const answers = { asked: [], token: { error: 'authorization_pending' }, api: TOKEN }
  const ctx = fakeCtx({ store: PICKED, keep: true, signin: null, sources: { gh: false, git: false }, fetch: deviceGitHub(answers) })
  apply(ctx)
  await ctx.tick()
  let s = await ctx.run('status')
  assert.deepEqual([s.signedIn, s.canKeep], [false, true])
  assert.deepEqual(await ctx.run('signinStart'), { code: 'WDJB-MJHT', url: 'https://github.com/login/device', expires_in: 900 })
  assert.equal(answers.asked[0], 'client_id=Ov23liJp2izMv6RZZS23&scope=repo%20read%3Aorg')
  // Asked again only after GitHub's interval (1 s here): a poll before it doesn't reach GitHub.
  assert.deepEqual(await ctx.run('signinPoll'), { state: 'waiting', code: 'WDJB-MJHT', url: 'https://github.com/login/device' })
  assert.equal(answers.asked.length, 1)
  await new Promise((r) => setTimeout(r, 1050))
  assert.equal((await ctx.run('signinPoll')).state, 'waiting')
  assert.equal(answers.asked[1], 'client_id=Ov23liJp2izMv6RZZS23&device_code=dev-1&grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code')
  // Confirmed on GitHub: Echo keeps it; GitHub is read with it.
  answers.token = { access_token: TOKEN, token_type: 'bearer', scope: 'repo,read:org' }
  await new Promise((r) => setTimeout(r, 1050))
  assert.deepEqual(await ctx.run('signinPoll'), { state: 'done' })
  assert.deepEqual(ctx.keptNow, { 'github.com': TOKEN })
  await new Promise((r) => setTimeout(r, 10))
  s = await ctx.run('status')
  assert.deepEqual([s.signedIn, s.from, s.login], [true, 'echo', 'ada-acme'])
  assert.ok(!JSON.stringify(s).includes(TOKEN) && !Object.values(ctx.files).some((f) => f.includes(TOKEN) || f.includes('dev-1')), 'neither the token nor the device code is shown or kept by the plugin')
  assert.deepEqual(await ctx.run('signinPoll'), { state: 'done' })
  // GitHub refuses it later: sign out and in again.
  const refused = fakeCtx({ store: PICKED, keep: true, signin: null, fetch: () => ({ status: 401, body: '{"message":"Bad credentials"}' }) })
  refused.keptNow['github.com'] = TOKEN
  apply(refused)
  await refused.run('refresh')
  assert.match((await refused.run('status')).problem.text, /sign-in you made in Echo.*Sign out, then sign in again/)
  // Sign out: Echo forgets it; nothing left to read with.
  const before = ctx.requests.length
  assert.equal(await ctx.run('signOut'), true)
  assert.deepEqual(ctx.keptNow, {})
  s = await ctx.run('status')
  assert.deepEqual([s.signedIn, s.problem.text], [false, 'Signed out of GitHub.'])
  assert.equal(ctx.requests.length, before)
})

test('device sign-in: refused, cancelled (a later confirmation isn’t kept), GitHub won’t give a code; an Echo that can’t keep it says to update', async () => {
  const answers = { asked: [], token: { error: 'access_denied' }, api: '' }
  const ctx = fakeCtx({ keep: true, signin: null, fetch: deviceGitHub(answers) })
  apply(ctx)
  await ctx.run('signinStart')
  await new Promise((r) => setTimeout(r, 1050))
  assert.deepEqual(await ctx.run('signinPoll'), { state: 'denied' })
  await ctx.run('signinStart')
  assert.equal(await ctx.run('signinCancel'), true)
  answers.token = { access_token: 'gho_late', scope: 'repo' }
  await new Promise((r) => setTimeout(r, 1050))
  assert.deepEqual(await ctx.run('signinPoll'), { state: 'none' })
  assert.deepEqual(ctx.keptNow, {})
  const noCode = fakeCtx({ keep: true, signin: null, fetch: () => ({ status: 200, body: '{"error":"device_flow_disabled","error_description":"Device Flow must be explicitly enabled"}' }) })
  apply(noCode)
  await assert.rejects(noCode.run('signinStart'), /GitHub didn’t give a code \(200: Device Flow must be explicitly enabled\)/)
  const old = fakeCtx({ signin: null })
  apply(old)
  assert.equal((await old.run('status')).canKeep, false)
  await assert.rejects(old.run('signinStart'), /can’t keep a GitHub sign-in made here yet/)
})

test('nothing picked: the widgets ask to pick, nothing is read for them; right after start a signed-in plugin never says "Sign in"', async () => {
  const ctx = fakeCtx({ signin: GH, fetch: (url, opts) => github(opts) })
  apply(ctx)
  // Asked before any read (Echo just started): the sign-in is looked up, not assumed missing.
  assert.match((await ctx.widget('repos')).empty, /Pick a repo or organisation to watch/)
  assert.equal((await ctx.widget('ci')).text, 'Pick a repo or organisation to watch — Settings → From plugins → GitHub')
  assert.equal((await ctx.widget('glance')).items[0].label, 'Pick a repo to watch')
  assert.ok(ctx.signins.length >= 1)
  await ctx.run('refresh')
  const q = ctx.requests.map((r) => JSON.parse(r.opts.body).query).find((x) => x.startsWith('query GitHub'))
  assert.ok(!/repositories\(/.test(q.split('fragment')[0]), 'no repos read with nothing picked')
  assert.match((await ctx.widget('glance')).items[0].label, /Pick a repo/)
  // Not signed in at all: it still says how to sign in.
  const out = fakeCtx({ signin: null, sources: { gh: false, git: false } })
  apply(out)
  assert.match((await out.widget('ci')).text, /Sign in to GitHub/)
})

test('a failed read keeps the last answer and says why', async () => {
  let status = 200
  const ctx = fakeCtx({ signin: GH, store: PICKED, fetch: (url, opts) => (status === 200 ? github(opts) : { status, body: '' }) })
  apply(ctx)
  await ctx.run('refresh')
  status = 502
  await ctx.run('refresh')
  const s = await ctx.run('status')
  assert.equal(s.problem.code, 'down')
  assert.ok(s.list.length > 0)
  assert.match((await ctx.widget('ci')).text, /as of/)
})

test('pick: kept in the store, GitHub read again; in a terminal no timer is set', async () => {
  const ctx = fakeCtx({ signin: GH, fetch: (url, opts) => github(opts) })
  apply(ctx)
  assert.deepEqual(await ctx.run('pick', { entry: 'acme-test', on: true }), ['acme-test'])
  assert.deepEqual(await ctx.run('pick', { entry: 'acme-test/api', on: true }), ['acme-test', 'acme-test/api'])
  assert.deepEqual(await ctx.run('pick', { entry: 'acme-test', on: false }), ['acme-test/api'])
  assert.deepEqual(JSON.parse(ctx.files['picks.json']), ['acme-test/api'])
  assert.equal(mains(ctx), 3)
  await assert.rejects(ctx.run('pick', { entry: 'no good', on: true }), /not a repo or an organisation/)
  const term = fakeCtx({ terminal: true, signin: GH })
  apply(term)
  assert.equal(term.timers.length, 0)
})

test('near GitHub’s hourly limit the timer waits for the reset; Refresh still reads', async () => {
  const low = { ...answer, data: { ...answer.data, rateLimit: { remaining: 10, limit: 5000, resetAt: '2999-01-01T00:00:00Z' } } }
  const ctx = fakeCtx({ signin: GH, fetch: () => ok(low) })
  apply(ctx)
  await ctx.run('refresh')
  await ctx.tick()
  assert.equal(mains(ctx), 1)
  await ctx.run('refresh')
  assert.equal(mains(ctx), 2)
})

test('links are built only from names GitHub could have (a hostile name gives none)', () => {
  assert.equal(actionsUrl('acme-test/api'), 'https://github.com/acme-test/api/actions')
  for (const bad of ['acme-labs/<img src=x onerror=alert(1)>', 'acme/a b', 'javascript:alert(1)', '', null]) assert.equal(actionsUrl(bad), '')
  const st = { at: NOW, repos: [{ repo: 'acme-labs/<img src=x>', url: 'https://github.com/acme-labs/<img src=x>', ci: 'failing', failing: ['x'], prs: 0, issues: 0, reviews: 0 }] }
  assert.equal(ciWidget(st, true, Date.parse(NOW)).open, undefined)
})

// ── Threads and work rows ──
const work = JSON.parse(readFileSync(new URL('./fixtures/work.json', import.meta.url), 'utf8'))
const THREADS = [{ thread: 'acme-rollout', value: ['acme-test/api'] }, { thread: 'globex-pilot', value: [] }]

test('the threads’ repos ride the main query as x<i>, by variables; digest keeps them apart', () => {
  const { query, variables } = buildQuery(parseEntries('acme-labs/site').entries, ['acme-test/api'])
  assert.match(query, /x0: repository\(owner: \$xo0, name: \$xn0\)/)
  assert.equal(variables.xo0, 'acme-test')
  const a = { data: { ...answer.data, x0: answer.data.w0.repositories.nodes[0] } }
  const st = digest(a, parseEntries('acme-labs/site').entries, NOW, ['acme-test/api'])
  assert.deepEqual(Object.keys(st.threadRepos), ['acme-test/api'])
  assert.equal(st.threadRepos['acme-test/api'].reviews, 1)
  assert.ok(!st.repos.some((r) => r.repo === 'acme-test/api'), 'a thread’s repo isn’t one of your picks')
})

test('a widget set to a thread: its repos, totals over them; none → says where to add them', () => {
  const st = { ...state(), threadRepos: {} }
  const v = forThread(st, ['acme-test/web', 'ACME-LABS/site', 'nope/gone'])
  assert.deepEqual(v.repos.map((r) => r.repo), ['acme-test/web', 'acme-labs/site'])
  assert.deepEqual(v.totals, { prs: 3, issues: 6, reviews: 1, failing: 0, running: 1 })
  assert.equal(forThread(st, []), null)
  assert.match(noThreadRepos('list').empty, /add them in its Profile/)
  assert.equal(noThreadRepos('status').state, 'warn')
  assert.equal(noThreadRepos('stats').items.length, 1)
})

test('the work query: three searches scoped to the picks, each thread repo, names in variables; nothing picked: no searches', () => {
  const entries = parseEntries('acme-test\nacme-labs/site').entries
  const { query, variables } = buildWorkQuery(['acme-test/api'], entries)
  assert.match(query, /^query Work\(/)
  assert.match(query, /t0: repository\(owner: \$to0, name: \$tn0\)/)
  assert.equal(variables.qr, 'is:open is:pr review-requested:@me archived:false user:acme-test repo:acme-labs/site')
  assert.equal(variables.qa, 'is:open is:issue assignee:@me archived:false user:acme-test repo:acme-labs/site')
  assert.ok(!query.includes('acme'))
  const none = buildWorkQuery(['acme-test/api'])
  assert.ok(!/rv:|my:|asg:/.test(none.query) && !('qr' in none.variables), 'nothing picked: nothing searched for My work')
  assert.match(none.query, /t0: repository/, 'a thread’s repos are still read for its Work')
  // Too many picks for GitHub's 256 characters: searched without them, filtered here.
  const many = parseEntries(Array.from({ length: 12 }, (_, i) => `some-organisation-${i}/some-repository-${i}`).join('\n')).entries
  assert.equal(pickScope(many), '')
  assert.equal(buildWorkQuery([], many).variables.qr, 'is:open is:pr review-requested:@me archived:false')
  assert.ok(inPicks(entries, 'ACME-TEST/anything') && inPicks(entries, 'acme-labs/site') && !inPicks(entries, 'acme-labs/other') && !inPicks(entries, 'elsewhere-co/tool'))
  assert.deepEqual(threadRepoNames([{ thread: 'a', value: ['x/y', 'X/Y'] }, { thread: 'b', value: ['z/w'] }]), ['x/y', 'z/w'])
})

test('work rows: reviews, your PRs that need you, assigned issues; a thread’s PRs and issues; links only to github.com', () => {
  const w = workRows(work, THREADS)
  assert.deepEqual(w.me.map((r) => [r.id, r.kind]), [
    ['pr:acme-test/api#7', 'review'], ['pr:elsewhere-co/tool#3', 'review'],
    ['pr:acme-test/web#11', 'my PR'], ['pr:acme-test/web#12', 'my PR'],
    ['issue:acme-test/api#21', 'assigned'], ['issue:acme-labs/site#22', 'assigned'],
  ])
  assert.equal(w.me[2].title, 'Speed up search — changes asked')
  assert.equal(w.me[3].title, 'Bump deps — checks failing')
  assert.equal(w.me[0].thread, 'acme-rollout', 'a review in a thread’s repo shows in that thread too')
  assert.equal(w.me[1].thread, undefined)
  assert.equal(w.me[4].due, '2026-11-20')
  assert.equal(w.me[4].title, 'Flaky test <b>', 'text as GitHub gave it (Echo escapes)')
  assert.equal(w.me[5].url, undefined, 'a link that isn’t https://github.com/… is left out')
  assert.equal(w.me[5].due, undefined)
  assert.deepEqual(w.threads['acme-rollout'].map((r) => [r.id, r.kind]), [['pr:acme-test/api#7', 'PR'], ['pr:acme-test/api#8', 'draft PR'], ['issue:acme-test/api#21', 'issue']])
  assert.deepEqual(w.threads['globex-pilot'], [])
  // What Echo checks of a row (jshost::work::check_rows): id unique, kind short, url https, due YYYY-MM-DD.
  for (const rows of [w.me, ...Object.values(w.threads)]) {
    assert.equal(new Set(rows.map((r) => r.id)).size, rows.length)
    for (const r of rows) {
      assert.ok(r.title && r.kind.length <= 30)
      assert.ok(r.url === undefined || /^https:\/\//.test(r.url))
      assert.ok(r.due === undefined || /^\d{4}-\d{2}-\d{2}$/.test(r.due))
    }
  }
})

test('the host half: a thread’s repos kept per thread, Claude told, rows answered from what was read', async () => {
  const threads = {}
  const ctx = fakeCtx({ signin: GH, threads, work: true, hints: true, fetch: (url, opts) => {
    const q = JSON.parse(opts.body).query
    return ok(q.startsWith('query Work') ? work : q.startsWith('query Discover') ? found : answer)
  } })
  apply(ctx)
  assert.deepEqual(await ctx.run('threadPick', { thread: 'acme-rollout', entry: 'acme-test/api', on: true }), ['acme-test/api'])
  assert.deepEqual(threads['acme-rollout'].repos, ['acme-test/api'])
  assert.match(ctx.hintsNow[0].text, /This thread's GitHub repos: acme-test\/api/)
  assert.equal(ctx.hintsNow[0].thread, 'acme-rollout')
  await assert.rejects(ctx.run('threadPick', { thread: 'acme-rollout', entry: 'acme-test', on: true }), /owner\/repo/)
  assert.ok(ctx.workState.changed >= 1, 'Echo told to ask again after a read')
  // Nothing picked: nothing on My work (a thread's own repos still fill its Work).
  assert.deepEqual(await ctx.rows({ scope: 'me' }), [])
  // acme-test picked: only its rows (GitHub's answer is the same here — the filter is the plugin's own).
  await ctx.run('pick', { entry: 'acme-test', on: true })
  const me = await ctx.rows({ scope: 'me' })
  assert.deepEqual(me.map((r) => r.id), ['pr:acme-test/api#7', 'pr:acme-test/web#11', 'pr:acme-test/web#12', 'issue:acme-test/api#21'])
  assert.ok(ctx.requests.some((r) => JSON.parse(r.opts.body).variables.qa === 'is:open is:issue assignee:@me archived:false user:acme-test'), 'the search itself scoped')
  const th = await ctx.rows({ scope: 'thread', thread: 'acme-rollout' })
  assert.equal(th.length, 3)
  assert.deepEqual(await ctx.rows({ scope: 'thread', thread: 'nope' }), [])
  // A widget set to the thread: its repo only.
  const ci = await ctx.widget('ci', { params: { thread: 'acme-rollout' } })
  assert.ok(ci.text)
  assert.match((await ctx.widget('repos', { params: { thread: 'globex-pilot' } })).empty, /add them in its Profile/)
  // Off again: no repos, no hint.
  assert.deepEqual(await ctx.run('threadPick', { thread: 'acme-rollout', entry: 'acme-test/api', on: false }), [])
  assert.equal(threads['acme-rollout'].repos, undefined)
  assert.deepEqual(ctx.hintsNow, [])
  assert.ok(!JSON.stringify(me).includes(GH.token))
})

test('signed out: no rows (Echo shows none), nothing asked', async () => {
  const ctx = fakeCtx({ signin: null, threads: {}, work: true, fetch: () => { throw new Error('should not fetch') } })
  apply(ctx)
  await ctx.tick()
  assert.deepEqual(await ctx.rows({ scope: 'me' }), [])
})
