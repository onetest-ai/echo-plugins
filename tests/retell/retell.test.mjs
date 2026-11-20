// Retell's pure logic (plugins/retell/main.js exports): a page's Markdown → the article's elements, a long article cut
// into parts that fit one Claude run, Claude's answer read as JSON, an article fitted into a prompt, the speech metrics
// of a spoken answer. Importing the plugin runs nothing (its effects are inside apply).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { asJson, unmd, mdElements, textLen, isPdfUrl, pdfAddress, pageRange, fromText, cutParts, PART_CHARS, MAX_PARTS, fitSource, analyseSpeech } from '../../plugins/retell/main.js'

test('Claude\'s answer as JSON: the whole text, a fenced block, or the largest {…} that parses — never prose around it', () => {
  assert.equal(asJson('{"a":1}').a, 1)
  assert.equal(asJson('```json\n{"a":2}\n```').a, 2)
  assert.equal(asJson('Here it is: {"a":3} — done.').a, 3)
  assert.equal(asJson('x {"a":4,"t":"a } b { c"} y').a, 4, 'braces inside a string are text')
  assert.equal(asJson('{"x":1} and then {"a":5,"items":[1,2,3]}').a, 5, 'the largest object wins')
  assert.equal(asJson('Note {this} is not JSON. {"a":6}').a, 6)
  assert.equal(asJson('{"a":7,"t":"say \\"hi\\" }"}').a, 7, 'an escaped quote stays inside the string')
  assert.throws(() => asJson('no json here'), /did not answer with JSON/)
})

test('a page\'s Markdown (Echo\'s web.read: its own words escaped) becomes elements: headings, paragraphs, list items, quotes, code, tables, pictures', () => {
  const md = [
    '# The title', '', 'A paragraph with a [link](https://acme-test.example/x) and *emphasis* and `code`.', 'Its second line.', '',
    '## A section', '', '- one item', '- two\\_items with an escaped underscore', '', '> a quote', '',
    '```', 'const x = 1 * 2', '```', '', '| a | b |', '|---|---|', '| 1 | 2 |', '',
    '![A diagram](https://acme-test.example/d.png)', '', 'Price is 5 \\* 3 \\[not a link\\]',
  ].join('\n')
  const els = mdElements(md)
  assert.deepEqual(els.map((e) => e.tag), ['h2', 'p', 'h2', 'li', 'li', 'blockquote', 'pre', 'p', 'p', 'img', 'p'])
  assert.equal(els[1].text, 'A paragraph with a link and emphasis and code. Its second line.')
  assert.equal(els[4].text, 'two_items with an escaped underscore')
  assert.equal(els[6].text, 'const x = 1 * 2', 'code is kept as it is')
  assert.equal(els[7].text, 'a — b', 'a table row: its cells joined')
  assert.equal(els[8].text, '1 — 2')
  assert.deepEqual(els[9], { tag: 'img', src: 'https://acme-test.example/d.png', alt: 'A diagram' })
  assert.equal(els[10].text, 'Price is 5 * 3 [not a link]', 'escaped marks are the page\'s own words')
  assert.equal(textLen(els), els.filter((e) => e.tag !== 'img').reduce((n, e) => n + e.text.length, 0))
  assert.equal(unmd('a \\*b\\* *c*'), 'a *b* c')
})

test('a hostile page\'s text stays text: markup in its words is escaped by Echo and never becomes a link or a tag here', () => {
  const els = mdElements('Click \\[here\\]\\(javascript:alert\\(1\\)\\) or \\<script\\>alert(1)\\</script\\>')
  assert.equal(els.length, 1)
  assert.equal(els[0].text, 'Click [here](javascript:alert(1)) or <script>alert(1)</script>')
})

