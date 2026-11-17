// Knowledge 1.0 step 4: a call's minutes into its vaults — onetest-ai/echo#677's export_tests.rs (its 36 acceptance
// tests) as they apply to the plugin: Echo's data from `echo.read('source')` and `minutes_written` (made up, in Echo's
// shapes), routed thread → client → the default vault, vaults made from the twin preset in temp folders, git isolated
// from the user's settings. Where the port differs from #677 the test says so.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as nfs from 'node:fs'
import * as npath from 'node:path'
import { routeCall, noteFileName, summaryLine, yamlValue, relativeTo, fmSplit, fmParse, fmGet, propText, activityRecent } from '../../plugins/obsidian/main.js'
import { MINUTES, CALL } from './echo-data.mjs'
import { world, call, read, write, exists, hasGit, gitOut } from './world.mjs'

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

const NOTE = 'knowledge/notes/2026-11-05-weekly-delivery-sync.md'
// A call's record, by its folder's stamp (YYYY-MM-DD_HHMMSS: a retitle keeps it).
const rec = (ctx, c) => JSON.parse(ctx.files[`calls/${c.slice(0, 17)}.json`] || '{"saved":[],"failed":[]}')

const GOLDEN = '---\ntitle: "Weekly delivery sync"\ndate: 2026-11-05\nmeeting: "Weekly delivery sync (MS Teams)"\ntags: [meeting]\nparticipants: Dana Reyes, Alex Doe, Sam Rivera\nduration: 46m\nsource: echo://call/2026-11-05_090012-weekly-delivery-sync\norigin: echo\necho_call: 2026-11-05_090012-weekly-delivery-sync\nsummary: "The team agreed to move the pilot | rollout to 18 November and to keep the pricing page as it is."\n---\n\n# Weekly delivery sync — 2026-11-05\n\n## Summary\n\nThe team agreed to move the pilot | rollout to 18 November and to keep the pricing page as it is.\n\n## Decisions\n\n- Pilot moves to 18 November.\n\n## Action items\n\n- [ ] Me — send the revised plan to Dana by Friday.\n\n## Open questions\n\n- Who owns the data migration?\n'

test('a call becomes a note and a row (golden; echo_call is the call\'s folder, as Echo names calls now)', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('My twin')
  const s = await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  assert.equal(s.state, 'saved')
  assert.equal(s.path, NOTE)
  assert.equal(read(v.root, NOTE), GOLDEN)
  const cat = read(v.root, 'knowledge/CATALOG.md')
  assert.ok(cat.includes('## Notes\n\n| File | Description | Date Added |\n|------|-------------|------------|\n| [2026-11-05-weekly-delivery-sync.md](notes/2026-11-05-weekly-delivery-sync.md) | 46m Weekly delivery sync — The team agreed to move the pilot / rollout to 18 November and to keep the pricing page as it is. | 2026-11-05 |\n'), cat)
  assert.ok(cat.includes(`Last update: ${today()}`))
  assert.equal(s.index, 'added')
  assert.equal(s.commit, 'off', 'commits are off: no git')
  assert.ok(read(v.root, 'log.md').trimEnd().endsWith(`· added · ${NOTE} · minutes of "Weekly delivery sync" from Echo`))
  const r = rec(w.ctx, CALL)
  assert.equal(r.saved[0].vault, v.id)
  assert.equal(r.saved[0].how, 'manual')
  assert.equal(r.saved[0].revision.length, 16, 'the minutes\' revision is kept: stale is told by it')
})

test('saving twice adds nothing', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('My twin')
  await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  const cat1 = read(v.root, 'knowledge/CATALOG.md')
  const s = await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  assert.equal(s.state, 'unchanged')
  assert.equal(read(v.root, 'knowledge/CATALOG.md'), cat1)
  assert.equal(rec(w.ctx, CALL).saved.length, 1)
})

