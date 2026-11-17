import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeVault, migrateVaults, uniqueId, folderProblem, setVaultKey, SCHEMA } from '../../plugins/obsidian/main.js'

// A record as Obsidian 0.8 kept it.
const OLD = {
  id: 'acme-wiki', name: 'acme-wiki', root: '/v/acme-wiki', state: 'ready', confirmed: true, error: '',
  added_at: '2026-10-01T09:00:00.000Z', kind: 'engagement', analysed_at: '2026-10-01T09:01:00.000Z', model: 'sonnet',
  notes: 2, latest: 1760000000000, git: true, is_vault: true, inside: [{ name: 'Decisions', n: 1, skip: false }],
  belongs: [{ client: 'acme' }, { thread: 'acme-rollout' }, { other: 'x' }],
}

test('registry: a 0.8 record keeps its id, name, folder, description state and for whom; its minutes wait to be asked', () => {
  const v = normalizeVault(OLD)
  assert.equal(v.schema, SCHEMA)
  for (const k of ['id', 'name', 'root', 'state', 'confirmed', 'added_at', 'kind', 'analysed_at', 'model', 'notes', 'latest', 'is_vault']) assert.deepEqual(v[k], OLD[k], k)
  assert.deepEqual(v.belongs, [{ client: 'acme' }, { thread: 'acme-rollout' }])
  assert.deepEqual(v.inside, OLD.inside)
  assert.equal(v.in_git, true, 'its git flag is in_git now')
  assert.ok(!('git' in v))
  assert.deepEqual(v.minutes, { mode: 'ask', tag: null, transcript: false, chat: false })
  assert.equal(v.commit, false)
  assert.equal(v.profile, null)
  assert.equal(v.detected, null)
  assert.deepEqual(v.overrides, {})
  assert.deepEqual(v.ingest, { skill: null, calls: 'off', mail: 'off' })
  assert.equal(v.template, null)
})

test('registry: a 0.8 record never comes over taking minutes by itself, whatever it held', () => {
  assert.equal(normalizeVault({ ...OLD, minutes: { mode: 'auto' } }).minutes.mode, 'ask')
  // A record of this version keeps what the user set.
  const now = normalizeVault({ ...normalizeVault(OLD), minutes: { mode: 'auto', tag: 'meeting', transcript: true } })
  assert.deepEqual(now.minutes, { mode: 'auto', tag: 'meeting', transcript: true, chat: false })
  assert.equal(normalizeVault({ ...normalizeVault(OLD), minutes: { mode: 'sometimes' } }).minutes.mode, 'ask')
})

test('registry: 0.8 without `confirmed` is confirmed when it was ready; unknown fields and shapes are dropped', () => {
  assert.equal(normalizeVault({ ...OLD, confirmed: undefined, state: 'ready' }).confirmed, true)
  assert.equal(normalizeVault({ ...OLD, confirmed: undefined, state: 'review' }).confirmed, false)
  const v = normalizeVault({ ...normalizeVault(OLD), echo: true, overrides: { pages: 'knowledge', evil: 'x', index: '' }, ingest: { calls: 'always' }, inside: [{ name: 'A', n: '3' }, null] })
  assert.ok(!('echo' in v))
  assert.deepEqual(v.overrides, { pages: 'knowledge' })
  assert.equal(v.ingest.calls, 'off')
  assert.deepEqual(v.inside, [{ name: 'A', n: 3, skip: false }])
  assert.equal(normalizeVault({ ...normalizeVault(OLD), state: 'weird', confirmed: true }).state, 'ready')
})

test('registry: migrating is idempotent — the second pass changes nothing; records without an id or folder go', () => {
  const first = migrateVaults([OLD, { id: '', root: '/x' }, { id: 'no-root' }, null])
  assert.equal(first.changed, true)
  assert.deepEqual(first.vaults.map((v) => v.id), ['acme-wiki'])
  const second = migrateVaults(first.vaults)
  assert.equal(second.changed, false)
  assert.deepEqual(second.vaults, first.vaults)
  assert.deepEqual(migrateVaults(undefined), { vaults: [], changed: false })
})

test('registry: ids are the name in words with dashes, -2, -3 past the taken ones', () => {
  assert.equal(uniqueId('Acme Wiki', []), 'acme-wiki')
  assert.equal(uniqueId('Acme Wiki', ['acme-wiki']), 'acme-wiki-2')
  assert.equal(uniqueId('Acme Wiki', ['acme-wiki', 'acme-wiki-2']), 'acme-wiki-3')
  assert.equal(uniqueId('Заметки', []), 'vault')
  assert.equal(uniqueId('Café notes', []), 'cafe-notes')
  assert.equal(uniqueId('x'.repeat(60), []).length, 40)
})

