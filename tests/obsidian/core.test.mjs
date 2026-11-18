// Knowledge 1.0: Echo core's plugin APIs adopted (onetest-ai/echo#772 stamps, #776 + Rules #768 a vault's hidden files
// and the user's own skills, #764 web pages, #757/#763 strict reads and link detail) and step 7's tags through Echo's
// dictionary. Made-up data and vaults in temp folders; Echo faked in its shapes (tests/helpers/fake-ctx.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as nfs from 'node:fs'
import * as npath from 'node:path'
import { stampOf, stampLedger, ledgerFolders, recordOf, datedStamp, webPictures, webSourceText, tagForm, tagContext, dictionaryTag, dictionaryRetag, twinSkillText, fmSplit, fmParse, fmGet, propText } from '../../plugins/obsidian/main.js'
import { world, call, read, write, exists, PKG, tmp } from './world.mjs'
import { twin, vault } from './twin.mjs'
import { skillMdProblem, hiddenOk } from '../helpers/echo-rules.mjs'
import { CALL } from './echo-data.mjs'

const STAMP = '2026-11-05_090012'
const ledgerOf = (ctx, id) => JSON.parse(ctx.files[`vaults/${id}/ingest.json`] || '{"queued":{},"sources":{},"calls":[]}')
const prop = (text, k) => { const [raw] = fmSplit(text); const p = fmGet(fmParse(raw), k); return p ? propText(p) : '' }
const filesIn = (dir) => { const out = []; const walk = (d) => { for (const e of nfs.readdirSync(d, { withFileTypes: true })) { const p = npath.join(d, e.name); if (e.isDirectory()) walk(p); else out.push(npath.relative(dir, p).split(npath.sep).join('/')) } }; if (nfs.existsSync(dir)) walk(dir); return out.sort() }

// ── echo#772: a call's stamp ──

test('a call\'s stamp: the YYYY-MM-DD_HHMMSS its folder starts with, else its whole name; Echo\'s own when it gives one', () => {
  assert.equal(stampOf('2026-11-05_090012-weekly-delivery-sync'), STAMP)
  assert.equal(stampOf('call:2026-11-05_090012-renamed'), STAMP, 'a retitle keeps it')
  assert.equal(stampOf('imported-notes'), 'imported-notes', 'a folder without one is its own stamp')
  assert.equal(stampOf('whatever', '2026-01-01_000000'), '2026-01-01_000000')
  assert.ok(datedStamp(STAMP) && !datedStamp('imported-notes') && !datedStamp(`${STAMP}-x`))
})

test('a ledger of before #772: every folder of a stamp is one call — a call retitled before (two folders) too — unless Echo says two calls share it', () => {
  const l = {
    calls: [`call:${STAMP}-sync`, `call:${STAMP}-sync-with-acme`, 'call:imported-notes', 'call:2026-11-06_100000-a', 'call:2026-11-06_100000-b'],
    queued: {
      'call:2026-11-07_080000-standup': { id: 'call:2026-11-07_080000-standup', kind: 'call', title: 'Standup', added: '2026-11-07T09:00:00Z' },
      'call:2026-11-07_080000-standup-acme': { id: 'call:2026-11-07_080000-standup-acme', kind: 'call', title: 'Standup with Acme', added: '2026-11-07T10:00:00Z' },
      'mail:m1': { id: 'mail:m1', kind: 'mail' },
    },
    sources: { 'raw_inbox/echo/a.md': { from: `call:${STAMP}-sync` }, 'raw_inbox/b.pdf': { by: 'file' } },
  }
  assert.deepEqual([...ledgerFolders(l).keys()].sort(), ['2026-11-05_090012', '2026-11-06_100000', '2026-11-07_080000'])
  // Echo: 11-05 and 11-07 are one call each; 11-06 is two calls (each its own key), one of them gone.
  const to = new Map([[`${STAMP}-sync`, `call:${STAMP}`], [`${STAMP}-sync-with-acme`, `call:${STAMP}`], ['2026-11-07_080000-standup', 'call:2026-11-07_080000'], ['2026-11-07_080000-standup-acme', 'call:2026-11-07_080000'], ['2026-11-06_100000-a', 'call:2026-11-06_100000']])
  assert.equal(stampLedger(l, to), true)
  assert.deepEqual(l.calls, [`call:${STAMP}`, 'call:imported-notes', 'call:2026-11-06_100000', 'call:2026-11-06_100000-b'], 'the retitled pair is one call; the shared stamp\'s other folder kept')
  assert.deepEqual(Object.keys(l.queued), ['call:2026-11-07_080000', 'mail:m1'], 'two queue entries of one call become one')
  assert.equal(l.queued['call:2026-11-07_080000'].title, 'Standup', 'the earliest kept')
  assert.equal(l.sources['raw_inbox/echo/a.md'].from, `call:${STAMP}`)
  assert.equal(l.keys, 'stamp')
  assert.equal(stampLedger(l, new Map()), false, 'once')
})