test('an edited note is kept: replaced or a new note beside it only on the user\'s word', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')], threads: [{ id: 'pilot', name: 'Pilot', client: null }] })
  const v = await w.vault('My twin')
  await w.ctx.run('default', { id: v.id })
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  const edited = `${read(v.root, NOTE)}\nMy own line.\n`
  write(v.root, NOTE, edited)
  w.data.calls[0].notes = MINUTES.replace('18 November', '25 November')
  await w.ctx.fire('minutes_written', w.data.payload(CALL, true))
  assert.equal(read(v.root, NOTE), edited, 'never written over')
  assert.equal(rec(w.ctx, CALL).saved[0].state, 'kept')
  const r = await w.ctx.run('save_minutes', { call: CALL, vault: v.id, replace: true })
  assert.equal(r.state, 'updated')
  assert.ok(read(v.root, NOTE).includes('25 November'))
  write(v.root, NOTE, 'my own version\n')
  w.data.calls[0].notes = MINUTES.replace('18 November', '2 December')
  assert.equal((await w.ctx.run('save_minutes', { call: CALL, vault: v.id })).state, 'kept')
  const n = await w.ctx.run('save_minutes', { call: CALL, vault: v.id, new: true })
  assert.equal(n.path, 'knowledge/notes/2026-11-05-weekly-delivery-sync-2.md')
  assert.ok(read(v.root, n.path).includes('2 December'))
  assert.equal(read(v.root, NOTE), 'my own version\n')
  assert.ok(read(v.root, 'knowledge/CATALOG.md').includes('(notes/2026-11-05-weekly-delivery-sync-2.md)'))
  assert.equal(rec(w.ctx, CALL).saved[0].path, 'knowledge/notes/2026-11-05-weekly-delivery-sync-2.md')
})

test('no notes table skips the row with a reason', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('My twin')
  write(v.root, 'knowledge/CATALOG.md', '# Catalog\n\nNo tables here.\n')
  const s = await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  assert.equal(s.state, 'saved')
  assert.ok(s.index.startsWith('skipped: no Notes table'), s.index)
  assert.ok(exists(v.root, NOTE))
})

test('the profile guard: another profile\'s call is never saved by the rule; by hand only "anyway"', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync', { profile: 'client-x' })] })
  const v = await w.vault('My twin')
  await w.ctx.run('default', { id: v.id })
  const st = await w.ctx.run('call_state', { call: CALL })
  assert.deepEqual(st.targets, [], 'no vault takes it by itself')
  assert.equal(st.routed[0].profile_ok, false)
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  assert.ok(!exists(v.root, NOTE))
  const m = await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  assert.equal(m.state, 'mismatch')
  assert.deepEqual(m.mismatch, { call: 'client-x', vault: 'system' })
  assert.match(m.error, /Client X profile.*Claude Code \(as configured\) profile/)
  assert.ok(!exists(v.root, NOTE))
  const s = await w.ctx.run('save_minutes', { call: CALL, vault: v.id, anyway: true })
  assert.equal(s.state, 'saved')
  assert.equal(rec(w.ctx, CALL).saved[0].anyway, true)
  // `null` is the default profile: a vault on it takes the default profile's calls.
  const w2 = world({ calls: [call(CALL, 'Weekly delivery sync', { profile: null })] })
  const v2 = await w2.vault('Mine')
  await w2.ctx.run('default', { id: v2.id })
  await w2.ctx.fire('minutes_written', w2.data.payload(CALL))
  assert.ok(exists(v2.root, NOTE))
})

test('routing (replaces #677\'s scope): the thread\'s vault, else its client\'s, else the default; none stops it', async () => {
  const threads = [{ id: 'pilot', name: 'Acme pilot', client: 'acme' }, { id: 'pricing', name: 'Pricing', client: 'acme' }]
  const clients = [{ id: 'acme', name: 'Acme' }]
  const w = world({ calls: [call(CALL, 'Weekly delivery sync', { threads: ['pilot'] })], threads, clients })
  const a = await w.vault('Acme wiki'), d = await w.vault('Mine')
  await w.ctx.run('default', { id: d.id })
  const route = async () => (await w.ctx.run('route', { call: CALL }))
  assert.deepEqual((await route()).vaults.map((x) => [x.id, x.from]), [[d.id, 'default']])
  await w.ctx.run('client_vault', { client: 'acme', vault: a.id })
  assert.deepEqual((await route()).vaults.map((x) => [x.id, x.from, x.why]), [[a.id, 'client', 'Acme\'s vault']])
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: d.id })
  assert.deepEqual((await route()).vaults.map((x) => [x.id, x.from]), [[d.id, 'thread']])
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: 'none' })
  assert.deepEqual((await route()).vaults, [], 'none on the thread: nowhere, not the client\'s')
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: null })
  assert.equal((await route()).from, 'client')
  await assert.rejects(w.ctx.run('thread_vault', { thread: 'pilot', vault: 'nope' }), /no such vault/)
  // A vault that is gone: as not set.
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: d.id })
  await w.ctx.run('remove', { id: d.id })
  const r = await route()
  assert.equal(r.from, 'client')
  assert.deepEqual(r.gone, [d.id])
  // The pure rule.
  const look = (t, c, def) => ({ thread: (id) => t[id] ?? null, client: (id) => c[id] ?? null, def, has: (id) => ['x', 'y', 'z'].includes(id) })
  assert.deepEqual(routeCall([], look({}, {}, 'z')).vaults.map((x) => x.id), ['z'])
  assert.deepEqual(routeCall([{ id: 't1', client: 'c1' }, { id: 't2', client: 'c2' }], look({}, { c1: 'x', c2: 'y' }, 'z')).vaults.map((x) => x.id), ['x', 'y'], 'two clients: both')
})

