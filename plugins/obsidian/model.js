// Knowledge (the plugin `obsidian`) — the pure parts of its activity, as onetest-ai/echo-plugins#17 wrote them (its
// `model.js`): your vaults — folders of Markdown you own — read, edited, graphed, checked and ingested, and the minutes
// of your calls saved into them. No DOM and no Echo: `view.js` draws from what these give; the node tests run them
// (tests/obsidian/ui.test.mjs). #17's Ask is not here: Claude Code in Echo's panel answers about a vault.

// ── kn-route: the activity's own routes, `#obsidian:knowledge/<vault>/<tab>/<path>` (a page's path encoded as one part,
// or by its parts as Echo's page links write it); a vault opens on Home (spec-2 K10-01) ──
const KN_BASE = 'obsidian:knowledge'
const KN_TABS = ['home', 'pages', 'graph', 'ingest', 'health', 'settings']
/** `decodeURIComponent`, or `null` for a broken escape (a `%` that is the name's own). */
function knDecode(s) {
  try { return decodeURIComponent(s) } catch { return null }
}
function knParseRoute(hash) {
  const parts = String(hash || '').replace(/^#/, '').split('/')
  if (parts[0] !== KN_BASE) return null
  const vault = parts[1] ? knDecode(parts[1]) : ''
  if (vault === null) return null
  if (vault && !/^[\p{L}\p{N}_-]+$/u.test(vault)) return null
  const tab = parts[2] || 'home'
  if (!KN_TABS.includes(tab)) return null
  const path = parts.length > 3 ? knDecode(parts.slice(3).join('/')) : ''
  if (path === null) return null
  return { vault, tab, path }
}
function knRouteOf({ vault, tab = 'home', path = '' }) {
  return `${KN_BASE}${vault ? `/${encodeURIComponent(vault)}/${tab}${path ? '/' + encodeURIComponent(path) : ''}` : ''}`
}
// end of the kn-route block

// ── kn-calls-rule: Settings → Ingest, what a new call's minutes do (K14-11, D37) ──
const KN_CALLS_RULE = [
  ['off', 'Off', 'The default. Minutes are saved as you set above and nothing else happens.'],
  ['add', 'Add to the inbox', 'The call joins the inbox as a source. You prepare changes when you want.'],
  ['prepare', 'Add and prepare changes', 'Runs start by themselves, in batches (below), never during a call. Their changes wait for your review; nothing is merged by itself.'],
]
/** The three choices with the vault's one checked (a value Echo doesn't know reads as Off). */
function knCallsRule(value) {
  const on = KN_CALLS_RULE.some(([k]) => k === value) ? value : 'off'
  return KN_CALLS_RULE.map(([k, label, sub]) => ({ k, label, sub, on: k === on }))
}
// end of the kn-calls-rule block

// ── kn-tabs: which tabs show a number (only where something waits) ──
/** `{ ingest, health }`: what waits to be ingested and what needs a look; `null` at 0 or when missing, so no badge. */
function knTabCounts({ waiting, needs } = {}) {
  const n = (v) => (Number.isFinite(v) && v > 0 ? v : null)
  return { ingest: n(waiting), health: n(needs) }
}
/** A tab's accessible name: with Health's number, "Health, 3 need you" (the number alone would read "Health3"). */
function knTabLabel(label, needs) {
  return needs ? `${label}, ${needs} ${needs === 1 ? 'needs' : 'need'} you` : label
}
// end of the kn-tabs block

// ── kn-switcher: what the header's switcher lists ──
function knSwitcherEntries(vaults, recallOn, pluginTabs) {
  const out = [{ kind: 'head', label: 'Your vaults' }]
  for (const v of vaults) out.push({ kind: 'vault', id: v.id, name: v.name, pages: v.pages, star: !!(v.minutes && v.minutes.mode === 'auto'), available: v.available !== false })
  out.push({ kind: 'connect', label: 'Connect a folder…' }, { kind: 'new', label: 'Start a new vault…' })
  if (recallOn) out.push({ kind: 'sep' }, { kind: 'head', label: "Echo's index" }, { kind: 'recall', label: 'Recall' })
  if (pluginTabs.length) {
    out.push({ kind: 'sep' }, { kind: 'head', label: 'From plugins' })
    for (const t of pluginTabs) out.push({ kind: 'plugin', tab: t.tab, label: t.label, plugin: t.plugin })
  }
  return out
}
// end of the kn-switcher block

// ── kn-chip: a call's Knowledge chip (`call.knowledge` from /api/call) ──
function knChipState(k) {
  if (!k) return { state: 'none' }
  const rec = k.record || {}
  const saved = rec.saved || []
  const byId = (id) => (k.vaults || []).find((v) => v.id === id)
  if (k.failure) return { state: 'failed', label: `Couldn't save to ${k.failure.name}`, vault: k.failure.vault, error: k.failure.error }
  const stale = (k.stale || [])[0]
  if (stale && byId(stale)) return { state: 'stale', label: `Update in ${byId(stale).name}`, vault: stale }
  const kept = saved.find((e) => e.state === 'kept')
  if (kept) return { state: 'kept', label: `${(byId(kept.vault) || { name: kept.vault }).name} · not updated`, vault: kept.vault, path: kept.path }
  if (saved.length) {
    const e = saved[saved.length - 1]
    const v = byId(e.vault)
    if (!v) return { state: 'removed', label: 'Saved to a vault since removed', vault: e.vault }
    return { state: 'saved', label: `In ${v.name}`, vault: e.vault, path: e.path, more: saved.length - 1 }
  }
  if (rec.choice === 'none') return { state: 'off', label: 'Not saved to Knowledge' }
  const t = k.targets || []
  if (t.length) return { state: 'will', label: `Minutes → ${t.map((v) => v.name).join(', ')}`, vault: t[0].id }
  return { state: 'none' }
}
// end of the kn-chip block

// ── kn-tree: the Pages tree from the vault's pages (paths vault-relative; `root` the pages root) ──
function knBuildTree(pages, { root = '', filter = 'all', open = new Set(), index = '' } = {}) {
  const rel = (p) => (root && p.startsWith(root + '/') ? p.slice(root.length + 1) : p)
  const name = (p) => p.split('/').pop()
  if (filter === 'recent' || filter === 'unindexed') {
    const list = filter === 'recent' ? [...pages].sort((a, b) => (b.mtime || 0) - (a.mtime || 0)) : pages.filter((p) => p.in_index === false)
    return list.map((p) => ({ kind: 'page', path: p.path, name: name(p.path), title: p.title, depth: 0, sub: rel(p.path).split('/').slice(0, -1).join('/') }))
  }
  const rows = []
  const walk = (prefix, depth) => {
    const here = pages.filter((p) => { const r = rel(p.path); return prefix ? r.startsWith(prefix + '/') : true })
    const folders = new Map(), files = []
    for (const p of here) {
      const rest = rel(p.path).slice(prefix ? prefix.length + 1 : 0)
      const slash = rest.indexOf('/')
      if (slash >= 0) { const f = rest.slice(0, slash); folders.set(f, (folders.get(f) || 0) + 1) } else files.push(p)
    }
    for (const [f, n] of [...folders].sort((a, b) => a[0].localeCompare(b[0]))) {
      const full = prefix ? `${prefix}/${f}` : f
      const vpath = root ? `${root}/${full}` : full
      const isOpen = open.has(vpath)
      rows.push({ kind: 'folder', path: vpath, name: f, depth, count: n, open: isOpen })
      if (isOpen) walk(full, depth + 1)
    }
    // The vault's index page (`index`, vault-relative) is marked.
    for (const p of files.sort((a, b) => name(a.path).localeCompare(name(b.path)))) rows.push({ kind: 'page', path: p.path, name: name(p.path), title: p.title, depth, index: !!index && p.path === index })
  }
  walk('', 0)
  return rows
}
/** What Pages says with no page open: `loading` until the vault's own pages are in (its index isn't known yet), or
 *  `failed` when asking for them failed (`failed`: `{vault, text}`, said with *Try again*), then `pick` — or `no-index`
 *  when the vault has none (C2). */
function knPagesEmpty(tree, vault, failed = null) {
  if (!tree || tree.vault !== vault) return failed && failed.vault === vault ? 'failed' : 'loading'
  return tree.index ? 'pick' : 'no-index'
}
// end of the kn-tree block

// ── kn-graph: which nodes and edges the graph shows ──
function knFilterGraph(g, { hideIndex = true, isolated = true, tags = false, focus = null, depth = 0, hidden = [] } = {}) {
  const hubs = new Set(hideIndex ? g.hubs || [] : [])
  const off = new Set(hidden)
  let nodes = g.nodes.filter((n) => !hubs.has(n.id) && (tags || !n.tag) && (n.tag || !off.has(n.folder || '(top)')))
  const keep = new Set(nodes.map((n) => n.id))
  let edges = g.edges.filter(([a, b]) => keep.has(a) && keep.has(b))
  if (!isolated) {
    const linked = new Set(edges.flat())
    nodes = nodes.filter((n) => linked.has(n.id) || n.tag)
  }
  if (focus && depth > 0 && keep.has(focus)) {
    const near = new Set([focus])
    for (let d = 0; d < depth; d++) {
      const was = new Set(near)
      for (const [a, b] of edges) { if (was.has(a)) near.add(b); if (was.has(b)) near.add(a) }
    }
    nodes = nodes.filter((n) => near.has(n.id))
    edges = edges.filter(([a, b]) => near.has(a) && near.has(b))
  }
  const shown = new Set(nodes.map((n) => n.id))
  return { nodes, edges: edges.filter(([a, b]) => shown.has(a) && shown.has(b)) }
}
/** A graph of more than 5,000 pages starts as the open page's local graph (else the index's); `null`: the whole. */
function knGraphStart(pages, path, index) {
  return pages > 5000 ? { depth: 1, sel: path || index || null } : null
}
/** How many pages "Show isolated pages" hides: no page links in or out (when the index is hidden, its own don't count;
 *  with tags as nodes, a tag's do), of the folders shown. */
function knIsolatedCount(g, hideIndex, hidden = [], tags = false) {
  const pages = (isolated) => knFilterGraph(g, { hideIndex, isolated, hidden, tags }).nodes.filter((n) => !n.tag).length
  return pages(true) - pages(false)
}
// end of the kn-graph block

// ── kn-force: the graph's live layout, forces as d3-force has them (many-body, links, a pull to the centre) ──
/** Push every node away from the others into its velocity (`strength` > 0). Past 64 nodes, a cell farther away than
 *  its size / `theta` counts as one body at its centre of mass (Barnes–Hut); `theta` 0 is the exact sum. */
function knRepel(nodes, strength, theta) {
  const n = nodes.length
  if (n < 2) return
  const near = (p, q, i, j) => {
    let dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy
    if (d2 < 1e-6) { dx = 0.1 * ((j - i) || 1); dy = 0.1 * (((i * 7 + j * 3) % 5) - 2 || 1); d2 = dx * dx + dy * dy } // on one spot: apart, the same way each time
    const f = strength / Math.max(d2, 16)
    return [dx * f, dy * f]
  }
  if (!theta || n < 64) {
    for (let i = 0; i < n; i++) {
      const p = nodes[i]
      for (let j = i + 1; j < n; j++) {
        const q = nodes[j], [fx, fy] = near(p, q, i, j)
        p.vx -= fx; p.vy -= fy; q.vx += fx; q.vy += fy
      }
    }
    return
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const p of nodes) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y) }
  const cell = (x, y, s) => ({ x, y, s, n: 0, sx: 0, sy: 0, k: null, b: null })
  const sub = (c, p) => {
    const h = c.s / 2, i = (p.x >= c.x + h ? 1 : 0) + (p.y >= c.y + h ? 2 : 0)
    return c.k[i] || (c.k[i] = cell(c.x + (i & 1 ? h : 0), c.y + (i & 2 ? h : 0), h))
  }
  const add = (c, p, d) => {
    for (;;) {
      c.n++; c.sx += p.x; c.sy += p.y
      if (c.k) { c = sub(c, p); d++; continue }
      if (!c.b) { c.b = [p]; return }
      if (d > 40) { c.b.push(p); return } // the same spot: one leaf holds them all
      const q = c.b[0]
      c.b = null; c.k = [null, null, null, null]
      add(sub(c, q), q, d + 1)
      c = sub(c, p); d++
    }
  }
  const root = cell(x0, y0, Math.max(x1 - x0, y1 - y0, 1) * 1.0001)
  const at = new Map()
  nodes.forEach((p, i) => { at.set(p, i); add(root, p, 0) })
  const t2 = theta * theta, stack = []
  nodes.forEach((p, i) => {
    stack.push(root)
    while (stack.length) {
      const c = stack.pop()
      if (c.b) {
        for (const q of c.b) if (q !== p) { const [fx, fy] = near(p, q, i, at.get(q)); p.vx -= fx; p.vy -= fy }
        continue
      }
      const dx = c.sx / c.n - p.x, dy = c.sy / c.n - p.y, d2 = dx * dx + dy * dy
      if (c.s * c.s < t2 * d2) { const f = (strength * c.n) / Math.max(d2, 16); p.vx -= dx * f; p.vy -= dy * f; continue }
      for (const k of c.k) if (k) stack.push(k)
    }
  })
}
/** A layout that moves: `set(nodes, links, heat)` keeps where known pages were (a page filtered out and back returns to
 *  its place; a new one starts beside the pages it links to) and warms it by `heat` (a first layout: fully), `tick()`
 *  steps it, and it cools until `settled()`. A dragged page is `fix`ed under the pointer while `hold(true)` keeps the
 *  rest moving round it. */
