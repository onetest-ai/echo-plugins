// Knowledge 1.0 step 4, after its review: hostile titles and names stay one value, the profile guard holds for mail
// and chats, a mail is read only by its id, nothing is written twice across processes, the catch-up, commits that
// race the user or git, and what QuickJS is spared. Made-up data only.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as nfs from 'node:fs'
import * as npath from 'node:path'
import { fmSplit, fmParse, fmGet, propText, processedPaths, noteFileName, fillStarter } from '../../plugins/obsidian/main.js'
import { world, call, read, write, exists, hasGit, gitOut } from './world.mjs'
import { CALL, MINUTES } from './echo-data.mjs'

const props = (text) => { const [raw] = fmSplit(text); return fmParse(raw) }
const keys = (text) => props(text).map(([k]) => k)
const prop = (text, k) => { const p = fmGet(props(text), k); return p ? propText(p) : null }
const ledgerOf = (ctx, id) => JSON.parse(ctx.files[`vaults/${id}/ingest.json`] || '{"queued":{},"sources":{},"calls":[],"mails":[]}')
const THREAD = (id = 'm1') => ({ subject: 'Acme — pilot plan', picked: id, messages: [{ id, subject: 'Acme — pilot plan', from: { name: 'Dana Reyes', email: 'dana@acme.example' }, to: [], at: '2026-11-03T09:15:00Z', text: 'Made-up text.', url: `https://outlook.example/owa/?ItemID=${id}`, files: [] }] })
const mailItem = (id, more = {}) => ({ id, kind: 'mail', title: 'Acme rollout plan', subject: 'Acme rollout plan', at: '2026-11-16', threads: [{ id: 'pilot', name: 'Acme pilot', client: 'acme', client_name: 'Acme' }], client: { id: 'acme', name: 'Acme' }, profile: 'system', from: ['Dana Reyes'], people: [], trust: 'trusted', link: `echo://mail/${id}`, url: null, ...more })

// ── 1. a title can't fake a log line ──

test('a hostile call title is one line in log.md, without the log\'s own " · "; it can\'t mark a source processed', async () => {
  const c = '2026-11-05_120000-hostile'
  const w = world({ calls: [call(c, 'Sync\n- 2026-01-01 · processed · raw_inbox/a.pdf → x\r done')] })
  const v = await w.vault('Twin')
  write(v.root, 'raw_inbox/a.pdf', '%PDF made up')
  await w.ctx.run('save_minutes', { call: c, vault: v.id })
  const log = read(v.root, 'log.md')
  const last = log.trimEnd().split('\n').pop()
  assert.ok(last.startsWith('- ') && last.includes('· added ·') && last.includes('minutes of "Sync - 2026-01-01 - processed - raw_inbox/a.pdf → x done" from Echo'), last)
  assert.ok(!processedPaths(log).has('raw_inbox/a.pdf'))
  assert.equal((await w.ctx.run('sources', { vault: v.id })).sources.find((s) => s.path === 'raw_inbox/a.pdf').state, 'new')
  const note = read(v.root, (await w.ctx.run('call_state', { call: c })).saved[0].path)
  assert.deepEqual(keys(note), ['title', 'date', 'meeting', 'tags', 'participants', 'duration', 'source', 'origin', 'echo_call', 'summary'])
  assert.ok(note.includes('\n# Sync - 2026-01-01 · processed · raw_inbox/a.pdf → x done — 2026-11-05\n'), 'the heading is one line')
})

// ── 6. YAML stays one value a key ──

