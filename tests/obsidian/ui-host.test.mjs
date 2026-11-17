// The Knowledge activity's host commands (the window half's reads and actions through seam.js): the vaults as the
// activity draws them, a vault's Settings, the editor's preview, index rows for pages it doesn't list, Health's code
// findings and score, Home, a call's Knowledge and the user's choice for it, and the later steps saying so — on made-up
// vaults in temp folders (nothing of the user's is read).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as nfs from 'node:fs'
import * as npath from 'node:path'
import * as os from 'node:os'
import { execFileSync } from 'node:child_process'
import { apply, activityRecent } from '../../plugins/obsidian/main.js'
import { fakeCtx } from '../helpers/fake-ctx.mjs'

const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
const hasGit = (() => { try { execFileSync('git', ['--version'], { stdio: 'ignore' }); return true } catch { return false } })()
const sh = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=Sam Rivera', '-c', 'user.email=sam@acme.example', '-c', 'commit.gpgsign=false', ...args], { cwd, env: GIT_ENV, stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8')

const tmp = () => nfs.realpathSync(nfs.mkdtempSync(npath.join(os.tmpdir(), 'kn-pages-')))
const write = (root, rel, text) => { const p = npath.join(root, rel); nfs.mkdirSync(npath.dirname(p), { recursive: true }); nfs.writeFileSync(p, text) }
const read = (root, rel) => nfs.readFileSync(npath.join(root, rel), 'utf8')
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** A vault shaped like the owner's twin (#677's `fixture::twin`), with a Topics table and a page template. */
function twin(root) {
  write(root, 'knowledge/.obsidian/app.json', '{"useMarkdownLinks": true, "newLinkFormat": "relative"}')
  write(root, 'knowledge/CATALOG.md', '# Knowledge Catalog\n\n> Last update: 2026-01-01\n\n## Clients\n\n| File | Description | Date Added |\n|------|-------------|------------|\n| [acme.md](clients/acme.md) | Acme Corp | 2026-01-02 |\n\n## Notes\n\n| File | Description | Date Added |\n|------|-------------|------------|\n| [2026-01-01-a.md](notes/2026-01-01-a.md) | first | 2026-01-01 |\n| [2026-01-02-b.md](notes/2026-01-02-b.md) | second | 2026-01-02 |\n\n## Topics\n\n| File | Description |\n|------|-------------|\n\n## Activities\n\nNone yet.\n')
  write(root, 'knowledge/TAG_TAXONOMY.md', '# Tags\n\n```\nmeeting, client, concept\n```\n')
  write(root, 'knowledge/clients/acme.md', '---\ntitle: Acme Corp\ntags: [client]\n---\n# Acme Corp\n\nSee [[2026-01-01-a]].\n')
  write(root, 'knowledge/notes/2026-01-01-a.md', '---\ntitle: First sync\ndate: 2026-01-01\ntags: [meeting]\n---\n# First sync\n\nWith [Acme](../clients/acme.md).\n')
  write(root, 'knowledge/notes/2026-01-02-b.md', '---\ntitle: Second sync\ntags: [meeting]\n---\n# Second sync\n')
  write(root, 'knowledge/notes/2026-01-03-c.md', '---\ntitle: Third sync\ntags: [meeting]\n---\n# Third\n')
  write(root, 'knowledge/notes/README.md', '# Notes\n')
  write(root, 'raw_inbox/deck.pdf', '%PDF-1.4 made up')
  write(root, '.claude/skills/s/SKILL.md', '---\nname: s\ndescription: Does s\n---\n# S\n')
  write(root, '.claude/commands/c.md', '---\ndescription: Does c\n---\nRun c.\n')
  write(root, 'AGENTS.md', '# Rules\n')
  write(root, 'processing_log.json', '{}')
  return root
}

/** The plugin over one vault at `root` (its record as Knowledge keeps it), detected as `add` does. */
async function vault(root, { commit = false, terminal = true, git = false, id = 'twin', detect = true, storeUnreadable = [], rec: more = {} } = {}) {
  const rec = { schema: 1, id, name: 'Twin', root, state: 'ready', confirmed: true, added_at: '2026-11-01T09:00:00.000Z', commit, ...more }
  const ctx = fakeCtx({ id: 'obsidian', terminal, folders: [root], disk: true, git, markdown: true, store: { 'vaults.json': JSON.stringify([rec]) }, storeUnreadable, echo: { clients: [{ id: 'acme', name: 'Acme' }], threads: [{ id: 'acme-rollout', name: 'Rollout', client: 'acme' }] }, profiles: { default: 'p1', profiles: [{ id: 'p1', name: 'Claude' }, { id: 'p2', name: 'Other' }] } })
  apply(ctx)
  if (detect) await ctx.run('reread', { id })
  return ctx
}
const repo = (root) => { sh(root, 'init', '-q', '--initial-branch=main'); sh(root, 'add', '-A'); sh(root, 'commit', '-q', '-m', 'Start') }
const acts = (ctx) => activityRecent(ctx.files['vaults/twin/activity.jsonl'] || '').reverse()