test('which record is a call\'s: never another folder\'s on a failed read; a retitle only when that folder is gone and it started then', () => {
  const A = `${STAMP}-acme-sync`, B = `${STAMP}-memo`, at = '2026-11-05T09:00:12+02:00'
  const recs = [{ key: STAMP, rec: { folder: A, started_at: at, memo: false } }]
  assert.equal(recordOf(B, recs, null), null, 'Echo couldn\'t say: a record of its own')
  assert.equal(recordOf(B, recs, [{ folder: A, started_at: at, memo: false }, { folder: B, started_at: at, memo: true }]), null, 'A is still there: B is another call')
  assert.equal(recordOf(`${A}-renamed`, recs, [{ folder: `${A}-renamed`, started_at: at, memo: false }]), STAMP, 'A retitled')
  assert.equal(recordOf(`${B}-renamed`, recs, [{ folder: `${B}-renamed`, started_at: at, memo: true }]), null, 'gone, but not the same kind: not A')
  const two = [...recs, { key: `${STAMP}~abc`, rec: { folder: B, started_at: at, memo: true } }]
  assert.equal(recordOf(`${B}-renamed`, two, [{ folder: A, started_at: at, memo: false }, { folder: `${B}-renamed`, started_at: at, memo: true }]), `${STAMP}~abc`, 'B retitled keeps its own record')
  const old = [{ key: STAMP, rec: { folder: A } }]
  assert.equal(recordOf(`${A}-renamed`, old, [{ folder: `${A}-renamed`, started_at: at }]), STAMP, 'a record from before: the one gone, the one without a record')
  assert.equal(recordOf(B, old, [{ folder: B, started_at: at }, { folder: 'x', started_at: at }]), null, 'two without a record: none taken')
})