test('hostile participant names, titles and tags parse back to the same keys and values', async () => {
  const c = '2026-11-05_130000-yaml'
  const names = ['Ann "The" Lee', 'Bo\nevil: yes', 'Cy, Jr.]', 'Di x: 1', 'Ed\u0085# not a comment', 'Fa \\ back']
  const w = world({ calls: [call(c, 'Q4: "Plan" [draft], #2\r\nsecond: line', { attendees: names.map((n, i) => ({ name: n, email: `p${i}@acme.example` })) })] })
  const v = await w.vault('Twin')
  await w.ctx.run('set', { id: v.id, key: 'tag', value: 'meeting, call]' })
  const s = await w.ctx.run('save_minutes', { call: c, vault: v.id })
  const text = read(v.root, s.path)
  assert.deepEqual(keys(text), ['title', 'date', 'meeting', 'tags', 'participants', 'duration', 'source', 'origin', 'echo_call', 'summary'], text.slice(0, 600))
  assert.equal(prop(text, 'title'), 'Q4: "Plan" [draft], #2  second: line')
  assert.equal(prop(text, 'participants'), 'Ann "The" Lee, Bo evil: yes, Cy, Jr.], Di x: 1, Ed # not a comment, Fa \\ back')
  const tags = fmGet(props(text), 'tags')
  assert.deepEqual(tags.v, ['meeting, call]'], 'the tag stays one item of the list')
  assert.equal(prop(text, 'echo_call'), c)
  assert.equal(prop(text, 'source'), `echo://call/${c}`)
})

// ── 7. a user's stem ──

test('a name the user types is made safe: a device name, a lone dot, too long', () => {
  assert.equal(noteFileName('{date}-{slug}.md', '2026-11-05', 'x', 'CON'), '_CON.md')
  assert.equal(noteFileName('{date}-{slug}.md', '2026-11-05', 'x', '.'), 'note.md')
  assert.equal(noteFileName('{date}-{slug}.md', '2026-11-05', 'x', ' .md '), 'note.md')
  const long = noteFileName('{date}-{slug}.md', '2026-11-05', 'x', '会议'.repeat(200))
  assert.ok(Buffer.byteLength(long) <= 200 && long.endsWith('.md'), long)
})

// ── nit: the owner's name in the preset's properties ──

test('the owner\'s name stays one value in DIGITAL_PROFILE.md\'s properties, and text in its body', () => {
  const t = '---\ntitle: Digital profile — {{vault.owner}}\ndate: {{vault.date}}\nsummary: "Who {{vault.owner}} is."\n---\n\n- **Name:** {{vault.owner}}\n'
  const out = fillStarter(t, { name: 'V', owner: 'Sam "R" Rivera\nevil: yes [x](y)', date: '2026-11-18' })
  assert.deepEqual(keys(out), ['title', 'date', 'summary'])
  assert.equal(prop(out, 'title'), 'Digital profile — Sam "R" Rivera evil: yes [x](y)')
  assert.equal(prop(out, 'summary'), 'Who Sam "R" Rivera evil: yes [x](y) is.')
  assert.ok(out.endsWith('- **Name:** Sam "R" Rivera evil: yes \\[x\\](y)\n'), out)
})

// ── 2, 3. mail: its profile, read by its id only, channels not queued ──

test('a queued mail keeps its profile: the vault switched to another, prepare refuses it and it stays queued, saying why', async () => {
  const w = world({ threads: [{ id: 'pilot', name: 'Acme pilot', client: 'acme' }], clients: [{ id: 'acme', name: 'Acme' }], m365: { mailThread: async (id) => THREAD(id) } })
  const v = await w.vault('Acme wiki', { minutes: 'off' })
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.mail', value: 'add' })
  await w.ctx.fire('sources_changed', { changed: ['mail:c1'], removed: [], items: [mailItem('mail:c1', { m365_id: 'AAMk1' })] })
  assert.equal(ledgerOf(w.ctx, v.id).queued['mail:c1'].profile, 'system')
  await w.ctx.run('set', { id: v.id, key: 'profile', value: 'client-x' })
  const p = await w.ctx.run('prepare_sources', { vault: v.id })
  assert.deepEqual(p.written, [])
  assert.match(p.failed[0].error, /Claude Code \(as configured\) profile; Acme wiki is read by the Client X profile/)
  assert.deepEqual(w.ctx.m365Log, [], 'not read')
  assert.match(ledgerOf(w.ctx, v.id).queued['mail:c1'].why, /profile/)
  await w.ctx.run('set', { id: v.id, key: 'profile', value: '' })
  const again = await w.ctx.run('prepare_sources', { vault: v.id })
  assert.equal(again.written.length, 1)
  assert.deepEqual(w.ctx.m365Log, [['mailThread', 'AAMk1']], 'by Intake\'s m365_id')
})

