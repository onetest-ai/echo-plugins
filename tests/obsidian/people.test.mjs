// Knowledge 1.1: Echo's people as person pages in the vault (`<pages>/people/<Name>.md`) — only Echo's own properties
// (origin, echo, reports_to, reports, threads) merged in, the rest of a page the user's; routed as a call's minutes are
// (thread → client → default); written in batches: with a call's minutes (Automatic vaults), the catch-up on start (once
// a day) and `people_sync`. Made-up people (echo-data.mjs `PEOPLE`), vaults from the twin preset in temp folders.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as nfs from 'node:fs'
import * as npath from 'node:path'
import { personFileName, personWikilink, personThreads, peopleOfVault, personProps, personValuesIn, withPersonProps, fmSplit, catalogInsertMany } from '../../plugins/obsidian/main.js'
import { CALL, PEOPLE_THREADS, PEOPLE_CLIENTS, people } from './echo-data.mjs'
import { world, call, read, write, exists, hasGit, gitOut } from './world.mjs'

const P = 'knowledge/people'
const DANA = `---
origin: echo
echo: "echo://person/dana@acme.example"
reports_to: "[[Grace Hopper]]"
reports: ["[[Alex Doe]]"]
threads:
  - thread: pilot
    role: sponsor
    stance: supportive
---

# Dana Reyes
`
// A call in each thread, on the default profile: Echo can tell each thread's AI profile (a thread whose profile it can't
// tell has no place in any vault).
const PRICING = '2026-11-03_100000-pricing-review', GLOBEX = '2026-11-04_100000-globex-intro'
const CALLS = () => [call(PRICING, 'Pricing review', { threads: ['pricing'] }), call(GLOBEX, 'Globex intro', { threads: ['globex-deal'] }), call(CALL, 'Weekly delivery sync', { threads: ['pilot'] })]
const base = (more = {}) => world({ calls: CALLS(), threads: PEOPLE_THREADS, clients: PEOPLE_CLIENTS, people: people(), ...more })
const ls = (root) => (exists(root, P) ? nfs.readdirSync(npath.join(root, P)).filter((f) => f !== 'README.md').sort() : [])

// ── the pure parts ──

test('a person\'s file name is safe: no path, no link marks, never a device name or a dot file', () => {
  assert.equal(personFileName('Dana Reyes'), 'Dana Reyes.md')
  assert.equal(personFileName('../../Eve <x>/#1'), '-..-Eve -x---1.md', 'no slash, no leading dot')
  assert.ok(!personFileName('../../etc/passwd').includes('/'))
  assert.equal(personFileName('CON'), '_CON.md')
  assert.equal(personFileName(''), 'person.md')
  assert.equal(personFileName('...'), 'person.md')
  assert.equal(personFileName('A [b] ^c|d'), 'A -b- -c-d.md')
  assert.equal(personFileName('Line\nbreak'), 'Line break.md')
  assert.equal(personWikilink('Grace Hopper', 'Grace Hopper'), '[[Grace Hopper]]')
  assert.equal(personWikilink('Grace Hopper-2', 'Grace Hopper'), '[[Grace Hopper-2|Grace Hopper]]')
  assert.equal(personWikilink('x', 'a]]|b'), '[[x|ab]]')
})

test('a person\'s threads: their places in open threads, then the open threads they were seen in; a vault gets only the threads routed to it', () => {
  const open = new Set(['pilot', 'pricing', 'globex-deal'])
  const [dana, , grace, lee, , old] = people()
  assert.deepEqual(personThreads(dana, open), [{ thread: 'pilot', role: 'sponsor', stance: 'supportive' }])
  assert.deepEqual(personThreads(lee, open), [{ thread: 'globex-deal', role: 'champion', stance: null }, { thread: 'pilot', role: null, stance: null }])
  assert.deepEqual(personThreads(old, open), [], 'a closed thread is nobody\'s place')
  const routes = { pilot: ['a'], pricing: ['b'], 'globex-deal': ['b'] }
  const of = (id) => peopleOfVault(people(), id, open, (t) => routes[t] || []).map((x) => [x.person.key, x.threads.map((t) => t.thread)])
  assert.deepEqual(of('a'), [['dana@acme.example', ['pilot']], ['alex@acme.example', ['pilot']], ['lee@globex.example', ['pilot']], ['eve@acme.example', ['pilot']]])
  assert.deepEqual(of('b'), [['grace@acme.example', ['pricing']], ['lee@globex.example', ['globex-deal']]])
  assert.ok(!of('a').some(([k]) => k === grace.key))
})

