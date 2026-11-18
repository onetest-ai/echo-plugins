// Health's findings, score, fixes, ignored findings and history (spec K16, health.rs's acceptance tests of #677 ported):
// on made-up vaults in temp folders, the plugin's commands as the window calls them.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { healthScore, healthHistory, closestPage, runFixOp, retagText } from '../../plugins/obsidian/main.js'
import { twin, vault, write, read, repo, sh, hasGit, acts, added, removed, today, tmp } from './twin.mjs'
import { world } from './world.mjs'

const of = (h, kind) => h.findings.filter((f) => f.kind === kind)
const fixOf = async (ctx, key, choice) => (await ctx.run('health_finding', { id: 'twin', key, choice })).fix
const item = (fx) => ({ key: fx.key, choice: fx.choice, base: fx.base, sha: fx.sha })

test('one of each new code finding: an index row to a missing page, a folder\'s usual property, one title twice, an oversized index — READMEs and templates not counted', async () => {
  const t = twin()
  const glossary = Array.from({ length: 1501 }, (_, n) => `| term-${n} | a made-up term |\n`).join('')
  write(t, 'knowledge/CATALOG.md', `${read(t, 'knowledge/CATALOG.md')}| [gone.md](notes/2026-01-09-gone.md) | gone |\n\n## Glossary\n\n| Term | Meaning |\n|---|---|\n${glossary}`)
  for (let n = 1; n <= 5; n++) write(t, `knowledge/topics/topic-${n}.md`, `---\ntitle: Topic ${n}\ntags: [concept]\n${n < 5 ? 'summary: A made-up topic.\n' : ''}---\n# Topic ${n}\n`)
  write(t, 'knowledge/clients/weekly-sync.md', '---\ntitle: Weekly Sync\ntags: [client]\n---\n# Weekly Sync\n')
  write(t, 'knowledge/notes/2026-01-04-weekly.md', '---\ntitle: weekly  sync\ntags: [meeting]\n---\n# weekly  sync\n')
  write(t, 'knowledge/topics/README.md', '---\ntitle: Overview\n---\n# Overview\n')
  write(t, 'knowledge/clients/README.md', '---\ntitle: Overview\n---\n# Overview\n')
  write(t, 'knowledge/templates/page.md', '---\ntitle: Weekly Sync\n---\n# {{title}}\n')
  const ctx = await vault(t)
  await ctx.run('set', { id: 'twin', key: 'templates', value: 'knowledge/templates' })
  const h = await ctx.run('health', { id: 'twin' })
  const kinds = ['dead_row', 'usual_prop', 'duplicate_title', 'oversized_index']
  assert.deepEqual(h.findings.filter((f) => kinds.includes(f.kind)).map((f) => f.key).sort(), [
    'dead_row:knowledge/CATALOG.md:(notes/2026-01-09-gone.md)',
    'duplicate_title:knowledge/clients/weekly-sync.md,knowledge/notes/2026-01-04-weekly.md',
    'oversized_index:knowledge/CATALOG.md',
    'usual_prop:knowledge/topics/topic-5.md:summary',
  ])
  const dead = of(h, 'dead_row')[0]
  const line = read(t, 'knowledge/CATALOG.md').split('\n').findIndex((l) => l.includes('2026-01-09-gone')) + 1
  assert.equal(dead.pages[0][1], line, 'the row\'s line')
  assert.equal(of(h, 'broken').length, 0, 'the index\'s rows are their own kind, not broken links too')
  assert.match(of(h, 'usual_prop')[0].title, /summary/)
  assert.deepEqual(kinds.map((k) => [k, of(h, k)[0].group, of(h, k)[0].by]), [['dead_row', 'should', 'code'], ['usual_prop', 'tidy', 'code'], ['duplicate_title', 'needs', 'code'], ['oversized_index', 'should', 'code']])
})