test('registry: a folder can\'t be connected twice, inside or around a vault, as a whole disk, or holding Echo\'s data', () => {
  const vs = [{ name: 'Acme wiki', root: '/v/acme-wiki' }]
  assert.equal(folderProblem('/v/home-notes', vs, '/u/echo'), null)
  assert.equal(folderProblem('/v/acme-wiki-2', vs, '/u/echo'), null, 'a name that starts the same is another folder')
  assert.match(folderProblem('/v/acme-wiki/', vs), /connected already/)
  assert.match(folderProblem('/v/acme-wiki/Decisions', vs), /inside “Acme wiki”/)
  assert.match(folderProblem('/v', vs), /holds “Acme wiki”/)
  assert.match(folderProblem('/', vs), /whole disk/)
  assert.match(folderProblem('C:\\', vs), /whole disk/)
  assert.match(folderProblem('/u', [], '/u/echo'), /data folder/)
  assert.match(folderProblem('/u/echo', [], '/u/echo'), /data folder/)
  assert.equal(folderProblem('/u/echo/knowledge/twin', [], '/u/echo'), null, 'a vault inside Echo\'s data folder is allowed (the starter\'s place)')
})

test('registry: settings are checked as the user sets them', () => {
  const v = normalizeVault({ ...OLD, schema: 1 })
  assert.equal(setVaultKey(v, 'name', '  Acme  ').name, 'Acme')
  assert.throws(() => setVaultKey(v, 'name', ' '), /needs a name/)
  assert.equal(setVaultKey(v, 'minutes', 'auto').minutes.mode, 'auto')
  assert.throws(() => setVaultKey(v, 'minutes', 'always'), /auto, ask or off/)
  assert.equal(setVaultKey(v, 'profile', 'work', { profiles: ['default', 'work'] }).profile, 'work')
  assert.equal(setVaultKey(v, 'profile', '').profile, null)
  assert.throws(() => setVaultKey(v, 'profile', 'nope', { profiles: ['default'] }), /no AI profile/)
  assert.equal(setVaultKey(v, 'tag', '#meeting').minutes.tag, 'meeting')
  assert.equal(setVaultKey(v, 'transcript', 'on').minutes.transcript, true)
  assert.throws(() => setVaultKey(v, 'chat', 'maybe'), /on or off/)
  assert.equal(setVaultKey(v, 'commit', 'yes').commit, true)
  assert.equal(setVaultKey(v, 'ingest.calls', 'prepare').ingest.calls, 'prepare')
  assert.throws(() => setVaultKey(v, 'ingest.calls', 'now'), /off, add or prepare/)
  assert.equal(setVaultKey(v, 'ingest.skill', 'process-inbox', { skills: ['process-inbox'] }).ingest.skill, 'process-inbox')
  assert.throws(() => setVaultKey(v, 'ingest.skill', 'x', { skills: [] }), /no skill/)
  assert.equal(setVaultKey(v, 'pages', '/knowledge/').overrides.pages, 'knowledge')
  assert.deepEqual(setVaultKey(setVaultKey(v, 'pages', 'knowledge'), 'pages', '').overrides, {})
  for (const bad of ['../x', 'a/./b', 'C:/x', 'a:b']) assert.throws(() => setVaultKey(v, 'notes', bad), /inside the vault/)
  assert.equal(setVaultKey(v, 'naming', '{date} {title}.md').overrides.naming, '{date} {title}.md')
  assert.throws(() => setVaultKey(v, 'naming', '{title}.md'), /naming:/)
  assert.throws(() => setVaultKey(v, 'scope', 'all'), /no setting “scope”/)
  assert.equal(v.minutes.mode, 'ask', 'the record given is left as it was')
})

// ── the plugin from 0.8: on a fake of Echo's ctx ──
import { apply } from '../../plugins/obsidian/main.js'
import { fakeCtx } from '../helpers/fake-ctx.mjs'

const DESC = '## When Claude looks here\n\nDecisions on Acme projects\n\n## What it is\n\nThe team\'s wiki.\n'
const store08 = () => ({
  'vaults.json': JSON.stringify([OLD, { id: 'home', name: 'Home', root: '/v/home', state: 'review', added_at: '2026-10-02T09:00:00.000Z' }], null, 2),
  'vaults/acme-wiki/description.md': DESC,
  'vaults/acme-wiki/index.json': '{"v":2}',
  'vaults/echo/index.json': '{"v":2}',
  'vaults.md': '# The user\'s Obsidian vaults',
  'vault/Clients/Acme.md': '# Acme\n',
  'vault/_echo/Rules.md': '# What this vault keeps\n',
  'vault/index.md': '- [[Acme]]\n',
  'knowledge/things.json': '{}', 'knowledge/queue.json': '["call:1"]', 'knowledge/failed.json': '{}',
  'knowledge/dictionary.hash': 'x', 'knowledge/render.version': '2',
  'runs/knowledge/2026-10-03/answer.md': 'x',
  'runs/acme-wiki/2026-10-01/answer.md': 'x',
})
const ctx08 = (extra = {}) => fakeCtx({
  id: 'obsidian', agent: true, sessions: true, hints: true, inbox: true, settings: { knowledge: true },
  folders: ['/v/acme-wiki', '/v/home'], echo: { clients: [{ id: 'acme', name: 'Acme' }], threads: [{ id: 'acme-rollout', name: 'Rollout' }] },
  profiles: { default: 'default', profiles: [{ id: 'default', name: 'Claude' }, { id: 'work', name: 'Work' }] },
  store: store08(), ...extra,
})