test('Echo\'s properties merge into a page\'s frontmatter: the user\'s keys and body as they were, line endings kept', () => {
  const props = personProps(people()[0], [{ thread: 'pilot', role: 'sponsor', stance: 'supportive' }], (x) => `[[${x.name}]]`)
  const fresh = `---\n${props.join('\n')}\n---\n\n# Dana Reyes\n`
  assert.equal(fresh, DANA)
  const mine = '---\ntitle: Dana\norigin: echo\nechO: "echo://person/old"\ntags: [person]\nthreads:\n  - thread: old\nmood: calm\n---\n\n# Dana\n\nMy notes.\n'
  const merged = withPersonProps(mine, props)
  assert.equal(merged, `---\ntitle: Dana\n${props.join('\n')}\ntags: [person]\nmood: calm\n---\n\n# Dana\n\nMy notes.\n`)
  assert.equal(personValuesIn(fmSplit(merged)[0]), personValuesIn(props.join('\n')))
  // CRLF stays CRLF; the body isn't touched (its mixed endings too).
  const crlf = '---\r\ntitle: Dana\r\n---\r\nbody\r\nline\n'
  assert.equal(withPersonProps(crlf, ['origin: echo']), '---\r\ntitle: Dana\r\norigin: echo\r\n---\r\nbody\r\nline\n')
  // No frontmatter, or an empty one.
  assert.equal(withPersonProps('# Dana\n', ['origin: echo']), '---\norigin: echo\n---\n# Dana\n')
  assert.equal(withPersonProps('---\n---\n# Dana\n', ['origin: echo']), '---\norigin: echo\n---\n# Dana\n')
  // Echo's keys moved among the user's: the same properties (nothing to write).
  const moved = `---\nthreads:\n  - thread: pilot\n    role: sponsor\n    stance: supportive\ntitle: x\n${props.slice(0, 4).join('\n')}\n---\n`
  assert.equal(personValuesIn(fmSplit(moved)[0]), personValuesIn(props.join('\n')))
})

// ── the batches ──

