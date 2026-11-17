// The vault engine's pure parts, ported from onetest-ai/echo#677 (crates/echoctl/src/knowledge/): each Rust #[test] of
// fm, evidence, diff, catalog, links, checks and scan's `page`, with the Rust assertion values kept. The checks tests
// that ran on a vault on disk (`fixture::twin`) run here on the same vault held in memory.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  fmSplit, fmParse, fmGet, propText, propItems, norm, quoteFound, quoteLines, isTextSource,
  diffLines, diffHunks, diffCounts, DIFF_MAX_LINES, catalogRow, catalogCell, catalogLink, catalogInsert, catalogInsertRow,
  tableOfRow, tableRowCount, percentDecode, normalizePath, withMd, pageStem, linkBare, makeResolver, linkEdges,
  linkBacklinks, linkGraph, tagLike, tagsInOrder, allowedTags, tagTaxonomy, meetingTag, runChecks, scanPage, textLines,
  cmpStr, INDEX_MAX_BYTES, INDEX_MAX_ROWS,
} from '../../plugins/obsidian/main.js'

const text = (v) => ({ t: 'text', v })
const list = (v) => ({ t: 'list', v })
const raw = (v) => ({ t: 'raw', v })

// ── helpers that stand in for Rust's ──

test('engine: lines split as Rust str::lines', () => {
  assert.deepEqual(textLines(''), [])
  assert.deepEqual(textLines('\n'), [''])
  assert.deepEqual(textLines('a\nb\n'), ['a', 'b'])
  assert.deepEqual(textLines('a\r\nb\r\n\r\nc'), ['a', 'b', '', 'c'])
  assert.deepEqual(textLines('foo\r\nbar\n\nbaz\r'), ['foo', 'bar', '', 'baz\r'], 'a last \\r without \\n stays')
})

test('engine: strings sort by code point, as Rust strings', () => {
  assert.ok(cmpStr('\u{1F600}', '�') > 0, 'above U+FFFF sorts after the BMP')
  assert.ok(cmpStr('a', 'b') < 0 && cmpStr('ab', 'a') > 0 && cmpStr('x', 'x') === 0)
})

// ── fm.rs ──

test('fm: frontmatter is split from the body', () => {
  assert.deepEqual(fmSplit('---\ntitle: A\n---\n# A\n'), ['title: A', '# A\n'])
  assert.deepEqual(fmSplit('---\r\ntitle: A\r\n---\r\nbody'), ['title: A', 'body'])
  assert.deepEqual(fmSplit('# No frontmatter\n---\n'), [null, '# No frontmatter\n---\n'])
  assert.deepEqual(fmSplit('---\nnever closed\n'), [null, '---\nnever closed\n'], 'an unclosed block is body')
  assert.deepEqual(fmSplit('---\n---\nbody'), ['', 'body'])
})

test('fm: the frontmatter subset parses', () => {
  const p = fmParse("title: Northwind Retail\ndate: 2026-06-12\ntags: [client, \"a, b\", 'c']\nsummary: \"Has: a colon # and hash\"\nparticipants:\n  - Dana Reyes\n  - \"Sam Hale\"\nempty:\nquote: 'it''s'")
  assert.deepEqual(p, [
    ['title', text('Northwind Retail')],
    ['date', text('2026-06-12')],
    ['tags', list(['client', 'a, b', 'c'])],
    ['summary', text('Has: a colon # and hash')],
    ['participants', list(['Dana Reyes', 'Sam Hale'])],
    ['empty', text('')],
    ['quote', text("it's")],
  ])
  assert.deepEqual(fmGet(p, 'TITLE'), text('Northwind Retail'), 'keys case-insensitive')
  assert.equal(fmGet(p, 'missing'), null)
  assert.equal(propText(fmGet(p, 'tags')), 'client, a, b, c')
  assert.deepEqual(propItems(fmGet(p, 'title')), ['Northwind Retail'])
  assert.deepEqual(propItems(fmGet(p, 'empty')), [])
  assert.deepEqual(propItems(raw('x')), [])
})

test('fm: values Echo does not read stay raw', () => {
  const p = fmParse('title: A\nmeta:\n  owner: x\n  team: y\nnotes: |\n  line one\n  line two')
  assert.deepEqual(p[0], ['title', text('A')])
  assert.deepEqual(p[1], ['meta', raw('owner: x\nteam: y')])
  assert.deepEqual(p[2], ['notes', text('line one\nline two')], 'a literal block is text, its lines kept')
})