function knForceSim(opts) {
  const o = { distance: 30, charge: 34, gravity: 0.05, decay: 0.6, theta: 0.9, ...opts }
  let nodes = [], links = [], byId = new Map(), alpha = 1, target = 0
  const seen = new Map()
  function set(list, edges, heat = 0.5) {
    for (const p of nodes) seen.set(p.id, { x: p.x, y: p.y })
    const fresh = []
    byId = new Map()
    nodes = list.map((n) => {
      const was = seen.get(n.id)
      const p = { ...n, x: was ? was.x : 0, y: was ? was.y : 0, vx: 0, vy: 0, fx: null, fy: null, nb: [], deg: 0, r: 0 }
      if (!was) fresh.push(p)
      byId.set(p.id, p)
      return p
    })
    links = []
    const twice = new Set()
    for (const [a, b] of edges) {
      const s = byId.get(a), t = byId.get(b), key = a < b ? `${a}\n${b}` : `${b}\n${a}`
      if (!s || !t || s === t || twice.has(key)) continue
      twice.add(key); links.push({ s, t }); s.nb.push(t); t.nb.push(s)
    }
    for (const p of nodes) { p.deg = p.nb.length; p.r = p.size || 3 + Math.sqrt(p.deg) * 1.4 }
    for (const l of links) { l.k = 1 / Math.min(l.s.deg, l.t.deg); l.bias = l.s.deg / (l.s.deg + l.t.deg) }
    // New pages: beside the placed pages they link to, else on a sunflower spiral (no two on one spot).
    const placed = new Set(nodes.filter((p) => !fresh.includes(p)))
    fresh.forEach((p, i) => {
      const by = p.nb.filter((m) => placed.has(m))
      if (by.length) {
        p.x = by.reduce((s, m) => s + m.x, 0) / by.length + 6 * Math.cos(i * 2.39996)
        p.y = by.reduce((s, m) => s + m.y, 0) / by.length + 6 * Math.sin(i * 2.39996)
      } else {
        const r = 10 * Math.sqrt(0.5 + i + placed.size), a = (i + placed.size) * 2.39996
        p.x = r * Math.cos(a); p.y = r * Math.sin(a)
      }
      placed.add(p)
    })
    alpha = Math.max(alpha, fresh.length === nodes.length ? 1 : heat)
  }
  function stepLayout() {
    knRepel(nodes, o.charge * alpha, nodes.length > 600 ? o.theta : 0)
    for (const l of links) {
      const a = l.s, b = l.t
      let dx = b.x + b.vx - a.x - a.vx, dy = b.y + b.vy - a.y - a.vy
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01
      const f = ((d - o.distance - a.r - b.r) / d) * alpha * l.k
      dx *= f; dy *= f
      b.vx -= dx * l.bias; b.vy -= dy * l.bias; a.vx += dx * (1 - l.bias); a.vy += dy * (1 - l.bias)
    }
    const g = o.gravity * alpha
    for (const p of nodes) {
      if (p.fx != null) { p.x = p.fx; p.y = p.fy; p.vx = p.vy = 0; continue }
      const gp = p.deg ? g : g * 1.6 // a page with no links rings the rest, not far out
      p.vx -= p.x * gp; p.vy -= p.y * gp
      p.x += (p.vx *= o.decay); p.y += (p.vy *= o.decay)
    }
    alpha += (target - alpha) * 0.0228
  }
  return {
    set, tick: stepLayout,
    forget() { seen.clear(); nodes = []; links = []; byId = new Map(); alpha = 1 },
    nodes: () => nodes, links: () => links, node: (id) => byId.get(id) || null,
    alpha: () => alpha,
    settled: () => !target && alpha < 0.003,
    reheat(a) { alpha = Math.max(alpha, a) },
    hold(on) { target = on ? 0.25 : 0; if (on) alpha = Math.max(alpha, 0.25) },
    fix(id, x, y) { const p = byId.get(id); if (p) { p.fx = x; p.fy = y; p.x = x; p.y = y } },
    free(id) { const p = byId.get(id); if (p) { p.fx = null; p.fy = null } },
  }
}
/** Which labels to draw: the most important first (hovered, dragged or selected: p 3, never skipped; neighbours and
 *  matches: 2; then the biggest pages), each skipped where it would overlap one placed or falls off the canvas. */
