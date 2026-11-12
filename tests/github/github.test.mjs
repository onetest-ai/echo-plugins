import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseEntries, buildQuery, ciOf, digest, problemOf, reposWidget, ciWidget, glanceWidget, apply } from '../../plugins/github/main.js'
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
    { entry: 'acme-test/gone', ok: false, why: 'not found, or your token can’t see it' },
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
  assert.equal(reposWidget(null, {}, false).empty, 'Sign in to GitHub: Settings → From plugins → GitHub')
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

// The host half, with a fake ctx and GitHub's answers from fixtures.
const ok = (body) => ({ status: 200, body: JSON.stringify(body) })

test('connect: a token is checked with GitHub before it is kept, then GitHub is read', async () => {
  let calls = 0
  const ctx = fakeCtx({ settings: { repos: REPOS }, fetch: (url, opts) => {
    calls++
    assert.equal(url, 'https://api.github.com/graphql')
    assert.equal(opts.method, 'POST')
    assert.equal(opts.headers.Authorization, 'bearer github_pat_' + 'x'.repeat(30))
    return JSON.parse(opts.body).query.includes('rateLimit') ? ok(answer) : ok({ data: { viewer: { login: 'ada-acme' } } })
  } })
  apply(ctx)
  await assert.rejects(ctx.run('connect', { token: 'nope' }), /isn’t a GitHub token/)
  assert.equal(calls, 0)
  assert.deepEqual(await ctx.run('connect', { token: 'github_pat_' + 'x'.repeat(30) }), { login: 'ada-acme' })
  assert.equal(ctx.settingsNow.token, 'github_pat_' + 'x'.repeat(30))
  await ctx.run('refresh')
  const s = await ctx.run('status')
  assert.equal(s.signedIn, true)
  assert.equal(s.login, 'ada-acme')
  assert.equal(s.list.length, 4)
  assert.ok(!JSON.stringify(s).includes('github_pat_'), 'the token is never shown back')
  assert.equal((await ctx.widget('ci')).state, 'bad')
})

test('connect: a refused token is not kept', async () => {
  const ctx = fakeCtx({ fetch: () => ({ status: 401, body: '{"message":"Bad credentials"}' }) })
  apply(ctx)
  await assert.rejects(ctx.run('connect', { token: 'ghp_' + 'y'.repeat(36) }), /GitHub refused the token/)
  assert.equal(ctx.settingsNow.token, undefined)
  assert.equal((await ctx.run('status')).signedIn, false)
})

test('a failed read keeps the last answer and says why; a revoked token shows as a sign-in problem', async () => {
  let status = 200
  const ctx = fakeCtx({ settings: { token: 'ghp_' + 'z'.repeat(36), repos: REPOS }, fetch: () => (status === 200 ? ok(answer) : { status, body: '{"message":"Bad credentials"}' }) })
  apply(ctx)
  await ctx.run('refresh')
  status = 401
  await ctx.run('refresh')
  const s = await ctx.run('status')
  assert.equal(s.list.length, 4)
  assert.equal(s.problem.code, 'auth')
  assert.match((await ctx.widget('ci')).text, /as of/)
})

test('repos: only repos and organisations are kept, and GitHub is read again', async () => {
  let reads = 0
  const ctx = fakeCtx({ settings: { token: 'ghp_' + 'z'.repeat(36) }, fetch: () => { reads++; return ok(answer) } })
  apply(ctx)
  await assert.rejects(ctx.run('repos', { text: 'acme-test/api\nnot a repo' }), /not a repo or an organisation: not a repo/)
  await ctx.run('repos', { text: 'https://github.com/acme-test/api\nacme-test' })
  assert.equal(ctx.settingsNow.repos, 'acme-test/api\nacme-test')
  assert.equal(reads, 1)
})

test('signed out: nothing is fetched, widgets ask to sign in; in a terminal no timer is set', async () => {
  const ctx = fakeCtx({ fetch: () => { throw new Error('should not fetch') } })
  apply(ctx)
  await ctx.tick()
  assert.equal(ctx.requests.length, 0)
  assert.match((await ctx.widget('repos')).empty, /Sign in to GitHub/)
  const term = fakeCtx({ terminal: true })
  apply(term)
  assert.equal(term.timers.length, 0)
})

test('near GitHub’s hourly limit the timer waits for the reset; Refresh still reads', async () => {
  const low = { ...answer, data: { ...answer.data, rateLimit: { remaining: 10, limit: 5000, resetAt: '2999-01-01T00:00:00Z' } } }
  const ctx = fakeCtx({ settings: { token: 'ghp_' + 'z'.repeat(36), repos: REPOS }, fetch: () => ok(low) })
  apply(ctx)
  await ctx.run('refresh')
  await ctx.tick()
  assert.equal(ctx.requests.length, 1)
  await ctx.run('refresh')
  assert.equal(ctx.requests.length, 2)
})
