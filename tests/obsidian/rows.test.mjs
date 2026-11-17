// Knowledge 1.0 step 4: a thread's and a client's "Knowledge vault" row — what the host half answers (`vault_row`) and
// what the row draws of it (rows.js `rowHtml`), on made-up threads and clients; the window's own run is TC-030.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rowHtml } from '../../plugins/obsidian/rows.js'
import { world } from './world.mjs'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

test('vault_row: a thread inherits its client\'s vault, else the default; its own value wins; none is said', async () => {
  const w = world({ threads: [{ id: 'pilot', name: 'Acme pilot', client: 'acme' }, { id: 'solo', name: 'Solo', client: null }], clients: [{ id: 'acme', name: 'Acme' }] })
  const a = await w.vault('Acme wiki'), d = await w.vault('Mine', { minutes: 'ask' })
  assert.deepEqual((await w.ctx.run('vault_row', { thread: 'pilot' })).inherited, { vault: null, name: null, from: 'default' })
  await w.ctx.run('default', { id: d.id })
  assert.deepEqual((await w.ctx.run('vault_row', { thread: 'solo' })).inherited, { vault: d.id, name: 'Mine', from: 'default' })
  await w.ctx.run('client_vault', { client: 'acme', vault: a.id })
  const r = await w.ctx.run('vault_row', { thread: 'pilot' })
  assert.deepEqual(r.inherited, { vault: a.id, name: 'Acme wiki', from: 'client', client: 'acme', client_name: 'Acme' })
  assert.equal(r.own, null)
  assert.equal(r.effective, a.id)
  await w.ctx.run('thread_vault', { thread: 'pilot', vault: 'none' })
  const n = await w.ctx.run('vault_row', { thread: 'pilot' })
  assert.deepEqual([n.own, n.effective], ['none', null])
  const c = await w.ctx.run('vault_row', { client: 'acme' })
  assert.deepEqual([c.own, c.effective, c.inherited.from], [a.id, a.id, 'default'])
  assert.deepEqual(c.vaults.map((v) => [v.name, v.mode]), [['Acme wiki', 'auto'], ['Mine', 'ask']])
  assert.deepEqual(w.ctx.clientsNow, { acme: { vault: a.id } })
  assert.deepEqual(w.ctx.threadsNow.pilot, { vault: 'none' })
})

test('the row: the picker (inherited / a vault / none), what it inherits, the vault\'s mode; hostile names stay text', () => {
  const row = { own: null, inherited: { vault: 'acme', name: 'Acme <wiki>', from: 'client', client_name: 'Acme' }, effective: 'acme', vaults: [{ id: 'acme', name: 'Acme <wiki>', mode: 'ask' }, { id: 'mine', name: 'Mine', mode: 'auto' }] }
  const h = rowHtml(esc, 'thread', 'pilot', row)
  assert.ok(h.includes('<option value="" selected>Inherited — from Acme&#39;s vault') || h.includes('<option value="" selected>Inherited — from Acme\'s vault, Acme &lt;wiki&gt;</option>'), h)
  assert.ok(!h.includes('<wiki>'), 'escaped')
  assert.ok(h.includes('<option value="none">None — not into a vault</option>'))
  assert.ok(h.includes('aria-pressed="true" data-kn-row-mode="ask"'), 'the vault\'s mode is pressed')
  assert.ok(h.includes('Minutes of this thread&#39;s calls go to') || h.includes('Minutes of this thread\'s calls go to <b>Acme &lt;wiki&gt;</b>'), h)
  const none = rowHtml(esc, 'client', 'acme', { ...row, own: 'none', effective: null })
  assert.ok(none.includes('<option value="none" selected>') && !none.includes('data-kn-row-mode'))
  assert.ok(none.includes('go into no vault'))
  assert.ok(rowHtml(esc, 'thread', 'x', null).includes('Reading…'))
  assert.ok(rowHtml(esc, 'thread', 'x', { own: null, inherited: { vault: null, from: 'default' }, effective: null, vaults: [] }).includes('No vault connected yet'))
})
