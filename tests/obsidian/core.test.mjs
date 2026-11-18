// Knowledge 1.0: Echo core's plugin APIs adopted (onetest-ai/echo#772 stamps, #776 + Rules #768 a vault's hidden files
// and the user's own skills, #764 web pages, #757/#763 strict reads and link detail) and step 7's tags through Echo's
// dictionary. Made-up data and vaults in temp folders; Echo faked in its shapes (tests/helpers/fake-ctx.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as nfs from 'node:fs'
import * as npath from 'node:path'
import { stampOf, callSourceId, stampLedger, datedStamp, webPictures, webSourceText, tagForm, dictionaryTag, dictionaryRetag, twinSkillText, fmSplit, fmParse, fmGet, propText } from '../../plugins/obsidian/main.js'
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
  const none = () => false, both = () => true
  assert.equal(callSourceId(CALL, undefined, none), `call:${STAMP}`)
  assert.equal(callSourceId(CALL, STAMP, both), `call:${CALL}`, 'two calls in one second: kept apart by folder')
  assert.equal(callSourceId('imported-notes', undefined, both), 'call:imported-notes')
})

test('a ledger of before #772 (calls by folder) is read by stamp: its calls, queue and sources; two folders of one stamp stay apart', () => {
  const l = {
    calls: [`call:${CALL}`, 'call:imported-notes', 'call:2026-11-06_100000-a', 'call:2026-11-06_100000-b'],
    queued: { 'call:2026-11-07_080000-standup': { id: 'call:2026-11-07_080000-standup', kind: 'call', title: 'Standup' }, 'mail:m1': { id: 'mail:m1', kind: 'mail' } },
    sources: { 'raw_inbox/echo/a.md': { from: `call:${CALL}` }, 'raw_inbox/b.pdf': { by: 'file' } },
  }
  assert.equal(stampLedger(l, (s) => s === '2026-11-07_080000'), true)
  assert.deepEqual(l.calls, [`call:${STAMP}`, 'call:imported-notes', 'call:2026-11-06_100000-a', 'call:2026-11-06_100000-b'])
  assert.deepEqual(Object.keys(l.queued), ['call:2026-11-07_080000-standup', 'mail:m1'], 'Echo says another call shares that stamp: by folder')
  assert.equal(l.sources['raw_inbox/echo/a.md'].from, `call:${STAMP}`)
  assert.equal(l.keys, 'stamp')
  assert.equal(stampLedger(l, () => false), false, 'once')
})