test('this call opted out; or chosen for one vault only', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync'), call('2026-11-05_130000-second', 'Second')] })
  const a = await w.vault('My twin'), b = await w.vault('Team wiki')
  await w.ctx.run('default', { id: a.id })
  await w.ctx.run('call_choice', { call: CALL, vault: 'none' })
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  assert.ok(!exists(a.root, NOTE))
  assert.equal(rec(w.ctx, CALL).choice, 'none')
  await w.ctx.run('call_choice', { call: CALL, vault: null })
  assert.deepEqual((await w.ctx.run('call_state', { call: CALL })).targets.map((x) => x.id), [a.id])
  await w.ctx.run('call_choice', { call: '2026-11-05_130000-second', vault: b.id })
  assert.deepEqual((await w.ctx.run('call_state', { call: '2026-11-05_130000-second' })).targets.map((x) => x.id), [b.id])
})

test('a call in two threads with two vaults is saved into both', async () => {
  const threads = [{ id: 'pilot', name: 'Acme pilot', client: 'acme' }, { id: 'globex', name: 'Globex rollout', client: 'globex' }]
  const w = world({ calls: [call(CALL, 'Weekly delivery sync', { threads: ['pilot', 'globex'] })], threads, clients: [{ id: 'acme', name: 'Acme' }, { id: 'globex', name: 'Globex' }] })
  const a = await w.vault('Acme wiki'), b = await w.vault('Globex wiki')
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: a.id })
  await w.ctx.run('thread_vault', { thread: 'globex', vault: b.id })
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  assert.ok(exists(a.root, NOTE) && exists(b.root, NOTE))
  assert.ok(read(a.root, NOTE).includes('threads: ["Acme pilot", "Globex rollout"]\n'), 'its threads, and no one client between two')
  assert.ok(!read(a.root, NOTE).includes('\nclient:'))
  assert.deepEqual(rec(w.ctx, CALL).saved.map((e) => e.vault).sort(), [a.id, b.id].sort())
})

test('auto, ask and off: only auto writes on the event; ask and off on the user\'s command', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('My twin', { minutes: 'ask' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  assert.ok(!exists(v.root, NOTE), 'ask: nothing by itself')
  assert.deepEqual((await w.ctx.run('call_state', { call: CALL })).routed.map((x) => x.mode), ['ask'])
  await w.ctx.run('set', { id: v.id, key: 'minutes', value: 'off' })
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  assert.ok(!exists(v.root, NOTE), 'off: nothing')
  assert.equal((await w.ctx.run('save_minutes', { call: CALL })).saved[0].state, 'saved', 'the user\'s command saves into the call\'s vault')
  await w.ctx.run('set', { id: v.id, key: 'minutes', value: 'auto' })
  const c2 = '2026-11-06_100000-pricing-review'
  w.data.calls.push(call(c2, 'Pricing review', { started_at: '2026-11-06T10:00:00+02:00', ended_at: '2026-11-06T10:30:00+02:00' }))
  await w.ctx.fire('minutes_written', w.data.payload(c2))
  assert.ok(exists(v.root, 'knowledge/notes/2026-11-06-pricing-review.md'), 'auto: written on the event')
})

test('the rule\'s notes wait for one commit per quiet window; only Echo\'s files, still as Echo wrote them', { skip: !hasGit }, async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync'), call('2026-11-06_100000-pricing-review', 'Pricing review', { started_at: '2026-11-06T10:00:00+02:00', ended_at: '2026-11-06T10:30:00+02:00' })], git: true })
  const v = await w.vault('My twin', { git: true })
  assert.equal(v.git, 'committed')
  await w.ctx.run('default', { id: v.id })
  const before = Number(gitOut(v.root, 'rev-list', '--count', 'HEAD').trim())
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  await w.ctx.fire('minutes_written', w.data.payload('2026-11-06_100000-pricing-review'))
  assert.equal(rec(w.ctx, CALL).saved[0].commit, 'pending')
  assert.equal(Number(gitOut(v.root, 'rev-list', '--count', 'HEAD').trim()), before, 'nothing committed yet')
  assert.deepEqual(await w.ctx.run('commit_pending', { vault: v.id }).then((r) => r[v.id].calls), 2)
  assert.equal(Number(gitOut(v.root, 'rev-list', '--count', 'HEAD').trim()), before + 1, 'one commit for both')
  assert.equal(gitOut(v.root, 'log', '-1', '--format=%s').trim(), 'Echo: minutes of 2 calls')
  const files = gitOut(v.root, 'show', '--name-only', '--format=', 'HEAD').trim().split('\n').sort()
  assert.deepEqual(files, ['knowledge/CATALOG.md', 'knowledge/notes/2026-11-05-weekly-delivery-sync.md', 'knowledge/notes/2026-11-06-pricing-review.md', 'log.md'])
  assert.match(rec(w.ctx, CALL).saved[0].commit, /^[0-9a-f]{40}$/, 'the record names the commit')
})