test('the score counts the pages each category touches (D32); Freshness only after an AI check; never below 0', () => {
  const found = (kind, page) => ({ key: `${kind}:${page}`, kind, pages: [[page, null]] })
  const f = Array.from({ length: 10 }, (_, n) => found('broken', `p${n}.md`))
  f.push({ ...found('broken', 'p0.md'), key: 'broken:p0.md:[[b]]' })
  const s = healthScore(f, 100, false)
  assert.deepEqual(s.categories, [['Links', 12.5, 25], ['Index', 20, 20], ['Properties', 15, 15], ['Consistency', 25, 25]], 'a page with two broken links counts once; Freshness left out')
  assert.deepEqual([s.total, s.code_only], [85, true], 'round(100 × 72.5 / 85)')
  f.push(...Array.from({ length: 4 }, (_, n) => found('stale', `s${n}.md`)))
  const ai = healthScore(f, 100, true)
  assert.deepEqual(ai.categories[ai.categories.length - 1], ['Freshness', 12, 15])
  assert.deepEqual([ai.total, ai.code_only], [85, false], '84.5 rounds half up')
  assert.deepEqual(healthScore(Array.from({ length: 60 }, (_, n) => found('broken', `p${n}.md`)), 100, false).categories[0], ['Links', 0, 25])
  assert.equal(healthScore([], 0, false).total, 100, 'nothing to judge')
})

test('broken links point to the closest page: the same name but for case, a name one character apart (a guess), else only remove or create', async () => {
  const t = twin()
  write(t, 'knowledge/clients/northwind-retail.md', '---\ntitle: Northwind Retail\n---\n# Northwind Retail\n')
  write(t, 'knowledge/notes/2026-11-05-a.md', '---\ntitle: A sync\n---\n# A sync\n')
  write(t, 'knowledge/topics/retro.md', '---\ntitle: Retro\n---\n# Retro\n\nAgreed with [[Northwind Retail]] to add a fallback.\nSee [the sync](notes/2026-1-05-a.md).\nAnd the [[summit-slides]].\n')
  const ctx = await vault(t)
  const h = await ctx.run('health', { id: 'twin' })
  const key = (l) => `broken:knowledge/topics/retro.md:${l}`
  assert.deepEqual(of(h, 'broken').map((f) => f.key), [key('(notes/2026-1-05-a.md)'), key('[[Northwind Retail]]'), key('[[summit-slides]]')])
  const toClient = await fixOf(ctx, key('[[Northwind Retail]]'))
  assert.equal(toClient.path, 'knowledge/topics/retro.md')
  assert.deepEqual(removed(toClient), ['Agreed with [[Northwind Retail]] to add a fallback.'])
  assert.deepEqual(added(toClient), ['Agreed with [[clients/northwind-retail|Northwind Retail]] to add a fallback.'])
  assert.equal(toClient.guess, false)
  const toNote = await fixOf(ctx, key('(notes/2026-1-05-a.md)'))
  assert.deepEqual(added(toNote), ['See [the sync](notes/2026-11-05-a.md).'])
  assert.equal(toNote.guess, true, 'one character apart: offered, but a guess')
  const fixAll = (k) => h.findings.find((x) => x.key === k).fix_all
  assert.ok(fixAll(key('[[Northwind Retail]]')) && !fixAll(key('(notes/2026-1-05-a.md)')))
  const d = await ctx.run('health_finding', { id: 'twin', key: key('[[Northwind Retail]]') })
  assert.equal(d.choices[0].to, 'knowledge/clients/northwind-retail.md')
  assert.equal(d.choices[0].why, 'the same name but for case or spacing')
  assert.deepEqual(d.choices.map((c) => c.choice), ['to', 'remove', 'create'])
  assert.equal(d.fix.plus, 1)
  const none = key('[[summit-slides]]')
  assert.equal(h.findings.find((x) => x.key === none).fixable, false)
  const n = await ctx.run('health_finding', { id: 'twin', key: none })
  assert.deepEqual(n.choices.map((c) => c.choice), ['remove', 'create'])
  assert.deepEqual(n.new_page, { folder: 'topics', name: 'summit-slides' }, 'its folder as Pages names it')
  assert.match(n.fix.error, /Nothing close/)
  assert.deepEqual(added(await fixOf(ctx, none, 'remove')), ['And the summit-slides.'])
  assert.match(read(t, 'knowledge/topics/retro.md'), /\[\[Northwind Retail\]\]/, 'fixes write nothing')
})