test('a retitled call is the same call: its note isn\'t written twice, it is queued once, and prepared by its stamp', async () => {
  const w = world({ calls: [call(CALL, 'Weekly delivery sync')] })
  const v = await w.vault('My twin', { minutes: 'auto' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.calls', value: 'prepare' })
  await w.ctx.fire('minutes_written', w.data.payload(CALL))
  const notes = () => filesIn(npath.join(v.root, 'knowledge/notes')).filter((p) => p !== 'README.md')
  assert.equal(notes().length, 1)
  assert.deepEqual(Object.keys(ledgerOf(w.ctx, v.id).queued), [`call:${STAMP}`])
  const rec = JSON.parse(w.ctx.files[`calls/${STAMP}.json`])
  assert.equal(rec.folder, CALL, 'the record says which folder it saw last')
  // Echo renames the folder (the call retitled): the same stamp.
  const renamed = `${STAMP}-weekly-sync-with-acme`
  w.data.calls[0].folder = renamed
  w.data.calls[0].title = 'Weekly sync with Acme'
  await w.ctx.fire('minutes_written', w.data.payload(renamed, true))
  assert.equal(notes().length, 1, 'the note is updated in place, never a second one')
  assert.deepEqual(Object.keys(ledgerOf(w.ctx, v.id).queued), [`call:${STAMP}`], 'queued once')
  assert.equal(JSON.parse(w.ctx.files[`calls/${STAMP}.json`]).folder, renamed)
  const s = await w.ctx.run('call_knowledge', { call: { name: renamed, stamp: STAMP, notes: true } })
  assert.deepEqual(s.record.saved.map((e) => e.vault), [v.id], 'the call\'s page finds its record by the stamp')
  const p = await w.ctx.run('prepare_sources', { vault: v.id })
  assert.deepEqual(p.written.map((x) => x.id), [`call:${STAMP}`])
  const l = ledgerOf(w.ctx, v.id)
  assert.deepEqual([l.calls, Object.keys(l.queued)], [[`call:${STAMP}`], []])
  const src = Object.entries(l.sources).find(([, e]) => e.by === 'call')
  assert.ok(read(v.root, src[0]).includes('Weekly sync with Acme'), 'read by its stamp: the call as it is named now')
  await w.ctx.fire('minutes_written', w.data.payload(renamed, true))
  assert.deepEqual(Object.keys(ledgerOf(w.ctx, v.id).queued), [], 'prepared once: never queued again')
})

test('two calls started in the same second: their records and queue entries stay apart, by folder', async () => {
  const a = `${STAMP}-acme-sync`, b = `${STAMP}-memo`
  const w = world({ calls: [call(a, 'Acme sync'), call(b, 'A memo', { memo: true })] })
  const v = await w.vault('My twin', { minutes: 'auto' })
  await w.ctx.run('default', { id: v.id })
  await w.ctx.run('set', { id: v.id, key: 'ingest.calls', value: 'add' })
  await w.ctx.fire('minutes_written', w.data.payload(a))
  await w.ctx.fire('minutes_written', w.data.payload(b))
  const recs = Object.keys(w.ctx.files).filter((k) => k.startsWith('calls/')).sort()
  assert.equal(recs.length, 2, recs.join(', '))
  assert.ok(recs[0] === `calls/${STAMP}.json` && recs[1].startsWith(`calls/${STAMP}~`), recs.join(', '))
  assert.deepEqual(recs.map((k) => JSON.parse(w.ctx.files[k]).folder), [a, b])
  assert.deepEqual(Object.keys(ledgerOf(w.ctx, v.id).queued).sort(), [`call:${a}`, `call:${b}`])
  assert.equal(filesIn(npath.join(v.root, 'knowledge/notes')).filter((p) => p !== 'README.md').length, 2)
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
  assert.equal(p.editable, false)
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
  assert.ok(!hiddenOk('knowledge/.obsidian/app.json'), 'Echo writes .obsidian/ only at a folder\'s top: the preset says it left those out')
  assert.ok(!hiddenOk('.obsidian/community-plugins.json') && !hiddenOk('.claude/settings.json') && !hiddenOk('.claude/skills/Twin/SKILL.md'))
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
function webWorld({ listed = 'https://wiki.acme.example', page } = {}) {
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
  w = world({ web })
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

test('a web page\'s pictures go into the copy with it when it is prepared; other sources\' don\'t', () => {
  const p = webPictures('![a](https://x.example/a.png) ![b](https://x.example/b%7Cc.png) ![a again](https://x.example/a.png)', [
    { src: 'https://x.example/a.png', saved: { file: 'h1', name: '01.png' } },
    { src: 'https://x.example/b|c.png', saved: { file: 'h2', name: '02.png' } },
    { src: 'https://x.example/c.png', error: 'too big' },
  ], '2026-11-18-plan (2)')
  assert.equal(p.md, '![a](2026-11-18-plan%20%282%29/01.png) ![b](2026-11-18-plan%20%282%29/02.png) ![a again](2026-11-18-plan%20%282%29/01.png)')
  assert.deepEqual([p.files.map((f) => f.name), p.failed], [['01.png', '02.png'], 1])
  assert.equal(webSourceText('https://x.example/', '', 'Text', '2026-11-18', 't').title, 'https://x.example/')
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
  const r = dictionaryRetag('---\ntags: [akme, meeting]\n---\n# Acme\n\nAbout #controlplane today; `#akme` in code stays.\n', null, TERMS)
  assert.equal(r.text, '---\ntags: [acme-corp, meeting]\n---\n# Acme\n\nAbout #control-plane today; `#akme` in code stays.\n')
  assert.deepEqual(r.changed.map((c) => [c.from, c.to]), [['akme', 'acme-corp'], ['controlplane', 'control-plane']])
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
