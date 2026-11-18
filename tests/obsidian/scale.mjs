// Knowledge's index at scale, in Echo's memory: `n` made-up pages of about `kb` KB with about 22 links each, indexed
// and asked by the Knowledge commands in one process (as one window's host would). Used by tests/obsidian/scale.test.mjs
// (node, a generous bound) and, under QuickJS with Echo's 64 MB, by tests/tools/obsidian-scale.mjs:
//   <quickjs>/qjs --memory-limit 65536 -m tests/tools/obsidian-scale.mjs 5000 1
// Nothing is read from a disk: the vault is made up in memory.
import { apply } from '../../plugins/obsidian/main.js'

export const COMMANDS = ['tree', 'search', 'graph', 'checks', 'page', 'find', 'backlinks']

export async function scale(n, kb, commands = COMMANDS, say = () => {}) {
  const store = new Map()
  store.set('vaults.json', JSON.stringify([{ schema: 1, id: 'v', name: 'V', root: '/v', state: 'ready', confirmed: true, added_at: '2026-01-01T00:00:00Z', detected: { pages: '', index: 'p0.md', taxonomies: [] }, overrides: {}, structure: 'confirmed' }]))
  const para = 'Some words [[p1]] and [y](p2.md) #tag/sub and more prose here, a longer line of text.\n'
  const body = (i) => `---\ntitle: Page ${i}\ntags: [a, b]\naliases: [P${i}]\n---\n# Page ${i}\n\n${para.repeat(Math.max(1, Math.floor((kb * 1024) / para.length)))}[[p${(i + 7) % n}]]\n- [ ] task\n`
  const files = Array.from({ length: n }, (_, i) => ({ path: `p${i}.md`, size: kb * 1024, mtime: 1 }))
  const num = (p) => Number(p.replace(/^p|\.md$/g, ''))
  // A stand-in for sha256: the same for the same text (enough to tell a read page is UTF-8, as the plugin checks).
  const sha = (t) => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(16).padStart(64, '0') }
  // The longest stretch of JavaScript between two awaits of Echo's services (Echo stops a plugin's call after 5 s).
  let sliceAt = Date.now(), slice = 0
  const tick = () => { slice = Math.max(slice, Date.now() - sliceAt) }
  const host = async (v) => { tick(); await Promise.resolve(); sliceAt = Date.now(); return v }
  const cmds = {}
  const ctx = {
    id: 'obsidian', terminal: true, log: () => {}, command: (name, fn) => { cmds[name] = fn },
    store: {
      read: (p) => store.get(p) ?? null, write: (p, t) => { store.set(p, String(t)) },
      update: (p, f) => { const r = f(store.get(p) ?? null); if (r != null) store.set(p, String(r)); return store.get(p) ?? null },
      path: (p = '') => `/data/.echo/plugins/obsidian/${p}`, remove: (p) => { store.delete(p) },
      list: (d = '') => [...new Set([...store.keys()].filter((k) => k.startsWith(`${d}/`)).map((k) => k.slice(d.length + 1).split('/')[0]))].sort(),
    },
    fs: {
      folders: () => ['/v'], forget: () => true, list: () => [],
      walk: () => host(files.slice()),
      readMany: (root, ps) => host(ps.map((p) => body(num(p)))),
      read: (root, p) => body(num(p)),
      stat: (root, p, o = {}) => (/^p\d+\.md$/.test(p) && num(p) < n ? { kind: 'file', size: body(num(p)).length, mtime: 1, real: p, ...(o.sha ? { sha: sha(body(num(p))) } : {}) } : null),
      search: async () => [],
    },
    git: { info: async () => ({ repo: false }) },
    crypto: { sha256: (t) => sha(String(t)) },
    markdown: Object.assign((md) => `<p>${md.length}</p>`, { links: () => ({ links: [], images: [] }) }),
    echo: { read: () => [] },
    sessions: { skills: () => {}, read: () => {} }, agent: { set: () => {} }, view: { hints: () => {} }, inbox: { set: () => {}, clear: () => {} },
  }
  apply(ctx)
  const args = { id: 'v', vault: 'v', q: 'zzz', note: 'p1.md', path: 'p1.md', mode: 'both' }
  const out = {}
  for (const c of commands) {
    const t0 = Date.now()
    sliceAt = t0
    slice = 0
    const r = await cmds[c](args)
    tick()
    out[c] = { ms: Date.now() - t0, slice, bytes: JSON.stringify(r).length }
    say(`${c}: ${out[c].ms} ms (longest slice ${slice} ms), answer ${(out[c].bytes / 1e6).toFixed(2)} MB`)
  }
  // The stored index: its head and parts (the largest part is the most written at once).
  const parts = [...store.keys()].filter((k) => k.startsWith('vaults/v/index'))
  out.indexBytes = parts.reduce((n, k) => n + store.get(k).length, 0)
  out.largestWrite = Math.max(...parts.map((k) => store.get(k).length))
  return out
}