test('Fix all writes what didn\'t change since, in one commit; the page changed since is left as it is', { skip: !hasGit }, async () => {
  const t = twin()
  write(t, 'knowledge/clients/northwind-retail.md', '---\ntitle: Northwind Retail\n---\n# Northwind Retail\n')
  for (let n = 1; n <= 3; n++) write(t, `knowledge/topics/t${n}.md`, `---\ntitle: T${n}\n---\nWith [[Northwind Retail]] (${n}).\n`)
  repo(t)
  const ctx = await vault(t, { commit: true, git: true })
  const sheet = await ctx.run('fixes', { id: 'twin', kind: 'broken' })
  assert.equal(sheet.fixes.length, 3)
  write(t, 'knowledge/topics/t2.md', '---\ntitle: T2\n---\nWith [[Northwind Retail]] (2), edited by Lena Hartmann.\n')
  sh(t, 'commit', '-q', '-am', 'Lena\'s edit')
  const before = Number(sh(t, 'rev-list', '--count', 'HEAD'))
  const a = await ctx.run('fix_all', { id: 'twin', items: sheet.fixes.map(item) })
  assert.deepEqual(a.written, ['knowledge/topics/t1.md', 'knowledge/topics/t3.md'])
  assert.deepEqual(a.changed_since, ['knowledge/topics/t2.md'])
  assert.equal(Number(sh(t, 'rev-list', '--count', 'HEAD')), before + 1, 'one commit')
  assert.deepEqual(sh(t, 'show', '--name-only', '--format=', 'HEAD').trim().split('\n'), ['knowledge/topics/t1.md', 'knowledge/topics/t3.md'])
  assert.match(read(t, 'knowledge/topics/t1.md'), /\[\[clients\/northwind-retail\|Northwind Retail\]\] \(1\)/)
  assert.match(read(t, 'knowledge/topics/t2.md'), /edited by Lena Hartmann/)
  const lines = acts(ctx)
  assert.equal(lines.length, 2)
  assert.ok(lines.every((e) => e.by === 'health' && e.commit && e.plus === 1 && e.minus === 1))
  const after = await ctx.run('health', { id: 'twin' })
  assert.deepEqual(of(after, 'broken').map((f) => f.key), ['broken:knowledge/topics/t2.md:[[Northwind Retail]]'], 'the fixed links resolve now')
})

test('the answer names the files the commit took: a file with changes of the user\'s is fixed but left out; commits off, none', { skip: !hasGit }, async () => {
  const t = twin()
  write(t, 'knowledge/clients/northwind-retail.md', '---\ntitle: Northwind Retail\n---\n# Northwind Retail\n')
  for (let n = 1; n <= 3; n++) write(t, `knowledge/topics/t${n}.md`, `---\ntitle: T${n}\n---\nWith [[Northwind Retail]] (${n}).\n`)
  repo(t)
  write(t, 'knowledge/topics/t3.md', '---\ntitle: T3\n---\nWith [[Northwind Retail]] (3), noted by Lena Hartmann.\n')
  const ctx = await vault(t, { commit: true, git: true })
  const sheet = await ctx.run('fixes', { id: 'twin', kind: 'broken' })
  const a = await ctx.run('fix_all', { id: 'twin', items: sheet.fixes.map(item) })
  assert.deepEqual(a.written, ['knowledge/topics/t1.md', 'knowledge/topics/t2.md', 'knowledge/topics/t3.md'])
  assert.deepEqual(a.committed, ['knowledge/topics/t1.md', 'knowledge/topics/t2.md'], a.commit)
  assert.deepEqual(sh(t, 'show', '--name-only', '--format=', 'HEAD').trim().split('\n'), a.committed)
  await ctx.run('set', { id: 'twin', key: 'commit', value: 'off' })
  const rows = await ctx.run('fixes', { id: 'twin', kind: 'not_in_index' })
  assert.ok(rows.fixes.length > 0)
  const b = await ctx.run('fix_all', { id: 'twin', items: rows.fixes.filter((x) => !x.error).map(item) })
  assert.ok(b.written.length > 0 && b.committed.length === 0 && b.commit === 'off', JSON.stringify(b))
})