test('commit holds only Echo\'s files: the user\'s staged and unstaged work stays theirs', { skip: !hasGit }, async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')], git: true })
  const v = await w.vault('My twin', { git: true })
  write(v.root, 'knowledge/topics/draft.md', '# staged by the user\n')
  gitOut(v.root, 'add', 'knowledge/topics/draft.md')
  write(v.root, 'knowledge/profile/DIGITAL_PROFILE.md', '# my unfinished edit\n')
  const s = await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  assert.match(s.commit, /^[0-9a-f]{40}$/)
  const lines = gitOut(v.root, 'show', '--name-only', '--format=%s', 'HEAD').split('\n').filter(Boolean)
  assert.equal(lines.shift(), 'Echo: minutes of "Weekly delivery sync" (2026-11-05) → knowledge/notes/')
  assert.deepEqual(lines.sort(), ['knowledge/CATALOG.md', NOTE, 'log.md'])
  const status = gitOut(v.root, 'status', '--porcelain')
  assert.ok(status.includes('A  knowledge/topics/draft.md'), status)
  assert.ok(status.includes(' M knowledge/profile/DIGITAL_PROFILE.md'), status)
})

test('a dirty index is written, not committed', { skip: !hasGit }, async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')], git: true })
  const v = await w.vault('My twin', { git: true })
  write(v.root, 'knowledge/CATALOG.md', `${read(v.root, 'knowledge/CATALOG.md')}\nMy own unsaved line.\n`)
  await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  const files = gitOut(v.root, 'show', '--name-only', '--format=', 'HEAD')
  assert.ok(!files.includes('CATALOG.md') && files.includes('2026-11-05-weekly-delivery-sync.md'), files)
  const now = read(v.root, 'knowledge/CATALOG.md')
  assert.ok(now.includes('My own unsaved line.') && now.includes('2026-11-05-weekly-delivery-sync.md'))
})

test('a commit Echo refuses is said; the note is written all the same (merge, hooks: Echo\'s git, its own tests)', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('My twin')
  await w.ctx.run('set', { id: v.id, key: 'commit', value: 'on' })
  w.ctx.git = { status: async () => [], info: async () => ({ repo: true, branch: 'main' }), commit: async () => { throw new Error('a merge is in progress') } }
  const s = await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  assert.equal(s.commit, 'skipped: a merge is in progress')
  assert.ok(exists(v.root, NOTE))
})

test('commits are off for a vault connected (not made) by Echo', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('My twin')
  assert.equal(JSON.parse(w.ctx.files['vaults.json']).find((x) => x.id === v.id).commit, false)
  assert.equal((await w.ctx.run('save_minutes', { call: CALL, vault: v.id })).commit, 'off')
})

test('the client links its page when the vault has one; else its name', async () => {
  const threads = [{ id: 'checkout', name: 'Checkout & payments', client: 'acme' }]
  const w = world({ calls: [call(CALL, 'Weekly delivery sync', { threads: ['checkout'] }), call('2026-11-05_160000-plain', 'Plain', { threads: ['checkout'] })], threads, clients: [{ id: 'acme', name: 'Acme Corp' }] })
  const v = await w.vault('My twin')
  write(v.root, 'knowledge/clients/acme-corp.md', '---\ntitle: Acme Corp\ntags: [client]\n---\n# Acme Corp\n')
  await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  const text = read(v.root, NOTE)
  assert.ok(text.includes('client: "[[acme-corp|Acme Corp]]"\n'), text)
  assert.ok(text.includes('threads: ["Checkout & payments"]\n'), text)
  nfs.rmSync(npath.join(v.root, 'knowledge/clients/acme-corp.md'))
  await w.ctx.run('save_minutes', { call: '2026-11-05_160000-plain', vault: v.id })
  assert.ok(read(v.root, 'knowledge/notes/2026-11-05-plain.md').includes('client: "Acme Corp"\n'))
})

test('people Echo resolved are named as its people', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')], people: [{ key: 'dana-reyes', name: 'Dana Reyes', email: 'dana@acme.example' }] })
  const v = await w.vault('My twin')
  await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  assert.ok(read(v.root, NOTE).includes('participants: Dana Reyes, Alex Doe, Sam Rivera\npeople: ["echo://person/dana-reyes"]\n'))
})