test('a mail with no id stays queued with why (no search for it); a channel\'s post isn\'t queued, said in the ledger', async () => {
  const w = world({ threads: [{ id: 'pilot', name: 'Acme pilot', client: 'acme' }], m365: { mailThread: async (id) => THREAD(id), search: async () => { throw new Error('never searched') } } })
  const v = await w.vault('Acme wiki', { minutes: 'off' })
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.mail', value: 'add' })
  await w.ctx.fire('sources_changed', { changed: [], removed: [], items: [mailItem('mail:c1'), mailItem('channel:p1', { kind: 'channel' })] })
  const l = ledgerOf(w.ctx, v.id)
  assert.deepEqual(Object.keys(l.queued), ['mail:c1'])
  assert.match(l.not_queued['channel:p1'].why, /channel's posts/)
  const p = await w.ctx.run('prepare_sources', { vault: v.id })
  assert.equal(p.failed[0].error, 'this mail can\'t be read until Echo gives its id')
  assert.deepEqual(w.ctx.m365Log, [])
  assert.equal((await w.ctx.run('sources', { vault: v.id })).sources[0].why, 'this mail can\'t be read until Echo gives its id')
})

test('a mail or a chat the user adds is checked against the vault\'s profile (the default one\'s when Intake has none)', async () => {
  const chat = { id: '19:x', topic: 'Ops', members: [], url: null, since: '2026-11-01', until: '2026-11-07', messages: [{ at: '2026-11-02T10:00:00Z', from: 'Sam Rivera', text: 'Hi.', files: [] }] }
  const w = world({ m365: { mailThread: async (id) => THREAD(id), chat: async () => chat } })
  const v = await w.vault('Twin', { minutes: 'off' })
  await w.ctx.run('set', { id: v.id, key: 'profile', value: 'client-x' })
  const m = await w.ctx.run('source_add', { id: v.id, kind: 'mail', message: 'm1' })
  assert.deepEqual(m.mismatch, { call: 'system', vault: 'client-x', call_name: 'Claude Code (as configured)', vault_name: 'Client X' })
  const c = await w.ctx.run('source_add', { id: v.id, kind: 'chat', chat: '19:x', since: '2026-11-01', until: '2026-11-07' })
  assert.ok(c.mismatch)
  assert.deepEqual(w.ctx.m365Log, [], 'nothing read')
  assert.ok((await w.ctx.run('source_add', { id: v.id, kind: 'mail', message: 'm1', anyway: true })).path.startsWith('raw_inbox/mail/'))
  // Recorded by its id: the queue never takes that mail again.
  assert.ok(ledgerOf(w.ctx, v.id).mails.includes('m365:m1'))
})

// ── 4. nothing twice ──

test('two prepares at once write each source once; a prepare another process holds is refused, an old one taken over', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('Twin', { minutes: 'off' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.calls', value: 'add' })
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  const [a, b] = await Promise.all([w.ctx.run('prepare_sources', { vault: v.id }), w.ctx.run('prepare_sources', { vault: v.id })])
  assert.equal(a.written.length + b.written.length, 1)
  assert.deepEqual(nfs.readdirSync(npath.join(v.root, 'raw_inbox/echo')), ['2026-11-05-weekly-delivery-sync.md'])
  w.ctx.files[`locks/prepare-${v.id}.json`] = JSON.stringify({ at: Date.now(), by: 'terminal' })
  await assert.rejects(w.ctx.run('prepare_sources', { vault: v.id }), /preparing Twin's sources already/)
  w.ctx.files[`locks/prepare-${v.id}.json`] = JSON.stringify({ at: Date.now() - 11 * 60 * 1000, by: 'terminal' })
  assert.deepEqual((await w.ctx.run('prepare_sources', { vault: v.id })).failed, [], 'an old marker is taken over')
  assert.ok(!(`locks/prepare-${v.id}.json` in w.ctx.files), 'and let go')
  // A source the ledger has by the call it came from is never written again, even if queued again by hand.
  const l = JSON.parse(w.ctx.files[`vaults/${v.id}/ingest.json`])
  l.queued['call:2026-11-05_090012'] = { kind: 'call', title: 'x', added: new Date().toISOString(), state: 'queued' }
  w.ctx.files[`vaults/${v.id}/ingest.json`] = JSON.stringify(l)
  const p = await w.ctx.run('prepare_sources', { vault: v.id })
  assert.deepEqual(p.written, [{ id: 'call:2026-11-05_090012', path: 'raw_inbox/echo/2026-11-05-weekly-delivery-sync.md', already: true }])
  assert.deepEqual(nfs.readdirSync(npath.join(v.root, 'raw_inbox/echo')), ['2026-11-05-weekly-delivery-sync.md'])
})

test('a call\'s note another process is writing isn\'t written here too (a marker per call and vault)', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('Twin')
  w.ctx.files[`locks/minutes-2026-11-05_090012-${v.id}.json`] = JSON.stringify({ at: Date.now(), by: 'app' })
  await assert.rejects(w.ctx.run('save_minutes', { call: CALL, vault: v.id }), /being saved into Twin already/)
  assert.ok(!exists(v.root, 'knowledge/notes/2026-11-05-weekly-delivery-sync.md'))
  w.ctx.files[`locks/minutes-2026-11-05_090012-${v.id}.json`] = JSON.stringify({ at: Date.now() - 3 * 60 * 1000, by: 'app' })
  assert.equal((await w.ctx.run('save_minutes', { call: CALL, vault: v.id })).state, 'saved')
  assert.ok(!(`locks/minutes-2026-11-05_090012-${v.id}.json` in w.ctx.files))
})

// ── 5. the catch-up ──

test('the catch-up: a first start notes the day; the next saves only calls with no record and queues only what the ledger hasn\'t; a failed read keeps the day', async () => {
  const later = (folder, title, day) => call(folder, title, { started_at: `${day}T10:00:00+02:00`, ended_at: `${day}T10:30:00+02:00` })
  const w = world({ calls: [later('2026-11-10_100000-a', 'A', '2026-11-10'), later('2026-11-11_100000-b', 'B', '2026-11-11'), later('2026-11-12_100000-c', 'C', '2026-11-12')] })
  const v = await w.vault('Twin')
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.calls', value: 'add' })
  assert.deepEqual(await w.ctx.run('catch_up'), { first: true, ok: true })
  assert.ok(!exists(v.root, 'knowledge/notes/2026-11-10-a.md'), 'a first start saves nothing')
  // B saved before (by hand), C's source written and done: the catch-up leaves both.
  await w.ctx.run('save_minutes', { call: '2026-11-11_100000-b', vault: v.id })
  await w.ctx.fire('minutes_written', w.data.payload('2026-11-12_100000-c'))
  await w.ctx.run('prepare_sources', { vault: v.id })
  await w.ctx.run('skip_source', { vault: v.id, path: 'raw_inbox/echo/2026-11-12-c.md' })
  w.ctx.files['seen.json'] = JSON.stringify({ since: '2026-11-09' })
  const before = read(v.root, 'knowledge/notes/2026-11-11-b.md')
  assert.deepEqual(await w.ctx.run('catch_up'), { first: false, ok: true })
  assert.ok(exists(v.root, 'knowledge/notes/2026-11-10-a.md'), 'A had no record: saved')
  assert.equal(read(v.root, 'knowledge/notes/2026-11-11-b.md'), before, 'B: its record has the vault')
  const l = ledgerOf(w.ctx, v.id)
  assert.deepEqual(Object.keys(l.queued).sort(), ['call:2026-11-10_100000', 'call:2026-11-11_100000'], 'C, written and skipped, not queued again')
  assert.notEqual(JSON.parse(w.ctx.files['seen.json']).since, '2026-11-09')
  // A read that fails keeps the day.
  w.ctx.files['seen.json'] = JSON.stringify({ since: '2026-11-09' })
  const read0 = w.ctx.echo.read
  w.ctx.echo.read = (kind, ...a) => { if (kind === 'sources') throw new Error('Intake is busy'); return read0(kind, ...a) }
  assert.deepEqual(await w.ctx.run('catch_up'), { first: false, ok: false })
  assert.equal(JSON.parse(w.ctx.files['seen.json']).since, '2026-11-09')
})

// ── 8. commits ──

const fakeGit = (log, fail = null) => ({ info: async () => ({ repo: true, branch: 'main' }), status: async () => [], commit: async (root, { paths, message }) => { if (fail) throw new Error(fail); log.push({ n: paths.length, paths: [...paths], message }); return { rev: 'a'.repeat(40) } } })

test('the quiet window\'s commit: a note the user changed meanwhile is left out; a refused commit keeps the notes queued, with why', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync'), call('2026-11-06_100000-p', 'Pricing')] })
  const v = await w.vault('Twin')
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'commit', value: 'on' })
  const log = []
  w.ctx.git = fakeGit(log, 'a merge is in progress')
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  const r = await w.ctx.run('commit_pending', { vault: v.id })
  assert.deepEqual([r[v.id].commit, r[v.id].kept], ['skipped: a merge is in progress', true])
  const q = JSON.parse(w.ctx.files[`vaults/${v.id}/pending.json`])
  assert.equal(q.why, 'skipped: a merge is in progress')
  assert.equal(q.items.length, 3, 'still queued')
  w.ctx.git = fakeGit(log)
  write(v.root, 'knowledge/notes/2026-11-05-weekly-delivery-sync.md', 'the user\'s now\n')
  const r2 = await w.ctx.run('commit_pending', { vault: v.id })
  assert.deepEqual(log[0].paths.sort(), ['knowledge/CATALOG.md', 'log.md'], 'the changed note left out')
  assert.ok(!(`vaults/${v.id}/pending.json` in w.ctx.files))
  assert.match(r2[v.id].commit, /^a{40}$/)
})