function knLabelPlan(cands, W, H, max = 300) {
  const out = []
  for (const c of cands.slice().sort((a, b) => b.p - a.p || b.r - a.r)) {
    const b = { x0: c.x - c.w / 2 - 2, x1: c.x + c.w / 2 + 2, y0: c.y - 1, y1: c.y + c.h + 2 }
    if (b.x1 < 0 || b.x0 > W || b.y0 > H || b.y1 < 0) continue
    if (c.p < 3 && (out.length >= max || out.some((q) => b.x0 < q.b.x1 && b.x1 > q.b.x0 && b.y0 < q.b.y1 && b.y1 > q.b.y0))) continue
    out.push({ ...c, b })
  }
  return out
}
/** The pages whose title or path has every word typed; `null` when nothing is typed. */
function knGraphHits(nodes, q) {
  const words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return null
  return new Set(nodes.filter((n) => { const t = `${n.title || ''} ${n.id}`.toLowerCase(); return words.every((w) => t.includes(w)) }).map((n) => n.id))
}
/** A label short enough to sit under its dot. */
function knShortLabel(text, max = 30) {
  const ch = [...String(text || '')]
  return ch.length <= max ? ch.join('') : `${ch.slice(0, max - 1).join('').trimEnd()}…`
}
// end of the kn-force block

// ── kn-draft: unsaved text kept per page across a reload (dropped when the file changed meanwhile) ──
function knDraftKey(vault, path) { return `obsidian.kn.draft:${vault}:${path}` }
/** #17's key for the same draft (`echo.kn.draft:…`): read once and carried over to the plugin's own. */
function knOldDraftKey(vault, path) { return `echo.kn.draft:${vault}:${path}` }
function knKeepDraft(store, vault, path, base, text) {
  try { store.setItem(knDraftKey(vault, path), JSON.stringify({ base, text })) } catch { /* storage off */ }
}
function knRestoreDraft(store, vault, path, base) {
  try {
    let raw = store.getItem(knDraftKey(vault, path))
    const old = store.getItem(knOldDraftKey(vault, path))
    if (old != null) { if (raw == null) { raw = old; store.setItem(knDraftKey(vault, path), old) } store.removeItem(knOldDraftKey(vault, path)) }
    const d = JSON.parse(raw || 'null')
    return d && d.base === base ? d.text : null
  } catch { return null }
}
function knDropDraft(store, vault, path) {
  try { store.removeItem(knDraftKey(vault, path)) } catch { /* storage off */ }
}
/** The text a page's editor starts from: its unsaved text kept for this base, else the file's `text`. */
function knEditText(store, vault, path, base, text) {
  const kept = store ? knRestoreDraft(store, vault, path, base) : null
  return kept != null ? kept : text
}
// end of the kn-draft block

// ── kn-diff: your text against the file on disk, line by line — ['=' | '-' (only yours) | '+' (only on disk), line], runs
// of the same lines folded to `context` around a change (['…', 'N lines the same']); null when too big to compare here ──
function knLineDiff(mine, theirs, context = 3) {
  const a = String(mine).split('\n'), b = String(theirs).split('\n')
  let pre = 0
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++
  let post = 0
  while (post < a.length - pre && post < b.length - pre && a[a.length - 1 - post] === b[b.length - 1 - post]) post++
  const x = a.slice(pre, a.length - post), y = b.slice(pre, b.length - post)
  if (x.length * y.length > 2.5e6) return null
  // The longest common run of lines, from the end.
  const L = Array.from({ length: x.length + 1 }, () => new Uint32Array(y.length + 1))
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const ops = a.slice(0, pre).map((l) => ['=', l])
  let i = 0, j = 0
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) { ops.push(['=', x[i]]); i++; j++ } else if (L[i + 1][j] >= L[i][j + 1]) ops.push(['-', x[i++]]); else ops.push(['+', y[j++]])
  }
  while (i < x.length) ops.push(['-', x[i++]])
  while (j < y.length) ops.push(['+', y[j++]])
  for (const l of a.slice(a.length - post)) ops.push(['=', l])
  const changed = ops.map((o) => o[0] !== '=')
  const near = ops.map((_, k) => changed.slice(Math.max(0, k - context), k + context + 1).some(Boolean))
  const out = []
  for (let k = 0; k < ops.length;) {
    if (near[k] || !changed.some(Boolean)) { out.push(ops[k++]); continue }
    let n = 0
    while (k < ops.length && !near[k]) { n++; k++ }
    out.push(['…', `${n} line${n === 1 ? '' : 's'} the same`])
  }
  return out
}
// end of the kn-diff block

// ── kn-tools: a turn's tool calls as rows (K13-03) — one line each; three or more read-only calls in a row fold ──
const KN_FOLD = { Read: ['read', 'file', 'files'], Grep: ['searched', 'time', 'times'], Glob: ['searched', 'time', 'times'], WebSearch: ['searched the web', 'time', 'times'], WebFetch: ['opened', 'page', 'pages'], Skill: ['used', 'skill', 'skills'] }
/** One call: verb, target (`code` when it is a path or a name), `where` it searched, an edit's `pm`, the `note` after
 *  the dot (a read's lines, a search's count, a failure's reason), and `text`, the whole line in words. The events
 *  carry no result count for a web search and no file length for a read. */