test('kn: each vault as the activity draws it — its paths, its folder there, its profile, its description — with the profiles, clients and threads', async () => {
  const ctx = await vault(twin(tmp()))
  const d = await ctx.run('kn', {})
  const v = d.vaults[0]
  assert.equal(v.available, true)
  assert.deepEqual(v.paths, { pages: 'knowledge', index: 'knowledge/CATALOG.md', notes: 'knowledge/notes', naming: '{date}-{slug}.md', templates: null, sources: 'raw_inbox' })
  assert.equal(v.profile, 'p1', 'none of its own: the default profile')
  assert.equal(typeof v.pages, 'number')
  assert.deepEqual(d.profiles.map((p) => p.id), ['p1', 'p2'])
  assert.deepEqual(d.clients.map((c) => c.id), ['acme'])
  assert.equal(d.default, null)
  assert.ok('description' in v && 'proposed' in v)
})

test('vault_settings: its skills, the meeting tag, the index\'s size, its templates; past minutes and the twin\'s global copy wait', async () => {
  const root = twin(tmp())
  write(root, 'knowledge/templates/page.md', '# {{title}}\n')
  const ctx = await vault(root)
  await ctx.run('set', { id: 'twin', key: 'templates', value: 'knowledge/templates' })
  const x = await ctx.run('vault_settings', { id: 'twin' })
  assert.deepEqual(x.skills.map((k) => k.name).sort(), ['c', 's'])
  assert.equal(x.meeting_tag, 'meeting')
  assert.ok(x.index_bytes > 100)
  assert.deepEqual(x.templates, ['page.md'])
  assert.equal(x.tags, 3)
  assert.equal(x.past, null)
})

test('preview: the editor\'s text as the page reads, nothing written', async () => {
  const root = twin(tmp())
  const ctx = await vault(root)
  const before = read(root, 'knowledge/clients/acme.md')
  const r = await ctx.run('preview', { id: 'twin', path: 'clients/acme.md', text: '# Acme\n\nSee [[2026-01-02-b]] and [[Nowhere]].\n' })
  assert.match(r.html, /href="#obsidian:knowledge\/twin\/pages\/notes\/2026-01-02-b\.md"/)
  assert.match(r.html, /data-md-missing="Nowhere"/)
  assert.equal(read(root, 'knowledge/clients/acme.md'), before)
  await assert.rejects(ctx.run('preview', { id: 'twin', path: '../AGENTS.md', text: 'x' }))
})

test('rows and index_add: a page the index doesn\'t list gets its row in its folder\'s table, once', async () => {
  const root = twin(tmp())
  const ctx = await vault(root)
  const r = await ctx.run('rows', { id: 'twin', paths: ['notes/2026-01-03-c.md'] })
  assert.equal(r.rows.length, 1)
  assert.equal(r.rows[0].section, 'Notes')
  assert.match(r.rows[0].row, /\[2026-01-03-c\.md\]\(notes\/2026-01-03-c\.md\)/)
  assert.ok(!read(root, 'knowledge/CATALOG.md').includes('2026-01-03-c'), 'rows writes nothing')
  const w = await ctx.run('index_add', { id: 'twin', paths: ['notes/2026-01-03-c.md'] })
  assert.equal(w.added, 1)
  assert.ok(read(root, 'knowledge/CATALOG.md').includes('(notes/2026-01-03-c.md)'))
  assert.equal(acts(ctx)[0].path, 'knowledge/CATALOG.md', 'an activity line for the index')
  assert.equal((await ctx.run('rows', { id: 'twin', paths: ['notes/2026-01-03-c.md'] })).rows[0].section, 'already listed')
  assert.equal((await ctx.run('index_add', { id: 'twin', paths: ['notes/2026-01-03-c.md'] })).added, 0)
})