test('a commit doesn\'t drop what was queued while it ran; over 1,000 files, several commits', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('Twin')
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'commit', value: 'on' })
  const log = []
  w.ctx.git = fakeGit(log)
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  // Another process queues a note while this commit runs.
  const commit0 = w.ctx.git.commit
  w.ctx.git.commit = async (root, o) => {
    write(v.root, 'knowledge/notes/other.md', 'x\n')
    const q = JSON.parse(w.ctx.files[`vaults/${v.id}/pending.json`])
    q.items.push({ path: 'knowledge/notes/other.md', sha: w.ctx.crypto.sha256('x\n') })
    q.calls.push({ call: '2026-11-07_100000-o', title: 'O', date: '2026-11-07', path: 'knowledge/notes/other.md' })
    w.ctx.files[`vaults/${v.id}/pending.json`] = JSON.stringify(q)
    return commit0(root, o)
  }
  await w.ctx.run('commit_pending', { vault: v.id })
  const q = JSON.parse(w.ctx.files[`vaults/${v.id}/pending.json`])
  assert.deepEqual(q.items.map((i) => i.path), ['knowledge/notes/other.md'], 'still queued for the next commit')
  w.ctx.git.commit = commit0
  // 1,001 files Echo wrote: two commits.
  const items = []
  for (let i = 0; i < 1001; i++) { write(v.root, `knowledge/notes/n${i}.md`, `${i}\n`); items.push({ path: `knowledge/notes/n${i}.md`, sha: w.ctx.crypto.sha256(`${i}\n`) }) }
  w.ctx.files[`vaults/${v.id}/pending.json`] = JSON.stringify({ at: 0, items, calls: [] })
  log.length = 0
  await w.ctx.run('commit_pending', { vault: v.id })
  assert.deepEqual(log.map((c) => [c.n, c.message]), [[1000, 'Echo: minutes of 0 calls (1/2)'], [1, 'Echo: minutes of 0 calls (2/2)']])
})