test('a missing vault: the rule\'s save is tried, fails, and the failure shows (record, Inbox); a later save clears it', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('My twin')
  await w.ctx.run('default', { id: v.id })
  const moved = `${v.root}-moved`
  nfs.renameSync(v.root, moved)
  assert.deepEqual((await w.ctx.run('call_state', { call: CALL })).targets.map((x) => [x.id, x.available]), [[v.id, false]])
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  const f = rec(w.ctx, CALL).failed
  assert.equal(f[0].vault, v.id)
  assert.match(f[0].error, /folder isn't there/)
  const key = `minutes:${CALL.slice(0, 17)}`
  assert.ok(w.ctx.inboxNow[key], 'an Inbox item')
  assert.deepEqual(w.ctx.inboxNow[key].actions[0], { label: 'Save again', command: 'save_minutes', args: { call: CALL, vault: v.id }, primary: true })
  nfs.renameSync(moved, v.root)
  await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  assert.deepEqual(rec(w.ctx, CALL).failed, [])
  assert.ok(!w.ctx.inboxNow[key])
})

test('saves at the same time make one note each, no row lost', async () => {
  const b = '2026-11-05_140000-design-review'
  const w = world({ calls: [call(CALL, 'Weekly delivery sync'), call(b, 'Design review')] })
  const v = await w.vault('My twin')
  await w.ctx.run('default', { id: v.id })
  await Promise.all([0, 1, 2, 3, 4, 5].map((i) => (i < 2 ? w.ctx.fire('minutes_written', w.data.payload(i % 2 ? b : CALL)) : w.ctx.run('save_minutes', { call: i % 2 ? b : CALL, vault: v.id }))))
  const notes = nfs.readdirSync(npath.join(v.root, 'knowledge/notes')).filter((n) => n !== 'README.md')
  assert.equal(notes.length, 2, notes.join(', '))
  const cat = read(v.root, 'knowledge/CATALOG.md')
  for (const n of notes) assert.equal(cat.split(`(notes/${n})`).length - 1, 1, n)
})

test('the preview is what the save writes', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('My twin')
  write(v.root, NOTE, '# someone else\'s\n')
  const p = await w.ctx.run('minutes_preview', { call: CALL, vault: v.id })
  const s = await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  assert.equal(p.path, s.path)
  assert.equal(s.path, 'knowledge/notes/2026-11-05-weekly-delivery-sync-2.md')
  assert.ok(read(v.root, 'knowledge/CATALOG.md').split('\n').includes(p.row), p.row)
  assert.equal(p.note, read(v.root, s.path))
  assert.equal(p.profile_ok, true)
  // A vault with no notes folder yet: they agree on where it goes.
  const plain = npath.join(w.base, 'plain')
  write(plain, 'knowledge/.obsidian/app.json', '{}')
  write(plain, 'knowledge/CATALOG.md', '# Index\n\n## Notes\n\n| File | Description | Date Added |\n|------|-------------|------------|\n')
  write(plain, 'knowledge/a.md', '# A\n')
  w.folders.push(plain)
  w.data.calls.push(call('2026-11-05_140000-design-review', 'Design review'))
  const added = await w.ctx.run('add', { root: nfs.realpathSync(plain), wait: false })
  const p2 = await w.ctx.run('minutes_preview', { call: '2026-11-05_140000-design-review', vault: added.id })
  const s2 = await w.ctx.run('save_minutes', { call: '2026-11-05_140000-design-review', vault: added.id })
  assert.equal(p2.path, s2.path)
  assert.equal(s2.path, 'knowledge/notes/2026-11-05-design-review.md')
})

test('the note\'s body is the minutes as Echo gives them, without Echo\'s header (departs from #677: a lead paragraph before the first section is Echo\'s header now)', async () => {
  const lead = '2026-11-05_140000-design-review'
  const w = world({ calls: [call(lead, 'Design review', { notes: '# Design review\n2026-11-05, 30 min.\n\nA lead paragraph before the sections.\n\n## Decisions\n\n- Ship it.\n\nFirst paragraph.\n\nSecond paragraph.\n' })] })
  const v = await w.vault('My twin')
  const s = await w.ctx.run('save_minutes', { call: lead, vault: v.id })
  const t = read(v.root, s.path)
  assert.ok(t.includes('# Design review — 2026-11-05\n\n## Decisions\n\n- Ship it.\n\nFirst paragraph.\n\nSecond paragraph.\n'), t)
  assert.ok(!t.includes('30 min.'), 'the header line is in the properties')
})

