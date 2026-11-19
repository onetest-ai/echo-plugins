// Knowledge 1.0 step 4: Ingest's sources and the twin preset — onetest-ai/echo#677's sources/tests.rs and starter.rs's
// tests as they apply to the plugin (made-up vaults in temp folders, Echo's data and Microsoft 365 faked in Echo's
// shapes; git isolated from the user's settings).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as nfs from 'node:fs'
import * as npath from 'node:path'
import { safeName, datedName, fitName, mdText, mailSourceText, processedPaths, sourceState, messageIdOf, fmSplit, fmParse, fmGet, propText, activityRecent, localTime } from '../../plugins/obsidian/main.js'
import { world, call, read, write, exists, hasGit, gitOut, PKG, tmp } from './world.mjs'
import { skillMdProblem } from '../helpers/echo-rules.mjs'
import { CALL, MINUTES } from './echo-data.mjs'

const ledgerOf = (ctx, id) => JSON.parse(ctx.files[`vaults/${id}/ingest.json`] || '{"queued":{},"sources":{}}')
const prop = (text, k) => { const [raw] = fmSplit(text); const p = fmGet(fmParse(raw), k); return p ? propText(p) : '' }
const files = (dir) => { const out = []; const walk = (d) => { for (const e of nfs.readdirSync(d, { withFileTypes: true })) { const p = npath.join(d, e.name); if (e.isDirectory()) walk(p); else out.push(npath.relative(dir, p).split(npath.sep).join('/')) } }; walk(dir); return out.sort() }
/** #677's `safe_everywhere`: a file name on macOS and on Windows alike. */
const safeEverywhere = (name) => {
  const stem = name.split('.')[0].toUpperCase()
  const reserved = ['CON', 'PRN', 'AUX', 'NUL'].includes(stem) || (stem.length === 4 && /^(COM|LPT)/.test(stem))
  return name !== '' && !reserved && !name.startsWith('.') && !/[. ]$/.test(name) && Buffer.byteLength(name) <= 255 && name.length <= 255 && !/[<>:"/\\|?*\x00-\x1f]/.test(name)
}

test('files are copied as they are, with (2) for a taken name; over 50 MB refused; they wait as new', async () => {
  const w = world()
  const v = await w.vault('Twin', { minutes: 'off' })
  const picked = npath.join(w.base, 'picked')
  const bytes = Buffer.from(Array.from({ length: 70000 }, (_, i) => i % 256))
  write(picked, 'a.pdf', bytes)
  write(picked, 'big deck.pdf', '')
  nfs.truncateSync(npath.join(picked, 'big deck.pdf'), 60 << 20)
  const hs = ['a.pdf', 'a.pdf', 'big deck.pdf', 'a.pdf'].map((n) => w.ctx.handle(npath.join(picked, n)))
  const r = await w.ctx.run('add_source', { vault: v.id, kind: 'file' }, { files: hs })
  assert.deepEqual(r.added.map((a) => a.path || a.error.slice(0, 12)), ['raw_inbox/a.pdf', 'raw_inbox/a (2).pdf', 'big deck.pdf', 'raw_inbox/a (3).pdf'])
  assert.match(r.added[2].error, /50 MB/)
  for (const p of ['raw_inbox/a.pdf', 'raw_inbox/a (2).pdf']) assert.deepEqual(nfs.readFileSync(npath.join(v.root, p)), bytes, p)
  assert.ok(!exists(v.root, 'raw_inbox/big deck.pdf'))
  assert.equal(r.added[0].committed, 'off')
  const l = ledgerOf(w.ctx, v.id)
  assert.deepEqual(Object.entries(l.sources).filter(([, e]) => e.by === 'file' && e.state === 'new').map(([p]) => p).sort(), ['raw_inbox/a (2).pdf', 'raw_inbox/a (3).pdf', 'raw_inbox/a.pdf'])
  const acts = activityRecent(w.ctx.files[`vaults/${v.id}/activity.jsonl`])
  assert.ok(acts.some((a) => a.path === 'raw_inbox/a (2).pdf' && a.by === 'source' && a.kind === 'new'))
  const s = await w.ctx.run('sources', { vault: v.id })
  assert.ok(s.sources.filter((x) => (x.path || '').startsWith('raw_inbox/a')).every((x) => x.state === 'new' && x.kind === 'file'))
})

test('files picked in the system\'s picker when none were handed over (a dropped file comes as a handle)', async () => {
  const w0 = tmp()
  write(w0, 'notes.txt', 'made up')
  const w = world({})
  const v = await w.vault('Twin', { minutes: 'off' })
  w.ctx.system.pickFiles = async () => [w.ctx.handle(npath.join(w0, 'notes.txt'))]
  const r = await w.ctx.run('add_source', { vault: v.id, kind: 'file' })
  assert.equal(r.added[0].path, 'raw_inbox/notes.txt')
  w.ctx.system.pickFiles = async () => []
  assert.deepEqual(await w.ctx.run('add_source', { vault: v.id, kind: 'file' }), { cancelled: true })
})

test('a call becomes a source: Echo\'s minutes, the transcript and chat only when asked; another profile only "anyway"', async () => {
  const c = '2026-11-05_090012-weekly-sync'
  const w = world({ calls: [call(c, 'Weekly delivery sync', { transcript: '# Transcript\n\n- **Dana Reyes**: The budget stays between us.\n', chat: [{ at: '2026-11-05T09:10:00+02:00', from: 'Sam Rivera', text: 'Slides are in the channel.', files: [] }] }), call('2026-11-06_100000-pricing', 'Pricing review', { profile: 'client-x', notes: '# Pricing review\n\n- Per seat.\n' })] })
  const v = await w.vault('Twin', { minutes: 'off' })
  const note = (await w.ctx.run('save_minutes', { call: c, vault: v.id })).path
  const a = await w.ctx.run('add_source', { vault: v.id, kind: 'call', call: c })
  assert.equal(a.path, 'raw_inbox/echo/2026-11-05-weekly-delivery-sync.md')
  assert.equal(read(v.root, a.path), `---\ntitle: Weekly delivery sync\ndate: 2026-11-05\nkind: call\nparticipants: Dana Reyes, Alex Doe, Sam Rivera\nduration: 46m\nsource: "echo://call/${c}"\nnote: ${note}\norigin: echo\n---\n\n# Weekly delivery sync — minutes\n\n${MINUTES.trimEnd()}\n`)
  const b = await w.ctx.run('add_source', { vault: v.id, kind: 'call', call: c, transcript: true, chat: true })
  assert.equal(b.path, 'raw_inbox/echo/2026-11-05-weekly-delivery-sync (2).md')
  const t = read(v.root, b.path)
  assert.ok(t.includes('\n## Transcript\n\n# Transcript\n\n- **Dana Reyes**: The budget stays between us.\n'), t)
  assert.ok(t.endsWith('\n## Chat\n\n- **Sam Rivera**: Slides are in the channel.\n'), t)
  const m = await w.ctx.run('add_source', { vault: v.id, kind: 'call', call: '2026-11-06_100000-pricing' })
  assert.deepEqual(m.mismatch, { call: 'client-x', vault: 'system' })
  assert.ok(!nfs.readdirSync(npath.join(v.root, 'raw_inbox/echo')).some((f) => f.includes('pricing')), 'nothing written')
  const x = await w.ctx.run('add_source', { vault: v.id, kind: 'call', call: '2026-11-06_100000-pricing', anyway: true })
  const l = ledgerOf(w.ctx, v.id)
  assert.ok(l.sources[x.path].anyway && l.sources[x.path].by === 'call')
  assert.ok(!l.sources[a.path].anyway)
  assert.ok(!read(v.root, x.path).includes('\nnote:'))
})

const THREAD = {
  subject: 'Acme — pilot plan', picked: 'm1',
  messages: [
    { id: 'm1', subject: 'Acme — pilot plan', from: { name: 'Dana Reyes', email: 'dana@acme.example' }, to: [{ name: 'Sam Rivera', email: 'sam@acme.example' }], at: '2026-11-03T09:15:00Z', text: 'Hi Sam,\nAttached is the pilot plan & its timeline.\nDana', url: 'https://outlook.example/owa/?ItemID=m1', files: ['pilot-plan.pdf'] },
    { id: 'm2', subject: 'RE: Acme — pilot plan', from: { name: 'Sam Rivera', email: 'sam@acme.example' }, to: [{ name: 'Dana Reyes', email: 'dana@acme.example' }], at: '2026-11-03T14:40:00Z', text: 'Thanks Dana, looks good.\nWho owns the data migration?', url: 'https://outlook.example/owa/?ItemID=m2', files: [], files_error: 'Graph: ErrorAccessDenied' },
    { id: 'm3', subject: 'RE: Acme — pilot plan', from: { name: 'Dana Reyes', email: 'dana@acme.example' }, to: [{ name: 'Sam Rivera', email: 'sam@acme.example' }, { name: 'Alex Doe', email: 'alex@acme.example' }], at: '2026-11-04T08:05:00Z', text: 'Alex Doe will own it.\nKickoff is on 18 November.', url: 'https://outlook.example/owa/?ItemID=m3', files: ['kickoff.ics', 'budget.xlsx'] },
  ],
}

test('a mail thread becomes a source: a section a message, attachments named', async () => {
  const w = world({ m365: { mailThread: async () => THREAD } })
  const v = await w.vault('Twin', { minutes: 'off' })
  const a = await w.ctx.run('add_source', { vault: v.id, kind: 'mail', message: 'm1' })
  const date = localTime('2026-11-04T08:05:00Z').slice(0, 10)
  assert.equal(a.path, `raw_inbox/mail/${date}-acme-pilot-plan.md`)
  const text = read(v.root, a.path)
  assert.deepEqual(['title', 'kind', 'date', 'people', 'source', 'origin'].map((k) => prop(text, k)), ['Acme — pilot plan', 'mail', date, 'Dana Reyes, Sam Rivera, Alex Doe', 'https://outlook.example/owa/?ItemID=m1', 'echo'])
  const body = fmSplit(text)[1]
  assert.equal(body.split('\n### ').length - 1, 3)
  assert.ok(body.includes(`### Dana Reyes · ${localTime('2026-11-03T09:15:00Z')}\n\nHi Sam,\nAttached is the pilot plan & its timeline.\nDana\n\nAttachments: pilot-plan.pdf\n`), body)
  assert.ok(body.includes('\nAttachments: Echo couldn\'t list them (Graph: ErrorAccessDenied)\n'), body)
  assert.ok(body.includes('Kickoff is on 18 November.\n\nAttachments: kickoff.ics, budget.xlsx'), body)
  assert.equal(ledgerOf(w.ctx, v.id).sources[a.path].by, 'mail')
  assert.deepEqual(w.ctx.m365Log, [['mailThread', 'm1']])
  assert.throws(() => mailSourceText({ messages: [] }), /no messages/)
})

test('mail from the event is queued with Intake\'s facts only; its text is read from Microsoft 365 only when the batch is prepared', async () => {
  const threads = [{ id: 'pilot', name: 'Acme pilot', client: 'acme' }]
  const w = world({ threads, clients: [{ id: 'acme', name: 'Acme' }], m365: { mailThread: async (id) => ({ ...THREAD, picked: id }) } })
  const v = await w.vault('Acme wiki', { minutes: 'off' })
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.mail', value: 'add' })
  const item = { id: 'mail:mail/c1', kind: 'mail', title: 'Acme — pilot plan', subject: 'Acme — pilot plan', at: '2026-11-04', threads: [{ id: 'pilot', name: 'Acme pilot', client: 'acme', client_name: 'Acme' }], client: { id: 'acme', name: 'Acme' }, profile: 'system', from: ['Dana Reyes'], people: ['dana@acme.example'], trust: 'trusted', link: 'echo://mail/mail/c1', url: 'https://outlook.example/owa/?ItemID=AAMk%2Bm1' }
  const before = w.ctx.fsLog.length
  await w.ctx.fire('sources_changed', { changed: ['mail:mail/c1'], removed: [], items: [item, { ...item, id: 'mail:mail/c2', profile: 'client-x' }] })
  assert.equal(w.ctx.fsLog.length, before, 'nothing written into the vault on the event')
  assert.deepEqual(w.ctx.m365Log, [], 'no mail read on the event')
  const q = ledgerOf(w.ctx, v.id).queued
  assert.deepEqual(Object.keys(q), ['mail:mail/c1'], 'another profile\'s mail is not queued')
  assert.equal(q['mail:mail/c1'].subject, 'Acme — pilot plan')
  const s = await w.ctx.run('sources', { vault: v.id })
  assert.deepEqual(s.sources.map((x) => [x.id, x.queued, x.state]), [['mail:mail/c1', true, 'new']])
  const p = await w.ctx.run('prepare_sources', { vault: v.id })
  assert.deepEqual(w.ctx.m365Log, [['mailThread', 'AAMk+m1']], 'read once, by the id its Outlook link holds')
  assert.equal(p.written.length, 1)
  assert.ok(p.written[0].path.startsWith('raw_inbox/mail/'))
  const l = ledgerOf(w.ctx, v.id)
  assert.deepEqual(l.queued, {})
  assert.equal(l.sources[p.written[0].path].from, 'mail:mail/c1')
  // Told again: not queued again; one gone from Intake leaves a queue it hadn't left.
  await w.ctx.fire('sources_changed', { changed: ['mail:mail/c1'], removed: [], items: [item] })
  assert.deepEqual(ledgerOf(w.ctx, v.id).queued, {})
  await w.ctx.fire('sources_changed', { changed: ['mail:mail/c3'], removed: [], items: [{ ...item, id: 'mail:mail/c3' }] })
  await w.ctx.fire('sources_changed', { changed: [], removed: ['mail:mail/c3'] })
  assert.deepEqual(ledgerOf(w.ctx, v.id).queued, {})
  assert.equal(messageIdOf('https://outlook.office365.com/owa/?ItemID=AAMk%3D&exvsurl=1'), 'AAMk=')
  assert.equal(messageIdOf('https://teams.example/x'), null)
})

test('odd titles make safe source names', async () => {
  const long = 'Quarterly planning for the northern stores '.repeat(7)
  const subjects = ['Встреча по проекту «Север»', 'Plan / Q3: pricing?', '🚀🎉', long, 'CON', '  ', 'Weekly sync', 'Weekly sync', 'Line one\nline two\ttabbed "quoted" \\ end']
  let i = 0
  const w = world({ m365: { mailThread: async () => { const s = subjects[i++]; return { subject: s, picked: 'm', messages: [{ id: 'm', subject: s, from: { name: 'Dana Reyes', email: 'dana@acme.example' }, to: [], at: '2026-11-04T08:05:00Z', text: 'Made-up text.', files: [] }] } } } })
  const v = await w.vault('Twin', { minutes: 'off' })
  const date = localTime('2026-11-04T08:05:00Z').slice(0, 10)
  const names = []
  for (const s of subjects) {
    const a = await w.ctx.run('add_source', { vault: v.id, kind: 'mail', message: 'm' })
    const name = a.path.split('/').pop()
    assert.ok(a.path.startsWith('raw_inbox/mail/') && safeEverywhere(name), `${s} → ${name}`)
    const text = read(v.root, a.path)
    const one = s.split(/\s+/).filter(Boolean).join(' ')
    assert.equal(prop(text, 'title'), one || '(no subject)')
    assert.ok(text.includes(`\n# ${mdText(prop(text, 'title'))}\n`))
    names.push(name)
  }
  assert.equal(names[0], `${date}-встреча-по-проекту-север.md`)
  assert.equal(names[1], `${date}-plan-q3-pricing.md`)
  assert.equal(names[2], `${date}-mail.md`)
  assert.ok(names[3].length < 100 && names[3].startsWith(`${date}-quarterly-planning`), names[3])
  assert.equal(names[4], `${date}-con.md`)
  assert.equal(names[5], `${date}-mail (2).md`)
  assert.deepEqual([names[6], names[7]], [`${date}-weekly-sync.md`, `${date}-weekly-sync (2).md`])
  // A picked file's own odd name is made safe, its bytes kept; never the folder's README.
  const picked = npath.join(w.base, 'picked')
  write(picked, 'Q3: plan?.pdf', '%PDF made up')
  write(picked, 'README.md', '# not the folder\'s README')
  write(picked, 'CON.txt', 'made up')
  const r = await w.ctx.run('add_source', { vault: v.id, kind: 'file' }, { files: ['Q3: plan?.pdf', 'README.md', 'CON.txt'].map((n) => w.ctx.handle(npath.join(picked, n))) })
  for (const a of r.added) assert.ok(a.path.startsWith('raw_inbox/') && safeEverywhere(a.path.split('/').pop()), a.path)
  assert.equal(r.added[1].path, 'raw_inbox/README (2).md')
  assert.equal(read(v.root, 'raw_inbox/README (2).md'), '# not the folder\'s README')
  assert.equal(safeName('CON.txt'), '_CON.txt')
})

test('the sources folder is made with its README; the README is never a source', async () => {
  const w = world()
  const v = await w.vault('Twin', { minutes: 'off' })
  nfs.rmSync(npath.join(v.root, 'raw_inbox'), { recursive: true })
  await w.ctx.run('reread', { id: v.id })
  const shown = await w.ctx.run('sources', { vault: v.id })
  assert.deepEqual([shown.folder, shown.exists, shown.create], ['raw_inbox', false, 'Echo will create raw_inbox/ with a README'])
  const picked = npath.join(w.base, 'a.txt')
  write(w.base, 'a.txt', 'made up')
  const a = await w.ctx.run('add_source', { vault: v.id, kind: 'file' }, { files: [w.ctx.handle(picked)] })
  assert.equal(a.added[0].path, 'raw_inbox/a.txt')
  assert.equal(read(v.root, 'raw_inbox/README.md'), nfs.readFileSync(npath.join(PKG, 'starter/twin/raw_inbox/README.md'), 'utf8'))
  assert.equal((await w.ctx.run('sources', { vault: v.id })).create, null)
  write(v.root, 'raw_inbox/README.md', '# My own words\n')
  await w.ctx.run('add_source', { vault: v.id, kind: 'file' }, { files: [w.ctx.handle(picked)] })
  assert.equal(read(v.root, 'raw_inbox/README.md'), '# My own words\n')
  const q = (await w.ctx.run('sources', { vault: v.id })).sources.map((s) => s.path)
  assert.equal(q.length, 2)
  assert.ok(!q.some((p) => p.endsWith('README.md')))
})

test('log.md\'s processed lines count as done; the first open offers a baseline until it is answered', async () => {
  const w = world()
  const v = await w.vault('Twin', { minutes: 'off' })
  write(v.root, 'raw_inbox/Acme RFP.pdf', '%PDF made up')
  write(v.root, 'raw_inbox/notes.txt', 'made up')
  write(v.root, 'raw_inbox/echo/2026-01-05-sync.md', '---\ntitle: Planning sync\nkind: call\n---\n\n# Planning sync — minutes\n')
  write(v.root, 'raw_inbox/.DS_Store', 'x')
  write(v.root, 'log.md', '# Log\n\n- 2026-11-02 · processed · raw_inbox/Acme RFP.pdf → knowledge/clients/acme.md\n- 2026-11-03 · added · raw_inbox/notes.txt\n- 2026-11-03 · processed · raw_inbox/gone.pdf → knowledge/x.md\n')
  const s = await w.ctx.run('sources', { vault: v.id })
  const st = Object.fromEntries(s.sources.map((x) => [x.path, [x.kind, x.state, x.title]]))
  assert.deepEqual(st, { 'raw_inbox/Acme RFP.pdf': ['file', 'done', 'Acme RFP.pdf'], 'raw_inbox/notes.txt': ['file', 'new', 'notes.txt'], 'raw_inbox/echo/2026-01-05-sync.md': ['echo', 'new', 'Planning sync'] })
  assert.deepEqual(s.offer, { count: 2, folder: 'raw_inbox' })
  await w.ctx.run('skip_source', { vault: v.id, path: 'raw_inbox/notes.txt', note: 'Already in the client page' })
  assert.equal((await w.ctx.run('sources', { vault: v.id })).offer.count, 1, 'a skipped file is answered')
  for (const bad of ['knowledge/CATALOG.md', '../x/raw_inbox/notes.txt', 'raw_inbox/../AGENTS.md', 'raw_inbox/nope.pdf', '/etc/hosts', 'raw_inbox/README.md']) await assert.rejects(w.ctx.run('skip_source', { vault: v.id, path: bad }), undefined, bad)
  assert.deepEqual(await w.ctx.run('baseline', { vault: v.id, done: true }), { marked: 1, done: true })
  const after = await w.ctx.run('sources', { vault: v.id })
  assert.equal(after.offer, null)
  assert.ok(after.sources.every((x) => x.state === 'done' || x.state === 'skipped'))
  assert.equal(after.sources.find((x) => x.path === 'raw_inbox/notes.txt').note, 'Already in the client page')
  assert.deepEqual([...processedPaths('- 2026-11-01 · processed · `raw_inbox/a b.pdf` -> x\n- 2026-11-01 · added · y\n- x · processed · raw_inbox/c.pdf → y\nsee - 2026-11-01 · processed · raw_inbox/d.pdf → y')], ['raw_inbox/a b.pdf'], 'only a line of its own in the starter\'s format')
  assert.equal(sourceState({ state: 'new' }, true), 'done')
  assert.equal(sourceState({ state: 'waiting' }, false), 'waiting')
})

test('a name the ledger or the log knows is taken: a new file never inherits an old one\'s state', async () => {
  const w = world()
  const v = await w.vault('Twin', { minutes: 'off' })
  write(v.root, 'log.md', '# Log\n\n- 2026-11-01 · processed · raw_inbox/a.pdf → knowledge/topics/a.md\n')
  const picked = npath.join(w.base, 'picked')
  write(picked, 'a.pdf', 'new a')
  write(picked, 'b.pdf', 'b')
  await w.ctx.run('add_source', { vault: v.id, kind: 'file' }, { files: [w.ctx.handle(npath.join(picked, 'b.pdf'))] })
  await w.ctx.run('skip_source', { vault: v.id, path: 'raw_inbox/b.pdf' })
  nfs.rmSync(npath.join(v.root, 'raw_inbox/b.pdf'))
  const r = await w.ctx.run('add_source', { vault: v.id, kind: 'file' }, { files: ['a.pdf', 'b.pdf'].map((n) => w.ctx.handle(npath.join(picked, n))) })
  assert.deepEqual(r.added.map((a) => a.path), ['raw_inbox/a (2).pdf', 'raw_inbox/b (2).pdf'])
  const q = (await w.ctx.run('sources', { vault: v.id })).sources
  assert.ok(q.filter((s) => r.added.some((a) => a.path === s.path)).every((s) => s.state === 'new'))
})

test('a new source never writes over a file: one that appears at the chosen name is kept', async () => {
  const w = world()
  const v = await w.vault('Twin', { minutes: 'off' })
  const picked = npath.join(w.base, 'x.md')
  write(w.base, 'x.md', 'mine')
  write(v.root, 'raw_inbox/x.md', 'theirs')
  const r = await w.ctx.run('add_source', { vault: v.id, kind: 'file' }, { files: [w.ctx.handle(picked)] })
  assert.equal(r.added[0].path, 'raw_inbox/x (2).md')
  assert.equal(read(v.root, 'raw_inbox/x.md'), 'theirs')
})

test('long names fit both systems', async () => {
  const w = world()
  const v = await w.vault('Twin', { minutes: 'off' })
  const picked = npath.join(w.base, 'picked')
  const names = [`${'会议记录'.repeat(20)}.pdf`, `${'🚀'.repeat(61)}.pdf`, `${'Протокол'.repeat(15)}Про.txt`]
  for (const n of names) write(picked, n, n)
  const hs = names.flatMap((n) => [w.ctx.handle(npath.join(picked, n)), w.ctx.handle(npath.join(picked, n))])
  const r = await w.ctx.run('add_source', { vault: v.id, kind: 'file' }, { files: hs })
  r.added.forEach((a, i) => {
    const name = a.path.split('/').pop()
    assert.ok(Buffer.byteLength(name) <= 200 && name.length <= 200 && safeEverywhere(name), a.path)
    assert.equal(read(v.root, a.path), names[Math.floor(i / 2)])
    assert.ok(i % 2 === 0 || a.path.includes(' (2)'), a.path)
  })
  const d = datedName('2026-11-04', '𠀀𠀁𠀂𠀃'.repeat(20), 'mail')
  assert.ok(Buffer.byteLength(d) <= 200 && d.length <= 200, d)
  assert.equal(fitName('abc', '.md'), 'abc')
})

test('a source is committed alone; with commits off, written and not committed', { skip: !hasGit }, async () => {
  const w = world({ git: true })
  const v = await w.vault('My twin', { git: true, minutes: 'off' })
  assert.equal(v.git, 'committed')
  write(v.root, 'knowledge/profile/DIGITAL_PROFILE.md', '# my unfinished edit\n')
  write(w.base, 'Acme RFP.pdf', '%PDF made up')
  const a = (await w.ctx.run('add_source', { vault: v.id, kind: 'file' }, { files: [w.ctx.handle(npath.join(w.base, 'Acme RFP.pdf'))] })).added[0]
  assert.match(a.committed, /^[0-9a-f]{40}$/)
  assert.deepEqual(gitOut(v.root, 'show', '--name-only', '--format=%s', 'HEAD').split('\n').filter(Boolean), ['Add source: Acme RFP.pdf', 'raw_inbox/Acme RFP.pdf'])
  assert.ok(gitOut(v.root, 'status', '--porcelain').includes(' M knowledge/profile/DIGITAL_PROFILE.md'))
  const head = gitOut(v.root, 'rev-parse', 'HEAD')
  await w.ctx.run('set', { id: v.id, key: 'commit', value: 'off' })
  const b = (await w.ctx.run('add_source', { vault: v.id, kind: 'file' }, { files: [w.ctx.handle(npath.join(w.base, 'Acme RFP.pdf'))] })).added[0]
  assert.deepEqual([b.path, b.committed], ['raw_inbox/Acme RFP (2).pdf', 'off'])
  assert.equal(gitOut(v.root, 'rev-parse', 'HEAD'), head)
})

test('a web page: Echo reads it (ctx.web) — without it, "not yet in this Echo"; never an extractor of the plugin\'s', async () => {
  const w = world()
  const v = await w.vault('Twin', { minutes: 'off' })
  await assert.rejects(w.ctx.run('add_source', { vault: v.id, kind: 'web', url: 'https://acme.example/notes' }), /not yet in this Echo/)
  const w2 = world({ web: { read: async (url) => ({ url, title: 'Store [opening] notes', markdown: 'The new store opens on 4 December.' }) } })
  const v2 = await w2.vault('Twin', { minutes: 'off' })
  await assert.rejects(w2.ctx.run('add_source', { vault: v2.id, kind: 'web', url: 'acme.example/notes' }), /http:\/\/ or https:\/\//)
  const a = await w2.ctx.run('add_source', { vault: v2.id, kind: 'web', url: 'https://acme.example/notes' })
  assert.ok(a.path.startsWith('raw_inbox/web/') && a.path.endsWith('-store-opening-notes.md'), a.path)
  const t = read(v2.root, a.path)
  assert.equal(prop(t, 'url'), 'https://acme.example/notes')
  assert.ok(t.includes('\n# Store \\[opening\\] notes\n\nThe new store opens on 4 December.\n'), t)
})

test('a call queued by the event is written only when the batch is prepared, in one commit', { skip: !hasGit }, async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync'), call('2026-11-06_100000-pricing-review', 'Pricing review')], git: true })
  const v = await w.vault('My twin', { git: true, minutes: 'off' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.calls', value: 'prepare' })
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  await w.ctx.fire('minutes_written', w.data.payload('2026-11-06_100000-pricing-review'))
  assert.ok(!exists(v.root, 'raw_inbox/echo'))
  const before = Number(gitOut(v.root, 'rev-list', '--count', 'HEAD').trim())
  const p = await w.ctx.run('prepare_sources', { vault: v.id })
  assert.deepEqual(p.written.map((x) => x.path).sort(), ['raw_inbox/echo/2026-11-05-pricing-review.md', 'raw_inbox/echo/2026-11-05-weekly-delivery-sync.md'])
  assert.equal(Number(gitOut(v.root, 'rev-list', '--count', 'HEAD').trim()), before + 1)
  assert.equal(gitOut(v.root, 'log', '-1', '--format=%s').trim(), 'Add sources: 2')
})

// ── the twin preset (starter.rs) ──

/** #677's `starter::FILES`: the 23 files of the preset, and the people folder's README of Knowledge 1.1 (person pages). */
const FILES_677 = ['knowledge/people/README.md', '.claude/skills/process-inbox/SKILL.md', '.claude/skills/twin/SKILL.md', 'AGENTS.md', 'CLAUDE.md', 'README.md', 'gitignore', 'knowledge/.obsidian/app.json', 'knowledge/.obsidian/templates.json', 'knowledge/CATALOG.md', 'knowledge/TAG_TAXONOMY.md', 'knowledge/TERMS_TAXONOMY.md', 'knowledge/action-items/README.md', 'knowledge/activities/README.md', 'knowledge/clients/README.md', 'knowledge/media/README.md', 'knowledge/notes/README.md', 'knowledge/profile/DIGITAL_PROFILE.md', 'knowledge/profile/README.md', 'knowledge/templates/meeting-note.md', 'knowledge/templates/page.md', 'knowledge/topics/README.md', 'log.md', 'raw_inbox/README.md']

test('the shipped preset is #677\'s 23 files and people/README.md, read through ctx.package', async () => {
  assert.deepEqual(files(npath.join(PKG, 'starter/twin')), [...FILES_677].sort())
  const w = world()
  assert.deepEqual((await w.ctx.run('starter_files')).slice().sort(), [...FILES_677].sort())
})

test('a new vault has the preset\'s files, filled in, all 24: its skills and .gitignore (Echo #776), Obsidian\'s settings for knowledge/ (#781)', async () => {
  const w = world({ me: { name: 'Sam Rivera', email: 'sam@acme.example' } })
  const v = await w.vault('My twin', { minutes: 'auto' })
  const got = files(v.root)
  assert.deepEqual(got, FILES_677.map((p) => (p === 'gitignore' ? '.gitignore' : p)).sort())
  assert.equal(got.length, 24)
  assert.deepEqual(v.left_out, [])
  assert.deepEqual(v.skills, { where: 'vault', in_vault: ['.claude/skills/process-inbox/SKILL.md', '.claude/skills/twin/SKILL.md'], offer: null, why: null })
  assert.equal(read(v.root, '.claude/skills/twin/SKILL.md'), read(PKG, 'starter/twin/.claude/skills/twin/SKILL.md'), 'a skill as the package ships it')
  assert.ok(read(v.root, '.gitignore').includes('.staging/'))
  assert.equal(JSON.parse(read(v.root, 'knowledge/.obsidian/app.json')).useMarkdownLinks, true)
  for (const p of got) assert.ok(!read(v.root, p).includes('{{vault.'), p)
  assert.ok(read(v.root, 'knowledge/templates/page.md').includes('{{title}}'), 'Obsidian\'s placeholders stay')
  assert.ok(read(v.root, 'README.md').startsWith('# My twin\n'))
  assert.ok(read(v.root, 'knowledge/profile/DIGITAL_PROFILE.md').includes('**Name:** Sam Rivera'))
  const rec = JSON.parse(w.ctx.files['vaults.json']).find((x) => x.id === v.id)
  assert.deepEqual([rec.template, rec.commit, rec.minutes.mode], ['twin@1', false, 'auto'])
  const acts = activityRecent(w.ctx.files[`vaults/${v.id}/activity.jsonl`])
  assert.deepEqual(acts.map((a) => [a.by, a.kind, a.path, a.ref, a.commit]), [['starter', 'new', '', 'twin@1', null]])
  assert.equal(acts[0].plus, got.reduce((n, p) => n + read(v.root, p).split('\n').filter((_, i, a) => i < a.length - 1 || a[i] !== '').length, 0))
  // What Echo finds of it.
  assert.deepEqual([rec.detected.pages, rec.detected.index, rec.detected.notes, rec.detected.templates, rec.detected.log, rec.detected.sources], ['knowledge', 'knowledge/CATALOG.md', 'knowledge/notes', 'knowledge/templates', 'log.md', 'raw_inbox'])
})

test('the owner defaults to "me"; skills set to global: process-inbox in the vault, the twin offered for the user\'s own Claude Code, not written', async () => {
  const w = world({ settings: { skills: 'global' } })
  const v = await w.vault('Mine')
  assert.ok(read(v.root, 'knowledge/profile/DIGITAL_PROFILE.md').includes('**Name:** me'))
  assert.deepEqual(v.skills, { where: 'global', in_vault: ['.claude/skills/process-inbox/SKILL.md'], offer: 'twin', why: null })
  assert.ok(!exists(v.root, '.claude/skills/twin/SKILL.md'), 'the host half never writes the user\'s Claude Code; the window half installs it on a click')
  const st = await w.ctx.run('vault_settings', { id: v.id })
  assert.deepEqual([st.has_twin, st.twin_made, st.global_twin], [false, true, null])
  assert.deepEqual(await w.ctx.run('twin', { id: v.id, op: 'installed', name: 'mine-twin' }), { vault: v.id, name: 'mine-twin' })
  assert.equal((await w.ctx.run('vault_settings', { id: v.id })).global_twin, 'mine-twin', 'its name shown in Settings, Update and Remove offered')
  await assert.rejects(w.ctx.run('twin', { id: v.id, op: 'installed', name: '../x' }), /1–64 of a-z/)
  await w.ctx.run('twin', { id: v.id, op: 'removed' })
  assert.equal((await w.ctx.run('vault_settings', { id: v.id })).global_twin, null)
})

test('a new vault in git is one clean commit on main, and commits on', { skip: !hasGit }, async () => {
  const w = world({ git: true })
  const v = await w.vault('Team wiki', { git: true, minutes: 'ask' })
  assert.equal(v.git, 'committed')
  assert.equal(gitOut(v.root, 'log', '--format=%s').trim(), 'Start the vault from Echo\'s twin starter')
  assert.equal(gitOut(v.root, 'status', '--porcelain'), '')
  assert.equal(gitOut(v.root, 'symbolic-ref', '--short', 'HEAD').trim(), 'main')
  const rec = JSON.parse(w.ctx.files['vaults.json']).find((x) => x.id === v.id)
  assert.equal(rec.commit, true)
  assert.equal(rec.minutes.mode, 'ask')
  assert.match(activityRecent(w.ctx.files[`vaults/${v.id}/activity.jsonl`])[0].commit, /^[0-9a-f]{40}$/)
})

test('a folder with files, or one inside a connected vault, is refused before anything is written', async () => {
  const w = world()
  const busy = npath.join(w.base, 'busy')
  write(busy, 'keep.txt', 'mine')
  w.folders.push(busy)
  await assert.rejects(w.ctx.run('new_vault', { name: 'Busy', folder: nfs.realpathSync(busy) }), /isn't empty/)
  assert.deepEqual(files(busy), ['keep.txt'])
  const empty = npath.join(w.base, 'empty')
  nfs.mkdirSync(empty)
  write(empty, '.DS_Store', 'x')
  w.folders.push(empty)
  assert.ok((await w.ctx.run('new_vault', { name: 'Empty', folder: nfs.realpathSync(empty) })).id)
  const outer = await w.vault('Outer')
  const inner = npath.join(outer.root, 'knowledge/inner')
  nfs.mkdirSync(inner)
  w.folders.push(inner)
  const before = files(outer.root)
  await assert.rejects(w.ctx.run('new_vault', { name: 'Inner', folder: nfs.realpathSync(inner) }), /inside/)
  assert.deepEqual(files(outer.root), before)
  await assert.rejects(w.ctx.run('new_vault', { name: '  ' }), /needs a name/)
})

// ── the activity's commands (seam.js → view.js): the Ingest queue and the Add a source sheet, the twin sheets ──

test('ingest_queue: the sheet\'s queue in #17\'s shape — the sources with meta, what is queued, no runs (step 5)', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('Twin', { minutes: 'off' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.calls', value: 'add' })
  write(v.root, 'raw_inbox/notes.md', '# Notes\n')
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  const q = await w.ctx.run('ingest_queue', { id: v.id })
  assert.deepEqual([q.folder, q.exists, q.runs, q.max_file, q.profile_name], ['raw_inbox', true, [], 50 << 20, 'Claude Code (as configured)'])
  const by = Object.fromEntries(q.sources.map((s) => [s.path, [s.kind, s.state, s.meta.markdown, s.meta.queued]]))
  assert.deepEqual(by, { 'raw_inbox/notes.md': ['file', 'new', true, false], 'call:2026-11-05_090012': ['echo', 'new', false, true] })
  assert.deepEqual(q.offer, { count: 1, folder: 'raw_inbox' })
})

test('the Add a source sheet: files picked then handed back, calls with their profile and note, mail search, a Teams chat; the skip of a queued one', async () => {
  const chat = { id: '19:x@thread.v2', topic: 'Ops/Infra: on-call', members: [], url: 'https://teams.example/l/chat/19:x', since: '2026-11-01', until: '2026-11-07', messages: [{ at: '2026-11-02T10:00:00Z', from: 'Sam Rivera', text: 'Paged twice.', files: ['log.txt'] }] }
  const w = world({ calls: [call(CALL, 'Weekly delivery sync'), call('2026-11-06_100000-x', 'Elsewhere', { profile: 'client-x' })], m365: { search: async () => ({ results: [{ kind: 'mail', id: 'm1' }, { kind: 'chats', chat: '19:x@thread.v2', channel: null }, { kind: 'chats', chat: '19:g@thread.tacv2', channel: '19:g' }, { kind: 'files', id: 'f' }], errors: {} }), chat: async () => chat } })
  const v = await w.vault('Twin', { minutes: 'off' })
  write(w.base, 'deck.pdf', '%PDF made up')
  w.ctx.system.pickFiles = async () => [w.ctx.handle(npath.join(w.base, 'deck.pdf'))]
  const p = await w.ctx.run('pick_files', {})
  assert.deepEqual(p.files, [{ name: 'deck.pdf', size: 12 }])
  const a = await w.ctx.run('source_add', { id: v.id, kind: 'files', pick: p.seq }, { files: p.handles })
  assert.deepEqual([a.added.map((x) => x.path), a.refused], [['raw_inbox/deck.pdf'], []])
  const calls = (await w.ctx.run('source_calls', { id: v.id, q: '' })).calls
  assert.deepEqual(calls.map((c) => [c.name, c.profile_ok, c.profile_name]), [['2026-11-06_100000-x', false, 'Client X'], [CALL, true, 'Claude Code (as configured)']])
  const mm = await w.ctx.run('source_add', { id: v.id, kind: 'call', call: '2026-11-06_100000-x' })
  assert.deepEqual(mm.mismatch, { call: 'client-x', vault: 'system', call_name: 'Client X', vault_name: 'Claude Code (as configured)' })
  const m = await w.ctx.run('source_m365', { id: v.id, q: 'pilot' })
  assert.deepEqual(m.results.map((h) => h.id || h.chat), ['m1', '19:x@thread.v2'], 'a mail and a chat — not a channel\'s post, not a file')
  assert.deepEqual(await w.ctx.run('source_m365', { id: v.id, q: ' ' }), { signed_in: true, results: [] })
  const t = await w.ctx.run('source_add', { id: v.id, kind: 'chat', chat: '19:x@thread.v2', since: '2026-11-01', until: '2026-11-07' })
  assert.equal(t.path, 'raw_inbox/teams/2026-11-07-ops-infra-on-call.md')
  const text = read(v.root, t.path)
  assert.deepEqual(['title', 'kind', 'since', 'until', 'source'].map((k) => prop(text, k)), ['Ops/Infra: on-call', 'teams', '2026-11-01', '2026-11-07', 'https://teams.example/l/chat/19:x'])
  assert.ok(text.includes(`### Sam Rivera · ${localTime('2026-11-02T10:00:00Z')}\n\nPaged twice.\n\nAttachments: log.txt\n`), text)
  const w2 = world({ m365: { search: async () => { throw new Error('Microsoft 365 isn\'t connected: sign in to it in Echo\'s Settings → Calendar & chat') } } })
  const v2 = await w2.vault('Other', { minutes: 'off' })
  assert.deepEqual(await w2.ctx.run('source_m365', { id: v2.id, q: 'x' }), { signed_in: false, results: [] })
})

test('the twin sheets: the skill\'s text for every session, its paths absolute and a frontmatter Echo takes; added to a vault without one; the host half never installs it', async () => {
  const w = world()
  const v = await w.vault('My twin')
  const t = await w.ctx.run('twin_text', { id: v.id })
  assert.equal(t.name, 'my-twin')
  assert.equal(t.own, true, 'the vault\'s own: the preset wrote it (Echo #776)')
  assert.ok(t.text.startsWith('---\nname: my-twin\n') && t.text.includes(`\n---\n\n<!-- Echo's copy of the twin skill of the vault “My twin” (${v.id}), added from Knowledge. -->\n`), t.text.slice(0, 300))
  assert.equal(skillMdProblem(t.text), null, 'Echo\'s installSkill takes it')
  assert.ok(t.text.includes(`\`${v.root}/knowledge/CATALOG.md\``), 'paths are absolute')
  await assert.rejects(w.ctx.run('twin', { id: v.id, op: 'add' }), /already has a twin skill/)
  nfs.rmSync(npath.join(v.root, '.claude/skills/twin'), { recursive: true })
  assert.deepEqual(await w.ctx.run('twin', { id: v.id, op: 'add' }), { path: '.claude/skills/twin/SKILL.md' })
  assert.equal(read(v.root, '.claude/skills/twin/SKILL.md'), read(PKG, 'starter/twin/.claude/skills/twin/SKILL.md'))
  await assert.rejects(w.ctx.run('twin', { id: v.id, op: 'global', name: 'my-twin' }), /in the window, on your click/)
  // The New vault sheet sends the folder it picked as `pick`, and takes the vault back.
  const f = npath.join(w.base, 'fresh')
  nfs.mkdirSync(f)
  w.folders.push(f)
  const r = await w.ctx.run('new_vault', { name: 'Fresh', pick: nfs.realpathSync(f), git: false, minutes: 'ask' })
  assert.deepEqual(r.vault, { id: 'fresh', name: 'Fresh' })
})