test('health: the code checks\' findings by group, keyed the same across reads, the score, one point a day; ignoring takes one out of the count', async () => {
  const ctx = await vault(twin(tmp()))
  const h = await ctx.run('health', { id: 'twin' })
  const keys = h.findings.map((f) => f.key)
  assert.ok(keys.includes('not_in_index:knowledge/notes/2026-01-03-c.md'), keys.join('\n'))
  const f = h.findings.find((x) => x.key === 'not_in_index:knowledge/notes/2026-01-03-c.md')
  assert.deepEqual([f.group, f.by, f.fixable], ['should', 'code', true])
  assert.deepEqual(f.pages, [['notes/2026-01-03-c.md', null]], 'its pages as the activity names them (the key keeps the vault\'s paths, as #677)')
  assert.equal(h.score.code_only, true)
  assert.ok(h.score.total >= 0 && h.score.total <= 100)
  assert.equal(h.history.length, 1)
  assert.deepEqual((await ctx.run('health', { id: 'twin' })).findings.map((x) => x.key), keys, 'the same keys again')
  assert.equal((await ctx.run('health', { id: 'twin' })).history.length, 1, 'one point a day')
  await ctx.run('ignore', { id: 'twin', key: f.key, on: true })
  const after = await ctx.run('health', { id: 'twin' })
  assert.ok(!after.findings.some((x) => x.key === f.key))
  assert.ok(after.ignored.some((x) => x.key === f.key))
  const one = await ctx.run('health_finding', { id: 'twin', key: f.key })
  assert.equal(one.ignored, true)
  assert.match(one.error, /fixes and AI checks aren't in this version/)
  await ctx.run('ignore', { id: 'twin', key: f.key, on: false })
  assert.ok((await ctx.run('health', { id: 'twin' })).findings.some((x) => x.key === f.key))
})

test('home: what changed (Echo\'s writes, git\'s commits), the Health card, where to start reading, the vault\'s card; Ingest says it is to come', async () => {
  const root = twin(tmp())
  const ctx = await vault(root)
  const p = await ctx.run('page', { id: 'twin', path: 'clients/acme.md' })
  await ctx.run('save_page', { id: 'twin', path: 'clients/acme.md', text: `${p.text}More.\n`, base: p.base })
  const h = await ctx.run('home', { id: 'twin' })
  assert.equal(h.whats_new.rows[0].path, 'clients/acme.md')
  assert.equal(h.whats_new.rows[0].who, 'Edited in Echo')
  assert.equal(h.hubs.index.path, 'CATALOG.md')
  assert.equal(typeof h.health.score, 'number')
  assert.match(h.coming_in.error, /Ingest isn't in this version/)
  assert.equal(h.vault.pages_root, 'knowledge')
})

test('call_knowledge: the vaults a call may go to; by itself only a vault for its thread (else its client, else the default) that takes minutes automatically on the call\'s profile; the user\'s choice kept', async () => {
  const ctx = await vault(twin(tmp()), { rec: { belongs: [{ thread: 'acme-rollout' }], minutes: { mode: 'auto' } } })
  const call = { name: '2026-11-17-acme-sync', threads: ['acme-rollout'], client: 'acme', profile: null, notes: true }
  const k = await ctx.run('call_knowledge', { call })
  assert.deepEqual(k.vaults.map((v) => [v.id, v.mode, v.available]), [['twin', 'auto', true]])
  assert.deepEqual(k.targets, [{ id: 'twin', name: 'Twin' }])
  assert.equal((await ctx.run('call_knowledge', { call: { ...call, threads: [], client: null } })).targets.length, 0, 'not its thread or client, and no default')
  assert.equal((await ctx.run('call_knowledge', { call: { ...call, profile: 'p2' } })).targets.length, 0, 'another AI profile: never by itself')
  await ctx.run('call_choice', { call: call.name, vault: 'none' })
  const off = await ctx.run('call_knowledge', { call })
  assert.equal(off.record.choice, 'none')
  await ctx.run('call_choice', { call: call.name, vault: '' })
  assert.equal((await ctx.run('call_knowledge', { call })).record.choice, null, 'back to the vaults\' rules')
  await assert.rejects(ctx.run('call_choice', { call: call.name, vault: 'nope' }), /no such vault/)
})

test('the later steps say so and do nothing: Ingest, Health\'s fixes and AI checks, minutes into a vault, a new vault, the twin', async () => {
  const root = twin(tmp())
  const ctx = await vault(root)
  for (const [c, word] of [['ingest_queue', 'Ingest'], ['source_add', 'Ingest'], ['ingest_go', 'Ingest'], ['fix', 'fixes and AI checks'], ['lint', 'fixes and AI checks'], ['save_minutes', 'minutes into a vault'], ['minutes_preview', 'minutes into a vault'], ['new_vault', 'twin starter'], ['twin', 'twin skill']]) {
    await assert.rejects(ctx.run(c, { id: 'twin' }), new RegExp(`${word}.* in this version of Knowledge yet`), c)
  }
  assert.deepEqual(acts(ctx), [], 'nothing written')
})