test('documents: PDF addresses (arxiv abs → pdf), page ranges as Echo\'s file reader takes them, pasted text as paragraphs', () => {
  assert.ok(isPdfUrl('https://acme-test.example/report.pdf?x=1'))
  assert.ok(isPdfUrl('https://arxiv.org/abs/2406.12045'))
  assert.ok(!isPdfUrl('https://acme-test.example/post.html'))
  assert.equal(pdfAddress('https://arxiv.org/abs/2406.12045'), 'https://arxiv.org/pdf/2406.12045')
  assert.equal(pageRange(' 5 - 12 '), '5-12')
  assert.equal(pageRange('7-'), '7-')
  assert.equal(pageRange('3'), '3')
  assert.equal(pageRange('1,3'), '', 'a list of pages is not a range')
  const t = fromText('A short title\n\nFirst paragraph\nwrapped.\n\nSecond one.')
  assert.equal(t.title, 'A short title')
  assert.deepEqual(t.elements.map((e) => e.id), ['p1', 'p2', 'p3'])
  assert.equal(t.elements[1].text, 'First paragraph wrapped.')
})

test('a long article is cut into parts under PART_CHARS: at a heading once half full, else between paragraphs; never mid-paragraph; at most MAX_PARTS', () => {
  const para = (n, len) => ({ id: 'p' + n, tag: 'p', text: 'x'.repeat(len) })
  let n = 0, els = []
  for (let s = 0; s < 4; s++) { els.push({ id: 'p' + (++n), tag: 'h2', text: 'Section ' + s }); for (let k = 0; k < 6; k++) els.push(para(++n, 1500)) }
  els.splice(3, 0, { id: 'img1', tag: 'img', src: 'https://acme-test.example/a.png', alt: '' })
  const parts = cutParts(els)
  assert.ok(parts.length >= 2)
  for (const p of parts) assert.ok(textLen(p) <= PART_CHARS, 'each part fits')
  assert.deepEqual(parts.flat().map((e) => e.id), els.map((e) => e.id), 'nothing lost, nothing reordered')
  assert.ok(parts.slice(1).every((p) => p[0].tag === 'h2'), 'each part after the first starts at a heading')
  const huge = cutParts([{ id: 'p1', tag: 'p', text: 'y'.repeat(PART_CHARS * 2) }])
  assert.equal(huge.length, 1); assert.equal(huge[0][0].text.length, PART_CHARS, 'one paragraph longer than a part is cut to it')
  const many = []; for (let k = 0; k < (MAX_PARTS + 3) * 12; k++) many.push(para(k + 1, 1400))
  assert.ok(cutParts(many).length > MAX_PARTS, 'the cut itself has no cap: the plugin keeps MAX_PARTS and says the rest was left out')
})

test('an article fitted into a prompt: all of it when it fits, else around the block being listened to, gaps marked', () => {
  const els = []; for (let k = 1; k <= 40; k++) els.push({ id: 'p' + k, tag: 'p', text: `Paragraph ${k} ` + 'z'.repeat(200) })
  const script = { blocks: [{ id: 'b1', anchor: 'p20' }] }
  assert.ok(!fitSource(els.slice(0, 3), 'b1', script, 100000).includes('…'))
  const fit = fitSource(els, 'b1', script, 2000)
  assert.ok(fit.length <= 2000 + 10)
  assert.ok(fit.includes('p20: Paragraph 20'), 'the block she was at is in')
  assert.ok(fit.startsWith('…') && fit.endsWith('…'))
})

test('speech metrics of a spoken answer: words over the time spoken, fillers, pauses between stretches, repeats', () => {
  const m = analyseSpeech({ segments: [
    { text: 'Um, I think the the agent', start_ms: 0, end_ms: 2000 },
    { text: 'runs the tests, you know.', start_ms: 3500, end_ms: 5000 },
  ] })
  assert.equal(m.words, 11)
  assert.equal(m.seconds, 3.5)
  assert.equal(m.wpm, Math.round(11 / 3.5 * 60))
  assert.equal(m.fillers.um, 1); assert.equal(m.fillers['you know'], 1); assert.equal(m.fillerTotal, 2)
  assert.equal(m.pauses.count, 1); assert.equal(m.pauses.longest, 1.5)
  assert.deepEqual(m.repeats, ['the'])
  assert.equal(analyseSpeech({ segments: [] }).words, 0)
})