// ── 9. what QuickJS is spared ──

test('Settings\' past minutes are counted once per day and change; an event writes each vault\'s ledger once; a failing past batch posts one Inbox item', async () => {
  const w = world({ threads: [{ id: 'pilot', name: 'Acme pilot', client: 'acme' }], calls: [call(CALL, 'Weekly delivery sync'), call('2026-11-06_100000-p', 'Pricing')] })
  const v = await w.vault('Twin')
  await w.ctx.run('default', { id: v.id })
  let reads = 0
  const read0 = w.ctx.echo.read
  w.ctx.echo.read = (kind, ...a) => { if (kind === 'calls') reads++; return read0(kind, ...a) }
  await w.ctx.run('vault_settings', { id: v.id })
  await w.ctx.run('vault_settings', { id: v.id })
  assert.equal(reads, 1, 'counted once')
  await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  assert.equal((await w.ctx.run('vault_settings', { id: v.id })).past.count, 1, 'counted again after a save')
  // Three mails of one vault: one write of its ledger.
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.mail', value: 'add' })
  let writes = 0
  const upd = w.ctx.store.update
  w.ctx.store.update = (path, fn) => { if (path.endsWith('ingest.json')) writes++; return upd(path, fn) }
  await w.ctx.fire('sources_changed', { changed: [], removed: [], items: ['mail:1', 'mail:2', 'mail:3'].map((id) => mailItem(id)) })
  assert.equal(writes, 1)
  assert.equal(Object.keys(ledgerOf(w.ctx, v.id).queued).length, 3)
  w.ctx.store.update = upd
  // A past batch that fails: one Inbox item, none a call.
  w.ctx.echo.read = (kind, ...a) => { if (kind === 'source') throw new Error('Echo can\'t read it now'); return read0(kind, ...a) }
  const r = await w.ctx.run('past', { id: v.id, apply: true })
  assert.equal(r.failed.length, 1)
  assert.deepEqual(Object.keys(w.ctx.inboxNow).filter((k) => !k.startsWith('review:')), [`past:${v.id}`])
})