test('an ignored finding is neither listed nor counted, and shows under Show ignored', async () => {
  const t = twin()
  const ctx = await vault(t)
  const key = 'not_in_index:knowledge/notes/2026-01-03-c.md'
  const has = (h, list) => h[list].some((f) => f.key === key)
  const before = await ctx.run('health', { id: 'twin' })
  assert.ok(has(before, 'findings'))
  assert.equal(before.score.total, 76, 'Index at 0: one of four pages isn\'t listed')
  await ctx.run('ignore', { id: 'twin', key, on: true })
  write(t, 'knowledge/clients/acme.md', '---\ntitle: Acme Corp\ntags: [client]\n---\n# Acme Corp\n\nSee [[2026-01-01-a]] and the plan.\n')
  const after = await ctx.run('health', { id: 'twin' })
  assert.ok(!has(after, 'findings'), 'not listed')
  assert.equal(after.score.total, 100, 'not counted')
  assert.ok(has(after, 'ignored'), 'listed under Show ignored')
  assert.deepEqual(JSON.parse(ctx.files['vaults/twin/health.json']).ignored, [key])
  await ctx.run('ignore', { id: 'twin', key, on: false })
  assert.ok(has(await ctx.run('health', { id: 'twin' }), 'findings'))
  await assert.rejects(ctx.run('ignore', { id: 'twin', key: 'a\nb', on: true }), /not a finding/)
})

test('the checks keep their keys, and Health gives the score and the day\'s point', async () => {
  const ctx = await vault(twin())
  const c = await ctx.run('checks', { id: 'twin' })
  for (const k of ['not_in_index', 'broken', 'isolated', 'no_props', 'unknown_tags', 'meeting_tag_missing', 'no_index', 'dead_rows', 'usual_props', 'duplicate_titles', 'oversized_index']) assert.ok(k in c, k)
  assert.deepEqual(c.not_in_index, ['notes/2026-01-03-c.md'])
  assert.deepEqual(c.isolated, ['notes/2026-01-03-c.md'])
  assert.equal(c.no_index, false)
  const h = await ctx.run('health', { id: 'twin' })
  assert.deepEqual([h.score.total, h.score.code_only], [76, true])
  assert.equal(h.history.length, 1, 'the day\'s point')
  assert.deepEqual(h.history[0].categories.map(([n]) => n), ['Links', 'Index', 'Properties', 'Consistency'])
})

test('findings follow the vault: a new broken link, and the vault\'s settings (its meeting tag)', async () => {
  const t = twin()
  const ctx = await vault(t)
  assert.equal(of(await ctx.run('health', { id: 'twin' }), 'broken').length, 0)
  write(t, 'knowledge/clients/acme.md', '---\ntitle: Acme Corp\ntags: [client]\n---\n# Acme Corp\n\nSee [[2026-01-01-a]] and [[missing-page]].\n')
  await ctx.run('reread', { id: 'twin' }) // Echo's index is looked at again after 2 s; a test doesn't wait
  assert.equal(of(await ctx.run('health', { id: 'twin' }), 'broken').length, 1)
  await ctx.run('set', { id: 'twin', key: 'tag', value: 'standup' })
  assert.equal(of(await ctx.run('health', { id: 'twin' }), 'meeting_tag_missing').length, 1)
})

