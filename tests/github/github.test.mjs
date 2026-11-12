import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseEntries, buildQuery, ciOf, digest, problemOf, reposWidget, ciWidget, glanceWidget, discovered, toggled, actionsUrl, apply } from '../../plugins/github/main.js'
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

test('query: names go in variables, never in the text; no entries reads your last-pushed repos', () => {
  const { query, variables } = buildQuery(parseEntries('acme-test\nacme-labs/site').entries)
  assert.match(query, /w0: repositoryOwner\(login: \$l0\)/)
  assert.match(query, /r1: repository\(owner: \$o1, name: \$n1\)/)
  assert.ok(!query.includes('acme'))
  assert.deepEqual(variables, { l0: 'acme-test', p0: 'user:acme-test is:pr is:open archived:false', i0: 'user:acme-test is:issue is:open archived:false', o1: 'acme-labs', n1: 'site' })
  const none = buildQuery([])
  assert.match(none.query, /^query GitHub \{/)
  assert.match(none.query, /mine: viewer/)
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
  assert.deepEqual(ctx.signins.every((h) => h === 'github.com'), true)
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
  assert.equal(ctx.requests.length, 2)
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
  assert.equal(ctx.requests.length, 3)
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
  assert.equal(ctx.requests.length, 1)
  await ctx.run('refresh')
  assert.equal(ctx.requests.length, 2)
})

test('links are built only from names GitHub could have (a hostile name gives none)', () => {
  assert.equal(actionsUrl('acme-test/api'), 'https://github.com/acme-test/api/actions')
  for (const bad of ['acme-labs/<img src=x onerror=alert(1)>', 'acme/a b', 'javascript:alert(1)', '', null]) assert.equal(actionsUrl(bad), '')
  const st = { at: NOW, repos: [{ repo: 'acme-labs/<img src=x>', url: 'https://github.com/acme-labs/<img src=x>', ci: 'failing', failing: ['x'], prs: 0, issues: 0, reviews: 0 }] }
  assert.equal(ciWidget(st, true, Date.parse(NOW)).open, undefined)
})
