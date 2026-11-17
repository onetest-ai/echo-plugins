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
  assert.deepEqual(v.ingest, { skill: null, calls: 'off' })
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
