// Obsidian's (0.8's) reading of links and tags, kept by Knowledge 1.0's one reader (`scanPage`): the 21 notes of PR
// #24's parity probe give the answers Obsidian vaults 0.8 gave — parity-expected.json, made from 0.8's `parseNote`
// (the step-2 base of knowledge-1.0) with tests/obsidian/parity-notes.mjs — through Claude's `info` and `links`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as plugin from '../../plugins/obsidian/main.js'
import { NOTES, answer } from './parity-notes.mjs'

const expected = JSON.parse(readFileSync(new URL('./parity-expected.json', import.meta.url), 'utf8'))

test('parity with 0.8: all 21 notes read as Obsidian vaults 0.8 read them', async () => {
  assert.equal(Object.keys(NOTES).length, 21)
  for (const [name, text] of Object.entries(NOTES)) assert.deepEqual(await answer(plugin, text), expected[name], name)
})

test('parity with 0.8: the engine sees the same links and tags (checks, graph, backlinks use scanPage)', () => {
  const p = plugin.scanPage('n.md', NOTES.comment)
  assert.deepEqual([p.links.map((l) => l.target), p.tags], [['A'], []])
  assert.deepEqual(plugin.scanPage('n.md', NOTES.headingTag).tags, ['notag'])
  assert.deepEqual(plugin.scanPage('n.md', NOTES.headingTag).links.map((l) => l.target), ['H'])
  assert.deepEqual(plugin.scanPage('n.md', NOTES.tagsKeyStr).tags, ['one', 'two', 'three'])
  assert.deepEqual(plugin.scanPage('n.md', NOTES.mdLinks).links.map((l) => l.target), ['<c d.md>', 'e%20f.md', 'p.png', '[x].md'])
})

test('the reader stays linear on hostile lines (code runs, comment marks, link openers)', () => {
  for (const line of ['`'.repeat(200000) + 'x', '`a'.repeat(100000), '``a`'.repeat(50000), '%%'.repeat(100000) + '%', '<!--'.repeat(50000), '[]('.repeat(100000), '[ [a]'.repeat(40000) + '](', '[x]('.repeat(50000) + 'a b', '# ' + ' #'.repeat(100000) + ' x', '#a'.repeat(100000), '[['.repeat(100000) + ']]']) {
    const t = Date.now()
    plugin.scanPage('a.md', line + '\n', 0, 0, { full: true })
    assert.ok(Date.now() - t < 1500, `${line.slice(0, 6)}…: ${Date.now() - t} ms`)
  }
})