test('odd titles make safe files and valid YAML', async () => {
  const c = '2026-11-05_170000-odd'
  const w = world({ calls: [call(c, 'Q4: "Plan" / Синк #2 — review')] })
  const v = await w.vault('My twin')
  const s = await w.ctx.run('save_minutes', { call: c, vault: v.id })
  const name = s.path.split('/').pop()
  assert.ok(!/[/\\:"#?*]/.test(name), name)
  assert.ok(name.startsWith('2026-11-05-') && name.includes('синк'), name)
  const [raw] = fmSplit(read(v.root, s.path))
  assert.equal(propText(fmGet(fmParse(raw), 'title')), 'Q4: "Plan" / Синк #2 — review')
  assert.equal(noteFileName('{date} {title}.md', '2026-11-05', 'a/b: c', null), '2026-11-05 a-b- c.md')
  assert.equal(noteFileName('{date}-{slug}.md', '2026-11-05', 'x', '  my: note.md '), 'my- note.md')
  assert.equal(yamlValue('yes'), '"yes"')
  assert.equal(relativeTo('knowledge/CATALOG.md', 'knowledge/notes/a.md'), 'notes/a.md')
  assert.equal(relativeTo('a/b/INDEX.md', 'c/d.md'), '../../c/d.md')
})

test('a memo says so', async () => {
  const c = '2026-11-05_180000-memo'
  const w = world({ calls: [call(c, 'Thoughts on pricing', { memo: true })] })
  const v = await w.vault('My twin')
  const s = await w.ctx.run('save_minutes', { call: c, vault: v.id })
  assert.ok(read(v.root, s.path).includes('meeting: "Memo"\n'))
})

test('only the rule\'s own notes update by themselves; one saved by hand is offered as an update (stale)', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync', { threads: ['pilot', 'pricing'] })], threads: [{ id: 'pilot', name: 'Pilot' }, { id: 'pricing', name: 'Pricing' }] })
  const a = await w.vault('My twin'), b = await w.vault('Team wiki', { minutes: 'ask' })
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: a.id })
  await w.ctx.run('thread_vault', { thread: 'pricing', vault: b.id })
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  await w.ctx.run('save_minutes', { call: CALL, vault: b.id })
  w.data.calls[0].notes = MINUTES.replace('18 November', '25 November')
  await w.ctx.fire('minutes_written', w.data.payload(CALL, true))
  assert.ok(read(a.root, NOTE).includes('25 November'))
  assert.ok(read(b.root, NOTE).includes('18 November'), 'a note saved by hand isn\'t updated by itself')
  assert.deepEqual((await w.ctx.run('call_state', { call: CALL })).stale, [b.id], 'it is offered instead')
})

test('the summary: Echo\'s, as one line (a list joined by "; "); else the first section; else none', async () => {
  const ru = '2026-11-05_190000-sink', bare = '2026-11-05_200000-bare'
  const w = world({ calls: [call(ru, 'Синк', { notes: '# Синк\n\n2026-11-05, 46 мин.\n\n## Итоги\n\n- Пилот переносится на 18 ноября\n- Цены не меняем\n\n## Решения\n\n- x\n' }), call(bare, 'Bare', { notes: '# Bare\n\nJust a line, no sections.\n' })] })
  const v = await w.vault('My twin')
  const s1 = await w.ctx.run('save_minutes', { call: ru, vault: v.id })
  assert.ok(read(v.root, s1.path).includes('summary: "Пилот переносится на 18 ноября; Цены не меняем"\n'))
  const s2 = await w.ctx.run('save_minutes', { call: bare, vault: v.id })
  assert.ok(read(v.root, s2.path).includes('summary: ""\n'))
  assert.ok(read(v.root, 'knowledge/CATALOG.md').includes('| 46m Bare | 2026-11-05 |'), 'the title alone')
  assert.equal(summaryLine(`${'word '.repeat(100)}`).length, 300)
})

test('the index is read again before the row goes in: another\'s change stays', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('My twin')
  write(v.root, 'knowledge/CATALOG.md', read(v.root, 'knowledge/CATALOG.md').replace('## Media', '## Media\n\nA line a skill added.'))
  await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  const now = read(v.root, 'knowledge/CATALOG.md')
  assert.ok(now.includes('A line a skill added.') && now.includes('2026-11-05-weekly-delivery-sync.md'))
})