test('fm: block and multi-line scalars are text', () => {
  const p = fmParse('a: >\n  Folded into\n  one line.\nb: >-\n  Also\n  folded.\nc: Plain words\n  that go on.\nd: |-\n  kept\n  lines')
  assert.deepEqual(p[0], ['a', text('Folded into one line.')])
  assert.deepEqual(p[1], ['b', text('Also folded.')])
  assert.deepEqual(p[2], ['c', text('Plain words that go on.')])
  assert.deepEqual(p[3], ['d', text('kept\nlines')])
})

test('fm: a broken block is kept whole', () => {
  let r = 'title: A\nthis line has no key\n'
  assert.deepEqual(fmParse(r), [['', raw(r)]])
  r = 'title: "never closed'
  assert.deepEqual(fmParse(r), [['', raw(r)]])
})

test('fm: inline comments and Cyrillic', () => {
  const p = fmParse('title: Клиент «Север» # a comment\ntags: [встреча]')
  assert.deepEqual(p[0], ['title', text('Клиент «Север»')])
  assert.deepEqual(p[1], ['tags', list(['встреча'])])
})

// ── evidence.rs (with ledger::norm) ──

test('evidence: quotes must be one span of three words', () => {
  const t = 'The team agreed: "move the pilot to 18 November", and keep the pricing page.'
  assert.ok(quoteFound(t, 'Move the pilot to 18 november'))
  assert.ok(quoteFound(t, '  the pricing   PAGE '), "case and spacing don't matter")
  assert.ok(quoteFound(t, 'keep the pricing'))
  assert.ok(!quoteFound(t, 'pilot to'), 'two words are not enough')
  assert.ok(!quoteFound(t, 'move the 18 November'), 'words skipped over: not one span')
  assert.ok(!quoteFound(t, 'the pilot to 18 Nov'), 'a part of a word is not a word')
  assert.ok(!quoteFound(t, ''))
  assert.ok(!quoteFound('', 'move the pilot'))
})

test('evidence: quotes in other scripts, punctuation and lines', () => {
  const t = 'Рішення: ПЕРЕНЕСТИ\n  Пілот   на 18 Листопада, далі — без змін.'
  assert.ok(quoteFound(t, 'перенести пілот на 18 листопада'), 'Cyrillic, mixed case, other spacing, across a line')
  assert.ok(!quoteFound(t, 'перенести пілот на 19 листопада'))
  assert.ok(!quoteFound(t, 'пілот на'), 'fewer than three words')
  const t2 = 'He said, "we\'ll ship it -- on Friday!" (probably).'
  assert.ok(quoteFound(t2, '"We\'ll ship it, on Friday"'), 'punctuation around and inside the quote')
  assert.ok(quoteFound(t2, 'ship it on friday'))
  assert.ok(quoteFound('first line ends here\nsecond line starts', 'ends here second line'), 'a quote may cross a newline')
  assert.ok(!quoteFound(t2, 'ship, it'), 'two words after punctuation is still two words')
  assert.equal(norm('‘Smart’ “quotes” `tick` ΣΑΣ'), "'smart' 'quotes' 'tick' σασ", 'curly quotes are one quote; lowercased a char at a time')
})

test('evidence: a quote is on the lines it spans', () => {
  const t = '---\ntitle: Northwind Retail\n---\n\n## Roadmap\n- Phase 2 go-live: **12 December**,\n  before the holiday freeze.\n\nThe go-live moves later.\n\nThe go-live moves later.\n'
  assert.deepEqual(quoteLines(t, 'Phase 2 go-live: 12 December, before the holiday freeze', null), [6, 7], 'across a line break and Markdown')
  assert.deepEqual(quoteLines(t, 'Phase 2 go-live: 12 December', null), [6, 6])
  assert.deepEqual(quoteLines(t, 'the go-live moves later', null), [9, 9], 'of several: the first')
  assert.deepEqual(quoteLines(t, 'the go-live moves later', 12), [11, 11], 'of several: the one nearest the line given')
  assert.deepEqual(quoteLines(t, 'title Northwind Retail', null), [2, 2], "properties' lines count")
  assert.equal(quoteLines(t, 'Phase 3 go-live', null), null)
  assert.equal(quoteLines(t, 'Roadmap', null), null, 'fewer than three words, as `found`')
  assert.deepEqual(quoteLines("Ціна зросла на п'ять відсотків.\nДалі без змін.", 'відсотків далі без', null), [1, 2], 'a last word of wide characters')
  for (const [tx, q] of [[t, 'before the holiday freeze'], [t, 'go live moves'], ['first line ends here\nsecond line starts', 'ends here second line']]) {
    assert.equal(quoteLines(tx, q, null) !== null, quoteFound(tx, q), `${q}: as \`found\``)
  }
})