test('past minutes in a vault that commits: the index and log the batch wrote go in its one commit, nothing of Echo\'s left', { skip: !hasGit }, async () => {
  const calls = ['One', 'Two', 'Three'].map((t, i) => call(`2026-11-0${i + 1}_100000-${t.toLowerCase()}`, t, { started_at: `2026-11-0${i + 1}T10:00:00+02:00`, ended_at: `2026-11-0${i + 1}T10:30:00+02:00` }))
  const w = world({ calls, git: true })
  const v = await w.vault('Twin', { git: true })
  await w.ctx.run('default', { id: v.id })
  const r = await w.ctx.run('past', { id: v.id, apply: true })
  assert.equal(r.saved, 3)
  assert.equal(gitOut(v.root, 'status', '--porcelain'), '')
  assert.deepEqual(gitOut(v.root, 'show', '--name-only', '--format=', 'HEAD').trim().split('\n').sort(), ['knowledge/CATALOG.md', 'knowledge/notes/2026-11-01-one.md', 'knowledge/notes/2026-11-02-two.md', 'knowledge/notes/2026-11-03-three.md', 'log.md'])
  assert.ok(!('items' in (await w.ctx.run('save_minutes', { call: '2026-11-01_100000-one', vault: v.id }))), 'the answer has no inner fields')
})