test('past minutes: the calls routed to the vault since a day, on its profile, in one commit', { skip: !hasGit }, async () => {
  const calls = ['One', 'Two', 'Three'].map((t, i) => call(`2026-11-0${i + 1}_100000-${t.toLowerCase()}`, t, { started_at: `2026-11-0${i + 1}T10:00:00+02:00`, ended_at: `2026-11-0${i + 1}T10:30:00+02:00` }))
  calls.push(call('2026-11-04_100000-other', 'Other profile', { profile: 'client-x', started_at: '2026-11-04T10:00:00+02:00', ended_at: '2026-11-04T10:30:00+02:00' }))
  calls.push(call('2026-10-01_100000-older', 'Older', { started_at: '2026-10-01T10:00:00+02:00', ended_at: '2026-10-01T10:30:00+02:00' }))
  const w = world({ calls, git: true })
  const v = await w.vault('My twin', { git: true })
  await w.ctx.run('default', { id: v.id })
  assert.equal((await w.ctx.run('past_minutes', { vault: v.id, since: '2026-11-01', dry: true })).count, 3)
  const before = Number(gitOut(v.root, 'rev-list', '--count', 'HEAD').trim())
  const r = await w.ctx.run('past_minutes', { vault: v.id, since: '2026-11-01' })
  assert.equal(r.saved, 3)
  assert.equal(Number(gitOut(v.root, 'rev-list', '--count', 'HEAD').trim()), before + 1)
  assert.equal(gitOut(v.root, 'log', '-1', '--format=%s').trim(), 'Echo: minutes of 3 past calls')
  assert.equal((await w.ctx.run('past_minutes', { vault: v.id, since: '2026-11-01', dry: true })).count, 0)
})

test('minutes_written saves in the background, into the vaults that take the call', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync'), call('2026-11-05_210000-x', 'X', { profile: 'client-x' })] })
  const v = await w.vault('My twin')
  await w.ctx.run('default', { id: v.id })
  assert.deepEqual((await w.ctx.run('call_state', { call: CALL })).targets.map((x) => x.name), ['My twin'])
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  assert.ok(exists(v.root, NOTE))
  assert.equal(rec(w.ctx, CALL).saved[0].how, 'auto')
  assert.deepEqual((await w.ctx.run('call_state', { call: '2026-11-05_210000-x' })).targets, [])
  const acts = activityRecent(w.ctx.files[`vaults/${v.id}/activity.jsonl`])
  assert.ok(acts.some((a) => a.by === 'minutes' && a.path === NOTE && a.ref === CALL && a.also.includes('knowledge/CATALOG.md')), JSON.stringify(acts))
})

// ── the new-calls rule (#677's K14-11): now a queue in the store — nothing written into the vault on the event ──

const ingestOf = (ctx, id) => JSON.parse(ctx.files[`vaults/${id}/ingest.json`] || '{"queued":{},"sources":{},"calls":[]}')

test('add and prepare queue the call (store only: no vault write, no run); off queues nothing', async () => {
  for (const rule of ['add', 'prepare', 'off']) {
    const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
    const v = await w.vault('My twin', { minutes: 'off' })
    await w.ctx.run('default', { id: v.id })
    await w.ctx.run('set', { id: v.id, key: 'ingest.calls', value: rule })
    const before = w.ctx.fsLog.length
    await w.ctx.fire('minutes_written', w.data.payload(CALL))
    assert.equal(w.ctx.fsLog.length, before, `${rule}: nothing written into the vault`)
    const q = ingestOf(w.ctx, v.id).queued
    if (rule === 'off') assert.deepEqual(q, {})
    else assert.deepEqual([q[`call:${CALL}`].kind, q[`call:${CALL}`].rule, q[`call:${CALL}`].state], ['call', rule, 'queued'])
  }
})

test('a call of another profile queues nothing', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync', { profile: 'client-x' })] })
  const v = await w.vault('My twin')
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.calls', value: 'prepare' })
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  assert.deepEqual(ingestOf(w.ctx, v.id).queued || {}, {})
})

test('minutes written again queue the call once; a source deleted is not queued again', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('My twin', { minutes: 'off' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.calls', value: 'add' })
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  await w.ctx.fire('minutes_written', w.data.payload(CALL, true))
  assert.equal(Object.keys(ingestOf(w.ctx, v.id).queued).length, 1)
  const p = await w.ctx.run('prepare_sources', { vault: v.id })
  assert.equal(p.written.length, 1)
  nfs.rmSync(npath.join(v.root, p.written[0].path))
  await w.ctx.fire('minutes_written', w.data.payload(CALL, true))
  assert.deepEqual(ingestOf(w.ctx, v.id).queued, {}, 'the ledger remembers the call')
})

test('two calls at once are queued, each once', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync'), call('2026-11-06_100000-pricing-review', 'Pricing review')] })
  const v = await w.vault('My twin')
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.calls', value: 'prepare' })
  await Promise.all([w.ctx.fire('minutes_written', w.data.payload(CALL)), w.ctx.fire('minutes_written', w.data.payload('2026-11-06_100000-pricing-review'))])
  assert.equal(Object.keys(ingestOf(w.ctx, v.id).queued).length, 2)
})