const notesOf = (v) => filesIn(npath.join(v.root, 'knowledge/notes')).filter((p) => p !== 'README.md')
async function sameSecond({ wrapCalls } = {}) {
  const A = `${STAMP}-acme-sync`, B = `${STAMP}-memo`
  const w = world({ calls: [call(A, 'Acme sync'), call(B, 'A memo', { memo: true })] })
  const v = await w.vault('My twin', { minutes: 'auto' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.calls', value: 'add' })
  if (wrapCalls) { const read = w.ctx.echo.read; w.ctx.echo.read = (k, a, o) => (k === 'calls' ? wrapCalls(() => read(k, a, o)) : read(k, a, o)) }
  return { w, v, A, B }
}

test('a retitled call is the same call: its note isn\'t written twice, it is queued once, and prepared as it is named now', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('My twin', { minutes: 'auto' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.calls', value: 'prepare' })
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  assert.equal(notesOf(v).length, 1)
  assert.deepEqual(Object.keys(ledgerOf(w.ctx, v.id).queued), [`call:${STAMP}`])
  const rec = JSON.parse(w.ctx.files[`calls/${STAMP}.json`])
  assert.deepEqual([rec.folder, rec.started_at, rec.memo], [CALL, '2026-11-05T09:00:12+02:00', false], 'the record says which folder it saw last, when it started, its kind')
  const renamed = `${STAMP}-weekly-sync-with-acme`
  w.data.calls[0].folder = renamed
  w.data.calls[0].title = 'Weekly sync with Acme'
  await w.ctx.fire('minutes_written', w.data.payload(renamed, true))
  assert.equal(notesOf(v).length, 1, 'the note is updated in place, never a second one')
  assert.deepEqual(Object.keys(ledgerOf(w.ctx, v.id).queued), [`call:${STAMP}`], 'queued once')
  assert.equal(JSON.parse(w.ctx.files[`calls/${STAMP}.json`]).folder, renamed)
  const s = await w.ctx.run('call_knowledge', { call: { name: renamed, stamp: STAMP, notes: true } })
  assert.deepEqual(s.record.saved.map((e) => e.vault), [v.id], 'the call\'s page finds its record by the stamp')
  const p = await w.ctx.run('prepare_sources', { vault: v.id })
  assert.deepEqual(p.written.map((x) => x.id), [`call:${STAMP}`])
  const l = ledgerOf(w.ctx, v.id)
  assert.deepEqual([l.calls, Object.keys(l.queued)], [[`call:${STAMP}`], []])
  const src = Object.entries(l.sources).find(([, e]) => e.by === 'call')
  assert.ok(read(v.root, src[0]).includes('Weekly sync with Acme'), 'read as the call is named now')
  await w.ctx.fire('minutes_written', w.data.payload(renamed, true))
  assert.deepEqual(Object.keys(ledgerOf(w.ctx, v.id).queued), [], 'prepared once: never queued again')
})

test('two calls of one second: B\'s minutes arriving within a minute of A\'s never go over A\'s note — its own record, note and queue entry', async () => {
  const { w, v, A, B } = await sameSecond()
  await w.ctx.fire('minutes_written', w.data.payload(A))
  await w.ctx.fire('minutes_written', w.data.payload(B))
  const recs = Object.keys(w.ctx.files).filter((k) => k.startsWith('calls/')).sort()
  assert.equal(recs.length, 2, recs.join(', '))
  assert.ok(recs[0] === `calls/${STAMP}.json` && recs[1].startsWith(`calls/${STAMP}~`), recs.join(', '))
  assert.deepEqual(recs.map((k) => JSON.parse(w.ctx.files[k]).folder), [A, B])
  assert.equal(notesOf(v).length, 2)
  const q = Object.keys(ledgerOf(w.ctx, v.id).queued).sort()
  assert.deepEqual(q, [`call:${STAMP}`, recs[1].slice(6, -5) && `call:${recs[1].slice(6, -5)}`])
  const p = await w.ctx.run('prepare_sources', { vault: v.id })
  assert.deepEqual(p.failed, [])
  const titles = Object.entries(ledgerOf(w.ctx, v.id).sources).filter(([, e]) => e.by === 'call').map(([path]) => read(v.root, path).split('\n').find((x) => x.startsWith('title:'))).sort()
  assert.deepEqual(titles, ['title: A memo', 'title: Acme sync'], 'each prepared as itself, not the stamp twice')
})

test('two calls of one second: when Echo can\'t say which calls there are, B gets a record of its own — never A\'s', async () => {
  let fail = false
  const { w, v, A, B } = await sameSecond({ wrapCalls: (read) => { if (fail) throw new Error('Echo is busy'); return read() } })
  await w.ctx.fire('minutes_written', w.data.payload(A))
  fail = true
  await w.ctx.fire('minutes_written', w.data.payload(B))
  assert.equal(notesOf(v).length, 2, 'A\'s note kept, B\'s its own')
  assert.equal(JSON.parse(w.ctx.files[`calls/${STAMP}.json`]).folder, A)
})

test('the day Echo lists a call by is its own, not its stamp\'s: a call started just past midnight is still found with its stamp', async () => {
  const A = '2026-11-05_235959-late-call', B = '2026-11-05_235959-late-memo'
  const w = world({ calls: [call(A, 'Late call', { started_at: '2026-11-06T00:00:00+02:00' }), call(B, 'Late memo', { memo: true, started_at: '2026-11-06T00:00:00+02:00' })] })
  const v = await w.vault('My twin', { minutes: 'auto' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.fire('minutes_written', w.data.payload(A))
  await w.ctx.fire('minutes_written', w.data.payload(B))
  assert.equal(notesOf(v).length, 2)
  assert.equal(Object.keys(w.ctx.files).filter((k) => k.startsWith('calls/2026-11-05_235959')).length, 2)
})

test('a call of a shared second, retitled: the same record and queue entry — no third', async () => {
  const { w, v, A, B } = await sameSecond()
  await w.ctx.fire('minutes_written', w.data.payload(A))
  await w.ctx.fire('minutes_written', w.data.payload(B))
  const before = Object.keys(ledgerOf(w.ctx, v.id).queued).sort()
  w.data.calls[1].folder = `${STAMP}-memo-on-pricing`
  await w.ctx.fire('minutes_written', w.data.payload(`${STAMP}-memo-on-pricing`, true))
  assert.equal(Object.keys(w.ctx.files).filter((k) => k.startsWith('calls/')).length, 2, 'no third record')
  assert.equal(notesOf(v).length, 2, 'no third note')
  assert.deepEqual(Object.keys(ledgerOf(w.ctx, v.id).queued).sort(), before, 'no second queue entry')
})

test('a ledger of before, with a call retitled then: kept by stamp, and the call\'s next event isn\'t queued a third time', async () => {
  const w = world({ calls: [call(`${STAMP}-sync-with-acme`, 'Sync with Acme')] })
  const v = await w.vault('My twin', { minutes: 'off' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.calls', value: 'add' })
  const l = ledgerOf(w.ctx, v.id)
  delete l.keys
  l.queued = { [`call:${STAMP}-sync`]: { id: `call:${STAMP}-sync`, kind: 'call', title: 'Sync', state: 'queued', rule: 'add', added: '2026-11-05T10:00:00Z' }, [`call:${STAMP}-sync-with-acme`]: { id: `call:${STAMP}-sync-with-acme`, kind: 'call', title: 'Sync with Acme', state: 'queued', rule: 'add', added: '2026-11-05T11:00:00Z' } }
  w.ctx.files[`vaults/${v.id}/ingest.json`] = JSON.stringify(l)
  assert.deepEqual((await w.ctx.run('sources', { vault: v.id })).sources.filter((x) => x.queued).map((x) => x.id), [`call:${STAMP}`], 'read by stamp at once: one call')
  await w.ctx.fire('minutes_written', w.data.payload(`${STAMP}-sync-with-acme`, true))
  const after = ledgerOf(w.ctx, v.id)
  assert.deepEqual([after.keys, Object.keys(after.queued)], ['stamp', [`call:${STAMP}`]])
})

test('the recording\'s events are heard by the call\'s stamp: a call retitled while it records is the same one when transcribed', async () => {
  const t = twin()
  const ctx = await vault(t, { terminal: false, echo: { clients: [], threads: [], calls: [], sources: [], recording: { state: 'idle', call: null, stamp: null } } })
  await ctx.fire('recording_started', { call: `${STAMP}-call`, stamp: STAMP, title: 'Call', memo: false })
  await ctx.fire('recording_stopped', { call: `${STAMP}-acme-review`, stamp: STAMP, duration_s: 60, reason: 'user' })
  await ctx.fire('transcribed', { call: `${STAMP}-acme-review-final`, stamp: STAMP, ok: true })
  const w = await ctx.run('ingest_queue', { id: 'twin' })
  assert.ok(!w.waiting, JSON.stringify(w.waiting))
})

// ── echo#763/#757: strict reads, how each link was written ──

test('a page is read strictly: one not UTF-8 is shown as Echo reads it and not editable; links are resolved by how Echo says each was written', async () => {
  const t = twin()
  write(t, 'knowledge/topics/legacy.md', '')
  nfs.writeFileSync(npath.join(t, 'knowledge/topics/legacy.md'), Buffer.from('# \xcf\xf0\xe8\xe2\xe5\xf2\n', 'latin1'))
  write(t, 'knowledge/topics/both.md', '# Both\n\n[[acme]] and [Acme](../clients/acme.md) and [[Nowhere]].\n')
  const ctx = await vault(t)
  const p = await ctx.run('page', { id: 'twin', path: 'topics/legacy.md' })
  assert.deepEqual([p.editable, p.utf8], [false, false])
  assert.ok(p.html.includes('\uFFFD'), 'shown as Echo reads it, read only — not "too large"')
  await assert.rejects(ctx.run('save_page', { id: 'twin', path: 'topics/legacy.md', text: '# x\n', base: p.base }), /isn't UTF-8 text/)
  const asked = []
  const links = ctx.markdown.links
  ctx.markdown.links = (md, o) => { asked.push(o); return links(md, o) }
  const b = await ctx.run('page', { id: 'twin', path: 'topics/both.md' })
  assert.deepEqual(asked, [{ detail: true }])
  assert.ok(b.html.includes('href="#obsidian:knowledge/twin/pages/clients/acme.md"'), b.html)
  assert.ok(b.html.includes('data-md-missing="Nowhere"'), b.html)
  // A page saved is written only over the text read (its sha is the text's, read strictly).
  const ok = await ctx.run('page', { id: 'twin', path: 'topics/both.md' })
  const r = await ctx.run('save_page', { id: 'twin', path: 'topics/both.md', text: '# Both\n\nChanged.\n', base: ok.base })
  assert.ok(!r.conflict)
  assert.equal(read(t, 'knowledge/topics/both.md'), '# Both\n\nChanged.\n')
})

// ── echo#776 + Rules #768: the twin's skills ──

test('the twin\'s SKILL.md files pass Echo\'s skill_md_ok, as shipped and as the copy for every session', () => {
  for (const n of ['twin', 'process-inbox']) {
    const md = read(PKG, `starter/twin/.claude/skills/${n}/SKILL.md`)
    assert.equal(skillMdProblem(md), null, n)
    assert.equal(skillMdProblem(twinSkillText(md, { id: 'acme-twin', name: 'Acme -- twin <x>', root: '/Users/sam/Notes/Acme twin' }, 'acme-twin')), null, `${n} for every session`)
  }
  assert.ok(hiddenOk('.claude/skills/twin/SKILL.md') && hiddenOk('.gitignore') && hiddenOk('.obsidian/app.json'))
  // Echo #781: `.obsidian/<name>.json` at any depth under plain folders.
  assert.ok(hiddenOk('knowledge/.obsidian/app.json') && hiddenOk('knowledge/.obsidian', true) && hiddenOk('a/b/.obsidian/templates.json'))
  for (const no of ['.obsidian/community-plugins.json', 'knowledge/.obsidian/Core-Plugins.json', 'knowledge/.obsidian/core-plugins-migration.json', 'knowledge/.obsidian/plugins/x.json', 'knowledge/.obsidian/themes/x.json', '.hidden/.obsidian/app.json', 'knowledge/.obsidian/\u017fnippets.json', '.claude/settings.json', '.claude/skills/Twin/SKILL.md']) assert.ok(!hiddenOk(no), no)
})

test('skill_md_ok as ported: what Echo takes and what it refuses (its own cases)', () => {
  for (const ok of [
    '---\nname: acme-notes\ndescription: Answers from the Acme vault\'s notes\n---\n# Acme notes\nRead `Notes/` first.\n',
    '﻿---\r\nname: acme-notes\r\ndescription: "Acme: notes"\r\n---\r\nBody.\r\n',
    '---\nname: acme\n# a comment\ndescription: >-\n  Folded text\n  over lines: fine\nwhen_to_use: when asked about Acme\nargument-hint: "[topic]"\ndisable-model-invocation: true\nuser-invocable: false\n---\n',
    'No frontmatter, just `code`, a ```js\nblock\n``` and ! alone, apart: ! `x`.',
    'Text first\n---\nhooks: a rule, not frontmatter\n',
  ]) assert.equal(skillMdProblem(ok), null, ok)
  const refused = (md, why) => { const e = skillMdProblem(md); assert.ok(e && e.includes(why), `${JSON.stringify(md)}: ${e}`) }
  for (const key of ['hooks', 'allowed-tools', 'shell', 'Hooks']) refused(`---\nname: x\n${key}: Bash(*)\n---\nx`, 'a skill can\'t run commands')
  for (const key of ['model', 'context', 'agent', '"name"', 'name ', '- hooks']) refused(`---\nname: x\n${key}: y\n---\nx`, 'frontmatter')
  for (const v of [':\n  hooks: x', ':\n  - a', ': {hooks: x}', ': [a]', ': !!map x', ': &a x', ': *a', ': |\n  ok\n hooks: x']) refused(`---\ndescription${v}\n---\nx`, 'frontmatter')
  refused('---\nname: x\ndescription: y\n', 'no closing')
  refused('----\nname: x\n----\n', 'starts with a line')
  for (const md of ['---\rhooks: x\r---\r', '---\ndescription: hi\rallowed-tools: Bash(*)\n---\n']) refused(md, 'carriage return')
  for (const md of ['Run !$ARGUMENTS', '$0!$1']) refused(md, '“!$”')
  for (const md of ['Today: !`date`', '```!\nrm -rf ~\n```', '~~~!\nid\n~~~', '````  !\nid\n````', '  ```\t!bash\nid\n```']) refused(md, 'run')
})

test('a new vault in git commits its skills and .gitignore with the rest; a skill refused by Echo is never half-written', { skip: !nfs.existsSync('/usr/bin/git') && 'git is not available' }, async () => {
  const w = world({ git: true })
  const v = await w.vault('Team twin', { git: true, minutes: 'ask' })
  assert.equal(v.git, 'committed')
  const { execFileSync } = await import('node:child_process')
  const tracked = execFileSync('git', ['ls-files'], { cwd: v.root }).toString().split('\n').filter(Boolean)
  for (const p of ['.gitignore', '.claude/skills/twin/SKILL.md', '.claude/skills/process-inbox/SKILL.md']) assert.ok(tracked.includes(p), p)
  assert.throws(() => w.ctx.fs.write(v.root, '.claude/skills/evil/SKILL.md', '---\nname: evil\nallowed-tools: Bash(*)\n---\n'), /can't run commands/)
  assert.ok(!exists(v.root, '.claude/skills/evil/SKILL.md'))
})

// ── echo#764: a web page as a source ──

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000200000002008020000', 'hex')
function webWorld({ listed = 'https://wiki.acme.example', page, claude } = {}) {
  const dir = tmp()
  nfs.writeFileSync(npath.join(dir, '01.png'), PNG)
  nfs.writeFileSync(npath.join(dir, '02.png'), PNG)
  const asked = []
  let w = null
  const web = {
    read: async (url, opts = {}) => {
      asked.push([url, opts])
      if (!url.startsWith(listed) && url !== typedNow) throw new Error('obsidian may reach only the hosts its manifest names () and the addresses you list in its settings (https://wiki.acme.example)')
      if (url === typedNow) typedNow = null
      const p = page ? page(url) : null
      if (p) return p
      return {
        url, title: 'Rollout | plan (draft)', markdown: 'The rollout starts in the EU\\.\n\n![The map](https://wiki.acme.example/img/map%7C1.png)\n\nThen the US.\n\n![Chart](https://cdn.example/chart.png)\n',
        byline: 'Ada Lovelace', published: '2026-11-02T10:00:00Z', lang: 'en', needs_js: false, truncated: false,
        images: [
          { src: 'https://wiki.acme.example/img/map|1.png', alt: 'The map', saved: opts.images === 'save' ? { ...w.ctx.handle(npath.join(dir, '01.png')), name: '01.png', type: 'image/png' } : undefined },
          { src: 'https://cdn.example/chart.png', alt: 'Chart', error: 'not an address this plugin may reach' },
        ],
      }
    },
  }
  let typedNow = null
  let typed = null
  w = world({ web, claude })
  w.ctx.http = { askAddress: async () => { asked.push(['ask']); typedNow = typed; return typed } }
  return { w, asked, type: (u) => { typed = u } }
}

test('a web page on a site the user listed: read once with its pictures, written as a source; the pictures beside it, part of it', async () => {
  const { w, asked } = webWorld()
  const v = await w.vault('Twin', { minutes: 'off' })
  const r = await w.ctx.run('add_source', { vault: v.id, kind: 'web', url: 'https://wiki.acme.example/rollout' })
  assert.deepEqual(asked, [['https://wiki.acme.example/rollout', { images: 'save' }]], 'read once, its pictures saved — never Echo\'s box for a listed site')
  assert.ok(/^raw_inbox\/web\/\d{4}-\d{2}-\d{2}-rollout-plan-draft\.md$/.test(r.path), r.path)
  assert.deepEqual([r.pictures, r.pictures_failed], [1, 1])
  const stem = r.path.slice(0, -3)
  const text = read(v.root, r.path)
  assert.deepEqual(['kind', 'url', 'author', 'published', 'lang'].map((k) => prop(text, k)), ['web', 'https://wiki.acme.example/rollout', 'Ada Lovelace', '2026-11-02', 'en'])
  assert.ok(text.includes(`![The map](${encodeURIComponent(stem.split('/').pop())}/01.png)`), text)
  assert.ok(text.includes('![Chart](https://cdn.example/chart.png)'), 'one Echo couldn\'t save keeps its address')
  assert.deepEqual(nfs.readFileSync(npath.join(v.root, `${stem}/01.png`)), PNG)
  const l = ledgerOf(w.ctx, v.id)
  assert.deepEqual([l.sources[r.path].by, l.sources[r.path].from, l.sources[`${stem}/01.png`].of], ['web', 'https://wiki.acme.example/rollout', r.path])
  const q = (await w.ctx.run('sources', { vault: v.id })).sources
  assert.deepEqual(q.filter((s) => s.kind === 'web').map((s) => s.path), [r.path], 'its pictures aren\'t sources of their own')
  await assert.rejects(w.ctx.run('add_source', { vault: v.id, kind: 'web', url: 'https://wiki.acme.example/rollout' }), /in the vault already/)
  assert.equal(asked.length, 1, 'never read again')
})

test('a page elsewhere: Echo asks for its address in its own box, reads that one once; cancelled adds nothing; one that needs JavaScript adds nothing, said so', async () => {
  const { w, asked, type } = webWorld({ page: (u) => (u.includes('spa') ? { url: u, title: 'App', markdown: 'Loading…', needs_js: true, images: [] } : null) })
  const v = await w.vault('Twin', { minutes: 'off' })
  type('https://blog.example/post')
  const r = await w.ctx.run('add_source', { vault: v.id, kind: 'web', url: 'https://blog.example/post' })
  assert.deepEqual(asked.map((x) => x[0]), ['https://blog.example/post', 'ask', 'https://blog.example/post'], 'refused as not listed, then Echo\'s box, then that page')
  assert.equal(r.url, 'https://blog.example/post')
  type(null)
  assert.deepEqual(await w.ctx.run('add_source', { vault: v.id, kind: 'web', url: '' }), { cancelled: true })
  const before = filesIn(npath.join(v.root, 'raw_inbox/web'))
  type('https://spa.example/app')
  await assert.rejects(w.ctx.run('add_source', { vault: v.id, kind: 'web', url: '' }), /builds itself with JavaScript, which Echo doesn't read yet, so nothing was added/)
  assert.deepEqual(filesIn(npath.join(v.root, 'raw_inbox/web')), before)
})

test('a web page\'s pictures go into the copy with it when it is prepared; other sources\' don\'t', async () => {
  let seen = null
  const claude = async (opts, run) => { seen = { exclude: opts.exclude, page: run.read(pagePath), pic: run.read(`${pagePath.slice(0, -3)}/01.png`), other: run.read('raw_inbox/other.md') }; return { answer: 'Nothing.' } }
  let pagePath = null
  const { w } = webWorld({ claude })
  const v = await w.vault('Twin', { minutes: 'off' })
  write(v.root, 'raw_inbox/other.md', '# Other\n')
  pagePath = (await w.ctx.run('add_source', { vault: v.id, kind: 'web', url: 'https://wiki.acme.example/rollout' })).path
  await w.ctx.run('ingest_go', { id: v.id, sources: [pagePath], wait: true })
  assert.ok(seen.page && seen.pic !== null, 'the page and its picture are in the copy')
  assert.equal(seen.other, null, 'another source isn\'t')
  assert.ok(seen.exclude.includes('raw_inbox/other.md') && !seen.exclude.some((p) => p.startsWith('raw_inbox/web')), seen.exclude.join(', '))
})

test('a web page\'s Markdown points at its pictures; one Echo couldn\'t save keeps its address', () => {
  const p = webPictures('![a](https://x.example/a.png) ![b](https://x.example/b%7Cc.png) ![a again](https://x.example/a.png)', [
    { src: 'https://x.example/a.png', saved: { file: 'h1', name: '01.png' } },
    { src: 'https://x.example/b|c.png', saved: { file: 'h2', name: '02.png' } },
    { src: 'https://x.example/c.png', error: 'too big' },
  ], '2026-11-18-plan (2)')
  assert.equal(p.md, '![a](2026-11-18-plan%20%282%29/01.png) ![b](2026-11-18-plan%20%282%29/02.png) ![a again](2026-11-18-plan%20%282%29/01.png)')
  assert.deepEqual([p.files.map((f) => f.name), p.failed], [['01.png', '02.png'], 1])
  assert.equal(webSourceText('https://x.example/', '', 'Text', '2026-11-18', 't').title, 'https://x.example/')
})

test('a page added twice through Echo\'s box is refused before anything is fetched', async () => {
  const { w, asked, type } = webWorld()
  const v = await w.vault('Twin', { minutes: 'off' })
  type('https://blog.example/post')
  const r = await w.ctx.run('add_source', { vault: v.id, kind: 'web', url: '' })
  assert.equal(r.url, 'https://blog.example/post')
  const n = asked.length
  type('https://blog.example/post')
  await assert.rejects(w.ctx.run('add_source', { vault: v.id, kind: 'web', url: '' }), /in the vault already: raw_inbox\/web\//)
  assert.deepEqual(asked.slice(n), [['ask']], 'Echo\'s box asked, the page not read again')
})

test('the twin skill in your own Claude Code: one name, one vault; the default name is one no other vault holds', async () => {
  const w = world()
  const a = await w.vault('Acme')
  const b = await w.vault('Acme Twin')
  assert.equal((await w.ctx.run('twin_text', { id: a.id })).name, 'acme-twin')
  await w.ctx.run('twin', { id: a.id, op: 'installed', name: 'acme-twin' })
  const t = await w.ctx.run('twin_text', { id: b.id })
  assert.deepEqual([t.name, t.taken_by], ['acme-twin-2', null], 'Acme Twin\'s default steps aside')
  assert.equal((await w.ctx.run('twin_text', { id: b.id, name: 'acme-twin' })).taken_by, 'Acme', 'asked for: said whose it is')
  await assert.rejects(w.ctx.run('twin', { id: b.id, op: 'installed', name: 'acme-twin' }), /is Acme's twin skill already/)
  assert.equal((await w.ctx.run('twin_text', { id: a.id })).installed, 'acme-twin', 'the sheet knows what it is installed as (Update… under a new name takes it out first)')
  assert.ok(!twinSkillText('x', { id: 'v', name: 'a --> b', root: '/r' }, 'n').includes('-->”'), 'a vault\'s name never closes the comment')
  assert.ok(!/<!--[^]*-->[^]*-->/.test(twinSkillText('x', { id: 'v', name: 'a ---> <!-- b', root: '/r' }, 'n')))
})

// ── step 7: tags through Echo's dictionary ──

const TERMS = [
  { name: 'Acme Corp', synonyms: ['ACME'], spellings: ['Akme'], kind: 'org', group: 'clients', client: null },
  { name: 'Control Plane', synonyms: [], spellings: ['controlplane'], kind: 'product', group: 'products', client: 'acme' },
  { name: 'Concept', synonyms: ['idea'], spellings: [], kind: 'term', group: 'terms', client: null },
]

test('a tag Echo\'s dictionary knows by another name is that name; the vault\'s taxonomy wins where it has one', () => {
  assert.equal(tagForm('Acme Corp'), 'acme-corp')
  assert.equal(tagForm(' Контроль якості '), 'контроль-якості')
  assert.deepEqual(dictionaryTag('akme', null, TERMS), { to: 'acme-corp', term: 'Acme Corp' })
  assert.deepEqual(dictionaryTag('#ACME', null, TERMS), { to: 'acme-corp', term: 'Acme Corp' })
  assert.equal(dictionaryTag('acme-corp', null, TERMS), null, 'right already')
  assert.equal(dictionaryTag('Acme-Corp', null, TERMS), null, 'case alone is no change (Obsidian\'s tags ignore it)')
  assert.equal(dictionaryTag('roadmap', null, TERMS), null, 'not in the dictionary: left')
  assert.deepEqual(dictionaryTag('idea', ['meeting', 'client', 'concept'], TERMS), { to: 'concept', term: 'Concept' })
  assert.equal(dictionaryTag('akme', ['meeting', 'client', 'concept'], TERMS), null, 'the taxonomy allows none of its names: left for Health')
  assert.equal(dictionaryTag('client', ['client'], [{ name: 'Customer', synonyms: ['client'] }]), null, 'a tag the taxonomy allows is never changed')
  const page = '---\ntags: [akme, meeting]\n---\n# Acme\n\nAbout #controlplane today; `#akme` in code stays.\n'
  // Control Plane is the client acme's term: only in a vault for acme.
  const anyVault = dictionaryRetag(page, tagContext(null, TERMS))
  assert.equal(anyVault.text, page.replace('[akme,', '[acme-corp,'))
  assert.deepEqual(anyVault.changed.map((c) => [c.from, c.to]), [['akme', 'acme-corp']], 'a client\'s term never in another\'s vault')
  const r = dictionaryRetag(page, tagContext(null, TERMS, new Set(['acme'])))
  assert.equal(r.text, '---\ntags: [acme-corp, meeting]\n---\n# Acme\n\nAbout #control-plane today; `#akme` in code stays.\n')
  assert.deepEqual(r.changed.map((c) => [c.from, c.to]), [['akme', 'acme-corp'], ['controlplane', 'control-plane']])
  // What Obsidian doesn't take as a tag is never one.
  assert.deepEqual(['2026', '/acme', 'acme/', '12-34', 'a/b'].map(tagForm), ['', '', '', '', 'a/b'])
  assert.equal(dictionaryTag('x', null, [{ name: '2026' , synonyms: ['x'] }]), null)
  // One lookup a tag: 5,000 terms, 200 tags, at once.
  const many = Array.from({ length: 5000 }, (_, i) => ({ name: `Term ${i}`, synonyms: [`syn-${i}`, `alias ${i}`], spellings: [`spell${i}`] }))
  const big = `---\ntags: [${Array.from({ length: 200 }, (_, i) => `syn-${i}`).join(', ')}]\n---\n# Many\n`
  const t0 = Date.now()
  const cx = tagContext(null, many)
  const got = dictionaryRetag(big, cx)
  assert.equal(got.changed.length, 200)
  assert.ok(Date.now() - t0 < 2000, `${Date.now() - t0} ms`)
})

test('a client\'s dictionary terms apply only in its vaults (For whom, its threads, its Profile)', async () => {
  const t = twin()
  write(t, 'knowledge/topics/plan.md', '---\ntitle: Plan\ntags: [cp]\n---\n# Plan\n')
  write(t, 'knowledge/TAG_TAXONOMY.md', '# Tags\n\n```\nmeeting, client, concept, control-plane\n```\n')
  const terms = [{ name: 'Control Plane', synonyms: ['cp'], client: 'acme' }]
  const ctx = await vault(t, { echo: { clients: [{ id: 'acme', name: 'Acme' }], threads: [], calls: [], sources: [], dictionary: { terms } } })
  const key = 'unknown_tag:knowledge/topics/plan.md:#cp'
  assert.equal((await ctx.run('health_finding', { id: 'twin', key })).choices[0].choice, 'tag:meeting', 'not acme\'s vault: its term not offered')
  await ctx.run('belongs', { id: 'twin', belongs: [{ client: 'acme' }] })
  assert.equal((await ctx.run('health_finding', { id: 'twin', key })).choices[0].label, 'Use #control-plane — Control Plane in Echo\'s dictionary')
})

test('Health: a tag the taxonomy doesn\'t allow offers the one Echo\'s dictionary says it is, first', async () => {
  const t = twin()
  write(t, 'knowledge/topics/plan.md', '---\ntitle: Plan\ntags: [idea]\n---\n# Plan\n\nSee [[acme]].\n')
  const ctx = await vault(t, { echo: { clients: [], threads: [], calls: [], sources: [], dictionary: { terms: TERMS } } })
  const key = 'unknown_tag:knowledge/topics/plan.md:#idea'
  const d = await ctx.run('health_finding', { id: 'twin', key })
  assert.deepEqual(d.choices.map((c) => c.choice), ['tag:concept', 'tag:meeting', 'tag:client', 'taxonomy'])
  assert.equal(d.choices[0].label, 'Use #concept — Concept in Echo\'s dictionary')
})

test('Ingest: the run\'s pages\' tags as Echo\'s dictionary names them, said on the change; the taxonomy as the run left it wins', async () => {
  const t = twin()
  write(t, '.claude/skills/process-inbox/SKILL.md', '---\nname: process-inbox\ndescription: Turn the sources in raw_inbox/ into pages\n---\n# Process inbox\n')
  write(t, 'raw_inbox/idea.md', '# An idea\n\nShip it.\n')
  const claude = async (opts, run) => {
    run.write('knowledge/topics/ship.md', '---\ntitle: Ship it\ntags: [idea, akme]\n---\n# Ship it\n\nFor #akme.\n')
    run.write('knowledge/TAG_TAXONOMY.md', '# Tags\n\n```\nmeeting, client, concept, acme-corp\n```\n')
    return { answer: 'Done.' }
  }
  const ctx = await vault(t, { claude, echo: { clients: [], threads: [], calls: [], sources: [], dictionary: { terms: TERMS } } })
  const run = (await ctx.run('ingest_go', { id: 'twin', sources: ['raw_inbox/idea.md'], wait: true })).run
  const cs = (await ctx.run('ingest_changes', { id: 'twin', run })).changes
  const c = cs.find((x) => x.path === 'knowledge/topics/ship.md')
  assert.equal((await ctx.run('ingest_text', { id: 'twin', run, path: c.path })).text, '---\ntitle: Ship it\ntags: [concept, acme-corp]\n---\n# Ship it\n\nFor #acme-corp.\n')
  assert.deepEqual(c.retagged.map((x) => [x.from, x.to]), [['idea', 'concept'], ['akme', 'acme-corp']])
  assert.deepEqual(cs.find((x) => x.path === 'knowledge/TAG_TAXONOMY.md').retagged, [], 'never the taxonomy itself')
})

test('an AI check\'s fix takes the dictionary\'s tag, as shown and as written', async () => {
  const t = twin()
  const PAGE = 'knowledge/topics/pricing.md'
  write(t, PAGE, '---\ntitle: Pricing\ntags: [concept]\n---\n# Pricing\n\nA price per active stream.\nNo summary yet.\n')
  const claude = async () => ({ answer: JSON.stringify({ findings: [{ kind: 'missing_summary', title: 'Pricing has no summary', pages: [{ path: PAGE, quote: 'A price per active stream' }], fix: { path: PAGE, old: 'No summary yet.', new: 'Summary: one #idea, priced per stream.' } }] }), usage: { cost_usd: 0.1 } })
  const ctx = await vault(t, { claude, echo: { clients: [], threads: [], calls: [], sources: [], dictionary: { terms: TERMS } } })
  await ctx.run('lint', { id: 'twin', wait: true })
  const f = (await ctx.run('health', { id: 'twin' })).findings.find((x) => x.by === 'ai')
  const fx = (await ctx.run('health_finding', { id: 'twin', key: f.key })).fix
  const plus = (fx.hunks || []).flat().filter(([k]) => k === '+').map(([, l]) => l)
  assert.deepEqual(plus, ['Summary: one #concept, priced per stream.'])
  const r = await ctx.run('fix', { id: 'twin', key: f.key, choice: 'ai', base: fx.base, sha: fx.sha })
  assert.deepEqual(r.written, [PAGE])
  assert.ok(read(t, PAGE).includes('Summary: one #concept, priced per stream.'))
})