test('evidence: a PDF is not a text source', () => {
  for (const ok of ['a.md', 'b.TXT', 'c/d.csv', 'e.json']) assert.ok(isTextSource(ok), ok)
  for (const no of ['deck.pdf', 'slides.pptx', 'notes', 'x.md.bak', 'img.png', '.md']) assert.ok(!isTextSource(no), no)
})

// ── diff.rs ──

test('diff: marks removed and added lines', () => {
  const d = diffLines('a\nb\nc\n', 'a\nB\nc\nd\n')
  assert.deepEqual(d.map(([k, l]) => k + l), ['=a', '-b', '+B', '=c', '+d'])
  assert.deepEqual(diffCounts(d), [2, 1])
  const h = diffHunks(diffLines('1\n2\n3\n4\n5\n6\n7\n8\n9\n', '1\nX\n3\n4\n5\n6\n7\n8\nY\n'), 1)
  assert.equal(h.length, 2, 'far apart: two hunks')
  assert.equal(h[0].map(([k]) => k).join(''), '=-+=')
  assert.equal(diffHunks(diffLines('1\n2\n3\n4\n', '1\nX\n3\nY\n'), 1).length, 1, 'touching contexts share a hunk')
  // Edges: empty sides, no final line break, CRLF.
  assert.deepEqual(diffLines('', 'x\n'), [['+', 'x']])
  assert.deepEqual(diffLines('x', ''), [['-', 'x']])
  assert.deepEqual(diffCounts(diffLines('a\r\nb\r\n', 'a\r\nc\r\n')), [1, 1])
  assert.ok(diffLines('a\r\nb\r\n', 'a\r\nb\r\n').every(([k]) => k === '='), 'CRLF against itself')
  assert.deepEqual(diffCounts(diffLines('a\r\n', 'a\n')), [1, 1], 'a changed line ending is a change')
})

test('diff: of equal texts is all context', () => {
  const t = 'one\ntwo\n\nthree\n'
  const d = diffLines(t, t)
  assert.ok(d.every(([k]) => k === '='))
  assert.equal(d.length, 4)
  assert.deepEqual(diffHunks(d, 3), [])
  assert.deepEqual(diffCounts(d), [0, 0])
  assert.deepEqual(diffLines('', ''), [])
})

test('diff: a huge side falls back to all removed, all added', () => {
  const big = 'x\n'.repeat(DIFF_MAX_LINES + 1)
  assert.deepEqual(diffCounts(diffLines(big, 'x\ny\n')), [2, DIFF_MAX_LINES + 1])
})

let git = null
try { execFileSync('git', ['--version'], { stdio: 'ignore' }); git = 'git' } catch { /* no git: the comparison is skipped */ }