test('people_sync: a page each in the twin\'s knowledge/people, Echo\'s properties only, rows in the index\'s People table, one log line', async () => {
  const w = base()
  const v = await w.vault('My twin', { minutes: 'ask' })
  await w.ctx.run('default', { id: v.id })
  const r = await w.ctx.run('people_sync', { id: v.id })
  assert.deepEqual([r.added, r.changed, r.unchanged, r.gone, r.index, r.commit, r.dir], [5, 0, 0, 0, 'added', 'off', P])
  assert.equal(read(v.root, `${P}/Dana Reyes.md`), DANA)
  assert.ok(read(v.root, `${P}/Alex Doe.md`).includes('reports_to: "[[Dana Reyes]]"\nthreads:\n  - thread: pilot\n---'), 'no role or stance: no line')
  assert.ok(read(v.root, `${P}/Lee Park.md`).includes('  - thread: globex-deal\n    role: champion\n  - thread: pilot\n'))
  assert.ok(!exists(v.root, `${P}/Old Timer.md`), 'only in a closed thread: no page')
  const cat = read(v.root, 'knowledge/CATALOG.md')
  assert.match(cat, /## People\n\n\| File \| Description \| Date Added \|\n\|[-|]+\|\n(\| \[.*\n){5}\n## Notes/)
  assert.ok(cat.includes('| [Dana Reyes.md](people/Dana%20Reyes.md) | Dana Reyes — Delivery lead, Acme |'))
  const log = read(v.root, 'log.md').trimEnd().split('\n').filter((l) => l.includes('· people ·'))
  assert.deepEqual(log.map((l) => l.replace(/^- \d{4}-\d{2}-\d{2} /, '')), [`· people · ${P}/ · 5 person pages from Echo (5 new, 0 changed)`])
  // Again: nothing changed, nothing written.
  const again = await w.ctx.run('people_sync', { id: v.id })
  assert.deepEqual([again.added, again.changed, again.unchanged], [0, 0, 5])
  assert.equal(read(v.root, 'log.md').split('· people ·').length, 2, 'no line for a batch that wrote nothing')
})

test('a hostile name stays a file in the people folder', async () => {
  const w = base()
  const v = await w.vault('My twin', { minutes: 'ask' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('people_sync', { id: v.id })
  const eve = ls(v.root).find((f) => f.includes('Eve'))
  assert.ok(eve && !eve.includes('/') && !eve.startsWith('.'), eve)
  assert.ok(read(v.root, `${P}/${eve}`).includes('\n# ../../Eve \\<x>/#1\n'), 'the name as text: `<` escaped')
})

test('a page is the person\'s by its echo: property — renamed, it is still theirs; the user\'s lines are kept; only Echo\'s changes write', async () => {
  const w = base()
  const v = await w.vault('My twin', { minutes: 'ask' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('people_sync', { id: v.id })
  const mine = DANA.replace('origin: echo\n', 'aliases: [Dana]\norigin: echo\n').replace('---\n\n# Dana Reyes\n', 'mood: calm\n---\r\n\n# Dana Reyes\n\nLikes short decks.\n')
  nfs.rmSync(npath.join(v.root, `${P}/Dana Reyes.md`))
  write(v.root, `${P}/Dana R.md`, mine)
  w.data.read.people[0].places[0].stance = 'sceptic'
  const r = await w.ctx.run('people_sync', { id: v.id })
  assert.deepEqual([r.added, r.changed], [0, 3], 'Dana, and the links to her page from Alex\'s and Grace\'s')
  assert.ok(!exists(v.root, `${P}/Dana Reyes.md`), 'no second page')
  const now = read(v.root, `${P}/Dana R.md`)
  assert.equal(now, mine.replace('stance: supportive', 'stance: sceptic'))
  // Alex's boss is linked to the page as it is named now.
  assert.ok(read(v.root, `${P}/Alex Doe.md`).includes('reports_to: "[[Dana R|Dana Reyes]]"'))
})

test('a name taken by another person\'s page (another echo:): a new file beside it, and links lead there', async () => {
  const w = base()
  const v = await w.vault('My twin', { minutes: 'ask' })
  await w.ctx.run('default', { id: v.id })
  const ADMIRAL = '---\necho: "echo://person/admiral@navy.example"\n---\n# Grace Hopper\n\nThe admiral — not the CFO.\n'
  write(v.root, `${P}/Grace Hopper.md`, ADMIRAL)
  await w.ctx.run('people_sync', { id: v.id })
  assert.equal(read(v.root, `${P}/Grace Hopper.md`), ADMIRAL)
  assert.ok(read(v.root, `${P}/Grace Hopper-2.md`).includes('echo: "echo://person/grace@acme.example"'))
  assert.ok(read(v.root, `${P}/Dana Reyes.md`).includes('reports_to: "[[Grace Hopper-2|Grace Hopper]]"'))
})

test('routing: each vault has the people of the threads routed to it, each page only those threads', async () => {
  const w = base()
  const a = await w.vault('Acme wiki', { minutes: 'ask' }), b = await w.vault('Money', { minutes: 'ask' })
  await w.ctx.run('client_vault', { client: 'acme', vault: a.id })
  await w.ctx.run('thread_vault', { thread: 'pricing', vault: b.id })
  await w.ctx.run('client_vault', { client: 'globex', vault: b.id })
  await w.ctx.run('people_sync', { id: a.id })
  await w.ctx.run('people_sync', { id: b.id })
  assert.deepEqual(ls(a.root).filter((f) => !f.includes('Eve')), ['Alex Doe.md', 'Dana Reyes.md', 'Lee Park.md'])
  assert.deepEqual(ls(b.root), ['Grace Hopper.md', 'Lee Park.md'])
  assert.ok(read(a.root, `${P}/Lee Park.md`).includes('threads:\n  - thread: pilot\n---'))
  assert.ok(read(b.root, `${P}/Lee Park.md`).includes('threads:\n  - thread: globex-deal\n    role: champion\n---'))
  // The reporting line names only people with a place in this vault — not even their name otherwise: Grace has none in
  // Acme wiki, Dana none in Money.
  assert.ok(!read(a.root, `${P}/Dana Reyes.md`).includes('Grace') && !read(a.root, `${P}/Dana Reyes.md`).includes('reports_to'))
  assert.ok(!read(b.root, `${P}/Grace Hopper.md`).includes('Dana') && !read(b.root, `${P}/Grace Hopper.md`).includes('reports:'))
})

test('a page the user deleted: not written again by the catch-up, only by people_sync', async () => {
  const w = base()
  const v = await w.vault('My twin', { minutes: 'auto' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('people_sync', { id: v.id })
  nfs.rmSync(npath.join(v.root, `${P}/Alex Doe.md`))
  w.data.read.people[1].places[0].role = 'engineer'
  w.data.read.people[0].places[0].role = 'owner'
  const c = await w.ctx.run('catch_up')
  assert.deepEqual([c.people.vaults[v.id].added, c.people.vaults[v.id].changed, c.people.vaults[v.id].gone], [0, 1, 1])
  assert.ok(!exists(v.root, `${P}/Alex Doe.md`))
  assert.ok(read(v.root, `${P}/Dana Reyes.md`).includes('role: owner'))
  // Once a day.
  assert.deepEqual((await w.ctx.run('catch_up')).people, { done: 'today already' })
  const r = await w.ctx.run('people_sync', { id: v.id })
  assert.equal(r.added, 1)
  assert.ok(read(v.root, `${P}/Alex Doe.md`).includes('role: engineer'))
})

test('the catch-up writes only into vaults whose minutes are Automatic; Ask and Off wait for people_sync', async () => {
  const w = base()
  const a = await w.vault('Auto', { minutes: 'auto' }), s = await w.vault('Asked', { minutes: 'ask' })
  await w.ctx.run('default', { id: a.id })
  await w.ctx.run('thread_vault', { thread: 'pricing', vault: s.id })
  const c = await w.ctx.run('catch_up')
  assert.deepEqual(Object.keys(c.people.vaults), [a.id])
  assert.ok(exists(a.root, `${P}/Dana Reyes.md`))
  assert.deepEqual(ls(s.root), [])
})

test('with a call\'s minutes: its participants\' pages in the same batch and commit (Automatic); none in an Ask vault', { skip: !hasGit }, async () => {
  const w = base({ git: true })
  const v = await w.vault('My twin', { git: true, minutes: 'auto', commit: true })
  await w.ctx.run('default', { id: v.id })
  const before = Number(gitOut(v.root, 'rev-list', '--count', 'HEAD').trim())
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  assert.deepEqual(ls(v.root), ['Alex Doe.md', 'Dana Reyes.md'], 'only the call\'s participants Echo lists')
  await w.ctx.run('commit_pending', { vault: v.id })
  assert.equal(Number(gitOut(v.root, 'rev-list', '--count', 'HEAD').trim()), before + 1, 'one commit')
  const files = gitOut(v.root, 'show', '--name-only', '--format=', 'HEAD').trim().split('\n').sort()
  assert.deepEqual(files, ['knowledge/CATALOG.md', 'knowledge/notes/2026-11-05-weekly-delivery-sync.md', `${P}/Alex Doe.md`, `${P}/Dana Reyes.md`, 'log.md'])
  assert.equal(gitOut(v.root, 'status', '--porcelain').trim(), '')
  // An Ask vault: the note by hand, no person pages.
  const w2 = base()
  const s = await w2.vault('Asked', { minutes: 'ask' })
  await w2.ctx.run('default', { id: s.id })
  const saved = await w2.ctx.run('save_minutes', { call: CALL })
  assert.equal(saved.saved[0].state, 'saved')
  assert.deepEqual(ls(s.root), [])
})

test('a page Echo can\'t read as text is skipped — never a second page beside it', async () => {
  const w = base()
  const v = await w.vault('My twin', { minutes: 'ask' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('people_sync', { id: v.id })
  nfs.writeFileSync(npath.join(v.root, `${P}/Alex Doe.md`), Buffer.from([0x2d, 0x2d, 0x2d, 0x0a, 0xff, 0x0a]))
  w.data.read.people[1].places[0].role = 'engineer'
  const r = await w.ctx.run('people_sync', { id: v.id })
  assert.equal(r.changed, 0)
  assert.ok(r.skipped.some((x) => x.key === 'alex@acme.example'), JSON.stringify(r.skipped))
})

// ── the review's findings (each was a failing proof first) ──

test('a name with Markdown or HTML is text in the page\'s heading; its index cell is made as a note\'s row is (one line, | as /)', async () => {
  const ps = people()
  ps[1].name = '![x](https://evil.example/p.png) | <b>A</b>'
  const w = base({ people: ps })
  const v = await w.vault('My twin', { minutes: 'ask' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('people_sync', { id: v.id })
  const f = ls(v.root).find((x) => x.includes('evil'))
  const t = read(v.root, `${P}/${f}`)
  assert.ok(t.endsWith('\n# \\!\\[x\\](https://evil.example/p.png) | \\<b>A\\</b>\n'), JSON.stringify(t))
  const html = w.ctx.markdown(t.split('---\n').pop())
  assert.ok(!/<img|<b>/.test(html), html)
  assert.ok(read(v.root, 'knowledge/CATALOG.md').includes('| ![x](https://evil.example/p.png) / <b>A</b> — Acme |'), 'catalogCell, as the notes\' rows')
})

test('a page of the user\'s with the person\'s file name and no echo: — the catch-up and a call\'s minutes leave it (Settings says so); people_sync adopts it, no -2', async () => {
  const w = base()
  const v = await w.vault('My twin', { minutes: 'auto' })
  await w.ctx.run('default', { id: v.id })
  nfs.rmSync(npath.join(v.root, P), { recursive: true, force: true })
  const MINE = '---\ntags: [person]\n---\n# Dana Reyes\n\nMy notes.\n'
  write(v.root, 'knowledge/People/Dana Reyes.md', MINE)
  const c = await w.ctx.run('catch_up')
  assert.equal(c.people.vaults[v.id].theirs, 1)
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  const files = nfs.readdirSync(npath.join(v.root, 'knowledge/People')).sort()
  assert.ok(!files.some((x) => x.includes('-2')), files.join(', '))
  assert.equal(read(v.root, 'knowledge/People/Dana Reyes.md'), MINE)
  assert.equal((await w.ctx.run('vault_settings', { id: v.id })).people.theirs, 1)
  // Update person pages: adopted — Echo's keys added, the user's property and body kept.
  const r = await w.ctx.run('people_sync', { id: v.id })
  assert.equal(r.adopted, 1)
  const now = read(v.root, 'knowledge/People/Dana Reyes.md')
  assert.ok(now.startsWith('---\ntags: [person]\norigin: echo\necho: "echo://person/dana@acme.example"\n'), now)
  assert.ok(now.endsWith('---\n# Dana Reyes\n\nMy notes.\n'))
  assert.ok(!nfs.readdirSync(npath.join(v.root, 'knowledge/People')).some((x) => x.includes('-2')))
  assert.ok(read(v.root, 'knowledge/CATALOG.md').includes('(People/Dana%20Reyes.md)'), 'its index row')
  assert.equal((await w.ctx.run('vault_settings', { id: v.id })).people.theirs, 0)
})

test('a thread\'s place goes only into a vault on the thread\'s AI profile; a thread whose profile Echo can\'t tell into none', async () => {
  const w = base({ calls: [call(CALL, 'Weekly delivery sync', { threads: ['pilot'] }), call('2026-11-06_100000-pricing-review', 'Pricing review', { threads: ['pricing'], profile: 'client-x' })] })
  const d = await w.vault('Mine', { minutes: 'ask' }), x = await w.vault('Client X', { minutes: 'ask' })
  await w.ctx.run('set', { id: x.id, key: 'profile', value: 'client-x' })
  await w.ctx.run('default', { id: d.id })
  await w.ctx.run('thread_vault', { thread: 'pricing', vault: x.id })
  await w.ctx.run('client_vault', { client: 'globex', vault: x.id })
  await w.ctx.run('people_sync', { id: d.id })
  await w.ctx.run('people_sync', { id: x.id })
  // pricing's calls are on Client X: Grace's place is Client X's.
  assert.ok(exists(x.root, `${P}/Grace Hopper.md`))
  assert.ok(!exists(d.root, `${P}/Grace Hopper.md`))
  // globex-deal has no call: its profile unknown — into no vault (Lee's pilot place is the default vault's).
  assert.ok(!exists(x.root, `${P}/Lee Park.md`), 'not into a vault on another profile')
  assert.ok(read(d.root, `${P}/Lee Park.md`).includes('threads:\n  - thread: pilot\n---'), 'only pilot, on the default profile')
  assert.equal((await w.ctx.run('vault_settings', { id: x.id })).people.unknown, 1, 'globex-deal: left out, said in Settings')
  // Dana (default) reports to Grace (Client X): neither names the other across the profiles.
  assert.ok(!read(d.root, `${P}/Dana Reyes.md`).includes('Grace'))
  assert.ok(!read(x.root, `${P}/Grace Hopper.md`).includes('Dana'))
  // A thread on the default profile, routed to a Client X vault: nothing there.
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: x.id })
  const r = await w.ctx.run('people_sync', { id: x.id })
  assert.ok(!exists(x.root, `${P}/Dana Reyes.md`), JSON.stringify(r))
})

test('"changed" is by value: Obsidian\'s layout of the same values (block lists, quotes dropped) writes nothing', async () => {
  const w = base()
  const v = await w.vault('My twin', { minutes: 'ask' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('people_sync', { id: v.id })
  const f = `${P}/Dana Reyes.md`
  const obs = read(v.root, f).replace('echo: "echo://person/dana@acme.example"', 'echo: echo://person/dana@acme.example')
    .replace('reports: ["[[Alex Doe]]"]', 'reports:\n  - "[[Alex Doe]]"').replace('reports_to: "[[Grace Hopper]]"', 'reports_to: [[Grace Hopper]]')
    .replace('role: sponsor', 'role: "sponsor"')
  write(v.root, f, obs)
  const r = await w.ctx.run('people_sync', { id: v.id })
  assert.deepEqual([r.changed, r.unchanged], [0, 5])
  assert.equal(read(v.root, f), obs, 'not rewritten')
  // A value that differs does write.
  w.data.read.people[0].places[0].role = 'owner'
  assert.equal((await w.ctx.run('people_sync', { id: v.id })).changed, 1)
  assert.ok(read(v.root, f).includes('role: owner'))
  // The pure comparison: flow or block, quoted or not.
  const a = 'echo: "echo://person/x"\nreports: ["[[A]]", "[[B]]"]\nthreads:\n  - thread: t\n    role: r'
  const b = 'echo: echo://person/x\nreports:\n  - "[[A]]"\n  - [[B]]\nthreads:\n- thread: "t"\n  role: \'r\''
  assert.equal(personValuesIn(a), personValuesIn(b))
  assert.notEqual(personValuesIn(a), personValuesIn(a.replace('role: r', 'role: s')))
})

test('a blank or comment line inside Echo\'s threads: block is part of it: a stale thread after it is taken out, and seen as a change', () => {
  const props = ['origin: echo', 'echo: "echo://person/x"', 'threads:', '  - thread: a']
  const page = '---\norigin: echo\necho: "echo://person/x"\nthreads:\n  - thread: a\n\n  # old\n  - thread: old\n    role: gone\nmood: calm\n---\nbody\n'
  assert.notEqual(personValuesIn(fmSplit(page)[0]), personValuesIn(props.join('\n')), 'the stale thread counts')
  assert.equal(withPersonProps(page, props), '---\norigin: echo\necho: "echo://person/x"\nthreads:\n  - thread: a\nmood: calm\n---\nbody\n')
  // A blank line before the user's next key isn't Echo's.
  const after = '---\nthreads:\n  - thread: a\n\nmood: calm\n---\n'
  assert.equal(withPersonProps(after, props), '---\norigin: echo\necho: "echo://person/x"\nthreads:\n  - thread: a\n\nmood: calm\n---\n')
})

test('a page changed between Echo\'s read and its write (ifSha) is left as the user wrote it, and merged on the next batch', async () => {
  const w = base()
  const v = await w.vault('My twin', { minutes: 'ask' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('people_sync', { id: v.id })
  w.data.read.people[0].places[0].role = 'owner'
  const f = `${P}/Dana Reyes.md`
  const write0 = w.ctx.fs.write
  let once = true
  w.ctx.fs.write = (root, rel, text, opts) => {
    if (once && rel === f && opts && opts.ifSha) { once = false; nfs.appendFileSync(npath.join(root, rel), '\nThe user typed this meanwhile.\n') }
    return write0(root, rel, text, opts)
  }
  const r = await w.ctx.run('people_sync', { id: v.id })
  assert.equal(r.changed, 0)
  assert.deepEqual(r.skipped.map((x) => [x.key, x.why]), [['dana@acme.example', 'it changed while Echo wrote it — next time']])
  assert.ok(read(v.root, f).includes('role: sponsor') && read(v.root, f).endsWith('The user typed this meanwhile.\n'))
  w.ctx.fs.write = write0
  assert.equal((await w.ctx.run('people_sync', { id: v.id })).changed, 1)
  assert.ok(read(v.root, f).includes('role: owner') && read(v.root, f).endsWith('The user typed this meanwhile.\n'))
})

test('a batch: the index written once with every new row, one activity row (a count and the first names), and rows a stopped run owed come with the next', async () => {
  const ps = []
  for (let i = 0; i < 300; i++) ps.push({ key: `p${i}@acme.example`, name: `Person ${i}`, title: 'Engineer', organisation: 'Acme', threads: ['pilot'], places: [{ thread: 'pilot', role: 'dev', stance: null }], reports_to: null, reports: [] })
  const w = base({ people: ps })
  const v = await w.vault('My twin', { minutes: 'ask' })
  await w.ctx.run('default', { id: v.id })
  // The index changes under Echo's write once: its rows are owed.
  const write0 = w.ctx.fs.write
  let indexWrites = 0, spoil = true
  w.ctx.fs.write = (root, rel, text, opts) => {
    if (rel === 'knowledge/CATALOG.md') { indexWrites++; if (spoil) { spoil = false; nfs.appendFileSync(npath.join(root, rel), '\n') } }
    return write0(root, rel, text, opts)
  }
  const r = await w.ctx.run('people_sync', { id: v.id })
  assert.equal(r.added, 300)
  assert.match(r.index, /^skipped: .*changed since you read it/)
  assert.equal(indexWrites, 1, 'one write of the index for the batch')
  assert.equal(Object.keys(JSON.parse(w.ctx.files[`vaults/${v.id}/people.json`]).unindexed).length, 300)
  const r2 = await w.ctx.run('people_sync', { id: v.id })
  assert.deepEqual([r2.added, r2.changed, r2.index], [0, 0, 'added'])
  assert.equal(indexWrites, 2)
  const cat = read(v.root, 'knowledge/CATALOG.md')
  assert.equal((cat.match(/\]\(people\//g) || []).length, 300, 'every page once')
  assert.deepEqual(JSON.parse(w.ctx.files[`vaults/${v.id}/people.json`]).unindexed, {})
  const acts = w.ctx.files[`vaults/${v.id}/activity.jsonl`].trim().split('\n').map((l) => JSON.parse(l)).filter((a) => a.by === 'people')
  assert.equal(acts.length, 1)
  assert.equal(acts[0].count, 300)
  assert.equal(acts[0].names.length, 20)
  const home = await w.ctx.run('home', { id: v.id })
  const row = (home.whats_new.rows || []).find((x) => x.by === 'people')
  assert.equal(row.title, '300 person pages from Echo\'s people')
  // catalogInsertMany alone: one pass, date order kept, what's listed left out.
  const idx = '# I\n\n## People\n\n| File | Description | Date Added |\n|---|---|---|\n| [a.md](people/a.md) | A | 2026-01-01 |\n\n## Notes\n'
  const got = catalogInsertMany(idx, 'people', [{ note: 'people/a.md', desc: 'A' }, { note: 'people/B b.md', desc: 'B' }, { note: 'people/c.md', desc: 'C' }], '2026-11-18', '2026-11-18')
  assert.equal(got.added, 2)
  assert.ok(got.text.includes('| [a.md](people/a.md) | A | 2026-01-01 |\n| [B b.md](people/B%20b.md) | B | 2026-11-18 |\n| [c.md](people/c.md) | C | 2026-11-18 |\n\n## Notes'), got.text)
})

// ── the second review's findings (each was a failing proof first) ──

test('a thread whose recent calls are on two profiles (mixed) goes into no vault; one with no call yet, none either', async () => {
  const w = base({ calls: [call('2026-11-02_100000-pricing-old', 'Pricing old', { threads: ['pricing'] }), call(GLOBEX, 'Globex intro', { threads: ['globex-deal'] }), call(CALL, 'Weekly delivery sync', { threads: ['pilot'] }), call('2026-11-06_100000-pricing-review', 'Pricing review', { threads: ['pricing'], profile: 'client-x' })] })
  const d = await w.vault('Mine', { minutes: 'ask' }), x = await w.vault('Client X', { minutes: 'ask' })
  await w.ctx.run('set', { id: x.id, key: 'profile', value: 'client-x' })
  await w.ctx.run('default', { id: d.id })
  await w.ctx.run('people_sync', { id: d.id })
  assert.ok(!exists(d.root, `${P}/Grace Hopper.md`), 'pricing is mixed: not the default vault\'s')
  await w.ctx.run('thread_vault', { thread: 'pricing', vault: x.id })
  await w.ctx.run('people_sync', { id: x.id })
  assert.ok(!exists(x.root, `${P}/Grace Hopper.md`), 'nor Client X\'s')
  assert.equal((await w.ctx.run('vault_settings', { id: x.id })).people.unknown, 1)
  // A new thread with people placed in it and no call yet: nowhere.
  const w2 = base({ calls: [call(CALL, 'Weekly delivery sync', { threads: ['pilot'] })] })
  const d2 = await w2.vault('Mine', { minutes: 'ask' })
  await w2.ctx.run('default', { id: d2.id })
  const r = await w2.ctx.run('people_sync', { id: d2.id })
  assert.ok(!exists(d2.root, `${P}/Grace Hopper.md`))
  assert.equal(r.unknown, 2, 'pricing and globex-deal')
})

test('one call\'s minutes into an Automatic vault read Echo\'s calls once, whatever the threads', async () => {
  const threads = [...PEOPLE_THREADS], ps = people(), calls = CALLS()
  for (let i = 0; i < 40; i++) {
    threads.push({ id: `t${i}`, name: `T${i}`, client: 'acme' })
    ps.push({ key: `p${i}@acme.example`, name: `P ${i}`, threads: [`t${i}`], places: [{ thread: `t${i}`, role: 'x', stance: null }], reports_to: null, reports: [] })
    calls.push(call(`2026-10-${String(1 + (i % 28)).padStart(2, '0')}_1${String(i).padStart(5, '0')}-t${i}`, `T${i}`, { threads: [`t${i}`] }))
  }
  const w = world({ calls, threads, clients: PEOPLE_CLIENTS, people: ps })
  const v = await w.vault('Mine', { minutes: 'auto' })
  await w.ctx.run('default', { id: v.id })
  const read0 = w.ctx.echo.read
  const reads = { calls: 0, people: 0 }
  // Person pages' reads: People, and calls without `since` (the catch-up's own read of the calls since a day is the
  // minutes', counted apart).
  w.ctx.echo.read = (what, ...a) => { if (what === 'calls' && a[0] && a[0].since) reads.since = (reads.since || 0) + 1; else if (what in reads) reads[what]++; return read0.call(w.ctx.echo, what, ...a) }
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  assert.ok(exists(v.root, `${P}/Dana Reyes.md`))
  assert.deepEqual(reads, { calls: 1, people: 1 })
  // The catch-up: one read of each for every vault.
  const v2 = await w.vault('Other', { minutes: 'auto' })
  await w.ctx.run('thread_vault', { thread: 't0', vault: v2.id })
  reads.calls = 0; reads.people = 0; delete reads.since
  w.ctx.files['seen.json'] = JSON.stringify({ since: '2026-11-17' })
  await w.ctx.run('catch_up')
  assert.ok(exists(v2.root, `${P}/P 0.md`))
  assert.deepEqual(reads, { calls: 1, people: 1, since: 1 }, 'both vaults, one run (and the minutes\' own read)')
})

test('a page of the user\'s holding its own values under Echo\'s key names is left alone, said in Settings; one with Echo\'s values or none of them is adopted', async () => {
  const w = base()
  const v = await w.vault('My twin', { minutes: 'ask' })
  await w.ctx.run('default', { id: v.id })
  nfs.rmSync(npath.join(v.root, P), { recursive: true, force: true })
  const MINE = '---\norigin: Lisbon, Portugal\nthreads:\n  - "[[Q3 budget]]"\n  # keep: the renewal\n  - "[[Renewal]]"\nreports: ["[[Sam]]"]\n---\n# Dana Reyes\n'
  write(v.root, `${P}/Dana Reyes.md`, MINE)
  const SAME = '---\norigin: echo\ntags: [person]\n---\n# Alex Doe\n\nMine.\n'
  write(v.root, `${P}/Alex Doe.md`, SAME)
  const r = await w.ctx.run('people_sync', { id: v.id })
  assert.equal(read(v.root, `${P}/Dana Reyes.md`), MINE, 'never replaced')
  assert.ok(!ls(v.root).some((f) => f.includes('-2')))
  assert.equal(r.adopted, 1, 'Alex: origin: echo is Echo\'s own value')
  assert.ok(read(v.root, `${P}/Alex Doe.md`).includes('echo: "echo://person/alex@acme.example"') && read(v.root, `${P}/Alex Doe.md`).includes('tags: [person]'))
  const s = (await w.ctx.run('vault_settings', { id: v.id })).people
  assert.deepEqual([s.theirs, s.kept, s.kept_first], [0, 1, [{ name: 'Dana Reyes', keys: ['origin', 'reports', 'threads'] }]])
})

test('the "page of yours" line clears once the person has no place in the vault any more', async () => {
  const w = base()
  const v = await w.vault('My twin', { minutes: 'auto' })
  await w.ctx.run('default', { id: v.id })
  nfs.rmSync(npath.join(v.root, P), { recursive: true, force: true })
  write(v.root, `${P}/Dana Reyes.md`, '---\ntags: [person]\n---\n# Dana\n')
  await w.ctx.run('catch_up')
  assert.equal((await w.ctx.run('vault_settings', { id: v.id })).people.theirs, 1)
  w.data.read.people[0].places = []
  w.data.read.people[0].threads = []
  await w.ctx.run('people_sync', { id: v.id })
  assert.equal((await w.ctx.run('vault_settings', { id: v.id })).people.theirs, 0)
})

test('values: a key of Echo\'s twice is a change and the rewrite leaves one; links with commas, quoted "null", a broken quote and a list are read as they are', () => {
  const e = 'origin: echo\necho: "echo://person/x"\nreports: ["[[A]]", "[[B]]"]\nthreads:\n  - thread: t\n    role: r'
  const dup = `${e}\nmood: x\nthreads:\n  - thread: stale`
  assert.notEqual(personValuesIn(dup), personValuesIn(e))
  assert.equal(withPersonProps(`---\n${dup}\n---\n`, e.split('\n')), `---\n${e}\nmood: x\n---\n`)
  assert.equal(personValuesIn('reports: ["[[Doe, Jane]]"]'), personValuesIn('reports: [[[Doe, Jane]]]'))
  assert.deepEqual(JSON.parse(personValuesIn('reports: [[[Doe, Jane]]]')).reports, ['[[Doe, Jane]]'])
  assert.notEqual(personValuesIn('threads:\n  - thread: t\n    role: "null"'), personValuesIn('threads:\n  - thread: t'))
  assert.notEqual(personValuesIn('threads:\n  - thread: t\n    role: "r'), personValuesIn('threads:\n  - thread: t'))
  assert.notEqual(personValuesIn('reports_to: ["[[A]]", "[[B]]"]'), personValuesIn('reports_to: "[[A]], [[B]]"'))
  assert.equal(personValuesIn('reports_to: [[A]]'), personValuesIn('reports_to: "[[A]]"'))
})

test('the ledger: a page never written owes no row; an index write that fails for any reason keeps the rows owed', async () => {
  const w = base()
  const v = await w.vault('My twin', { minutes: 'ask' })
  await w.ctx.run('default', { id: v.id })
  const write0 = w.ctx.fs.write
  w.ctx.fs.write = (root, rel, text, opts) => {
    if (rel === `${P}/Alex Doe.md`) throw new Error('the disk is full')
    if (rel === 'knowledge/CATALOG.md') throw new Error('the disk is full')
    return write0(root, rel, text, opts)
  }
  const r = await w.ctx.run('people_sync', { id: v.id })
  assert.equal(r.index, 'skipped: the disk is full')
  const led = () => JSON.parse(w.ctx.files[`vaults/${v.id}/people.json`])
  assert.ok(!('alex@acme.example' in led().unindexed), 'Alex\'s page was never written')
  assert.equal(Object.keys(led().unindexed).length, 4, 'the others owed')
  w.ctx.fs.write = write0
  const r2 = await w.ctx.run('people_sync', { id: v.id })
  assert.deepEqual([r2.added, r2.index], [1, 'added'])
  assert.deepEqual(led().unindexed, {})
  assert.equal((read(v.root, 'knowledge/CATALOG.md').match(/\]\(people\//g) || []).length, 5)
})

test('the save sheet names the people\'s pages only when a participant would be written into that vault', async () => {
  const w = base()
  const v = await w.vault('My twin', { minutes: 'auto' })
  await w.ctx.run('default', { id: v.id })
  assert.equal((await w.ctx.run('minutes_preview', { call: CALL, vault: v.id })).people, true)
  // pilot (Dana's and Alex's only place) routed elsewhere: neither would be written here.
  const o = await w.vault('Other', { minutes: 'ask' })
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: o.id })
  assert.equal((await w.ctx.run('minutes_preview', { call: CALL, vault: v.id })).people, false)
  // An Ask vault: never.
  assert.equal((await w.ctx.run('minutes_preview', { call: CALL, vault: o.id })).people, false)
})

test('Echo\'s host breathes every 25 pages, and the ledger is written only through the store\'s update', async () => {
  const ps = []
  for (let i = 0; i < 100; i++) ps.push({ key: `p${i}@acme.example`, name: `Person ${i}`, threads: ['pilot'], places: [{ thread: 'pilot', role: 'dev', stance: null }], reports_to: null, reports: [] })
  const w = base({ people: ps })
  const v = await w.vault('My twin', { minutes: 'ask' })
  await w.ctx.run('default', { id: v.id })
  let breaths = 0
  const rm0 = w.ctx.fs.readMany
  w.ctx.fs.readMany = (root, paths, ...a) => { if (Array.isArray(paths) && !paths.length) breaths++; return rm0(root, paths, ...a) }
  const ledger = `vaults/${v.id}/people.json`
  const writes = [], updates = []
  const sw0 = w.ctx.store.write, su0 = w.ctx.store.update
  w.ctx.store.write = (p, ...a) => { if (p === ledger) writes.push(p); return sw0(p, ...a) }
  w.ctx.store.update = (p, ...a) => { if (p === ledger) updates.push(p); return su0(p, ...a) }
  const r = await w.ctx.run('people_sync', { id: v.id })
  assert.equal(r.added, 100)
  // 100 pages: 4 in the plan, 4 in the writes, and one before each of Echo's reads (People, calls).
  assert.ok(breaths >= 4 + 4 + 2, `breaths: ${breaths}`)
  assert.deepEqual(writes, [])
  assert.ok(updates.length >= 4, `updates: ${updates.length}`)
})
