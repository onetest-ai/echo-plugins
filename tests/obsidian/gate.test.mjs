// Knowledge 1.0's release gate (#32): the host half's fixes, each with a test that fails without it — the call's routed
// vaults for the Save sheet, a pending commit kept while Echo doesn't give the folder, git kept when Claude can't
// describe a vault, a text source's size, the shown vault's page count from Echo's index.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as nfs from 'node:fs'
import * as npath from 'node:path'
import { world, call } from './world.mjs'
import { CALL } from './echo-data.mjs'

const fakeGit = (log) => ({ info: async () => ({ repo: true, branch: 'main' }), status: async () => [], commit: async (root, { paths, message }) => { log.push({ paths: [...paths], message }); return { rev: 'a'.repeat(40) } } })

test('call_knowledge names the vaults the call is routed to, whatever their mode: the thread\'s in Ask mode first', async () => {
  const threads = [{ id: 'pilot', name: 'Acme pilot', client: 'acme' }]
  const w = world({ calls: [call(CALL, 'Weekly delivery sync', { threads: ['pilot'] })], threads, clients: [{ id: 'acme', name: 'Acme' }] })
  const other = await w.vault('Globex notes', { minutes: 'auto' })
  const acme = await w.vault('Acme wiki', { minutes: 'ask' })
  await w.ctx.run('default', { id: other.id })
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: acme.id })
  const k = await w.ctx.run('call_knowledge', { call: { name: CALL, notes: true } })
  assert.deepEqual(k.targets, [], 'Ask: nothing goes by itself')
  assert.deepEqual(k.routed, [acme.id], 'but the thread\'s vault is where it belongs')
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: 'none' })
  assert.deepEqual((await w.ctx.run('call_knowledge', { call: { name: CALL, notes: true } })).routed, [], 'none: routed nowhere')
})

test('a pending commit waits while Echo doesn\'t give the vault\'s folder (the plugin removed), and lands once it is given again', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('Twin')
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'commit', value: 'on' })
  const log = []
  w.ctx.git = fakeGit(log)
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  const pending = `vaults/${v.id}/pending.json`
  const items = JSON.parse(w.ctx.files[pending]).items.length
  assert.ok(items > 0)
  const at = w.folders.findIndex((f) => nfs.realpathSync(f) === v.root)
  const [taken] = w.folders.splice(at, 1)
  await w.ctx.run('commit_pending', { vault: v.id })
  assert.deepEqual(log, [], 'no commit tried')
  assert.equal(JSON.parse(w.ctx.files[pending]).items.length, items, 'the queue kept, not cleared as "changed"')
  w.folders.push(taken)
  await w.ctx.run('commit_pending', { vault: v.id })
  assert.equal(log.length, 1)
  assert.ok(!(pending in w.ctx.files))
})

test('a vault Claude can\'t describe keeps what Echo found in its folder: in git, how many notes', async () => {
  const w = world({})
  const v = await w.vault('Twin')
  nfs.mkdirSync(npath.join(v.root, '.git'), { recursive: true })
  await w.ctx.run('analyse', { id: v.id }).catch(() => {})
  const got = (await w.ctx.run('view')).vaults.find((x) => x.id === v.id)
  assert.equal(got.state, 'failed', 'the test has no Claude')
  assert.equal(got.in_git, true)
  assert.ok(got.notes > 0)
})

test('a source written as text says its size, as a copied file does', async () => {
  const c = '2026-11-05_090012-weekly-sync'
  const w = world({ calls: [call(c, 'Weekly delivery sync')] })
  const v = await w.vault('Twin', { minutes: 'off' })
  const a = await w.ctx.run('add_source', { vault: v.id, kind: 'call', call: c })
  assert.equal(a.size, nfs.statSync(npath.join(v.root, a.path)).size)
  assert.ok(a.size > 0)
})

test('the shown vault\'s page count is Echo\'s index of it now, not the count when it was connected', async () => {
  const w = world({})
  const v = await w.vault('Twin')
  const count = async () => (await w.ctx.run('kn', { id: v.id })).vaults.find((x) => x.id === v.id).pages
  await w.ctx.run('tree', { id: v.id })
  const before = await count()
  await w.ctx.run('new_page', { id: v.id, folder: '', title: 'Made up', template: null, index_row: false })
  await w.ctx.run('tree', { id: v.id })
  assert.equal(await count(), before + 1)
})