test('diff: counts match git --numstat', { skip: git ? false : 'git is not available' }, () => {
  const old = '# Title\n\nalpha\nbeta\ngamma\ndelta\n\n- one\n- two\n- three\n\nend\n'
  const nu = '# Title\n\nalpha\nBETA\ngamma\n\n- one\n- two\n- two and a half\n- three\n- four\n\nend\n'
  const [plus, minus] = diffCounts(diffLines(old, nu))
  const dir = mkdtempSync(join(tmpdir(), 'echo-diff-'))
  try {
    writeFileSync(join(dir, 'a.md'), old)
    writeFileSync(join(dir, 'b.md'), nu)
    let out
    // git diff --no-index exits 1 when the files differ.
    try { out = execFileSync(git, ['diff', '--no-index', '--numstat', 'a.md', 'b.md'], { cwd: dir, encoding: 'utf8' }) } catch (e) { out = e.stdout }
    const [gp, gm] = out.trim().split(/\s+/).map(Number)
    assert.deepEqual([plus, minus], [gp, gm], out)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ── catalog.rs ──

const CAT = '# Catalog\n\n> Last update: 2026-01-01\n\n## Clients\n\n| File | Description | Date Added |\n|---|---|---|\n| [acme.md](clients/acme.md) | Acme | 2026-01-02 |\n\n## Notes\n\n| File | Description | Date Added |\n|------|-------------|------------|\n| [2026-10-01-a.md](notes/2026-10-01-a.md) | a | 2026-10-01 |\n| [2026-11-01-b.md](notes/2026-11-01-b.md) | b | 2026-11-01 |\n| [2026-12-01-c.md](notes/2026-12-01-c.md) | c | 2026-12-01 |\n\n## Media\n\n| File | Description |\n|---|---|\n'

const ins = (index, date) => {
  const r = catalogInsert(index, 'notes', `notes/${date}-x.md`, '46m Weekly sync — moved | the pilot', date, '2026-11-05')
  assert.ok(r.text, JSON.stringify(r))
  return r.text
}

test('catalog: rows go in date order', () => {
  const out = ins(CAT, '2026-11-05')
  const lines = textLines(out)
  const at = lines.findIndex((l) => l.includes('2026-11-05-x.md'))
  assert.ok(lines[at - 1].includes('2026-11-01-b.md') && lines[at + 1].includes('2026-12-01-c.md'), out)
  assert.equal(lines[at], '| [2026-11-05-x.md](notes/2026-11-05-x.md) | 46m Weekly sync — moved / the pilot | 2026-11-05 |')
  assert.ok(out.includes('> Last update: 2026-11-05\n'), 'the Last update line is today')
  // Before every dated row; after every one.
  const early = ins(CAT, '2026-09-01')
  assert.ok(early.indexOf('2026-09-01-x') < early.indexOf('2026-10-01-a'))
  const late = ins(CAT, '2027-01-01')
  assert.ok(late.indexOf('2027-01-01-x') > late.indexOf('2026-12-01-c') && late.indexOf('2027-01-01-x') < late.indexOf('## Media'))
})

test('catalog: an empty notes table takes the first row', () => {
  const index = '# Catalog\n\n## Notes\n\n| File | Description | Date Added |\n|------|-------------|------------|\n\n## Media\n'
  const out = ins(index, '2026-11-05')
  assert.ok(out.includes('|------|-------------|------------|\n| [2026-11-05-x.md](notes/2026-11-05-x.md) | 46m Weekly sync — moved / the pilot | 2026-11-05 |\n\n## Media'), out)
})

test('catalog: rows fit the table shape', () => {
  const two = '## Meetings\n\n| Note | What |\n|---|---|\n| [old.md](notes/old.md) | old |\n'
  assert.ok(ins(two, '2026-11-05').endsWith('| [old.md](notes/old.md) | old |\n| [2026-11-05-x.md](notes/2026-11-05-x.md) | 46m Weekly sync — moved / the pilot |\n'))
  const four = '## Notes\n\n| File | Description | Date | Owner |\n|---|---|---|---|\n'
  assert.ok(ins(four, '2026-11-05').includes('| [2026-11-05-x.md](notes/2026-11-05-x.md) | 46m Weekly sync — moved / the pilot | 2026-11-05 |  |'))
  // No heading named for the notes: the table that links into notes/.
  const byLinks = '## Recent\n\n| File | Description |\n|---|---|\n| [a.md](notes/a.md) | a |\n\n## Other\n\n| File | Description |\n|---|---|\n| [x.md](clients/x.md) | x |\n'
  const out = ins(byLinks, '2026-11-05')
  assert.ok(out.indexOf('2026-11-05-x') < out.indexOf('## Other'))
})

test('catalog: no notes table is a reason, not a guess', () => {
  const e = catalogInsert('# Catalog\n\nJust text.\n', 'notes', 'notes/a.md', 'd', '2026-11-05', '2026-11-05')
  assert.ok(e.error && e.error.includes('no Notes table'), JSON.stringify(e))
  const onlyClients = '## Clients\n\n| File | Description |\n|---|---|\n| [x.md](clients/x.md) | x |\n'
  assert.ok(catalogInsert(onlyClients, 'notes', 'notes/a.md', 'd', '2026-11-05', '2026-11-05').error)
})

test('catalog: a listed note is not added twice', () => {
  const once = ins(CAT, '2026-11-05')
  assert.deepEqual(catalogInsert(once, 'notes', 'notes/2026-11-05-x.md', 'again', '2026-11-05', '2026-11-05'), { already: true })
})

test('catalog: a run row goes into its table as it is now', () => {
  const row = '| [2026-11-15-x.md](notes/2026-11-15-x.md) | Weekly sync | 2026-11-15 |'
  const out = catalogInsertRow(CAT, 'Notes', row, '2026-11-20').text
  const lines = textLines(out)
  const at = lines.indexOf(row)
  assert.ok(lines[at - 1].includes('2026-11-01-b.md') && lines[at + 1].includes('2026-12-01-c.md'), `date order: ${out}`)
  assert.ok(out.includes('> Last update: 2026-11-20\n'))
  assert.deepEqual(catalogInsertRow(out, 'Notes', row, '2026-11-20'), { already: true }, 'the same row')
  assert.deepEqual(catalogInsertRow(out, 'notes', '| [x](notes/2026-11-15-x.md) | other words | 2026-11-15 |', '2026-11-20'), { already: true }, 'a row with its link')
  assert.ok(catalogInsertRow(CAT, 'Projects', row, '2026-11-20').error.includes('Projects'))
  assert.equal(tableOfRow(CAT, textLines(CAT).findIndex((l) => l.includes('acme.md'))), 'Clients')
  assert.equal(tableOfRow(CAT, textLines(CAT).findIndex((l) => l.startsWith('|---'))), null, "a separator isn't a row")
})

test('catalog: links and cells are safe', () => {
  assert.equal(catalogLink('notes/2026-03-01 Weekly.md'), '[2026-03-01 Weekly.md](notes/2026-03-01%20Weekly.md)')
  assert.equal(catalogCell('a | b\nc'), 'a / b c')
  assert.equal(catalogRow(3, '[x](y)', 'd', '2026-01-01'), '| [x](y) | d | 2026-01-01 |')
  assert.equal(catalogRow(1, '[x](y)', 'd', '2026-01-01'), '| [x](y) |')
})

// ── links.rs ──

const pagesOf = (files) => files.map(([p, t]) => scanPage(p, t, t.length, 1))
const link = (target, wiki) => ({ target, line: 1, wiki, embed: false })

test('links: resolve like Obsidian', () => {
  const r = makeResolver(['clients/acme.md', 'clients/b c.md', 'notes/2026-01-01-a.md', 'Клиент.md', 'topics/same.md', 'topics/deep/same.md', 'archive/old/same.md'])
  const from = 'notes/2026-01-01-a.md'
  assert.equal(r.resolve(from, link('../clients/acme.md', false)), 'clients/acme.md')
  assert.equal(r.resolve(from, link('../clients/acme.md#people', false)), 'clients/acme.md')
  assert.equal(r.resolve(from, link('../clients/b%20c.md', false)), 'clients/b c.md')
  assert.equal(r.resolve(from, link('<../clients/b c.md>', false)), 'clients/b c.md')
  assert.equal(r.resolve(from, link('clients/acme.md', false)), 'clients/acme.md', 'vault-relative')
  assert.equal(r.resolve(from, link('../clients/ACME.md', false)), 'clients/acme.md', 'case-insensitive')
  assert.equal(r.resolve(from, link('acme', true)), 'clients/acme.md')
  assert.equal(r.resolve(from, link('acme|Acme Corp', true)), 'clients/acme.md')
  assert.equal(r.resolve(from, link('acme#People', true)), 'clients/acme.md')
  assert.equal(r.resolve(from, link('clients/acme', true)), 'clients/acme.md')
  assert.equal(r.resolve(from, link('Клиент', true)), 'Клиент.md')
  assert.equal(r.resolve(from, link('same', true)), 'topics/same.md', 'the shortest path wins')
  assert.equal(r.resolve('topics/deep/x.md', link('same', true)), 'topics/deep/same.md', 'the same folder first')
  assert.equal(r.resolve(from, link('acme.md', false)), 'clients/acme.md', 'a Markdown link falls back to the name, as Obsidian does')
  assert.equal(r.resolve(from, link('b%20c.md', false)), 'clients/b c.md')
  assert.equal(r.resolve(from, link('missing', true)), null)
  assert.equal(r.resolve(from, link('../../../etc/passwd', false)), null, 'never out of the vault')
  assert.equal(r.resolve(from, link('#heading-only', false)), null)
  assert.equal(linkBare(link('acme|Acme Corp', true)), 'acme')
  assert.equal(linkBare(link('../b%20c.md#x', false)), '../b c.md')
  // The helpers on their own.
  assert.equal(percentDecode('a%20b%zz%2'), 'a b%zz%2', 'a broken escape is kept')
  assert.equal(percentDecode('%D0%9A'), 'К')
  assert.equal(percentDecode('%FF%20'), '%FF%20', 'not UTF-8 after decoding: as written')
  assert.equal(normalizePath('a/./b/../c'), 'a/c')
  assert.equal(normalizePath('../a'), null)
  assert.equal(withMd('a/b'), 'a/b.md')
  assert.equal(withMd('a/img.png'), 'a/img.png')
  assert.equal(withMd('a/B.MD'), 'a/B.MD')
  assert.equal(pageStem('x/Acme.MD'), 'acme')
  assert.equal(r.page('CLIENTS/ACME.MD'), 'clients/acme.md')
})

test('links: backlinks skip code blocks', () => {
  const pages = pagesOf([['a.md', '# A'], ['b.md', 'line\nsee [[a]]\nagain [[a]]'], ['c.md', '[A](a.md)'], ['d.md', '```\n[[a]]\n```\n`[[a]]`']])
  assert.deepEqual(linkBacklinks(pages, 'a.md'), [['b.md', 2], ['c.md', 1]])
  assert.deepEqual(linkEdges(pages), [['b.md', 'a.md', 2], ['b.md', 'a.md', 3], ['c.md', 'a.md', 1]])
})

test('links: the graph marks the index as a hub', () => {
  const files = [['CATALOG.md', '']]
  for (let i = 0; i < 12; i++) {
    files[0][1] += `[[p${i}]]\n`
    files.push([`p${i}.md`, i === 0 ? '[[p1]]' : ''])
  }
  const g = linkGraph(pagesOf(files), 'CATALOG.md', 'links')
  assert.deepEqual(g.hubs, ['CATALOG.md'])
  assert.equal(g.nodes.length, 13)
  assert.equal(g.edges.length, 13)
  const both = linkGraph(pagesOf([['a.md', '---\ntags: [x, y]\n---\n[[b]]'], ['b.md', '#x']]), null, 'both')
  assert.deepEqual(both.nodes.filter((n) => n.tag).map((n) => n.id), ['#x', '#y'])
  assert.deepEqual(both.edges, [['a.md', 'b.md'], ['a.md', '#x'], ['a.md', '#y'], ['b.md', '#x']])
  assert.deepEqual(linkGraph(pagesOf([['a.md', '[[b]]'], ['b.md', '']]), null, 'tags').edges, [])
})

// ── scan.rs `page` ──

test('scan: a page is read like Obsidian', () => {
  const t = "---\ntitle: Pricing model\ntags: [concept, '#pricing']\nclient: \"[[Acme Corp]]\"\n---\n# Heading one\n\nSee [[2026-01-01-a|the first sync]] and [Acme](../clients/acme.md#people).\n![[diagram.png]] ![x](img/a.png) [web](https://example.com) [mail](mailto:a@b.c)\n\n```\n[[not-a-link]] #notatag\n```\nInline `[[code]]` #real-tag and #2026 but not a#b.\n## Two ##\n"
  const p = scanPage('topics/pricing.md', t, t.length, 1)
  assert.equal(p.title, 'Pricing model')
  assert.ok(p.has_props)
  assert.deepEqual(p.tags, ['concept', 'pricing', 'real-tag'])
  assert.deepEqual(p.headings, [[1, 'Heading one'], [2, 'Two']])
  assert.deepEqual(p.links.map((l) => [l.target, l.line, l.wiki, l.embed]), [
    ['Acme Corp', 4, true, false],
    ['2026-01-01-a|the first sync', 8, true, false],
    ['../clients/acme.md#people', 8, false, false],
    ['diagram.png', 9, true, true],
    ['img/a.png', 9, false, true],
  ])
})

test('scan: a title comes from the first heading or the name', () => {
  assert.equal(scanPage('a/b.md', 'intro\n# The real title\n# Second\n', 1, 1).title, 'The real title')
  assert.equal(scanPage('a/plain-name.md', 'no heading', 1, 1).title, 'plain-name')
})

// ── checks.rs ──

test('checks: allowed tags are the backticked words', () => {
  const t = '| `meeting` | x |\n| `ai-strategy` | y |\n```\nmeeting, concept\n```\nNot `Two Words` nor `#x`.\n'
  assert.deepEqual(allowedTags(t), ['ai-strategy', 'concept', 'meeting'], 'backticked words and the words of a fenced list')
  assert.deepEqual(tagsInOrder(t), ['meeting', 'ai-strategy', 'concept'])
  assert.ok(tagLike('a/b-c_d') && !tagLike('-a') && !tagLike('') && !tagLike('#x'))
  assert.equal(tagTaxonomy(['knowledge/GLOSSARY.md', 'knowledge/TAG_TAXONOMY.md']), 'knowledge/TAG_TAXONOMY.md')
  assert.equal(tagTaxonomy(['x/my-tags.md']), 'x/my-tags.md')
  assert.equal(tagTaxonomy(['x/GLOSSARY.md']), null)
})

// `fixture::twin` (onetest-ai/echo#677 crates/echoctl/src/knowledge/fixture.rs), held in memory: the vault's files by
// their vault-relative paths; its pages root is `knowledge/`, its index `knowledge/CATALOG.md`, its taxonomy
// `knowledge/TAG_TAXONOMY.md`.
function twin() {
  return new Map([
    ['knowledge/.obsidian/app.json', '{"useMarkdownLinks": true, "newLinkFormat": "relative"}'],
    ['knowledge/CATALOG.md', '# Knowledge Catalog\n\n> Last update: 2026-01-01\n\n## Clients\n\n| File | Description | Date Added |\n|------|-------------|------------|\n| [acme.md](clients/acme.md) | Acme Corp | 2026-01-02 |\n\n## Notes\n\n| File | Description | Date Added |\n|------|-------------|------------|\n| [2026-01-01-a.md](notes/2026-01-01-a.md) | first | 2026-01-01 |\n| [2026-01-02-b.md](notes/2026-01-02-b.md) | second | 2026-01-02 |\n'],
    ['knowledge/TAG_TAXONOMY.md', '# Tags\n\n```\nmeeting, client, concept\n```\n'],
    ['knowledge/clients/acme.md', '---\ntitle: Acme Corp\ntags: [client]\n---\n# Acme Corp\n\nSee [[2026-01-01-a]].\n'],
    ['knowledge/notes/2026-01-01-a.md', '---\ntitle: First sync\ndate: 2026-01-01\ntags: [meeting]\n---\n# First sync\n\nWith [Acme](../clients/acme.md).\n'],
    ['knowledge/notes/2026-01-02-b.md', '---\ntitle: Second sync\ntags: [meeting]\n---\n# Second sync\n'],
    ['knowledge/notes/2026-01-03-c.md', '---\ntitle: Third sync\ntags: [meeting]\n---\n# Third\n'],
    ['knowledge/notes/README.md', '# Notes\n'],
    ['raw_inbox/deck.pdf', '%PDF-1.4 made up'],
    ['.claude/skills/s/SKILL.md', '---\nname: s\ndescription: Does s\n---\n# S\n'],
    ['.claude/commands/c.md', '---\ndescription: Does c\n---\nRun c.\n'],
    ['AGENTS.md', '# Rules\n'],
    ['processing_log.json', '{}'],
  ])
}

const PAGES = 'knowledge'
const INDEX = 'knowledge/CATALOG.md'

/** What `scan::index` and `checks::run` read of a vault in memory, as `runChecks` takes it. */
function checksOf(files, minutesTag = null) {
  const toPagePath = (vr) => (vr.startsWith(`${PAGES}/`) ? vr.slice(PAGES.length + 1) : null)
  const pages = [...files].filter(([p]) => toPagePath(p) !== null && p.endsWith('.md') && !p.split('/').some((c) => c.startsWith('.')))
    .map(([p, t]) => scanPage(toPagePath(p), t, t.length, 1))
  const indexText = files.get(INDEX) ?? null
  const taxonomy = 'knowledge/TAG_TAXONOMY.md'
  const taxonomyText = files.get(taxonomy) ?? null
  return runChecks({
    pages,
    indexPage: toPagePath(INDEX),
    indexLinks: indexText === null ? null : scanPage(INDEX, indexText, 0, 0).links,
    indexDir: 'knowledge',
    indexBytes: indexText === null ? 0 : Buffer.byteLength(indexText),
    indexText,
    pageDirInVault: (p) => { const v = `${PAGES}/${p}`; return v.slice(0, v.lastIndexOf('/')) },
    toPagePath,
    fileExists: (vr) => vr === '' || files.has(vr) || [...files.keys()].some((f) => f.startsWith(`${vr}/`)),
    taxonomies: [toPagePath(taxonomy)],
    taxonomyText,
    meetingTag: meetingTag(minutesTag, taxonomyText),
  })
}

test('checks: count only pages', () => {
  const f = twin()
  // Two pages the index doesn't list (one isolated, one without properties), a broken link, an unknown tag.
  f.set('knowledge/topics/lonely.md', '---\ntitle: Lonely\ntags: [concept]\n---\n# Lonely\n')
  f.set('knowledge/topics/bare.md', '# Bare\nLinks to [[missing-page]] and [Acme](../clients/acme.md).\n')
  f.set('knowledge/clients/acme.md', '---\ntitle: Acme Corp\ntags: [client, invented]\n---\n# Acme Corp\n\nSee [[2026-01-01-a]].\n')
  f.set('knowledge/topics/README.md', '# Topics\n')
  const c = checksOf(f)
  assert.deepEqual(c.not_in_index, ['notes/2026-01-03-c.md', 'topics/bare.md', 'topics/lonely.md'])
  assert.deepEqual(c.broken, [['topics/bare.md', 'missing-page']])
  assert.deepEqual(c.isolated, ['notes/2026-01-03-c.md', 'topics/lonely.md'])
  assert.deepEqual(c.no_props, ['topics/bare.md'])
  assert.deepEqual(c.unknown_tags, [['clients/acme.md', 'invented']])
  assert.equal(c.meeting_tag_missing, null)
  assert.ok(!c.no_index)
  // And the rest of the answer, for this vault.
  assert.deepEqual(c.dead_rows, [])
  assert.deepEqual(c.usual_props, [])
  assert.deepEqual(c.duplicate_titles, [])
  assert.equal(c.oversized_index, null)
  assert.deepEqual(c.broken_links, [['topics/bare.md', { target: 'missing-page', line: 2, wiki: true, embed: false }]])
})

test("checks: links to the vault's other files or outside it are not broken", () => {
  const f = twin()
  f.set('teams/CATALOG.md', '# Teams\n')
  f.set('knowledge/topics/links.md', '---\ntitle: L\n---\n[teams](../../teams/CATALOG.md) [folder](../../teams/) [elsewhere](../../../other-repo/spec.md) [gone](../../teams/missing.md)\n')
  const c = checksOf(f)
  const broken = c.broken.filter(([p]) => p === 'topics/links.md').map(([, l]) => l)
  assert.deepEqual(broken, ['../../teams/missing.md'], 'only the missing file in the vault')
})

test('checks: a missing meeting tag is named', () => {
  const f = twin()
  f.set('knowledge/TAG_TAXONOMY.md', '`call`, `concept`\n')
  assert.equal(meetingTag(null, f.get('knowledge/TAG_TAXONOMY.md')), 'meeting')
  assert.equal(checksOf(f).meeting_tag_missing, 'meeting')
  f.set('knowledge/TAG_TAXONOMY.md', '`meetings`, `concept`\n')
  assert.equal(meetingTag(null, f.get('knowledge/TAG_TAXONOMY.md')), 'meetings', "the taxonomy's own meeting tag")
  assert.equal(meetingTag('standup', f.get('knowledge/TAG_TAXONOMY.md')), 'standup', "the user's choice first")
  assert.equal(meetingTag(null, null), 'meeting')
})

// Beyond the Rust tests: the checks no Rust test reached (dead rows, usual properties, duplicate titles, an oversized
// index, no index), on the same vault.
test('checks: dead rows, usual properties, duplicate titles, an oversized index, no index', () => {
  const f = twin()
  f.set(INDEX, `${f.get(INDEX)}| [gone.md](notes/gone.md) | gone | 2026-01-04 |\n| [deck](../raw_inbox/deck.pdf) | a source | 2026-01-05 |\n`)
  f.set('knowledge/notes/2026-01-04-d.md', '---\ntitle: d\ntags: [meeting]\n---\n')
  f.set('knowledge/notes/2026-01-05-e.md', '---\ntitle: e\ntags: [meeting]\n---\n')
  f.set('knowledge/notes/2026-01-06-f.md', '---\ntitle: first   SYNC\ntags: [meeting]\n---\n')
  let c = checksOf(f)
  assert.deepEqual(c.dead_rows, [{ target: 'notes/gone.md', line: 17, wiki: false, embed: false }], 'a row to a missing page; a source that is there is not dead')
  assert.ok(c.not_in_index.includes('notes/2026-01-04-d.md'))
  assert.deepEqual(c.duplicate_titles, [['notes/2026-01-01-a.md', 'notes/2026-01-06-f.md']], 'case and spacing ignored')
  assert.deepEqual(c.usual_props, [], 'six notes: title and tags on all, date on one')
  // Nine notes, eight with a date (80 %): the one without it lacks a usual property; tags on five (under 80 %).
  for (const n of ['b', 'c']) f.set(`knowledge/notes/2026-01-0${n === 'b' ? 2 : 3}-${n}.md`, `---\ntitle: ${n}\ndate: 2026-01-01\ntags: [meeting]\n---\n`)
  f.set('knowledge/notes/2026-01-04-d.md', '---\ntitle: d\ndate: 2026-01-04\n---\n')
  f.set('knowledge/notes/2026-01-05-e.md', '---\ntitle: e\ndate: 2026-01-05\ntags: [meeting]\n---\n')
  for (const n of ['g', 'h', 'i']) f.set(`knowledge/notes/2026-01-1${n}.md`, `---\ntitle: ${n}\ndate: 2026-01-10\n---\n`)
  f.set('knowledge/notes/2026-01-1j.md', '# No properties, so nothing usual is missing\n')
  c = checksOf(f)
  assert.deepEqual(c.usual_props, [['notes/2026-01-06-f.md', 'date']])
  // An index over INDEX_MAX_ROWS rows.
  f.set(INDEX, `| File |\n|---|\n${'| x |\n'.repeat(INDEX_MAX_ROWS + 2)}`)
  assert.deepEqual(checksOf(f).oversized_index, { bytes: Buffer.byteLength(f.get(INDEX)), rows: INDEX_MAX_ROWS + 2 })
  assert.equal(INDEX_MAX_BYTES, 150 * 1024)
  assert.equal(tableRowCount('| a | b |\n|---|---|\n| 1 | 2 |\n\n| c |\n| :-: |\n| 3 |\n| 4 |\n'), 3)
  f.delete(INDEX)
  const none = checksOf(f)
  assert.ok(none.no_index)
  assert.deepEqual(none.not_in_index, [])
  assert.equal(none.oversized_index, null)
})
