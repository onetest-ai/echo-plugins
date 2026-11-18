// Knowledge 1.1: Echo's people as person pages in the vault (`<pages>/people/<Name>.md`) — only Echo's own properties
// (origin, echo, reports_to, reports, threads) merged in, the rest of a page the user's; routed as a call's minutes are
// (thread → client → default); written in batches: with a call's minutes (Automatic vaults), the catch-up on start (once
// a day) and `people_sync`. Made-up people (echo-data.mjs `PEOPLE`), vaults from the twin preset in temp folders.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as nfs from 'node:fs'
import * as npath from 'node:path'
import { personFileName, personWikilink, personThreads, peopleOfVault, personProps, personPropsIn, withPersonProps, fmSplit } from '../../plugins/obsidian/main.js'
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
const base = (more = {}) => world({ calls: [call(CALL, 'Weekly delivery sync', { threads: ['pilot'] })], threads: PEOPLE_THREADS, clients: PEOPLE_CLIENTS, people: people(), ...more })
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
  assert.equal(personPropsIn(fmSplit(merged)[0]), personPropsIn(props.join('\n')))
  // CRLF stays CRLF; the body isn't touched (its mixed endings too).
  const crlf = '---\r\ntitle: Dana\r\n---\r\nbody\r\nline\n'
  assert.equal(withPersonProps(crlf, ['origin: echo']), '---\r\ntitle: Dana\r\norigin: echo\r\n---\r\nbody\r\nline\n')
  // No frontmatter, or an empty one.
  assert.equal(withPersonProps('# Dana\n', ['origin: echo']), '---\norigin: echo\n---\n# Dana\n')
  assert.equal(withPersonProps('---\n---\n# Dana\n', ['origin: echo']), '---\norigin: echo\n---\n# Dana\n')
  // Echo's keys moved among the user's: the same properties (nothing to write).
  const moved = `---\nthreads:\n  - thread: pilot\n    role: sponsor\n    stance: supportive\ntitle: x\n${props.slice(0, 4).join('\n')}\n---\n`
  assert.equal(personPropsIn(fmSplit(moved)[0]), personPropsIn(props.join('\n')))
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
  assert.ok(read(v.root, `${P}/${eve}`).includes('\n# ../../Eve <x>/#1\n'))
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

test('a name taken by a page that isn\'t this person\'s: a new file beside it, and links lead there', async () => {
  const w = base()
  const v = await w.vault('My twin', { minutes: 'ask' })
  await w.ctx.run('default', { id: v.id })
  write(v.root, `${P}/Grace Hopper.md`, '# Grace Hopper\n\nThe admiral — not the CFO.\n')
  await w.ctx.run('people_sync', { id: v.id })
  assert.equal(read(v.root, `${P}/Grace Hopper.md`), '# Grace Hopper\n\nThe admiral — not the CFO.\n')
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
  // A link only to a page in this vault: Grace has none in Acme wiki.
  assert.ok(read(a.root, `${P}/Dana Reyes.md`).includes('reports_to: "Grace Hopper"'))
  assert.ok(read(b.root, `${P}/Grace Hopper.md`).includes('reports: ["Dana Reyes"]'))
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

test('a page changed while Echo writes is left for the next batch; one Echo cannot read as text is skipped', async () => {
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