test('from 0.8: the vaults take this shape, minutes only when asked; the facts vault and its state are gone; descriptions and entries stay', () => {
  const ctx = ctx08()
  apply(ctx)
  const vs = JSON.parse(ctx.files['vaults.json'])
  assert.deepEqual(vs.map((v) => [v.id, v.schema, v.minutes.mode, v.confirmed]), [['acme-wiki', 1, 'ask', true], ['home', 1, 'ask', false]])
  assert.equal(vs[0].in_git, true)
  const left = Object.keys(ctx.files).sort()
  assert.ok(!left.some((p) => /^(vault|knowledge)\//.test(p) || p.startsWith('vaults/echo/') || p.startsWith('runs/knowledge/')), left.join(' '))
  for (const kept of ['vaults/acme-wiki/description.md', 'vaults/acme-wiki/index.json', 'runs/acme-wiki/2026-10-01/answer.md']) assert.ok(kept in ctx.files, kept)
  assert.deepEqual(ctx.agentNow.part.entries.map((e) => e.name), ['acme-wiki'], 'Claude is told the confirmed vault, never a facts vault')
  assert.match(ctx.files['vaults.md'], /^# The user's Knowledge vaults/)
  assert.ok(!ctx.files['vaults.md'].includes('Echo\'s own'))
  assert.deepEqual(ctx.logs, [])
})

test('from 0.8: loading again changes nothing (the migration is done once and harmless after)', () => {
  const ctx = ctx08()
  apply(ctx)
  const once = JSON.stringify(ctx.files)
  apply(ctx)
  assert.equal(JSON.stringify(ctx.files), once)
  assert.deepEqual(ctx.logs, [])
})

test('from 0.8: a store with no vaults gets no registry written; a broken registry is read as none', () => {
  const ctx = ctx08({ store: { 'vault/Acme.md': '# Acme\n' } })
  apply(ctx)
  assert.deepEqual(Object.keys(ctx.files), ['vaults.md'], 'only the (empty) catalog: no registry, no facts vault')
  const bad = ctx08({ store: { 'vaults.json': 'not json' } })
  apply(bad)
  assert.equal(bad.files['vaults.json'], 'not json', 'loading leaves it as it is')
  assert.deepEqual(bad.agentNow.part, { summary: null, entries: [] })
})

test('a broken registry is set aside before a change writes a new one', async () => {
  const ctx = ctx08({ store: { 'vaults.json': '[{"id": "acme-wiki", "root"' } })
  ctx.fs.list = () => []
  ctx.fs.walk = async () => [{ path: 'a.md' }]
  ctx.system = { pickFolder: async () => '/v/home' }
  apply(ctx)
  await ctx.run('add', { root: '/v/home' }).catch(() => {})
  const aside = Object.keys(ctx.files).find((p) => p.startsWith('vaults.json.bad-'))
  assert.ok(aside, Object.keys(ctx.files).join(' '))
  assert.equal(ctx.files[aside], '[{"id": "acme-wiki", "root"')
  assert.match(ctx.logs.join('\n'), /couldn't be read: kept as vaults\.json\.bad-/)
})

test('from 0.8: a vault of the user\'s own with the id `echo` keeps its description', () => {
  const store = store08()
  store['vaults.json'] = JSON.stringify([{ ...OLD, id: 'echo', name: 'Echo', root: '/v/echo' }])
  store['vaults/echo/description.md'] = DESC
  const ctx = ctx08({ store, folders: ['/v/echo'] })
  apply(ctx)
  assert.equal(ctx.files['vaults/echo/description.md'], DESC)
  assert.deepEqual(ctx.agentNow.part.entries.map((e) => [e.name, e.summary]), [['echo', 'Decisions on Acme projects']])
})

test('a 1.0 record whose keys come in another order is not migrated again', () => {
  const v = normalizeVault({ ...OLD, schema: 1 })
  const shuffled = Object.fromEntries(Object.entries(v).reverse())
  assert.equal(migrateVaults([shuffled]).changed, false)
  const ctx = ctx08({ terminal: true, store: { 'vaults.json': JSON.stringify([shuffled]) } })
  apply(ctx)
  assert.equal(ctx.agentNow.sets, 0, 'a terminal\'s load publishes nothing')
})

test('overrides read from the registry are checked as `set` checks them', () => {
  const v = normalizeVault({ ...OLD, schema: 1, overrides: { pages: '../../x', index: 'C:/x', notes: '/notes/', naming: '{title}.md' } })
  assert.deepEqual(v.overrides, { notes: 'notes' })
})

test('the 0.8 facts commands are gone', () => {
  const ctx = ctx08()
  apply(ctx)
  for (const c of ['knowledge', 'knowledge_fill', 'knowledge_wake', 'knowledge_retry', 'knowledge_status', 'ingest', 'forget_source', 'echo_reindex']) assert.ok(!(c in ctx.commands), c)
  for (const c of ['view', 'add', 'set', 'default', 'remove', 'search', 'rename_plan']) assert.ok(c in ctx.commands, c)
})

test('set: a vault\'s setting is checked and kept; a profile must be one of the user\'s', async () => {
  const ctx = ctx08()
  apply(ctx)
  const v = await ctx.run('set', { id: 'acme-wiki', key: 'minutes', value: 'auto' })
  assert.equal(v.minutes.mode, 'auto')
  assert.equal(JSON.parse(ctx.files['vaults.json'])[0].minutes.mode, 'auto')
  assert.equal((await ctx.run('set', { id: 'acme-wiki', key: 'profile', value: 'work' })).profile, 'work')
  await assert.rejects(ctx.run('set', { id: 'acme-wiki', key: 'profile', value: 'other' }), /no AI profile “other”/)
  await assert.rejects(ctx.run('set', { id: 'nope', key: 'minutes', value: 'off' }), /no such vault/)
  await assert.rejects(ctx.run('set', { id: 'acme-wiki', key: 'scope', value: 'all' }), /no setting/)
  // A folder the vault doesn't have, or a file where a folder is wanted.
  ctx.fs.stat = (root, path) => (path === 'knowledge' ? { kind: 'dir', real: 'knowledge' } : path === 'CATALOG.md' ? { kind: 'file', real: 'CATALOG.md' } : null)
  assert.equal((await ctx.run('set', { id: 'acme-wiki', key: 'pages', value: 'knowledge' })).overrides.pages, 'knowledge')
  assert.equal((await ctx.run('set', { id: 'acme-wiki', key: 'index', value: 'CATALOG.md' })).overrides.index, 'CATALOG.md')
  await assert.rejects(ctx.run('set', { id: 'acme-wiki', key: 'notes', value: 'missing' }), /isn't in this vault/)
  await assert.rejects(ctx.run('set', { id: 'acme-wiki', key: 'notes', value: 'CATALOG.md' }), /isn't a folder/)
})

test('default: the vault minutes go to by default; removing it leaves none', async () => {
  const ctx = ctx08()
  ctx.fs.forget = () => true
  apply(ctx)
  assert.deepEqual(await ctx.run('default', { id: 'home' }), { default: 'home' })
  assert.equal((await ctx.run('view')).default, 'home')
  await assert.rejects(ctx.run('default', { id: 'nope' }), /no such vault/)
  await ctx.run('remove', { id: 'home' })
  assert.equal((await ctx.run('view')).default, null)
  assert.deepEqual(JSON.parse(ctx.files['vaults.json']).map((v) => v.id), ['acme-wiki'])
  await ctx.run('remove', { id: 'acme-wiki' })
  assert.ok(!Object.keys(ctx.files).some((p) => p.startsWith('vaults/acme-wiki/')), 'its description and index go with it')
})

test('add: a folder inside, around or the same as a vault is refused and given back', async () => {
  const forgot = []
  const ctx = ctx08({ folders: ['/v/acme-wiki', '/v/home', '/v/acme-wiki/Decisions', '/v'] })
  ctx.fs.forget = (root) => { forgot.push(root); return true }
  apply(ctx)
  await assert.rejects(ctx.run('add', { root: '/v/acme-wiki/Decisions' }), /inside “acme-wiki”/)
  await assert.rejects(ctx.run('add', { root: '/v' }), /holds “acme-wiki”/)
  assert.deepEqual(forgot, ['/v/acme-wiki/Decisions', '/v'])
  assert.deepEqual(await ctx.run('add', { root: '/v/home' }), { id: 'home', already: true })
})

test('from 0.8: a terminal\'s first load lays out Claude\'s entries again (the facts entry goes); a later one doesn\'t', () => {
  const ctx = ctx08({ terminal: true })
  apply(ctx)
  assert.equal(ctx.agentNow.sets, 1)
  assert.deepEqual(ctx.agentNow.part.entries.map((e) => e.name), ['acme-wiki'])
  apply(ctx)
  assert.equal(ctx.agentNow.sets, 1)
})
