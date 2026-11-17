// Knowledge's index at scale (tests/obsidian/scale.mjs): 5,000 made-up pages of 1 KB with about 22 links each, indexed
// and asked by tree, search, graph, checks, page, find, backlinks and browse in one process. Node has no 64 MB cap like
// Echo's QuickJS host, so this is a generous bound against a regression (tests/tools/obsidian-scale.mjs under qjs
// --memory-limit 65536 is the real check): the heap stays under 160 MB and no command takes 20 s.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scale } from './scale.mjs'

test('scale: 5,000 pages, every Knowledge command, in a bounded heap and time', async () => {
  const before = process.memoryUsage().heapUsed
  const r = await scale(5000, 1)
  const grown = (process.memoryUsage().heapUsed - before) / 1e6
  for (const [c, x] of Object.entries(r)) if (x && typeof x === 'object') assert.ok(x.ms < 20000, `${c}: ${x.ms} ms`)
  assert.ok(grown < 160, `the heap grew ${grown.toFixed(0)} MB`)
  assert.ok(r.indexBytes < 4e6, `index.json ${r.indexBytes} bytes: one compact record a page`)
  assert.ok(r.graph.bytes > 0 && r.tree.bytes > 0)
})