test('one point a day — the day\'s last — kept 90 days', () => {
  const s = (total) => ({ total, categories: [['Links', 25, 25]], code_only: true })
  let h = healthHistory([], '2026-11-01', s(80))
  h = healthHistory(h, '2026-11-01', s(82))
  assert.deepEqual(h.map((p) => [p.day, p.score]), [['2026-11-01', 82]], 'the day\'s last')
  h = healthHistory(h, '2026-11-03', s(84))
  assert.deepEqual(h.map((p) => [p.day, p.score]), [['2026-11-01', 82], ['2026-11-03', 84]])
  h = healthHistory(h, '2027-01-31', s(90))
  assert.deepEqual(h.map((p) => [p.day, p.score]), [['2026-11-03', 84], ['2027-01-31', 90]], '91 days after the first: it goes')
})

test('index rows, properties and tags are fixed by code; several fixes of one file go in one write', async () => {
  const t = twin()
  write(t, 'knowledge/CATALOG.md', `${read(t, 'knowledge/CATALOG.md').replace('| [2026-01-02-b.md](notes/2026-01-02-b.md) | second | 2026-01-02 |\n', '| [2026-01-02-b.md](notes/2026-01-02-b.md) | second | 2026-01-02 |\n| [2026-01-05-a.md](notes/2026-01-05-a.md) | moved | 2026-01-05 |\n| [old.md](notes/old.md) | gone | 2026-01-06 |\n')}`)
  write(t, 'knowledge/meetings/2026-01-05-a.md', '---\ntitle: Moved\n---\n# Moved\n')
  write(t, 'knowledge/topics/bare.md', '# Bare\n\nNo properties.\n')
  write(t, 'knowledge/notes/2026-01-07-plain.md', '# Plain\r\n\r\nWritten on Windows.\r\n')
  write(t, 'knowledge/clients/acme.md', '---\ntitle: Acme Corp\ntags: [client, invented]\n---\n# Acme Corp\n\nWorks with #invented teams. See [[2026-01-01-a]].\n')
  write(t, 'knowledge/topics/block.md', '---\ntitle: Block\ntags:\n  - invented\n  - concept\n---\n# Block\n')
  const ctx = await vault(t)
  const moved = await fixOf(ctx, 'dead_row:knowledge/CATALOG.md:(notes/2026-01-05-a.md)')
  assert.equal(moved.choice, 'to')
  assert.deepEqual(added(moved), ['| [2026-01-05-a.md](meetings/2026-01-05-a.md) | moved | 2026-01-05 |'])
  const gone = await fixOf(ctx, 'dead_row:knowledge/CATALOG.md:(notes/old.md)')
  assert.deepEqual([gone.choice, removed(gone), added(gone)], ['remove', ['| [old.md](notes/old.md) | gone | 2026-01-06 |'], []])
  const row = await fixOf(ctx, 'not_in_index:knowledge/notes/2026-01-03-c.md')
  assert.equal(row.path, 'knowledge/CATALOG.md')
  assert.ok(added(row).some((l) => l.includes('(notes/2026-01-03-c.md)')), added(row).join('\n'))
  const bare = await fixOf(ctx, 'no_props:knowledge/topics/bare.md')
  assert.deepEqual(added(bare), ['---', 'title: Bare', 'tags: []', '---'])
  const plainText = runFixOp({ op: 'prepend', text: '---\r\ntitle: Plain\r\ndate: 2026-01-07\r\ntags: []\r\n---\r\n' }, read(t, 'knowledge/notes/2026-01-07-plain.md'), today())
  const plain = await fixOf(ctx, 'no_props:knowledge/notes/2026-01-07-plain.md')
  assert.deepEqual(added(plain), ['---\r', 'title: Plain\r', 'date: 2026-01-07\r', 'tags: []\r', '---\r'], 'the H1 as title, the date from the name, the file\'s own line endings')
  assert.ok(plainText.startsWith('---\r\ntitle: Plain\r\ndate: 2026-01-07\r\ntags: []\r\n---\r\n# Plain\r\n'))
  const key = 'unknown_tag:knowledge/clients/acme.md:#invented'
  assert.match((await fixOf(ctx, key)).error, /Pick/)
  assert.match((await fixOf(ctx, key, 'tag:nope')).error, /isn't in the taxonomy/, 'only a tag the taxonomy allows')
  assert.deepEqual(added(await fixOf(ctx, key, 'tag:concept')), ['tags: [client, concept]', 'Works with #concept teams. See [[2026-01-01-a]].'])
  assert.equal(added(await fixOf(ctx, key, 'tag:client'))[0], 'tags: [client]', 'never the same tag twice')
  const block = await fixOf(ctx, 'unknown_tag:knowledge/topics/block.md:#invented', 'tag:concept')
  assert.deepEqual([removed(block), added(block)], [['  - invented'], []])
  const picks = (await ctx.run('health_finding', { id: 'twin', key })).choices.map((c) => c.choice)
  assert.deepEqual(picks, ['tag:meeting', 'tag:client', 'tag:concept', 'taxonomy'])
  // Three fixes of the index at once: one write, each change in it.
  const a = await ctx.run('fix_all', { id: 'twin', items: [moved, gone, row].map(item) })
  assert.deepEqual([a.written, a.changed_since, a.commit], [['knowledge/CATALOG.md'], [], 'off'])
  const now = read(t, 'knowledge/CATALOG.md')
  assert.ok(now.includes('](meetings/2026-01-05-a.md)') && !now.includes('notes/old.md') && now.includes('(notes/2026-01-03-c.md)'), now)
  assert.equal(acts(ctx).length, 1)
  // A fix shown before that write no longer matches: nothing is written.
  const stale = await fixOf(ctx, 'no_props:knowledge/topics/bare.md')
  const b = await ctx.run('fix', { id: 'twin', key: stale.key, choice: stale.choice, base: '0'.repeat(64), sha: stale.sha })
  assert.deepEqual([b.written.length, b.changed_since], [0, ['knowledge/topics/bare.md']])
  // The tag fix's text, as retagText writes it.
  assert.equal(retagText('#x #xy (#x)\n', 'x', 'y'), '#y #xy (#y)\n')
})

test('a new vault from the twin starter scores 100 on code checks only', async () => {
  const w = world()
  const v = await w.vault('Fresh', { minutes: 'auto' })
  const h = await w.ctx.run('health', { id: v.id })
  assert.deepEqual(h.findings, [])
  assert.deepEqual([h.score.total, h.score.code_only], [100, true])
  assert.equal(h.history.length, 1)
})

test('a dated note is never guessed for Fix all (R36): an index row only to the same name, a broken link\'s near name only on its own', async () => {
  const t = twin()
  write(t, 'knowledge/CATALOG.md', read(t, 'knowledge/CATALOG.md').replace('| second | 2026-01-02 |\n', '| second | 2026-01-02 |\n| [2026-01-09-weekly-sync.md](notes/2026-01-09-weekly-sync.md) | gone | 2026-01-09 |\n'))
  write(t, 'knowledge/notes/2026-01-16-weekly-sync.md', '---\ntitle: Weekly sync\n---\n# Weekly sync\n')
  write(t, 'knowledge/topics/plan.md', '---\ntitle: Plan\n---\nAs agreed in [[2026-01-09-weekly-sync]].\n')
  const ctx = await vault(t)
  const h = await ctx.run('health', { id: 'twin' })
  const dead = 'dead_row:knowledge/CATALOG.md:(notes/2026-01-09-weekly-sync.md)'
  assert.deepEqual((await ctx.run('health_finding', { id: 'twin', key: dead })).choices.map((c) => c.choice), ['remove'], 'no guessed page for an index row')
  assert.equal((await fixOf(ctx, dead)).choice, 'remove')
  const broken = 'broken:knowledge/topics/plan.md:[[2026-01-09-weekly-sync]]'
  const b = h.findings.find((x) => x.key === broken)
  assert.ok(b.fixable && !b.fix_all, 'offered alone, not in Fix all')
  const alone = await fixOf(ctx, broken)
  assert.equal(alone.guess, true)
  assert.deepEqual(added(alone), ['As agreed in [[notes/2026-01-16-weekly-sync|2026-01-09-weekly-sync]].'])
  assert.ok(!(await ctx.run('fixes', { id: 'twin', kind: 'broken' })).fixes.some((x) => x.key === broken), 'not in Fix all\'s sheet')
  assert.ok((await ctx.run('fixes', { id: 'twin', kind: 'dead_row' })).fixes.some((x) => x.key === dead && x.choice === 'remove'))
  // Sent to Fix all anyway (an old sheet): left out, said.
  const r = await ctx.run('fix_all', { id: 'twin', items: [item(alone)] })
  assert.deepEqual([r.written, r.skipped.map((s) => s.key)], [[], [broken]])
  assert.equal(closestPage(['notes/2026-01-16-weekly-sync.md'], 'topics/plan.md', { target: '2026-01-09-weekly-sync', wiki: true, embed: false, line: 1 }, false), null, 'no guesses: none')
})

test('an index row fix writes the vault\'s log line, in the same commit', { skip: !hasGit }, async () => {
  const t = twin()
  write(t, 'log.md', '# Log\n\n- 2026-01-01 · created · the vault\n')
  repo(t)
  const ctx = await vault(t, { commit: true, git: true })
  const row = await fixOf(ctx, 'not_in_index:knowledge/notes/2026-01-03-c.md')
  const a = await ctx.run('fix', { id: 'twin', ...item(row) })
  assert.deepEqual(a.written, ['knowledge/CATALOG.md', 'log.md'])
  assert.ok(read(t, 'log.md').endsWith(`- ${today()} · changed · knowledge/CATALOG.md · 1 page added to the index by Echo\n`))
  assert.deepEqual(sh(t, 'show', '--name-only', '--format=', 'HEAD').trim().split('\n'), ['knowledge/CATALOG.md', 'log.md'], 'one commit with both')
})

test('a fix shown before a save into the vault isn\'t written over it; computed again, both land', async () => {
  const t = twin()
  write(t, 'log.md', '# Log\n\n- 2026-01-01 · created · the vault\n')
  const ctx = await vault(t)
  const key = 'not_in_index:knowledge/notes/2026-01-03-c.md'
  const row = await fixOf(ctx, key)
  // A minutes save writes its row and its line meanwhile.
  const saved = '| [2026-01-04-d.md](notes/2026-01-04-d.md) | fourth | 2026-01-04 |'
  write(t, 'knowledge/CATALOG.md', read(t, 'knowledge/CATALOG.md').replace('| second | 2026-01-02 |\n', `| second | 2026-01-02 |\n${saved}\n`))
  write(t, 'log.md', `${read(t, 'log.md')}- 2026-01-04 · added · knowledge/notes/2026-01-04-d.md\n`)
  const a = await ctx.run('fix', { id: 'twin', ...item(row) })
  assert.deepEqual([a.written.length, a.changed_since], [0, ['knowledge/CATALOG.md']], 'the index changed since its fix was shown')
  assert.ok(read(t, 'knowledge/CATALOG.md').includes(saved))
  const b = await ctx.run('fix', { id: 'twin', ...item(await fixOf(ctx, key)) })
  assert.deepEqual(b.written, ['knowledge/CATALOG.md', 'log.md'])
  const i = read(t, 'knowledge/CATALOG.md'), l = read(t, 'log.md')
  assert.ok(i.includes(saved) && i.includes('(notes/2026-01-03-c.md)'), i)
  assert.ok(l.includes('2026-01-04 · added') && l.includes('1 page added to the index by Echo'), l)
})

/** The twin with dead index rows: a wikilink on a table row, a link both on a row and in prose, two on one row. */
async function deadRows() {
  const t = twin()
  write(t, 'knowledge/CATALOG.md', `${read(t, 'knowledge/CATALOG.md')}| [[Northwind Retail]] | Northwind |\n| [old.md](notes/old.md) | gone |\n| [x.md](notes/x-gone.md) and [y.md](notes/y-gone.md) | two |\n\nSee also [the old notes](notes/old.md) for history.\n`)
  write(t, 'knowledge/clients/northwind-retail.md', '---\ntitle: Northwind Retail\n---\n# Northwind Retail\n')
  return { t, ctx: await vault(t) }
}

test('a relinked table row keeps its cells: the alias\'s | is escaped', async () => {
  const { ctx } = await deadRows()
  assert.deepEqual(added(await fixOf(ctx, 'dead_row:knowledge/CATALOG.md:[[Northwind Retail]]')), ['| [[clients/northwind-retail\\|Northwind Retail]] | Northwind |'])
})

test('a dead link in prose keeps its words: the table row goes, the line of prose stays', async () => {
  const { ctx } = await deadRows()
  const old = await fixOf(ctx, 'dead_row:knowledge/CATALOG.md:(notes/old.md)', 'remove')
  assert.deepEqual(removed(old), ['| [old.md](notes/old.md) | gone |', 'See also [the old notes](notes/old.md) for history.'])
  assert.deepEqual(added(old), ['See also the old notes for history.'])
})

test('a fix with nothing left to do is skipped, with why — not "changed since"', async () => {
  const { ctx } = await deadRows()
  const x = await fixOf(ctx, 'dead_row:knowledge/CATALOG.md:(notes/x-gone.md)')
  const y = await fixOf(ctx, 'dead_row:knowledge/CATALOG.md:(notes/y-gone.md)')
  const a = await ctx.run('fix_all', { id: 'twin', items: [item(x), item(y)] })
  assert.deepEqual([a.written, a.changed_since], [['knowledge/CATALOG.md'], []])
  assert.deepEqual(a.skipped.map((s) => s.key), ['dead_row:knowledge/CATALOG.md:(notes/y-gone.md)'])
  assert.match(a.skipped[0].why, /isn't there/)
})

test('a file left out of the commit has no commit in its activity line', { skip: !hasGit }, async () => {
  const t = twin()
  write(t, 'knowledge/clients/northwind-retail.md', '---\ntitle: Northwind Retail\n---\n# Northwind Retail\n')
  for (let n = 1; n <= 2; n++) write(t, `knowledge/topics/t${n}.md`, `---\ntitle: T${n}\n---\nWith [[Northwind Retail]] (${n}).\n`)
  repo(t)
  write(t, 'knowledge/topics/t2.md', '---\ntitle: T2\n---\nWith [[Northwind Retail]] (2), not committed yet.\n')
  const ctx = await vault(t, { commit: true, git: true })
  const items = []
  for (const p of ['knowledge/topics/t1.md', 'knowledge/topics/t2.md']) items.push(item(await fixOf(ctx, `broken:${p}:[[Northwind Retail]]`)))
  const a = await ctx.run('fix_all', { id: 'twin', items })
  assert.equal(a.written.length, 2)
  assert.deepEqual(sh(t, 'show', '--name-only', '--format=', 'HEAD').trim().split('\n'), ['knowledge/topics/t1.md'], 'only the file that was clean')
  const commitOf = (p) => acts(ctx).find((e) => e.path === p).commit
  assert.ok(commitOf('knowledge/topics/t1.md'))
  assert.equal(commitOf('knowledge/topics/t2.md'), null, 'it isn\'t in the commit')
})

test('a fix is computed again from its key: the window sends no path or text, and one not shown isn\'t written', async () => {
  const t = twin()
  const ctx = await vault(t)
  await assert.rejects(ctx.run('fix', { id: 'twin', key: 'no_props:../x.md', base: 'a', sha: 'b' }), /isn't there any more/)
  const row = await fixOf(ctx, 'not_in_index:knowledge/notes/2026-01-03-c.md')
  const r = await ctx.run('fix', { id: 'twin', key: row.key, choice: row.choice, base: row.base, sha: '0'.repeat(64) })
  assert.deepEqual([r.written, r.changed_since], [[], ['knowledge/CATALOG.md']])
  assert.ok(!read(t, 'knowledge/CATALOG.md').includes('2026-01-03-c'))
  void tmp
})