// ── the activity's commands (seam.js → view.js): a call's chip, the save sheet, Settings' past minutes and sample ──

test('call_knowledge: the vaults, the targets by the call\'s route and profile, the record, kept and stale, the failure; its choice by the call\'s stamp', async () => {
  const threads = [{ id: 'pilot', name: 'Acme pilot', client: 'acme' }]
  const w = world({ calls: [call(CALL, 'Weekly delivery sync', { threads: ['pilot'] })], threads, clients: [{ id: 'acme', name: 'Acme' }] })
  const v = await w.vault('My twin')
  const page = { name: CALL, threads: ['pilot'], client: 'acme', profile: null, notes: true }
  assert.deepEqual((await w.ctx.run('call_knowledge', { call: page })).targets, [], 'no vault for its thread, client or by default')
  await w.ctx.run('client_vault', { client: 'acme', vault: v.id })
  const k = await w.ctx.run('call_knowledge', { call: page })
  assert.deepEqual(k.vaults.map((x) => [x.id, x.mode, x.available, x.profile]), [[v.id, 'auto', true, 'system']])
  assert.deepEqual(k.targets, [{ id: v.id, name: 'My twin' }])
  assert.ok(!('later' in k), 'saving works: the chip and the minutes line promise it')
  await w.ctx.run('call_choice', { call: CALL, vault: 'none' })
  assert.equal((await w.ctx.run('call_knowledge', { call: page })).record.choice, 'none')
  assert.equal((await w.ctx.run('call_knowledge', { call: { ...page, name: '2026-11-05_090012-retitled' } })).record.choice, 'none', 'a retitled call keeps its record by its stamp')
  await w.ctx.run('call_choice', { call: CALL, vault: null })
  await w.ctx.run('save_minutes', { call: CALL, vault: v.id })
  assert.deepEqual((await w.ctx.run('call_knowledge', { call: page })).record.saved.map((e) => [e.vault, e.how]), [[v.id, 'manual']])
  w.data.calls[0].notes = MINUTES.replace('18 November', '25 November')
  assert.deepEqual((await w.ctx.run('call_knowledge', { call: page })).stale, [v.id], 'offered as an update')
  nfs.renameSync(v.root, `${v.root}-gone`)
  await w.ctx.run('save_minutes', { call: CALL, vault: v.id }).catch(() => {})
  assert.match((await w.ctx.run('call_knowledge', { call: page })).failure.error, /folder isn't there/)
})

test('Settings: the past minutes it would save, then saved; the sample is the newest call on the vault\'s profile; nothing written by either look', async () => {
  const w = world({ calls: [call('2026-11-04_100000-older', 'Older'), call(CALL, 'Weekly delivery sync'), call('2026-11-06_100000-x', 'Elsewhere', { profile: 'client-x' })] })
  const v = await w.vault('My twin')
  await w.ctx.run('default', { id: v.id })
  assert.equal((await w.ctx.run('vault_settings', { id: v.id })).past.count, 2)
  const s = await w.ctx.run('sample', { id: v.id })
  assert.equal(s.title, 'Weekly delivery sync')
  assert.ok(s.note.includes('title: "Weekly delivery sync"'))
  assert.deepEqual(nfs.readdirSync(npath.join(v.root, 'knowledge/notes')), ['README.md'])
  assert.deepEqual(await w.ctx.run('past', { id: v.id, apply: true }), { saved: 2, skipped: 0, commit: 'off' })
  assert.equal((await w.ctx.run('past', { id: v.id })).count, 0)
})

test('a save by hand while the rule\'s notes wait for their commit: Echo\'s own index and log go in a commit, nothing of Echo\'s is left uncommitted', { skip: !hasGit }, async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync'), call('2026-11-06_100000-pricing-review', 'Pricing review', { started_at: '2026-11-06T10:00:00+02:00', ended_at: '2026-11-06T10:30:00+02:00' })], git: true })
  const v = await w.vault('My twin', { git: true })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  const s = await w.ctx.run('save_minutes', { call: '2026-11-06_100000-pricing-review', vault: v.id })
  assert.match(s.commit, /^[0-9a-f]{40}$/)
  assert.deepEqual(gitOut(v.root, 'show', '--name-only', '--format=', 'HEAD').trim().split('\n').sort(), ['knowledge/CATALOG.md', 'knowledge/notes/2026-11-06-pricing-review.md', 'log.md'], 'the index and log Echo wrote are its own')
  await w.ctx.run('commit_pending', { vault: v.id })
  assert.equal(gitOut(v.root, 'status', '--porcelain'), '', 'the rule\'s note committed too, nothing left')
})