function knToolRow(x, ended) {
  const d = x.detail || '', r = x.result
  const error = r && r.ok === false ? r.summary || 'It failed.' : ''
  const summary = r && !error ? r.summary || '' : ''
  let where = '', pm = '', note = d
  if (x.name === 'Read') note = d || summary
  else if (x.name === 'Grep' || x.name === 'Glob') { where = d; note = summary }
  else if (x.name === 'Edit') { pm = d; note = '' }
  if (error) note = error
  const text = [x.verb, x.target, where, pm].filter(Boolean).join(' ') + (note ? ` · ${note}` : '')
  return { kind: 'row', id: x.id, name: x.name, verb: x.verb, target: x.target, path: x.path, code: ['Read', 'Edit', 'Write', 'Glob', 'Skill', 'WebFetch'].includes(x.name), where, pm, note, error, running: !r && !ended, text, at: x.at, done: r && r.at, input: x.input, preview: r ? r.preview : '' }
}
function knFoldLabel(items) {
  const n = new Map()
  for (const x of items) { const k = (KN_FOLD[x.name] || [String(x.verb || x.name).toLowerCase(), 'time', 'times']).join('|'); n.set(k, (n.get(k) || 0) + 1) }
  const s = [...n].map(([k, c]) => { const [verb, one, many] = k.split('|'); return `${verb} ${c} ${c === 1 ? one : many}` }).join(', ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
/** The rows of a run of calls (each with its `result`): a row each, a `fold` (its `rows` inside) for three or more
 *  read-only calls in a row. `ended`: the turn is over. */
function knToolRows(items, { ended = false } = {}) {
  const out = []
  for (let i = 0; i < items.length;) {
    let j = i
    while (j < items.length && items[j].readonly) j++
    if (j - i >= 3) {
      const rows = items.slice(i, j).map((x) => knToolRow(x, ended))
      out.push({ kind: 'fold', id: rows[0].id, text: knFoldLabel(items.slice(i, j)), rows, running: rows.some((r) => r.running), errors: rows.filter((r) => r.error).length })
      i = j
    } else out.push(knToolRow(items[i++], ended))
  }
  return out
}
// end of the kn-tools block

// ── kn-health: Health's findings by group and kind under a filter, the finding shown, the 30-day trend with its gaps,
// Fix all's items, what a fix did, and the AI checks — what one kept, a contradiction's sides, the row's state (spec
// K16). The page names a finding only by its key ──
const KN_HEALTH_GROUPS = [['needs', 'Needs you', 'only you can decide'], ['should', 'Should fix', 'most by code'], ['tidy', 'Tidy', 'when there is time']]
const knS = (n, one, many) => (n === 1 ? one : many)
/** A code check's kind: its name in the list, the heading of its findings (n of them) and, where *Fix all* applies, the
 *  sheet's title. */
const KN_HEALTH_KINDS = {
  not_in_index: ['Not in the index', (n) => `${n} ${knS(n, 'page isn\'t', 'pages aren\'t')} in the index`, (n) => `Add ${n} ${knS(n, 'row', 'rows')} to the index`],
  broken: ['Broken links', (n) => `${n} ${knS(n, 'link leads', 'links lead')} to no page`, (n) => `Fix ${n} broken ${knS(n, 'link', 'links')}`],
  isolated: ['Pages with no links', (n) => `${n} ${knS(n, 'page has', 'pages have')} no links`],
  no_props: ['Without properties', (n) => `${n} ${knS(n, 'page has', 'pages have')} no properties`, (n) => `Add properties to ${n} ${knS(n, 'page', 'pages')}`],
  unknown_tag: ['Tags not in the taxonomy', (n) => `${n} ${knS(n, 'tag isn\'t', 'tags aren\'t')} in the taxonomy`],
  meeting_tag_missing: ['The meeting tag', () => 'The taxonomy doesn\'t allow the meeting tag'],
  dead_row: ['Index rows to missing pages', (n) => `${n} index ${knS(n, 'row leads', 'rows lead')} to no page`, (n) => `Fix ${n} index ${knS(n, 'row', 'rows')}`],
  usual_prop: ['Missing a usual property', (n) => `${n} usual ${knS(n, 'property is', 'properties are')} missing`],
  duplicate_title: ['Pages that share a title', (n) => `${n} ${knS(n, 'title is', 'titles are')} on more than one page`],
  oversized_index: ['An oversized index', () => 'The index is too big to read first'],
  // The AI checks' (K16-05): never a Fix all — an AI fix is made one by one.
  contradiction: ['Two pages disagree', (n) => (n === 1 ? 'Two pages disagree' : `${n} contradictions between pages`)],
  possible_duplicate: ['Pages that may be one', (n) => (n === 1 ? 'Two pages may be one' : `${n} pairs of pages may be one`)],
  stale: ['Statements a newer page replaced', (n) => `${n} ${knS(n, 'statement a newer page replaced', 'statements newer pages replaced')}`],
  link_to_add: ['Links worth adding', (n) => `${n} ${knS(n, 'page has a link', 'pages have links')} worth adding`],
  missing_summary: ['Without a summary', (n) => `${n} ${knS(n, 'page has', 'pages have')} no summary`],
}
/** The findings under `filter` — `all`, `needs` (Needs you), `code` or `ai` — by group, then by kind in Echo's order:
 *  each kind with its count `n`, its keys, how many have a fix (`fixable`) and how many *Fix all* takes (`fixAll`, never
 *  a guess). Empty groups are left out; the ignored findings are a group of their own with `showIgnored`. `kinds` and
 *  `needs` (findings in Needs you: the tab's number) count the findings not ignored, whatever the filter. */
function knHealthList(findings, { filter = 'all', ignored = [], showIgnored = false } = {}) {
  const keep = (f) => (filter === 'needs' ? f.group === 'needs' : filter === 'code' ? f.by === 'code' : filter === 'ai' ? f.by === 'ai' : true)
  const kindsOf = (list, ign) => {
    const by = new Map()
    for (const f of list) {
      let k = by.get(f.kind)
      if (!k) by.set(f.kind, (k = { kind: f.kind, by: f.by, group: f.group, ignored: ign, n: 0, keys: [], fixable: 0, fixAll: 0, name: (KN_HEALTH_KINDS[f.kind] || [f.title])[0], title: f.title, why: f.why }))
      k.n++
      k.keys.push(f.key)
      if (f.fixable) k.fixable++
      if (f.fix_all) k.fixAll++
    }
    return [...by.values()].map((k) => ({ ...k, meta: k.by === 'code' && k.fixable ? `${k.fixable} fixable by code` : k.n > 1 ? `${k.title} · ${k.n - 1} more` : k.title }))
  }
  const all = findings || [], shown = all.filter(keep)
  const groups = KN_HEALTH_GROUPS.map(([id, label, sub]) => ({ id, label, sub, kinds: kindsOf(shown.filter((f) => f.group === id), false) })).filter((g) => g.kinds.length)
  const off = showIgnored ? kindsOf((ignored || []).filter(keep), true) : []
  if (off.length) groups.push({ id: 'ignored', label: 'Ignored', sub: 'not counted', kinds: off })
  return { groups, kinds: new Set(all.map((f) => f.kind)).size, needs: all.filter((f) => f.group === 'needs').length }
}
/** The finding shown: `key` when it is listed, else the first of its kind (one just fixed or ignored), else the first
 *  listed — `{ kind, key }` (`kind`: its entry in `list`), or null when nothing is. */
function knHealthSelect(list, key) {
  const kinds = list.groups.flatMap((g) => g.kinds)
  const has = key ? kinds.find((k) => k.keys.includes(key)) : null
  if (has) return { kind: has, key }
  const k = (key && kinds.find((x) => x.kind === String(key).split(':')[0])) || kinds[0]
  return k ? { kind: k, key: k.keys[0] } : null
}
/** The trend: a point a day for the `days` days up to `today` (`YYYY-MM-DD`), its score `null` on a day none was kept;
 *  `first` and `last` the days with one, `delta` last − first (null with fewer than two). */
function knHealthTrend(history, today, days = 30) {
  const by = new Map((history || []).map((p) => [p.day, p.score]))
  const t = Date.parse(`${today}T00:00:00Z`)
  const points = []
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(t - i * 864e5).toISOString().slice(0, 10)
    points.push({ day, score: by.has(day) ? by.get(day) : null })
  }
  const kept = points.filter((p) => p.score != null)
  const first = kept[0] || null, last = kept[kept.length - 1] || null
  return { points, first, last, delta: kept.length > 1 ? last.score - first.score : null }
}
/** The trend drawn in a `w`×`h` box: a line and the area under it for each run of days with a score — a day without one
 *  is a gap, never bridged — and a dot for a day alone between gaps; `end` the last point. */
function knTrendPath(points, { w = 300, h = 44, lo = 60, hi = 100 } = {}) {
  const n = points.length
  const low = Math.min(lo, ...points.filter((p) => p.score != null).map((p) => Math.floor(p.score / 10) * 10))
  const x = (i) => +(n > 1 ? 3 + (i * (w - 6)) / (n - 1) : w / 2).toFixed(1)
  const y = (v) => +(h - 4 - ((v - low) / Math.max(1, hi - low)) * (h - 8)).toFixed(1)
  const runs = []
  let cur = null
  points.forEach((p, i) => {
    if (p.score == null) { cur = null; return }
    if (!cur) runs.push((cur = []))
    cur.push([x(i), y(p.score)])
  })
  const lines = runs.filter((r) => r.length > 1).map((r) => r.map(([a, b], j) => `${j ? 'L' : 'M'}${a},${b}`).join(''))
  const area = runs.filter((r) => r.length > 1).map((r, i) => `${lines[i]}L${r[r.length - 1][0]},${h}L${r[0][0]},${h}Z`).join('')
  return { line: lines.join(''), area, dots: runs.filter((r) => r.length === 1).map((r) => r[0]), end: runs.length ? runs[runs.length - 1][runs[runs.length - 1].length - 1] : null }
}
/** *Fix all*'s sheet from `/health?fixes=<kind>`: a row per fix, ticked unless its key is in `off` — never a guess (it is
 *  fixed on its own finding, ruling R36); one Echo couldn't compute says why, unticked. `items` is what `kn_fix_all`
 *  takes: each ticked fix by its key, with the `base` and `sha` of the diff shown (ruling R37); `files` how many files.
 *  `shown`: the rows drawn — the first `first`, the rest folded into `more` ({n, ticked}) until `open`; folded ones are
 *  sent all the same. */
function knFixAll(fixes, findings, off = new Set(), { open = false, first = 4 } = {}) {
  const by = new Map((findings || []).map((f) => [f.key, f]))
  const rows = (fixes || []).filter((x) => x && !x.guess).map((x) => {
    const f = by.get(x.key) || {}, page = (f.pages || [])[0] || []
    const ok = !x.error && !!x.base && !!x.sha
    return { key: x.key, choice: x.choice || '', base: x.base, sha: x.sha, path: x.path || page[0] || '', line: page[1] ?? null, title: f.title || '', hunks: x.hunks || [], plus: x.plus || 0, minus: x.minus || 0, error: x.error || (ok ? '' : 'Echo can\'t show this fix'), on: ok && !off.has(x.key) }
  })
  const on = rows.filter((r) => r.on)
  const fold = !open && rows.length > first + 1, rest = fold ? rows.slice(first) : []
  return { rows, shown: fold ? rows.slice(0, first) : rows, more: fold ? { n: rest.length, ticked: rest.filter((r) => r.on).length } : null,
    items: on.map((r) => ({ key: r.key, choice: r.choice, base: r.base, sha: r.sha })), files: new Set(on.map((r) => r.path)).size }
}
/** What came of `kn_fix` / `kn_fix_all` (`{written, committed, changed_since, skipped, commit}`) in Echo's words —
 *  `text`, and `wait` when something wasn't done (said until OK; else it goes by itself). `findings` name the skipped
 *  ones. A commit takes only the written files without changes of the user's (X-G2): `committed` names them. */
function knFixSummary(r, findings = []) {
  const title = (k) => ((findings || []).find((f) => f.key === k) || {}).title || 'a finding'
  const written = r.written || [], commit = String(r.commit || ''), skipped = /^skipped: /.test(commit)
  const left = commit && commit !== 'off' && !skipped && Array.isArray(r.committed) ? written.filter((p) => !r.committed.includes(p)) : []
  const committed = commit && commit !== 'off' && !skipped ? ` Committed (${commit})${left.length ? `, but not ${left.join(', ')}: ${left.length === 1 ? 'it' : 'they'} had changes of yours` : ''}.` : ''
  const out = []
  if (written.length) out.push(`${written.length === 1 ? `Fixed: ${written[0]}` : `Fixed in ${written.length} files`}.${skipped ? ` Not committed: ${commit.slice(9)}.` : committed}`)
  for (const p of r.changed_since || []) out.push(`${p} changed since Echo showed its fix, so it was left as it is.`)
  for (const s of r.skipped || []) out.push(`Not fixed: ${title(s.key)} — ${String(s.why).replace(/\.$/, '')}.`)
  return { text: out.join(' ') || 'Nothing was changed.', wait: !written.length || skipped || left.length > 0 || out.length > 1 }
}
/** What the vault's view asks for Health as it loads — Echo caches the checks per revision, so asking is cheap: on the
 *  Health tab `all` (the findings, score and history, then the finding shown) — a settings change isn't in the pages'
 *  rev the poll watches —, unless the user only `picked` another finding of the list shown (`finding`); elsewhere `count`
 *  (for the tab's number) only when there are no findings of this vault (a settings change empties them), else null. */
function knHealthLoad(h, { vault, tab, picked = false }) {
  const have = !!(h && h.data && h.vault === vault)
  if (tab === 'health') return have && picked ? 'finding' : 'all'
  return have ? null : 'count'
}
/** What an AI check kept and dropped (`health.json`'s `ai`), and how many past the most Echo keeps it didn't read
 *  (`left`), said in a line (K16-06). */
function knLintNotice(ai) {
  if (!ai) return ''
  const kept = ai.kept || 0, dropped = ai.dropped || 0, left = ai.left || 0
  if (!kept && !dropped && !left) return 'Found nothing to fix.'
  const k = kept === 0 ? 'Kept no finding' : `Kept ${kept} ${knS(kept, 'finding', 'findings')}`
  const d = dropped ? ` · ${dropped} dropped: ${dropped === 1 ? 'its quotes aren\'t' : 'their quotes aren\'t'} in the pages` : ''
  return `${k}${d}${left ? ` · ${left} more not read: Echo keeps ${kept} a check` : ''}.`
}
/** A contradiction's two quotes side by side (K16-07): the older page's first, each `side` named — `Older`, `Newer` —
 *  when both dates are known and differ, else as the check gave them with none named. Null unless there are two. */
function knVersus(quotes) {
  if (!Array.isArray(quotes) || quotes.length !== 2) return null
  const [a, b] = quotes
  if (!a.date || !b.date || a.date === b.date) return [{ ...a, side: null }, { ...b, side: null }]
  const [o, n] = a.date < b.date ? [a, b] : [b, a]
  return [{ ...o, side: 'Older' }, { ...n, side: 'Newer' }]
}
/** The AI row of *How Health checks* (K16-01): `running` (the check going: its id, what it waits for), else the last
 *  check's end when it failed or was stopped (said until the next one ends) with what it cost — it is never the last AI
 *  check, which only a check that ended is —, else `idle`. `lint` is `/health`'s, `ai` the last check that ended. */
function knLintState(lint, ai) {
  const l = (lint && lint.last) || null
  if (lint && lint.running) return { state: 'running', run: lint.running, waiting: (l && l.id === lint.running && l.waiting) || null, reason: null, cost: null }
  if (l && (l.state === 'failed' || l.state === 'stopped') && !(ai && ai.run === l.id)) return { state: l.state, run: null, waiting: null, reason: l.reason || null, cost: l.cost ?? null }
  return { state: 'idle', run: null, waiting: null, reason: null, cost: null }
}
/** Health's state for `vault`: nothing loaded yet. From an `old` one (a settings change) it keeps how the user looks at
 *  it — the filter, *Show ignored* — and is a new object, so a load started for the old one doesn't land in it. */
function knHealthState(vault, old = null) {
  return { vault, data: null, rev: null, at: 0, error: null, detail: null, want: '', choice: {}, filter: (old && old.filter) || 'all', showIgnored: !!(old && old.showIgnored), loading: false, picked: false }
}
// end of the kn-health block

// ── kn-ingest: the Ingest tab (spec K14, K15) — the sources by group under a filter, the tab's number, the last runs, a
// run as it goes (its steps, its tool rows), the review's state from the changes Echo gives (their answers and D28's
// dropped lines merged in Rust; blocked ones), what the Add a source sheet can add and what it sends — a pick's number,
// a call's name, Microsoft 365's ids, an https address; never a file path —, the first open's question, what a write did ──
const KN_INGEST_GROUPS = [['echo', 'From Echo'], ['mail', 'Mail & Teams'], ['web', 'Web'], ['file', 'Files']]
const KN_CHANGE_KINDS = { new: ['New page', 'ok'], edit: ['Edit', ''], index: ['Index', 'acc'], log: ['Log', 'acc'], taxonomy: ['Taxonomy', 'acc'], other: ['Other', ''] }
const knUsd = (c) => (c < 0.01 ? '<$0.01' : `$${c.toFixed(2)}`)
/** A source's state as the queue says it: Echo's `waiting` told apart by its run — `preparing` (it is going),
 *  `review` (its changes wait; also a source a write marked Done while its run still waits), `failed` (it ended with
 *  its Echo, until the next start tidies: *Run again*). */
function knSourceState(src, runs) {
  const r = (runs || []).find((x) => x.id === (src.meta || {}).run)
  // A write marks the run's sources Done while some of its changes still wait (fix round 1, M2): In review till then.
  if (src.state === 'done' && r && r.state === 'review') return 'review'
  if (src.state !== 'waiting') return src.state
  if (!r) return 'waiting'
  return r.state === 'running' ? 'preparing' : r.state === 'review' ? 'review' : r.state === 'failed' || r.state === 'stopped' ? 'failed' : 'waiting'
}
/** A state's chip: `[class, words]`. */
function knSourceChip(state, meta = {}) {
  switch (state) {
    case 'new': return ['new', 'New']
    case 'preparing': return ['run', 'Preparing']
    case 'review': return ['wait', 'In review']
    case 'failed': return ['fail', 'Run stopped']
    case 'done': return ['done', meta.kept == null ? 'Done' : meta.kept ? `Done · kept ${meta.kept}` : 'Done — nothing kept']
    case 'skipped': return ['skip', 'Skipped']
  }
  return ['wait', 'Waiting']
}
/** The queue (K14-08): the sources in Echo's order (newest first) by group — a Teams chat with mail —, each with its
 *  state, chip and whether *Prepare changes* takes it (New only); `filter` all · new · waiting · done (Skipped is with
 *  Done). Under All a group's done ones fold into a count (`folded`) unless `showDone[group]`. The counts never change
 *  with the filter. */
function knIngestQueue(sources, runs, { filter = 'all', showDone = {} } = {}) {
  const bucket = (s) => (s === 'new' ? 'new' : s === 'done' || s === 'skipped' ? 'done' : 'waiting')
  const rows = (sources || []).map((x) => {
    const state = knSourceState(x, runs), meta = x.meta || {}
    return { path: x.path, kind: x.kind, title: x.title, state, chip: knSourceChip(state, meta), note: meta.note || '', selectable: state === 'new', meta }
  })
  const n = (b) => rows.filter((r) => bucket(r.state) === b).length
  const counts = { all: rows.length, new: n('new'), waiting: n('waiting'), done: n('done') }
  const groups = KN_INGEST_GROUPS.map(([id, label]) => {
    const mine = rows.filter((r) => (r.kind === 'teams' ? 'mail' : r.kind) === id && (filter === 'all' || bucket(r.state) === filter))
    const fold = filter === 'all' && !showDone[id]
    const rest = fold ? mine.filter((r) => bucket(r.state) !== 'done') : mine
    return { id, label, n: mine.length, rows: rest, folded: mine.length - rest.length }
  }).filter((g) => g.n)
  return { groups, counts }
}
/** Ingest's number on its tab (K10-02): the changes still waiting for an answer across the vault's runs (`to_answer`:
 *  Echo counts the undecided ones and those changed in the vault since the run). */
function knIngestWaiting(runs) {
  return (runs || []).filter((r) => r.state === 'review').reduce((a, r) => a + (r.to_answer || 0), 0)
}
/** A run in the list of the last ones (K15-11): its sources (one by its title), how it stands, changes kept, cost. */
function knRunLine(r, titleOf = (p) => String(p).split('/').pop()) {
  const src = (r.sources || []).length === 1 ? titleOf(r.sources[0]) : `${(r.sources || []).length} sources`
  const left = r.to_answer || 0
  const state = r.state === 'running' ? (r.waiting ? 'waiting for a call' : 'preparing')
    : r.state === 'review' ? (left ? `${left} to review` : r.changes === 0 ? 'nothing changed — finish' : 'all answered — write or finish')
      : r.state === 'done' ? (r.changes === 0 ? 'nothing changed' : `kept ${r.kept || 0} of ${r.changes || 0}`)
        : r.state === 'discarded' ? 'discarded — nothing kept' : r.state
  const cost = r.cost ? knUsd(r.cost) : ''
  return { sources: src, state, cost, text: [src, state, cost].filter(Boolean).join(' · ') }
}
/** A run's events (K15-06) as the view shows them: what the copy left out, what it waits for before Claude Code starts
 *  (X-S2; over once Claude Code does something), its steps (the last `todo`), its tool calls each with its result — a
 *  write of its steps file is "Updated the steps · k of n" —, its words, its `result`, errors and how it ended. */
function knRunView(events) {
  const out = { copy: null, waiting: null, steps: [], tools: [], said: [], result: null, ended: null, errors: [] }
  const calls = new Map(), notes = /(^|\/)\.echo-ingest\/(steps|changes)\.json$/
  for (const e of events || []) {
    if (['tool', 'todo', 'text', 'thinking', 'result'].includes(e.type)) out.waiting = null
    switch (e.type) {
      case 'notice':
        if (e.kind === 'copy') out.copy = e.text
        else if (e.kind === 'waiting') out.waiting = e.text
        else if (e.kind === 'ended') { out.ended = { state: e.state, text: e.text }; out.waiting = null }
        break
      case 'tool': {
        const m = notes.exec(e.path || e.target || '')
        const item = { ...e, result: null, ...(m ? { verb: m[2] === 'steps' ? 'Updated the steps' : 'Wrote what it changed', target: '', detail: '', notes: m[2], readonly: false } : {}) }
        out.tools.push(item)
        calls.set(e.id, item)
        break
      }
      case 'tool_result': { const c = calls.get(e.id); if (c) c.result = e; break }
      case 'todo': {
        out.steps = e.items || []
        const w = [...out.tools].reverse().find((t) => t.notes === 'steps')
        if (w) w.detail = `${out.steps.filter((s) => s.state === 'done').length} of ${out.steps.length}`
        break
      }
      case 'text': if (e.done && !e.parent) out.said.push(e); break
      case 'result': out.result = e; break
      case 'error': out.errors.push(e.text); break
    }
  }
  return out
}
/** The review (K15-08) from the changes Echo gives — their answers merged, D28's lines left out of an index's or a
 *  log's change (`dropped`, said in `note`): a card each (its kind, whether it takes Approve · Reject · Edit (`open`),
 *  what was left out, why it is blocked, its quotes and what to say when there are none), the counts, *Approve the
 *  rest* (with one undecided), *Write N approved* (with one approved) and *Finish the run* (nothing left to decide).
 *  `pending`: changes whose answer is on its way —
 *  each answered once, and nothing else is sent meanwhile. */
function knIngestReview(changes, pending = {}) {
  const busy = Object.keys(pending || {}).length > 0
  const cards = (changes || []).map((c, i) => {
    const [kind, tag] = KN_CHANGE_KINDS[c.kind] || [String(c.kind || 'Other'), '']
    const quotes = c.quotes || [], inv = c.invented || 0, list = c.kind === 'index' || c.kind === 'log'
    const fromNote = /can't check/.test(c.quote_note || '') ? 'Echo can\'t check quotes in this kind of file, so none are shown.'
      : quotes.length ? '' : list ? 'Written by the skill from the changes above — no source words to show.' : 'No quote found in the sources.'
    return {
      n: i + 1, path: c.path, kind, tag, adds: !!c.adds_only, plus: c.plus || 0, minus: c.minus || 0, why: c.why || '', hunks: c.diff || [],
      state: c.state, edited: !!c.edited, busy: !!pending[c.path], open: c.state === 'undecided' && !pending[c.path], changed: c.state === 'changed',
      left: (c.dropped || []).length && c.state !== 'blocked' ? { note: c.note || '', lines: c.dropped } : null,
      blocked: c.state === 'blocked' ? c.note || 'can\'t be written' : null,
      quotes, fromNote, invented: inv ? `${inv} more ${inv === 1 ? 'quote' : 'quotes'} the run gave ${inv === 1 ? 'isn\'t' : 'aren\'t'} in the sources — not shown.` : '',
      // Its tags as Echo's dictionary names them (the vault's taxonomy winning), said on the change.
      retagged: (c.retagged || []).length ? `Tags as Echo's dictionary names them: ${c.retagged.map((r) => `#${r.from} → #${r.to}`).join(', ')}.` : '',
    }
  })
  const count = (s) => cards.filter((c) => c.state === s).length
  const counts = { all: cards.length, undecided: count('undecided'), approved: count('approved'), rejected: count('rejected'), written: count('written'), changed: count('changed'), blocked: count('blocked') }
  // Every change written, rejected or one Echo can't write: a write of none finishes the run (its sources Done).
  const finish = !busy && !counts.undecided && !counts.approved && !counts.changed
  return { cards, counts, rest: counts.undecided > 0 && !busy, write: { n: counts.approved, can: counts.approved > 0 && !busy }, finish }
}
/** What *Write N approved* did (K15-09: `{written, changed_since, commit, kept, of, finished}`) in Echo's words — `text`,
 *  and `wait` when something wasn't written (said until OK; else it goes by itself). */
function knWriteSummary(r, vault) {
  const written = r.written || [], commit = String(r.commit || ''), out = []
  const skipped = /^skipped: /.test(commit), ok = commit && commit !== 'off' && !skipped
  // X-G2: the commit takes only the files without changes of the user's from before.
  const left = ok && Array.isArray(r.committed) ? written.filter((p) => !r.committed.includes(p)) : []
  if (written.length) {
    const c = skipped ? ` Not committed: ${commit.slice(9).replace(/\.$/, '')}.` : ok ? ` Committed (${commit})${left.length ? `, but not ${left.join(', ')}: ${left.length === 1 ? 'it' : 'they'} had changes of yours` : ''}.` : ''
    out.push(`Wrote ${written.length === 1 ? written[0] : `${written.length} files`} into ${vault}.${c}`)
  }
  for (const p of r.changed_since || []) out.push(`${p} changed in the vault since the run, so it wasn't written: compare it below.`)
  if (r.finished && written.length) out.push(`The run is done: ${r.kept} of its ${r.of} changes kept.`)
  return { text: out.join(' ') || 'Nothing was written.', wait: !written.length || (r.changed_since || []).length > 0 || skipped || left.length > 0 }
}
/** What the Add a source sheet's tab `x.tab` can add now (K14-02…06): `can`, the button's `label`, how many, and a
 *  `note` (an address Echo won't fetch); Mail or Teams without Echo's Microsoft 365 sign-in says `signin`. A call on
 *  another profile, once refused (`x.mismatch`, named for that call), is *Add anyway* on that call only (X-P3). */
function knAddState(x, { m365 = true } = {}) {
  switch (x.tab) {
    case 'files': {
      const n = ((x.pick && x.pick.files) || []).filter((f) => !f.too_big).length
      return { can: n > 0 && !x.busy, label: n ? `Add ${n} ${n === 1 ? 'file' : 'files'}` : 'Add files', count: n }
    }
    case 'call': return { can: !!x.call && !x.busy, label: !x.call ? 'Add a source' : x.mismatch && x.mismatch.name === x.call.name ? 'Add anyway' : 'Add 1 source', count: x.call ? 1 : 0 }
    case 'mail': return m365 ? { can: !!x.hit && !x.busy, label: x.hit ? 'Add 1 source' : 'Add a source', count: x.hit ? 1 : 0 } : { can: false, signin: true, label: 'Add a source', count: 0 }
    case 'web': {
      // No address: Echo asks for it in its own box (`ctx.http.askAddress`). One typed here is read at once when it is
      // on a site listed in Knowledge's settings; Echo's box asks for it otherwise.
      const u = String(x.url || '').trim(), ok = /^https?:\/\/[^\s/?#]+/i.test(u) && !/\s/.test(u)
      if (!u) return { can: !x.busy, label: 'Type the address…', count: 1, note: '' }
      return { can: ok && !x.busy, label: 'Add the page', count: ok ? 1 : 0, note: ok ? '' : 'A web address starts with http:// or https://.' }
    }
  }
  return { can: false, label: '', count: 0 }
}
/** What `kn_source_add` takes for the sheet's tab (besides the vault): the files by their pick's number, a call by its
 *  name, a mail by its message's id, a chat by its id with its days (`x.days` up to `today`, `YYYY-MM-DD`), a web page by
 *  the address typed — never a path. */
function knAddArgs(x, today) {
  switch (x.tab) {
    case 'files': return { kind: 'files', pick: x.pick.seq }
    case 'call': return { kind: 'call', call: x.call.name, transcript: !!(x.include || {}).transcript, chat: !!(x.include || {}).chat, anyway: !!(x.mismatch && x.mismatch.name === x.call.name) }
    case 'mail': {
      if (x.hit.kind === 'mail') return { kind: 'mail', message: x.hit.id }
      const t = Date.parse(`${today}T00:00:00Z`), since = new Date(t - ((x.days || 7) - 1) * 864e5).toISOString().slice(0, 10)
      return { kind: 'chat', chat: x.hit.chat, since, until: today }
    }
    case 'web': return { kind: 'web', url: String(x.url || '').trim() }
  }
  return null
}
/** The first open's question (K14-09): while Echo's ledger has no answer — an add before it doesn't take it away (ruling
 *  R40) —, how many files are already in the sources folder; null once answered. */
function knFirstOpen(v) {
  const o = v && v.offer
  if (!o || !o.count) return null
  const one = o.count === 1, n = Number(o.count).toLocaleString('en-US')
  return { count: o.count, folder: o.folder, text: `${n} ${one ? 'file is' : 'files are'} already in ${o.folder}/. ${one ? 'Was it' : 'Were they'} processed?` }
}
/** Does the page take files dropped on the window now (K14-03b): while Ingest shows a vault, or the Add a source sheet
 *  is open. Echo is told on and off (never a path); otherwise a drop is the webview's own, as before (a logo tile's). */
function knTakesDrops({ view, active, tab, vault, sheet }) {
  return sheet === 'source' || (view === 'brain' && !!active && tab === 'ingest' && !!vault)
}
/** What a drop left out (`left_out`: folders, which aren't added), in Echo's words; '' when nothing was. */
function knDropNote(r) {
  const n = (r && r.left_out) || 0
  if (!n) return ''
  return (r.files || []).length ? `${n} ${n === 1 ? 'folder' : 'folders'} left out: folders aren't added.` : 'Folders aren\'t added: drop the files in them.'
}
// end of the kn-ingest block

// ── kn-ingest-poll: the run Ingest shows, loaded as it goes — a poll works on the run it was started for and never
// takes the view from one opened since; one load of a run at a time, each answer merged once (as kn-poll for Ask) ──
/** Open run `id`: the one open when it is `id` (its events kept), else a new one — its review and open rows afresh. Only
 *  the route opens a run. */
function knRunOpen(g, id) {
  if (g.run && g.run.id === id) return g.run
  g.run = { id, data: null, events: [], next: 0, loaded: false, error: null, polling: false, loading: false }
  g.review = null
  g.open = {}
  return g.run
}
/** May a load of run `r` start: it is still the run shown, and none of its loads is on its way. */
function knRunMayLoad(g, r) { return !!r && g.run === r && !r.loading }
/** The answer to a load of `r` asked from event `from`: merged into the run shown, once — null when stale (another run
 *  shown since, or the run moved on from `from`). Events that come while it is watched carry `now`. */
function knRunTake(g, r, from, d, now) {
  if (g.run !== r || r.next !== from) return null
  if (d.error) { r.error = d.error; return r }
  const evs = d.events || []
  if (r.loaded) for (const e of evs) e.at = now
  r.events.push(...evs)
  if (d.next != null) r.next = d.next
  const data = { ...d }
  delete data.events
  Object.assign(r, { data, loaded: true, error: null })
  return r
}
// end of the kn-ingest-poll block

// ── kn-home: Home's cards (spec-2 K11) — the Health card's lines, Coming in's rows, What's new under its filter, the
// Continue lines, the Ask box's suggestions and a new vault's second step; Echo gives the facts, the view escapes them ──
const KN_HOME_ROWS = 12
const KN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const KN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** When, as Home says it: Today 10:01 · Yesterday 17:20 · Mon 11:05 (this week) · 28 Oct (2025 when not this year's);
 *  `short` (Continue): 10:01 · yesterday · Mon · 28 Oct. '' for no time. */
function knWhen(at, now = new Date(), short = false) {
  const d = at ? new Date(at) : null
  if (!d || isNaN(d)) return ''
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5)
  if (days === 0) return short ? hm : `Today ${hm}`
  if (days === 1) return short ? 'yesterday' : `Yesterday ${hm}`
  if (days > 1 && days < 7) return short ? KN_DAYS[d.getDay()] : `${KN_DAYS[d.getDay()]} ${hm}`
  return `${d.getDate()} ${KN_MONTHS[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`}`
}
/** Home's Health card and Coming in (K11-05, -06) from `/home`'s `health` and `coming_in`: the score, "code checks
 *  only" until an AI check has run, the first three of *Needs you* (each opens its finding), what code can fix by kind;
 *  the changes waiting with their sources (*Review* opens the run when there is one), the sources not processed by
 *  kind, the run going with its step — and `nothing` only when none of them is there. */
function knHomeCards(h = {}, now = new Date()) {
  const hl = h.health || {}, ci = h.coming_in || {}
  const kind = (k) => String((KN_HEALTH_KINDS[k] || [k])[0]).toLowerCase()
  const lines = (hl.top || []).slice(0, 3).map((f) => ({ key: f.key, title: f.title, sub: f.by === 'ai' ? `${kind(f.kind)} · AI` : kind(f.kind) }))
  const fix = (hl.fixable_kinds || []).map(([k, n]) => `${n} ${kind(k)}`).join(' · ')
  const health = {
    score: hl.score == null ? 100 : hl.score, needs: hl.needs || 0, lines, nothing: !hl.needs && !hl.fixable,
    sub: hl.code_only || !hl.ai ? 'code checks only · AI checks when you ask' : `AI checks ${knWhen(hl.ai, now)}`,
    fixable: hl.fixable ? `${hl.fixable} fixable by code${fix ? ` — ${fix}` : ''}` : '',
  }
  const runs = ci.runs || []
  const waiting = ci.waiting > 0 ? { n: ci.waiting, sources: runs.map((r) => `${(r.sources || []).join(', ') || 'a run'} (${r.to_answer})`).join(' · '), run: runs.length === 1 ? runs[0].id : '' } : null
  const fresh = ci.new > 0 ? { n: ci.new, kinds: (ci.kinds || []).filter(([, n]) => n > 0) } : null
  const running = ci.running ? { run: ci.running.id, step: ci.running.waiting || ci.running.step || 'Starting' } : null
  return { health, coming: { waiting, fresh, running, nothing: !waiting && !fresh && !running && !ci.error, error: ci.error || '' } }
}
/** What's new under its filter (K11-04): All · New pages (`new`) · Notes (`notes`: under the vault's notes folder), the
 *  newest twelve, in the order Echo gave them. */
function knHomeNews(rows, filter = 'all', notes = '') {
  const keep = filter === 'new' ? (r) => r.kind === 'new' && !!r.path : filter === 'notes' ? (r) => !!notes && String(r.path).startsWith(`${notes}/`) : () => true
  return (rows || []).filter(keep).slice(0, KN_HOME_ROWS)
}
/** A new vault's *Record a call* (K11-09): where its minutes land, by the vault's minutes rule; `code` the words the
 *  view sets as code. */
function knHomeRecord(minutes = {}, paths = {}) {
  const notes = `${String(paths.notes || 'notes').split('/').pop()}/`, index = String(paths.index || 'the index').split('/').pop()
  if (minutes.mode === 'auto') return { word: 'automatically', text: `Its minutes are saved here by themselves: a note in ${notes} and a row in ${index}.`, code: [notes, index] }
  if (minutes.mode === 'ask') return { word: 'when you choose', text: `After a call, its page offers to save its minutes here: a note in ${notes} and a row in ${index}.`, code: [notes, index] }
  return { word: 'off', text: 'Minutes aren\'t saved here by themselves. Save one from its call\'s page when you want it.', code: [] }
}
// end of the kn-home block

// ── the twin skill in the user's own Claude Code (Echo #776 `ctx.claude.installSkill` / `removeSkill`), on the user's
// click: the host keeps one name to one vault (reserved before Echo writes anything, released when the install fails);
// a new name is installed before the old one is taken out, so a failed install loses nothing ──
/** Echo's word for a skill it no longer has as this plugin's (removed with the plugin, or by the user). */
const KN_SKILL_GONE = /isn't a skill .* added/
/** Echo's click guard refusing (the page's transient activation passed: `copyAllowed`). */
const KN_CLICK_GONE = /only on your click/
/** Install `text` as `/name` for vault `vault` (`old`: the name it has now). `claude` the window half's ctx.claude,
 *  `call(command, args)` the host's commands. `reservedAt`: when the sheet's text reserved the name (twin_text
 *  `reserve`) — fresh, Echo's install is the click's first round trip; else the name is reserved first. A new name goes
 *  in before the old one comes out, right after it (still the click's). Echo refusing for a click gone stale: the name
 *  stays reserved and the error says click again (`again`). The host failing to record it after Echo wrote it: the
 *  record tried twice, else the skill taken out again before the name is released. → {name, old}; throws. */
async function knTwinInstall({ claude, call, vault, name, text, old = null, reservedAt = null, now = Date.now() }) {
  if (!(reservedAt && now - reservedAt < 90 * 1000)) await call('twin', { id: vault, op: 'reserve', name })
  try { await claude.installSkill(name, text) } catch (e) {
    const m = String((e && e.message) || e)
    if (KN_CLICK_GONE.test(m)) { const x = new Error(`Knowledge kept /${name} for you — click Install again`); x.again = true; throw x }
    try { await call('twin', { id: vault, op: 'release', name }) } catch { /* it lapses by itself */ }
    throw e
  }
  let oldOut = null
  if (old && old !== name) {
    try { await claude.removeSkill(old); oldOut = { name: old, gone: false, error: null } } catch (e) {
      const m = String((e && e.message) || e)
      oldOut = { name: old, gone: KN_SKILL_GONE.test(m), error: KN_SKILL_GONE.test(m) ? null : m }
    }
  }
  for (let k = 0; ; k++) {
    try { await call('twin', { id: vault, op: 'installed', name }); break } catch (e) {
      if (k < 1) continue
      try { await claude.removeSkill(name) } catch { /* the click may be gone: Echo's own record still names Knowledge */ }
      try { await call('twin', { id: vault, op: 'release', name }) } catch { /* lapses */ }
      throw e
    }
  }
  return { name, old: oldOut }
}
/** Take `/name` out of the user's Claude Code and forget it for `vault`; one Echo no longer has as this plugin's is
 *  forgotten too (`gone`). Throws on any other refusal. */
async function knTwinRemove({ claude, call, vault, name }) {
  let gone = false
  try { await claude.removeSkill(name) } catch (e) { if (!KN_SKILL_GONE.test(String((e && e.message) || e))) throw e; gone = true }
  await call('twin', { id: vault, op: 'removed', name })
  return { gone }
}



// ── kn-window-choices: small decisions of the window, kept here so they are tested without a DOM (`ui.test.mjs`) ──
/** The vault the Save sheet opens on: the one asked for; else a vault the call's minutes go to by themselves
 *  (`targets`), else one its thread, client or the default routes it to whatever its mode or profile (`routed`) — each
 *  first where it isn't saved yet, then even where it is; only then any other vault not saved in, else the first. */
function knSaveVault(k, vaultId) {
  if (vaultId) return vaultId
  const saved = new Set((((k || {}).record || {}).saved || []).map((e) => e.vault))
  const vs = ((k || {}).vaults || []).filter((v) => v.available)
  const there = (id) => vs.some((v) => v.id === id)
  const own = [...((k || {}).targets || []).map((t) => t && t.id), ...((k || {}).routed || [])].filter((id) => id && there(id))
  return own.find((id) => !saved.has(id)) || own[0] || (vs.find((v) => !saved.has(v.id)) || vs[0] || {}).id || null
}
/** The folder the New page sheet opens on: a missing link's page goes in the pages' top folder (`root`, '' when the
 *  pages are the vault's own root); otherwise the folder of the page open, else the top folder. */
function knNewPageFolder(name, root, path) {
  if (name) return root ?? ''
  return path ? path.split('/').slice(0, -1).join('/') : root || ''
}
/** A vault's page count: the tree's when it is that vault's (a page added in Echo counts at once), else the host's. */
function knPagesNow(tree, v) {
  return tree && v && tree.vault === v.id && Array.isArray(tree.pages) ? tree.pages.length : v ? v.pages : null
}
/** Whether a page is being edited now: only while Pages shows its editor (another tab draws as Echo asks). */
function knPageEditing(kn) {
  return !!(kn && kn.edit && kn.tab === 'pages')
}
/** Whether the activity asks Echo to leave its box alone: never on a new address (it must draw), nor when forced. */
function knHoldsBox({ force, hash, lastHash, editing }) {
  return !force && hash === lastHash && !!editing
}
// end of the kn-window-choices block

export { KN_BASE, KN_TABS, knDecode, knParseRoute, knRouteOf, KN_CALLS_RULE, knCallsRule, knTabCounts, knTabLabel, knSwitcherEntries, knChipState, knBuildTree, knPagesEmpty, knFilterGraph, knGraphStart, knIsolatedCount, knRepel, knForceSim, knLabelPlan, knGraphHits, knShortLabel, knDraftKey, knKeepDraft, knRestoreDraft, knDropDraft, knEditText, knLineDiff, KN_FOLD, knToolRow, knFoldLabel, knToolRows, KN_HEALTH_GROUPS, knS, KN_HEALTH_KINDS, knHealthList, knHealthSelect, knHealthTrend, knTrendPath, knFixAll, knFixSummary, knHealthLoad, knLintNotice, knVersus, knLintState, knHealthState, KN_INGEST_GROUPS, KN_CHANGE_KINDS, knUsd, knSourceState, knSourceChip, knIngestQueue, knIngestWaiting, knRunLine, knRunView, knIngestReview, knWriteSummary, knAddState, knAddArgs, knFirstOpen, knTakesDrops, knDropNote, knRunOpen, knRunMayLoad, knRunTake, KN_HOME_ROWS, KN_DAYS, KN_MONTHS, knWhen, knHomeCards, knHomeNews, knHomeRecord, KN_SKILL_GONE, KN_CLICK_GONE, knTwinInstall, knTwinRemove, knSaveVault, knNewPageFolder, knPagesNow, knPageEditing, knHoldsBox }
