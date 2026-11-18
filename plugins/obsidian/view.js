// Knowledge (the plugin `obsidian`) — the activity's view: onetest-ai/echo-plugins#17's Knowledge 0.1.1 client (its
// `view.js`), ported as it was — its components, classes and words — onto this plugin's own seams: its host half's
// commands through `seam.js` in place of Echo's `/api/kn` routes and `kn_*` jobs, Echo's generic slots in place of #677's
// native hooks (`client.js` wires them). Its tabs: Home · Pages · Graph · Ingest · Health · Settings; #17's Ask is gone —
// "Ask the vault" opens Claude Code in Echo's panel, in the vault (`ctx.claude.session`). `hooks` (from client.js): the
// vault's "What Claude knows" section in Settings, the call the window shows, a sheet over a call's page.

export async function createKnowledge(ctx, hooks = {}) {
  const v1 = new URL(import.meta.url).search
  const { KN_BASE, knDecode, knParseRoute, knRouteOf, knCallsRule, knTabCounts, knTabLabel, knSwitcherEntries, knChipState, knBuildTree, knPagesEmpty, knFilterGraph, knGraphStart, knIsolatedCount, knForceSim, knLabelPlan, knGraphHits, knShortLabel, knKeepDraft, knRestoreDraft, knDropDraft, knLineDiff, knToolRows, KN_HEALTH_KINDS, knHealthList, knHealthSelect, knHealthTrend, knTrendPath, knFixAll, knFixSummary, knHealthLoad, knLintNotice, knVersus, knLintState, knHealthState, knSourceState, knSourceChip, knIngestQueue, knIngestWaiting, knRunLine, knRunView, knIngestReview, knWriteSummary, knAddState, knAddArgs, knFirstOpen, knTakesDrops, knDropNote, knRunOpen, knRunMayLoad, knRunTake, knWhen, knHomeCards, knHomeNews, knHomeRecord, knTwinInstall, knTwinRemove, knSaveVault, knNewPageFolder, knPagesNow, knPageEditing } = await import(`./model.js${v1}`)
  const { knRead, knAct, knConnectArgs, knUnpickOf } = await import(`./seam.js${v1}`)

  const timing = {}
  let alive = true
  const timers = new Set(), intervals = new Set(), frames = new Set()
  const setTimeout = (fn, ms) => { const id = globalThis.setTimeout(() => { timers.delete(id); if (alive) fn() }, ms); timers.add(id); return id }
  const clearTimeout = (id) => { globalThis.clearTimeout(id); timers.delete(id) }
  const setInterval = (fn, ms) => { const id = globalThis.setInterval(() => { if (alive) fn() }, ms); intervals.add(id); return id }
  const clearInterval = (id) => { globalThis.clearInterval(id); intervals.delete(id) }
  const requestAnimationFrame = (fn) => { const id = globalThis.requestAnimationFrame((t) => { frames.delete(id); if (alive) fn(t) }); frames.add(id); return id }
  const cancelAnimationFrame = (id) => { globalThis.cancelAnimationFrame(id); frames.delete(id) }
  const render = () => { if (alive) (hooks.render || ctx.render)() }
  // A read or an action: one of the host half's commands (`seam.js`).
  const call = (command, args, opts) => (alive ? ctx.call(command, args, opts) : Promise.reject(new Error('Knowledge was unloaded')))
  const get = (path) => knRead(call, path)
  // A route change: a step in the window's history, or (`{replace: true}`, Echo #772) the address corrected in place —
  // Back skips it.
  const go = (hash, opts) => { if (alive) ctx.go(hash, opts) }
  const { esc, patch } = ctx.ui
  const nf = (n) => Number(n || 0).toLocaleString()
  const hm = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const brainOn = () => !!ctx.where().recall
  // The AI profiles and the clients and threads, as `kn` gave them with the vaults.
  const ai = () => ({ profiles: (st().data && st().data.profiles) || [], default: (st().data && st().data.default_profile) || '' })
  const profileOf = (id) => ai().profiles.find((p) => p.id === id)
  const loadCall = () => (hooks.refreshCall ? hooks.refreshCall() : Promise.resolve())
  /** Whether the activity is on screen. */
  const shown = () => ctx.where().view === KN_BASE
  let noticeText = null
  const S = {
    kn: null,
    get call() { return hooks.call ? hooks.call() : null },
    get selected() { return (S.call || {}).name || null },
    get pj() { return { data: { projects: ((st().data || {}).threads || []), clients: ((st().data || {}).clients || []) } } },
    get notice() { return noticeText },
    set notice(text) { noticeText = text; ctx.ui.notice(text) },
  }
  ctx.onUnload(() => {
    alive = false
    for (const id of timers) globalThis.clearTimeout(id)
    for (const id of intervals) globalThis.clearInterval(id)
    for (const id of frames) globalThis.cancelAnimationFrame(id)
    if (gview) { gview.destroy(); gview = null }
    if (mview) { mview.destroy(); mview = null }
  })

  const st = () => {
    if (!S.kn) S.kn = { data: null, vault: '', tab: 'home', path: '', tree: null, page: null, filter: 'all', q: '', hits: null, open: new Set(), rail: 'links', hist: null, ver: null, edit: null, graph: null, gopt: { hideIndex: true, isolated: true, tags: false, color: 'folder', depth: 0, sel: null, hidden: [] }, gq: '', settings: null, sheet: null, switcher: false, menu: null, busy: {}, error: null, chip: null, lastVault: null, ovr: {}, hl: null, hlKey: '', ing: null, ingRun: '', home: null, tabs: {} }
    return S.kn
  }
  const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms))
  const I = (d, w = 14) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
  const IC = {
    gem: I('<path d="M6.5 3.5h11l3.5 5-9 12-9-12z"/><path d="M3 8.5h18M9.5 3.5l-1 5 3.5 12 3.5-12-1-5"/>'),
    folder: I('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
    file: I('<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5V8h4"/>'),
    index: I('<path d="M5 5h14M5 10h14M5 15h9M5 20h6"/>'),
    plus: I('<path d="M12 5v14M5 12h14"/>'),
    minus: I('<path d="M5 12h14"/>'),
    fit: I('<path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15"/>'),
    more: I('<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>', 16),
    ask: I('<path d="M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8z"/>'),
    ext: I('<path d="M14 4.5h5.5V10M19.5 4.5L11 13"/><path d="M18 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H10"/>', 13),
    git: I('<circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="8.5" r="2.2"/><path d="M6 8.2v7.6M18 10.7c0 4-6 3-10.5 6.2"/>', 12),
    check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    warn: I('<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5v.1"/>', 16),
    info: I('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 8v.1"/>', 16),
    link: I('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', 12),
    close: I('<path d="M6 6l12 12M18 6L6 18"/>', 16),
    recall: I('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8.5 11h5M11 8.5v5"/>'),
    graph: I('<circle cx="6" cy="7" r="2.3"/><circle cx="17.5" cy="6" r="2.3"/><circle cx="12" cy="17" r="2.3"/><path d="M8 8l2.8 7M15.8 7.6L13 15M8.3 7l7-.8"/>'),
    globe: I('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.3 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.3-3.6-8.5S9.5 6.1 12 3.5z"/>'),
    edit: I('<path d="M4.5 19.5h4l10-10a2.8 2.8 0 0 0-4-4l-10 10z"/><path d="M13.5 6.5l4 4"/>'),
    search: I('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
    bolt: I('<path d="M13 3.5L5.5 13.5H12l-1 7 7.5-10H12z"/>'),
    files: I('<path d="M8.5 3.5h6l4 4V17a.5.5 0 0 1-.5.5H8.5A.5.5 0 0 1 8 17V4a.5.5 0 0 1 .5-.5z"/><path d="M14.5 3.5V8h4M5 7v13a.5.5 0 0 0 .5.5H14"/>'),
    agent: I('<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
    clock: I('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', 12),
    call: I('<path d="M6.5 4.5h3l1.5 4-2 1.5a10 10 0 0 0 5 5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 5 6.1a1.5 1.5 0 0 1 1.5-1.6z"/>'),
    lock: I('<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'),
    tray: I('<path d="M3.5 13.5l2.6-7.2a1.5 1.5 0 0 1 1.4-1h9a1.5 1.5 0 0 1 1.4 1l2.6 7.2V19a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 19z"/><path d="M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5"/>'),
    mail: I('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7.5l8 6 8-6"/>'),
    chat: I('<path d="M4.5 5.5h15v10h-9l-4 3.5v-3.5h-2z"/>'),
    upload: I('<path d="M12 15.5V4.5M7.5 9L12 4.5 16.5 9"/><path d="M4.5 15v3.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V15"/>'),
    memo: I('<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>'),
    // Home
    cal: I('<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'),
    tasks: I('<path d="M4.5 7l2 2 3.5-3.5M4.5 15l2 2 3.5-3.5M13 8h6.5M13 16h6.5"/>'),
  }
  const GEM_BIG = I('<path d="M6.5 3.5h11l3.5 5-9 12-9-12z"/><path d="M3 8.5h18M9.5 3.5l-1 5 3.5 12 3.5-12-1-5"/>', 22)
  const vaults = () => ((st().data || {}).vaults || [])
  const vault = () => vaults().find((v) => v.id === st().vault) || null
  const enc = (p) => encodeURIComponent(p)
  const store = () => { try { return window.localStorage } catch { return null } }
  /** `kn` with the vault shown, the only one whose git the host reads. */
  const knState = () => `api/kn${st().vault ? `?id=${enc(st().vault)}` : ''}`
  /** The vault last open, under the plugin's own key; #17's (`echo.kn.vault`) is read once and carried over. */
  const VAULT_KEY = 'obsidian.kn.vault'
  const lastVaultStored = () => {
    try {
      let id = localStorage.getItem(VAULT_KEY)
      const old = localStorage.getItem('echo.kn.vault')
      if (old != null) { if (id == null) { id = old; localStorage.setItem(VAULT_KEY, old) } localStorage.removeItem('echo.kn.vault') }
      return id
    } catch { return null }
  }
  /** A message that waits for OK (something didn't happen, or did only in part). */
  const say = (text) => { S.notice = text; render() }
  /** A done thing, said for a moment. */
  const done = (text) => { S.notice = text; render(); setTimeout(() => { if (S.notice === text) { S.notice = null; render() } }, 4000) }
  const recallOn = () => brainOn()
  const many = (n, one) => `${nf(n)} ${one}${n === 1 ? '' : 's'}`
  const kb = (bytes) => bytes < 1024 ? 'under 1 KB' : `${Math.round(bytes / 1024)} KB`
  const short = (p) => String(p || '').replace(/^\/Users\/[^/]+/, '~').replace(/^[A-Z]:\\Users\\[^\\]+/i, '~')

  // ── talking to the host half: an action is one of its commands (`seam.js`), answered when it is done ──
  async function run(cmd, args = {}, busyKey, opts) {
    const s = st()
    if (busyKey) { s.busy[busyKey] = true; render() }
    try { return await knAct(call, cmd, args, opts) } finally { if (busyKey) { delete s.busy[busyKey]; render() } }
  }
  /** The system's folder dialog (the host half's `pick`); the folder picked with what Echo found in it, or null when
   *  cancelled. `what`: `connect`, or `new` (a new vault's folder). */
  async function pick(what) {
    try { return await call('pick', { for: what }) } catch (e) { say(String(e.message || e)); return null }
  }

  async function load() {
    const s = st()
    try { s.data = await get(knState()) } catch { return }
    if (!s.vault && s.lastVault && vaults().some((v) => v.id === s.lastVault)) s.vault = s.lastVault
    if (s.vault && !vault()) s.vault = ''
    if (s.vault) await loadVault()
  }
  async function loadVault() {
    const s = st(), v = vault()
    if (!v) return
    s.lastVault = v.id
    try { localStorage.setItem(VAULT_KEY, v.id) } catch { /* off */ }
    // Another vault shown: its git (the host reads git for the vault shown only).
    if (s.gitFor !== v.id) { s.gitFor = v.id; try { s.data = await get(knState()) } catch { /* app restarting */ } }
    if (v.available === false) return
    // Health's number on its tab (Needs you), wherever the vault opens; the Health tab loads it with its view.
    const h = hl(), want = knHealthLoad(h, { vault: v.id, tab: s.tab, picked: h.picked })
    h.picked = false
    if (want === 'count' && !h.loading) { h.loading = true; loadHealth({ detail: false }).then(() => { h.loading = false; render() }) }
    // Ingest's number on its tab (changes waiting for review), wherever the vault opens; its tab loads it with its view.
    const gi = ing()
    if (s.tab !== 'ingest' && !gi.data && !gi.loading) { gi.loading = true; loadIngest().then(() => { gi.loading = false; render() }) }
    if (s.tab === 'home') await loadHome()
    else if (s.tab === 'pages') {
      if (!s.tree || s.tree.vault !== v.id) await loadTree()
      if (!s.path) s.path = (s.tree && s.tree.index) || ''
      if (s.path && (!s.page || s.page.path !== s.path || s.page.vault !== v.id)) await loadPage()
    } else if (s.tab === 'graph') await loadGraph()
    else if (s.tab === 'settings') await loadSettings()
    else if (s.tab === 'health') { if (want === 'finding') await loadFinding(); else await loadHealth() }
    else if (s.tab === 'ingest') await loadIngestTab()
  }
  async function loadTree() {
    const s = st(), v = vault()
    // A failure is said where the pages would be, with *Try again* (an answer with `error` is one too).
    try {
      const t = await get(`api/kn/${enc(v.id)}/tree`)
      if (t.error) throw new Error(t.error)
      t.vault = v.id; s.tree = t; s.treeError = null
      const notes = toPage((v.paths || {}).notes)
      if (!s.open.size && notes) s.open.add(notes)
    } catch (e) { s.error = String(e.message || e); s.treeError = { vault: v.id, text: String(e.message || e) } }
  }
  async function loadPage() {
    const s = st(), v = vault()
    if (!v || !s.path) return
    try {
      const p = await get(`api/kn/${enc(v.id)}/page?path=${enc(s.path)}`)
      if (p.error) { s.page = { vault: v.id, path: s.path, error: p.error }; return }
      p.vault = v.id
      p.html = withExt(p.html)
      s.page = p
      if (s.rail === 'history') await loadHistory()
    } catch (e) { s.page = { vault: v.id, path: s.path, error: String(e.message || e) } }
  }
  async function loadHistory() {
    const s = st(), v = vault()
    if (!v || !s.path) return
    try { s.hist = await get(`api/kn/${enc(v.id)}/history?path=${enc(s.path)}`); s.hist.path = s.path } catch { s.hist = null }
  }
  async function loadGraph() {
    const s = st(), v = vault()
    const mode = s.gopt.tags ? 'both' : 'links'
    // Stamped with the vault's rev, so the poll sees a change on disk even when the Graph was opened without Pages.
    let rev = s.tree && s.tree.vault === v.id ? s.tree.rev : null
    if (!rev) { try { rev = (await get(`api/kn/${enc(v.id)}/rev`)).rev } catch { /* app restarting */ } }
    if (s.graph && s.graph.vault === v.id && s.graph.mode === mode && s.graph.rev === rev) return
    try { const g = await get(`api/kn/${enc(v.id)}/graph?mode=${mode}`); g.vault = v.id; g.mode = mode; g.rev = rev; s.graph = g } catch (e) { s.error = String(e.message || e); return }
    // A very large vault opens on a local graph (drawing every page would freeze the window); Off shows it all.
    if (s.bigGraph !== v.id) {
      const start = knGraphStart(s.graph.nodes.filter((n) => !n.tag).length, s.path, (s.tree || {}).index)
      if (start && start.sel) { s.gopt.depth = start.depth; s.gopt.sel = start.sel; s.bigGraph = v.id }
    }
  }
  async function loadSettings() {
    const s = st(), v = vault()
    try { s.settings = await get(`api/kn/${enc(v.id)}/settings`) } catch (e) { s.error = String(e.message || e) }
  }
  /** Health's findings, score and history (`/health`, checked by code when asked), stamped with the vault's rev so the
   *  poll sees a change on disk; then the finding shown, with its fix. */
  async function loadHealth({ detail = true } = {}) {
    const v = vault(), h = hl()
    let rev = null
    try { rev = (await get(`api/kn/${enc(v.id)}/rev`)).rev } catch { /* the app restarting */ }
    try {
      const d = await get(`api/kn/${enc(v.id)}/health`)
      if (hl() !== h) return
      if (d.error) { h.error = d.error; return }
      Object.assign(h, { data: d, rev, at: Date.now(), error: null })
    } catch (e) { h.error = String(e.message || e); return }
    if (detail) await loadFinding(true)
  }
  /** The finding shown (the route's, else the first of its kind, else the first): its choices and the fix of the one
   *  picked, with the diff (`health/<key>`, the key encoded once). `force`: asked again though it is the one shown. */
  async function loadFinding(force = false) {
    const v = vault(), h = hl()
    const sel = h.data && knHealthSelect(hlList(), st().hlKey)
    if (!sel) { h.detail = null; return }
    const choice = h.choice[sel.key] || '', want = `${sel.key}\n${choice}`
    if (!force && h.detail && h.detail.want === want) return
    h.want = want
    let d
    try { d = await get(`api/kn/${enc(v.id)}/health/${enc(sel.key)}${choice ? `?choice=${enc(choice)}` : ''}`) } catch (e) { d = { error: String(e.message || e) } }
    if (hl() === h && h.want === want) h.detail = { ...d, key: sel.key, want }
  }
  async function refreshAll() { st().tree = null; st().page = null; st().graph = null; hlReset(false); await load(); render() }

  /** Polled with the window (every 2 s while Knowledge shows): a change on disk shows within a tick. */
  let ticks = 0
  async function tick() {
    const s = st(), v = vault()
    ticks++
    if (ticks % 15 === 0) { try { s.data = await get(knState()) } catch { /* app restarting */ } }
    if (!v || v.available === false || !shown() || !s.vault) return
    // Ingest's sources and runs (an add or a run from the command line, a run ending while another tab shows): every 30 s.
    const gi = s.ing && s.ing.vault === v.id && s.ing.data ? s.ing : null
    if (gi && ticks % 15 === 0 && !(gi.run && gi.run.polling)) { const was = JSON.stringify(gi.data); await loadIngest(); if (JSON.stringify(gi.data) !== was) render() }
    // Home: what came in, git's commits, a conversation — every 30 s while it shows; a change on disk at once (below).
    const hm0 = s.tab === 'home' && s.home && s.home.vault === v.id && s.home.data ? s.home : null
    if (hm0 && ticks % 15 === 0) { const was = JSON.stringify(hm0.data); await loadHome(); if (JSON.stringify(hm0.data) !== was) render() }
    let rev
    try { rev = (await get(`api/kn/${enc(v.id)}/rev`)).rev } catch { return }
    const h = s.hl && s.hl.vault === v.id && s.hl.data ? s.hl : null
    const known = s.tree ? s.tree.rev : s.graph ? s.graph.rev : h ? h.rev : hm0 ? hm0.data.rev : null
    if (!known || rev === known) return
    await loadTree()
    if (s.tab === 'home') await loadHome()
    // Health's findings, its number on the tab and the diff shown follow the change.
    if (h) await loadHealth({ detail: s.tab === 'health' })
    if (s.edit) {
      // Editing: the file changed under the editor? Say so; never replace what is typed.
      try { const p = await get(`api/kn/${enc(v.id)}/page?path=${enc(s.edit.path)}`); if (p.base && p.base !== s.edit.base) s.edit.conflict = { base: p.base, text: p.text, mtime: p.mtime } } catch { /* gone */ }
    } else if (s.path) await loadPage()
    if (s.tab === 'graph') { s.graph = null; await loadGraph() }
    render()
  }

  // ── routing ──
  function routeTo(r) {
    const s = st()
    // Another vault: its Pages open on its own index (Home names no page, so the last vault's would stay otherwise).
    if (r.vault !== s.vault) { s.page = null; s.tree = null; s.graph = null; s.settings = null; s.edit = null; s.hits = null; s.q = ''; s.gq = ''; s.gopt.hidden = []; s.path = ''; s.ver = null }
    s.vault = r.vault || s.lastVault || (vaults()[0] || {}).id || ''
    s.tab = r.tab
    if (s.vault) s.tabs[s.vault] = r.tab
    // Health's part of the route is a finding's key and Ingest's a run, not the page Pages keeps open; Home names none,
    // so Pages opens on the page last read there (or the index).
    if (r.tab === 'health') s.hlKey = r.path || ''
    else if (r.tab === 'ingest') s.ingRun = r.path || ''
    else if (r.tab === 'home') { /* the page Pages has open stays */ }
    else if (r.path !== undefined && r.path !== s.path) { s.path = r.path; s.ver = null }
  }
  /** The route's last part for the tab open now. */
  const here = () => (st().tab === 'home' ? '' : st().tab === 'health' ? st().hlKey || '' : st().tab === 'ingest' ? st().ingRun || '' : st().path || '')
  const goVault = (id, tab = 'home', path = '', opts) => go(knRouteOf({ vault: id, tab, path }), opts)
  /** Opening the Knowledge activity: where the user left it. */
  function home() {
    const s = st()
    const id = s.vault || s.lastVault || lastVaultStored() || ((s.data && s.data.vaults[0]) || {}).id
    return id ? knRouteOf({ vault: id, tab: s.tab || 'home', path: here() }) : KN_BASE
  }
  /** A path Echo found in the vault (vault-relative) as a page's path (relative to its pages folder), or '' when it
   *  isn't under the pages folder. */
  const toPage = (rel) => {
    const r = String(rel || ''), pf = ((vault() || {}).paths || {}).pages || ''
    if (!r) return ''
    return !pf ? r : r.startsWith(`${pf}/`) ? r.slice(pf.length + 1) : ''
  }
  /** A page's HTML from Echo's writer with its web links opened by Echo (`data-ext`: the system's browser). */
  const withExt = (html) => {
    if (!html || !/href="https:/.test(html)) return html
    const t = document.createElement('template')
    t.innerHTML = html
    for (const a of t.content.querySelectorAll('a[href^="https://"]')) a.setAttribute('data-ext', '')
    return t.innerHTML
  }
  /** "Ask the vault": Claude Code in Echo's panel, in the vault as its own project — at its root, where its CLAUDE.md,
   *  AGENTS.md and `.claude/skills` are — on the vault's AI profile; the user asks there, nothing is typed in for them.
   *  Only on the user's click (Echo checks it). The header, Home's card, Settings, every *Ask about it* and a skill's
   *  *Run in Claude* open it here. */
  function askVault() {
    const v = vault()
    if (!v) return
    st().menu = null
    try { ctx.claude.session({ folder: v.root, ...(v.profile ? { profile: v.profile } : {}) }) } catch (e) { say(String(e.message || e)) }
    render()
  }
  /** A page's path on the disk (Copy path). */
  const pagePathAbs = (path) => { const v = vault(), pf = ((v || {}).paths || {}).pages || ''; return v ? `${v.root}/${pf ? `${pf}/` : ''}${path}` : path }
  /** Obsidian's own link to the vault or a page of it (`obsidian://open?path=`), opened by Echo. */
  const obsidianHref = (path) => {
    const v = vault()
    if (!v) return ''
    const pf = (v.paths || {}).pages || ''
    const rel = path ? (pf ? `${pf}/${path}` : path) : ''
    return `obsidian://open?path=${encodeURIComponent(rel ? `${v.root}/${rel}` : v.root)}`
  }

  // ── the header: Knowledge, the switcher, the vault's place, actions ──
  function switcherMenu() {
    const e = knSwitcherEntries(vaults().map((x) => ({ ...x, pages: pagesNow(x) })), recallOn(), [])
    const s = st()
    const item = (x) => {
      switch (x.kind) {
        case 'head': return `<div class="kn-menu-h">${esc(x.label)}</div>`
        case 'sep': return '<div class="menu-sep" role="separator"></div>'
        case 'vault': return `<button class="menu-item kn-mi${x.id === s.vault ? ' on' : ''}" role="menuitem" data-kn="vault" data-id="${esc(x.id)}"><span class="kn-gem sm">${IC.gem}</span><span class="grow">${esc(x.name)}</span><span class="kn-mi-r">${x.available ? `${x.pages == null ? '' : `${nf(x.pages)} pages`}${x.star ? ' · ★ minutes' : ''}` : 'folder not found'}</span></button>`
        case 'connect': return `<button class="menu-item kn-mi" role="menuitem" data-kn="connect">${IC.folder}<span class="grow">${esc(x.label)}</span></button>`
        case 'new': return `<button class="menu-item kn-mi" role="menuitem" data-kn="new">${IC.plus}<span class="grow">${esc(x.label)}</span></button>`
        case 'recall': return `<button class="menu-item kn-mi" role="menuitem" data-kn="recall">${IC.recall}<span class="grow">Intake</span><span class="kn-mi-r">mail and channels</span></button>`
      }
      return ''
    }
    return `<div class="menu kn-switch-menu" role="menu">${e.map(item).join('')}<div class="kn-menu-foot">Each vault is a folder of Markdown you own; Echo changes nothing in it until you save something.</div></div>`
  }
  /** The title and switcher. */
  function title() {
    const s = st(), v = vault()
    const label = v ? v.name : vaults().length ? 'Choose a vault' : 'No vault yet'
    const icon = IC.gem
    return `<h2 class="kn-h2">Knowledge</h2><span class="kn-switch-wrap"><button class="kn-switch" data-kn="switcher" aria-haspopup="menu" aria-expanded="${!!s.switcher}"><span class="kn-gem">${icon}</span><span class="kn-switch-name">${esc(label)}</span><span class="kn-car" aria-hidden="true">▾</span></button>${s.switcher ? switcherMenu() : ''}</span>`
  }
  /** A vault's pages: the tree's when it is that vault's (a page added in Echo counts at once), else as the host said. */
  const pagesNow = (v) => knPagesNow(st().tree, v)
  function head() {
    const s = st(), v = vault()
    if (!v) return `<header class="kn-head">${title()}<span class="grow"></span></header>`
    const g = v.git
    const where = v.available === false ? `<span class="kn-meta warn">${v.given === false ? 'Echo doesn\'t give this folder now' : 'The folder isn\'t there'}</span>`
      : `<span class="kn-meta"><code title="${esc(v.root)}">${esc(short(v.root))}</code>${g ? ` · ${IC.git} ${esc(g.branch || 'detached')}` : ''}${pagesNow(v) != null ? ` · ${nf(pagesNow(v))} pages` : ''}</span>`
    const menu = s.menu === 'vault' ? `<div class="menu kn-head-menu" role="menu"><button class="menu-item" role="menuitem" data-kn="reveal" data-path="">${/Windows/.test(navigator.userAgent) ? 'Show in Explorer' : 'Show in Finder'}</button><a class="menu-item" role="menuitem" data-ext href="${esc(obsidianHref((s.tree || {}).index || toPage((v.paths || {}).index)))}" data-kn="obsidian">Open in Obsidian</a><button class="menu-item" role="menuitem" data-kn="reread">Read the folder again</button><div class="menu-sep" role="separator"></div><button class="menu-item" role="menuitem" data-kn="tab" data-kn-tab="settings">Vault settings</button></div>` : ''
    const acts = v.available === false ? '' : `<button class="btn sm" data-kn="ask" title="Claude Code in this vault, in Echo's panel">${IC.ask} Ask the vault</button><button class="btn sm" data-kn="ing-add">${IC.tray} Add a source</button><button class="btn sm" data-kn="newpage">${IC.plus} New page</button><span class="kn-rel"><button class="icon-btn" data-kn="menu" data-menu="vault" aria-haspopup="menu" aria-expanded="${s.menu === 'vault'}" aria-label="More">${IC.more}</button>${menu}</span>`
    return `<header class="kn-head">${title()}${where}<span class="grow"></span>${acts}</header>`
  }
  function tabs() {
    const s = st()
    const h = s.hl && s.hl.vault === s.vault && s.hl.data
    const gi = s.ing && s.ing.vault === s.vault && s.ing.data
    const n = knTabCounts({ waiting: gi ? knIngestWaiting(gi.runs) : 0, needs: h ? knHealthList(h.findings).needs : 0 })
    const t = (id, label, count, name) => `<button class="tab" role="tab" data-kn="tab" data-kn-tab="${id}" aria-selected="${s.tab === id}"${count ? ` aria-label="${esc(name)}" title="${esc(name)}"` : ''}>${label}${count ? `<span class="kn-cnt" aria-hidden="true">${nf(count)}</span>` : ''}</button>`
    return `<div class="kn-tabs"><div class="tabs" role="tablist">${t('home', 'Home')}${t('pages', 'Pages')}${t('graph', 'Graph')}${t('ingest', 'Ingest', n.ingest, `Ingest, ${n.ingest} to review`)}${t('health', 'Health', n.health, knTabLabel('Health', n.health))}${t('settings', 'Settings')}</div></div>`
  }

  // ── nothing connected yet ──
  function emptyView() {
    const recall = recallOn() ? '<p class="kn-empty-foot">Intake — what Echo reads from your threads\' mail and channels — is in the switcher above.</p>' : ''
    return `<div class="kn-empty"><span class="kn-gem big">${GEM_BIG}</span><h2>Your knowledge, in files you own</h2>
      <p class="kn-empty-lead">A vault is a folder of Markdown — your second brain. Echo shows it, lets you edit and graph it, saves your meeting minutes into it, and Claude answers from it.</p>
      <div class="kn-choices">
        <div class="kn-choice"><h3>${IC.folder} Connect a folder you have</h3><p>An Obsidian vault, a git repository of notes, or any folder of Markdown. Echo maps its index, notes, skills and tags — and changes nothing.</p><button class="btn primary" data-kn="connect">Connect a folder…</button></div>
        <div class="kn-choice"><h3>${IC.plus} Start a new one</h3><p>Echo's twin starter: the folders, an index, tags and terms, a profile to fill, and the <code>/twin</code> and <code>/process-inbox</code> skills — in git.</p><button class="btn" data-kn="new">Start a new vault…</button></div>
      </div>${recall}</div>`
  }
  function missingView(v) {
    if (v.given === false) return `<div class="kn-empty"><span class="kn-gem big warn">${GEM_BIG}</span><h2>Echo doesn't give Knowledge ${esc(v.name)}'s folder now</h2><p class="kn-empty-lead"><code>${esc(v.root)}</code> — Knowledge was removed and installed again, or the folder was given back. Its settings, description and records are kept: pick the folder again to go on. Nothing is saved into it until then.</p><div class="kn-acts"><button class="btn primary" data-kn="give-again">Pick the folder again…</button><button class="btn ghost" data-kn="remove-ask">Remove from Echo…</button></div></div>`
    return `<div class="kn-empty"><span class="kn-gem big warn">${GEM_BIG}</span><h2>${esc(v.name)}'s folder isn't there</h2><p class="kn-empty-lead"><code>${esc(v.root)}</code> can't be found — a disk that isn't connected, or a folder moved. Nothing is saved into it until it's back.</p><div class="kn-acts"><button class="btn primary" data-kn="reread">Look again</button><button class="btn ghost" data-kn="remove-ask">Remove from Echo…</button></div></div>`
  }

  // ── Pages ──
  function treeView() {
    const s = st(), t = s.tree
    if (!t) return knPagesEmpty(t, s.vault, s.treeError) === 'failed' ? '<div class="kn-tree"><p class="kn-tree-none">The pages couldn\'t be listed.</p></div>' : '<div class="kn-tree"><div class="skeleton" style="padding:14px"><i></i><i></i><i></i></div></div>'
    const f = (id, label) => `<button class="${s.filter === id ? 'on' : ''}" data-kn="filter" data-filter="${id}">${label}</button>`
    let list
    if (s.q.trim() && s.hits) {
      list = s.hits.hits.length ? s.hits.hits.map((h) => `<button class="kn-tr${h.path === s.path ? ' on' : ''}" data-kn="open" data-path="${esc(h.path)}" title="${esc(h.path)}">${h.hit === 'tag' ? IC.link : IC.file}<span class="kn-tr-t"><span class="nm">${esc(h.title)}</span>${h.line ? `<span class="kn-tr-sub">${esc(h.line)}</span>` : `<span class="kn-tr-sub">${esc(h.path.replace(/^[^/]*\//, ''))}</span>`}</span></button>`).join('')
        : `<p class="kn-tree-none">Nothing matches “${esc(s.q)}”.</p>`
    } else {
      const rows = knBuildTree(t.pages, { root: t.root || '', filter: s.filter, open: s.open, index: t.index || '' })
      list = rows.map((r) => {
        const pad = `style="padding-left:${6 + r.depth * 14}px"`
        if (r.kind === 'folder') return `<button class="kn-tr" ${pad} data-kn="fold" data-path="${esc(r.path)}" aria-expanded="${r.open}"><span class="kn-car">${r.open ? '▾' : '▸'}</span>${IC.folder}<span class="nm">${esc(r.name)}</span><span class="kn-tr-r">${r.count}</span></button>`
        const sub = r.sub !== undefined ? `<span class="kn-tr-sub">${esc(r.sub || '')}</span>` : ''
        return `<button class="kn-tr${r.path === s.path ? ' on' : ''}" ${pad} data-kn="open" data-path="${esc(r.path)}" title="${esc(r.title)}"><span class="kn-car"></span>${r.index ? IC.index : IC.file}<span class="kn-tr-t"><span class="nm">${esc(r.name)}</span>${sub}</span>${r.index ? '<span class="kn-tr-r">index</span>' : ''}</button>`
      }).join('') || `<p class="kn-tree-none">${s.filter === 'unindexed' ? 'Every page is in the index.' : 'No pages yet.'}</p>`
    }
    return `<div class="kn-tree"><div class="kn-tree-top"><input class="search" id="kn-find" placeholder="Find a page — title, path, #tag, words" aria-label="Find a page" value="${esc(s.q)}" autocomplete="off" spellcheck="false">
      <div class="kn-filters">${f('all', 'All')}${f('recent', 'Recent')}${f('unindexed', 'Not in index')}</div></div>
      <div class="kn-tree-list" data-keep-scroll>${list}</div>
      <div class="kn-tree-foot">${nf(t.pages.length)} pages · sources and templates hidden</div></div>`
  }
  function propsView(p) {
    // Echo's own bookkeeping (which call a note came from) stays in the file, not in the reader.
    const echoKey = ([k, v]) => k === 'echo_call' || (k === 'origin' && v && v.v === 'echo')
    const rows = (p.props || []).filter((r) => r[0] && !['title', 'tags'].includes(r[0]) && !echoKey(r))
    // Tags: the page's own (its `tags` property and its inline #tags), as chips.
    if ((p.tags || []).length) rows.unshift(['tags', { t: 'list', v: p.tags }])
    if (!rows.length) return ''
    const val = ([k, v]) => {
      if (k === 'tags') return `<span class="kn-tags">${(v.v || []).concat(v.t === 'text' && v.v ? [v.v] : []).filter((x) => typeof x === 'string').map((t) => `<span class="tag kn-tag">${esc(String(t).replace(/^#/, ''))}</span>`).join('')}</span>`
      const text = v.t === 'list' ? (v.v || []).join(', ') : String(v.v == null ? '' : v.v)
      const link = /^\[\[(.+?)(\|(.+?))?\]\]$/.exec(text.trim())
      if (link) return `<a class="kn-wl" href="#kn-name:${esc(link[1])}" data-kn-name="${esc(link[1])}">${esc(link[3] || link[1])}</a>`
      if (/^echo:\/\//.test(text)) return `<a href="${esc(text)}" class="kn-src">${IC.link} ${esc(text)}</a>`
      return `<span>${esc(text)}</span>`
    }
    return `<div class="kn-props">${rows.slice(0, 14).map(([k, v]) => `<span class="kn-pk">${esc(k)}</span>${val([k, v])}`).join('')}</div>`
  }
  function readerView() {
    const s = st(), v = vault(), p = s.page
    if (s.edit) return editorView()
    if (s.ver) return versionView()
    if (!s.path) {
      const empty = knPagesEmpty(s.tree, v && v.id, s.treeError)
      if (empty === 'loading') return '<div class="kn-reader"><div class="skeleton" style="padding:24px"><i></i><i></i><i></i><i></i></div></div>'
      if (empty === 'failed') return `<div class="kn-reader"><div class="kn-none"><p class="error">Echo couldn't list this vault's pages: ${esc(String(s.treeError.text).replace(/\.$/, ''))}.</p><button class="btn sm" data-kn="tree-retry" id="kn-tree-retry">Try again</button></div></div>`
      return `<div class="kn-reader"><div class="kn-none"><p>Pick a page on the left${empty === 'no-index' ? ' — this vault has no index page' : ''}.</p></div></div>`
    }
    if (!p || p.path !== s.path) return '<div class="kn-reader"><div class="skeleton" style="padding:24px"><i></i><i></i><i></i><i></i></div></div>'
    if (p.error) return `<div class="kn-reader"><div class="kn-none"><p class="error">${esc(p.error)}</p></div></div>`
    const parts = p.path.split('/'), file = parts.pop()
    const crumbs = `<span class="kn-crumbs" title="${esc(p.path)}">${parts.length ? `<b>${esc(parts.slice(-1)[0])}</b> / ` : ''}${esc(file)}${p.is_index ? ' · the index' : p.source ? ' · a source, read-only' : ''}</span>`
    const menu = s.menu === 'page' ? `<div class="menu kn-page-menu" role="menu"><button class="menu-item" role="menuitem" data-kn="reveal" data-path="${esc(p.path)}">${/Windows/.test(navigator.userAgent) ? 'Show in Explorer' : 'Show in Finder'}</button><button class="menu-item" role="menuitem" data-kn="copy" data-text="${esc(pagePathAbs(p.path))}">Copy path</button><button class="menu-item" role="menuitem" data-kn="ask-about" data-path="${esc(p.path)}">Ask about it</button><button class="menu-item" role="menuitem" data-kn="rail" data-rail="history">History</button></div>` : ''
    const editBtn = p.source ? '<button disabled title="Sources are never edited">Edit</button>' : p.editable ? '<button data-kn="edit">Edit</button>' : `<button disabled title="${p.utf8 === false && (p.size || 0) <= 2 << 20 ? 'Not UTF-8 text: shown as Echo reads it, read only' : 'Too large to edit in Echo'}">Edit</button>`
    const bar = `<div class="kn-bar">${crumbs}<div class="seg" role="group" aria-label="Read or edit"><button aria-pressed="true">Read</button>${editBtn}</div><a class="btn ghost sm" data-ext href="${esc(obsidianHref(p.path))}" data-kn="obsidian" title="Open this page in Obsidian">${IC.ext} Obsidian</a><span class="kn-rel"><button class="icon-btn" data-kn="menu" data-menu="page" aria-haspopup="menu" aria-expanded="${s.menu === 'page'}" aria-label="Page actions">${IC.more}</button>${menu}</span></div>`
    const src = p.source ? `<div class="kn-info kn-src-note">${IC.lock}<span>A source in the vault's inbox, shown as it came. Echo never edits a source.</span><button class="btn ghost sm" data-kn="tab" data-kn-tab="ingest">Open Ingest</button></div>` : ''
    return `<div class="kn-reader" data-keep-scroll>${bar}<article class="kn-doc selectable">${src}${propsView(p)}${p.html}</article></div>`
  }
  function editorView() {
    const s = st(), e = s.edit
    const conflict = e.conflict ? `<div class="kn-warn" role="alert">${IC.warn}<span class="grow"><b>This page changed on disk while you were editing</b>${e.conflict.mtime ? ` (${esc(hm(new Date(e.conflict.mtime)))})` : ''}. Your text isn't saved yet.</span><button class="btn sm" data-kn="compare">${e.compare ? 'Hide theirs' : 'Compare'}</button><button class="btn ghost sm" data-kn="take-theirs">Take theirs</button><button class="btn ghost sm" data-kn="keep-mine" title="Save your text over the change">Keep mine</button></div>` : ''
    const v = vault()
    const note = v && v.commit ? `Save writes the file and commits <b>only this file</b>${v.git && v.git.branch ? ` on <code>${esc(v.git.branch)}</code>` : ''}.` : 'Save writes the file. Commits are off for this vault — you commit.'
    const d = e.compare && e.conflict ? knLineDiff(e.text, e.conflict.text || '') : null
    const right = !(e.compare && e.conflict) ? `<div class="kn-preview kn-doc">${e.preview || ''}</div>`
      : d ? `<div class="kn-theirs kn-diff" role="region" aria-label="The file on disk compared with your text"><div class="hd">− only in your text · + only on disk</div>${d.map(([o, l]) => `<div class="${o === '+' ? 'add' : o === '-' ? 'del' : o === '…' ? 'hd' : ''}">${o === '=' || o === '…' ? ' ' : o} ${esc(l)}</div>`).join('')}</div>`
        : `<textarea class="kn-theirs" readonly aria-label="The file on disk">${esc(e.conflict.text || '')}</textarea>`
    return `<div class="kn-reader kn-editing"><div class="kn-bar"><span class="kn-crumbs">Editing <b>${esc(e.path)}</b>${e.dirty ? ' · not saved' : ''}</span><div class="seg" role="group" aria-label="Read or edit"><button data-kn="edit-cancel">Read</button><button aria-pressed="true">Edit</button></div><button class="btn ghost sm" data-kn="edit-cancel">Cancel</button><button class="btn primary sm" data-kn="save"${e.conflict || st().busy.save ? ' disabled' : ''}>${st().busy.save ? 'Saving…' : 'Save'}</button></div>
      ${conflict}<div class="kn-editor"><textarea id="kn-edit" spellcheck="true" aria-label="The page's Markdown">${esc(e.text)}</textarea>${right}</div>
      <div class="kn-edit-foot">${v && v.commit ? `<label class="kn-msg">Message <input class="search" id="kn-msg" value="${esc(e.message || `Edit ${e.path}`)}" aria-label="Commit message"></label>` : ''}<span class="set-sub">${note}</span></div></div>`
  }
  function versionView() {
    const s = st(), r = s.ver
    if (!r || r.loading) return '<div class="kn-reader"><div class="skeleton" style="padding:24px"><i></i><i></i><i></i></div></div>'
    const lines = String(r.diff || '').split('\n').filter((l) => !/^(diff --git|index |--- |\+\+\+ )/.test(l))
    const diff = lines.map((l) => `<div class="${l.startsWith('@@') ? 'hd' : l.startsWith('+') ? 'add' : l.startsWith('-') ? 'del' : ''}">${esc(l) || ' '}</div>`).join('')
    const v = (s.hist && s.hist.versions || []).find((x) => x.rev === r.rev) || {}
    return `<div class="kn-reader"><div class="kn-bar"><span class="kn-crumbs"><b>${esc(s.path.split('/').slice(-2, -1)[0] || '')}</b> / ${esc(s.path.split('/').pop())} · version of ${esc(v.at ? new Date(v.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : r.rev)}</span><button class="btn sm" data-kn="restore" data-rev="${esc(r.rev)}"${st().busy.restore ? ' disabled' : ''}>Restore this version</button><button class="btn ghost sm" data-kn="ver-close">Back to the page</button></div>
      <div class="kn-doc"><p class="set-sub">${esc(v.message || '')} — ${esc(v.author || '')} · <code>${esc(r.rev)}</code></p><div class="kn-diff">${diff || '<div>No change in this file.</div>'}</div>
      <p class="set-sub">Restoring writes this version's text${vault() && vault().commit ? ' and commits it — nothing is lost' : '; commit it when you are ready'}.</p></div></div>`
  }
  function railView() {
    const s = st(), p = s.page
    const t = (id, label) => `<button class="tab" role="tab" data-kn="rail" data-rail="${id}" aria-selected="${s.rail === id}">${label}</button>`
    let body = ''
    if (!p || p.error || p.path !== s.path) body = ''
    else if (s.rail === 'links') {
      const back = (p.backlinks || []).map((b) => `<button class="kn-bl" data-kn="open" data-path="${esc(b.path)}"><b>${IC.file} ${esc(b.title || b.path.split('/').pop())}</b><span>${esc(b.line || b.path)}</span></button>`).join('') || '<p class="set-sub">Nothing links here yet.</p>'
      const out = (p.links || []).map((l) => l.path ? `<button class="kn-bl" data-kn="open" data-path="${esc(l.path)}"><b>${IC.file} ${esc(l.title || l.path.split('/').pop())}</b></button>` : `<button class="kn-bl missing" data-kn="newpage" data-name="${esc(l.target)}"><b>${IC.file} ${esc(l.target)}</b><span>no such page — make it</span></button>`).join('') || '<p class="set-sub">No links.</p>'
      const idx = p.in_index === false ? `<div class="kn-rail-note">${IC.info}<span>Not in the index — Claude finds pages through it. <button class="btn ghost sm" data-kn="rows" data-path="${esc(p.path)}">Add a row…</button></span></div>` : ''
      body = `${idx}<div><h4>Linked from <span>${(p.backlinks || []).length}</span></h4>${back}</div><div><h4>Links from this page <span>${(p.links || []).length}</span></h4>${out}</div>${(p.local && p.local.nodes.length > 1) ? '<div><h4>Local graph</h4><div class="kn-mini" id="kn-mini"></div></div>' : ''}`
    } else if (s.rail === 'outline') {
      body = (p.outline || []).map(([l, h]) => `<div class="kn-ol l${l}">${esc(h)}</div>`).join('') || '<p class="set-sub">No headings.</p>'
    } else {
      const h = s.hist
      if (!h || h.path !== s.path) body = '<div class="skeleton"><i></i><i></i></div>'
      else if (h.no_history) body = '<p class="set-sub">This vault isn\'t in git, so pages have no versions here.</p>'
      else body = `<div><h4>Versions <span>git</span></h4>${h.versions.map((x, i) => `<button class="kn-hist${s.ver && s.ver.rev === x.rev ? ' on' : ''}" data-kn="version" data-rev="${esc(x.rev)}"><i></i><span><b>${esc(x.message)}</b><span>${esc(x.author)} · ${esc(new Date(x.at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }))}${x.added != null ? ` · +${x.added} −${x.removed}` : ''}${i === 0 ? ' · current' : ''}</span></span></button>`).join('')}</div><p class="set-sub">Each version is a commit. Restoring one makes a new commit — nothing is lost.</p>`
    }
    return `<aside class="kn-rail"><div class="kn-rail-tabs tabs" role="tablist">${t('links', 'Links')}${t('outline', 'Outline')}${t('history', 'History')}</div><div class="kn-rail-body" data-keep-scroll>${body}</div></aside>`
  }
  function pagesView() {
    const narrow = window.innerWidth < 1100
    return `<div class="kn-pages${narrow ? ' no-rail' : ''}">${treeView()}${readerView()}${narrow ? '' : railView()}</div>`
  }

  // ── Graph ──
  const FOLDER_COLORS = ['#9b78ff', '#6cc4f0', '#f0a24a', '#3ccf91', '#f48fb8', '#c6d36a', '#d9b38c', '#b39cff', '#ff9f80', '#7fd1c7']
  const GREY = '#8a8a95'
  /** A live graph on a canvas, laid out by the kn-force block: it moves until it settles, then draws nothing until
   *  something changes. Drag a page and its links pull its neighbours along; drag the background to pan, scroll to zoom.
   *  A click calls `click(id | null)`, a double click `open(id)`. Kept across renders: `mount(box)` puts it back. */
  function graphCanvas(opts) {
    const o = { labels: 'auto', maxFit: 2.2, font: 11, long: 80, ...opts }
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d'), root = document.documentElement
    canvas.className = 'kn-canvas'
    canvas.setAttribute('role', 'img')
    const sim = knForceSim(o.forces)
    const calm = matchMedia('(prefers-reduced-motion: reduce)')
    let W = 1, H = 1, dpr = 1, k = 1, tx = 0, ty = 0, fitting = true, raf = 0, dirty = true, pads = { l: 16, r: 16, t: 16, b: 16 }
    let hover = null, sel = null, drag = null, pan = null, down = null, hits = null, lastClick = null, fly = null, C = {}
    const widths = new Map()
    const css = (v) => getComputedStyle(root).getPropertyValue(v).trim()
    const SX = (n) => n.x * k + tx, SY = (n) => n.y * k + ty
    const zr = () => Math.pow(k, 0.7)
    const rad = (n) => Math.max(2, n.r * zr())
    function theme() {
      C = { text: css('--text'), text2: css('--text-2'), text3: css('--text-3'), accent: css('--accent'), halo: css('--bg'), font: getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif' }
      widths.clear(); dirty = true; kick()
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame) }
    function frame() {
      raf = 0
      if (!canvas.isConnected) return // off the page: it carries on where it was once mounted again
      const live = !sim.settled()
      if (live) { sim.tick(); dirty = true; if (fitting) fit() }
      if (fly) flyStep()
      if (dirty) { draw(); dirty = false }
      if (live || fly) kick()
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const N = sim.nodes(), L = sim.links()
      const f = drag || hover, near = f ? new Set([f, ...f.nb]) : null
      const lit = (l) => f ? l.s === f || l.t === f : !!sel && (l.s === sel || l.t === sel)
      // Links: the plain ones, then the lit ones (the hovered page's, else the selected page's) over them. One stroke
      // each: a path of thousands of segments strokes several times slower than the segments one by one.
      ctx.lineWidth = Math.max(0.6, Math.min(1.4, k * 0.9))
      for (const on of [false, true]) {
        ctx.strokeStyle = on ? C.accent : C.text3
        ctx.globalAlpha = on ? 0.85 : f ? 0.06 : hits ? 0.1 : 0.3
        for (const l of L) {
          if (lit(l) !== on) continue
          const x1 = SX(l.s), y1 = SY(l.s), x2 = SX(l.t), y2 = SY(l.t)
          if ((x1 < 0 && x2 < 0) || (y1 < 0 && y2 < 0) || (x1 > W && x2 > W) || (y1 > H && y2 > H)) continue
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
        }
      }
      // Pages, grouped by colour; what isn't near the hovered page (or isn't found) is dimmed.
      const groups = new Map()
      for (const n of N) {
        const dim = near ? !near.has(n) : hits ? !hits.has(n.id) && n !== sel : false
        const key = `${dim ? 0 : 1}${n.color || C.text3}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(n)
      }
      for (const [key, list] of groups) {
        ctx.globalAlpha = key[0] === '0' ? 0.14 : 1
        ctx.fillStyle = key.slice(1)
        for (const n of list) {
          const x = SX(n), y = SY(n), r = rad(n)
          if (x < -r || y < -r || x > W + r || y > H + r) continue
          ctx.beginPath()
          if (n.shape === 'tag') { ctx.moveTo(x, y - r - 1); ctx.lineTo(x + r + 1, y); ctx.lineTo(x, y + r + 1); ctx.lineTo(x - r - 1, y); ctx.closePath() } else ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      // Rings: the selected page, and what a search found.
      ctx.globalAlpha = 1
      ctx.strokeStyle = C.accent
      for (const n of N) {
        if (n !== sel && !(hits && hits.has(n.id))) continue
        ctx.lineWidth = n === sel ? 2.2 : 1.5
        ctx.beginPath(); ctx.arc(SX(n), SY(n), rad(n) + 3.5, 0, Math.PI * 2); ctx.stroke()
      }
      labels(N, near)
      ctx.globalAlpha = 1
    }
    // Labels: the hovered, dragged or selected page's always (its whole title); its neighbours and search matches next;
    // then the biggest pages, and every page once zoomed in (or in a small graph) — none drawn over another.
    function labels(N, near) {
      const z = zr(), fs = o.font, cands = [], all = N.length <= 80
      ctx.font = `${fs}px ${C.font}`
      for (const n of N) {
        const p = n === hover || n === drag || n === sel || n.pin ? 3 : (hits && hits.has(n.id)) || (near && near.has(n)) ? 2 : 1
        if (p === 1 && (o.labels !== 'auto' || near || hits || (!all && n.r * z < 6 && k < 1.9))) continue
        const x = SX(n), y = SY(n) + rad(n) + 3
        if (x < -300 || x > W + 300 || y < -20 || y > H + 20) continue
        const text = p === 3 ? knShortLabel(n.title || n.label, o.long) : n.label
        let w = widths.get(text)
        if (w == null) { w = ctx.measureText(text).width; widths.set(text, w) }
        cands.push({ text, x, y, w, h: fs, p, r: n.r })
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round'
      for (const c of knLabelPlan(cands, W, H)) {
        ctx.lineWidth = 3; ctx.strokeStyle = C.halo; ctx.strokeText(c.text, c.x, c.y)
        ctx.fillStyle = c.p > 1 ? C.text : C.text2; ctx.fillText(c.text, c.x, c.y)
      }
    }
    function fit() {
      const N = sim.nodes()
      if (!N.length || W < 2) return
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      for (const n of N) { x0 = Math.min(x0, n.x - n.r); y0 = Math.min(y0, n.y - n.r); x1 = Math.max(x1, n.x + n.r); y1 = Math.max(y1, n.y + n.r + 14) }
      const p = pads, aw = Math.max(60, W - p.l - p.r), ah = Math.max(60, H - p.t - p.b)
      k = Math.max(0.05, Math.min(o.maxFit, (aw * 0.94) / Math.max(1, x1 - x0), (ah * 0.94) / Math.max(1, y1 - y0)))
      tx = p.l + aw / 2 - ((x0 + x1) / 2) * k; ty = p.t + ah / 2 - ((y0 + y1) / 2) * k
      dirty = true
    }
    function zoomAt(px, py, f) {
      const nk = Math.max(0.05, Math.min(8, k * f))
      tx = px - ((px - tx) * nk) / k; ty = py - ((py - ty) * nk) / k; k = nk
      fitting = false; fly = null; dirty = true; kick()
    }
    // Flying to a page: the camera eases to it over a moment (at once with reduced motion), following it as it moves.
    function flyStep() {
      const t = calm.matches ? 1 : Math.min(1, (performance.now() - fly.t0) / 380), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const p = pads, ttx = p.l + (W - p.l - p.r) / 2 - fly.n.x * fly.k, tty = p.t + (H - p.t - p.b) / 2 - fly.n.y * fly.k
      k = fly.from.k + (fly.k - fly.from.k) * e; tx = fly.from.tx + (ttx - fly.from.tx) * e; ty = fly.from.ty + (tty - fly.from.ty) * e
      dirty = true
      if (t >= 1) fly = null
    }
    function resize() {
      const r = canvas.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) return
      pads = { l: 16, r: 16, t: 16, b: 16, ...(o.pad ? o.pad() : null) }
      const d = window.devicePixelRatio || 1
      if (r.width !== W || r.height !== H || d !== dpr) {
        dpr = d; W = r.width; H = r.height
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
        if (fitting) fit()
        draw(); dirty = false // a new size clears the canvas: drawn again now, not a frame later
      }
      kick()
    }

    const pt = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
    function nodeAt(p) {
      let best = null, bd = Infinity
      for (const n of sim.nodes()) {
        const d = Math.hypot(SX(n) - p.x, SY(n) - p.y)
        if (d <= Math.max(rad(n), 4) + 3 && d < bd) { best = n; bd = d }
      }
      return best
    }
    function setHover(n) { if (n !== hover) { hover = n; canvas.style.cursor = n ? 'pointer' : ''; dirty = true; kick() } }
    function onDown(e) {
      if (e.button) return
      const p = pt(e), n = nodeAt(p)
      down = { x: p.x, y: p.y, moved: false, n, dx: n ? n.x - (p.x - tx) / k : 0, dy: n ? n.y - (p.y - ty) / k : 0 }
      canvas.setPointerCapture(e.pointerId)
      if (n) { drag = n; hover = n; dirty = true; kick() } else pan = { x: p.x, y: p.y, tx, ty }
    }
    function onMove(e) {
      const p = pt(e)
      if (!down) return setHover(nodeAt(p))
      if (!down.moved) {
        if (Math.hypot(p.x - down.x, p.y - down.y) <= 3) return
        down.moved = true; fitting = false; fly = null
        if (drag) sim.hold(true); else canvas.style.cursor = 'grabbing'
      }
      if (drag) sim.fix(drag.id, (p.x - tx) / k + down.dx, (p.y - ty) / k + down.dy)
      else { tx = pan.tx + p.x - pan.x; ty = pan.ty + p.y - pan.y }
      dirty = true; kick()
    }
    function onUp() {
      if (down && !down.moved) {
        const id = down.n ? down.n.id : null, now = performance.now()
        if (id && o.open && lastClick && lastClick.id === id && now - lastClick.at < 350) { lastClick = null; o.open(id) } else { lastClick = { id, at: now }; if (o.click) o.click(id) }
      }
      if (drag) { sim.free(drag.id); sim.hold(false) }
      drag = null; pan = null; down = null
      canvas.style.cursor = hover ? 'pointer' : ''
      dirty = true; kick()
    }
    function onLeave() { if (!down) setHover(null) }
    function onWheel(e) { e.preventDefault(); const p = pt(e); zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016))) }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    // The theme: Echo's own choice, or the system's appearance.
    const mo = new MutationObserver(theme)
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    const dark = matchMedia('(prefers-color-scheme: dark)')
    dark.addEventListener('change', theme)
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    theme()

    return {
      mount(box) { if (canvas.parentNode !== box) box.appendChild(canvas); resize() },
      /** New nodes and links. `how`: 'fresh' forgets where earlier pages were; 'keep' (a file changed on disk) only
       *  nudges the layout and leaves the camera where the user put it. A first layout warms up out of sight (no burst
       *  from the spiral), one that changed (a filter) moves there in view; with reduced motion both settle first. */
      set(nodes, links, how) {
        const first = how === 'fresh' || !sim.nodes().length
        if (how === 'fresh') sim.forget()
        sim.set(nodes, links, how === 'keep' ? 0.1 : 0.5)
        hover = null; drag = null; down = null
        if (sel) sel = sim.node(sel.id)
        if (hits) hits = knGraphHits(sim.nodes(), o.q || '')
        canvas.setAttribute('aria-label', o.aria ? o.aria(sim.nodes().length, sim.links().length) : '')
        const t0 = performance.now(), budget = calm.matches ? 400 : first ? 120 : 0
        while (!sim.settled() && performance.now() - t0 < budget) sim.tick()
        if (how !== 'keep' || fitting) { fitting = true; fly = null; fit() }
        dirty = true; kick()
      },
      paint(colorOf) { for (const n of sim.nodes()) n.color = colorOf(n); dirty = true; kick() },
      select(id) { const n = id ? sim.node(id) : null; if (n !== sel) { sel = n; dirty = true; kick() } },
      search(q) { o.q = q; hits = knGraphHits(sim.nodes(), q); dirty = true; kick(); return hits ? hits.size : 0 },
      /** The search match with the most links. */
      best() { let b = null; for (const n of sim.nodes()) if (hits && hits.has(n.id) && (!b || n.deg > b.deg)) b = n; return b ? b.id : null },
      center(id) { const n = sim.node(id); if (n) { fitting = false; fly = { t0: performance.now(), from: { k, tx, ty }, n, k: Math.max(k, 1.2) }; kick() } },
      zoom(f) { zoomAt(W / 2, H / 2, f) },
      fit() { fitting = true; fly = null; fit(); kick() },
      destroy() {
        cancelAnimationFrame(raf); raf = 0
        mo.disconnect(); ro.disconnect(); dark.removeEventListener('change', theme)
        canvas.remove()
      },
    }
  }
  let gview = null, mview = null
  /** The folders (or tags) the graph colours, the most pages first: each its colour, the rest grey. */
  function graphGroups(g, by) {
    const count = new Map()
    for (const n of g.nodes) if (!n.tag) for (const x of by === 'tag' ? (n.tags || []).slice(0, 1) : [n.folder || '(top)']) count.set(x, (count.get(x) || 0) + 1)
    const list = [...count].sort((a, b) => b[1] - a[1])
    const top = by === 'tag' ? list.slice(0, 9) : list
    const color = new Map(top.map(([x], i) => [x, FOLDER_COLORS[i % FOLDER_COLORS.length]]))
    const colorOf = (n) => n.tag ? GREY : color.get(by === 'tag' ? (n.tags || [])[0] : n.folder || '(top)') || GREY
    const pages = g.nodes.filter((n) => !n.tag).length
    return { list: top, rest: pages - top.reduce((s, [, c]) => s + c, 0), color, colorOf }
  }
  const folderName = (fo) => fo === '(top)' ? 'top level' : `${fo}/`
  function graphView() {
    const s = st(), g = s.graph, o = s.gopt
    if (!g) return '<div class="kn-graph-wrap"><div class="skeleton" style="padding:24px"><i></i><i></i></div></div>'
    if (g.error) return `<div class="kn-graph-wrap"><p class="error" style="padding:20px">${esc(g.error)}</p></div>`
    const f = knFilterGraph(g, { hideIndex: o.hideIndex, isolated: o.isolated, tags: o.tags, focus: o.depth ? o.sel : null, depth: o.depth, hidden: o.hidden })
    const isolated = knIsolatedCount(g, o.hideIndex, o.hidden, o.tags)
    const alone = o.hideIndex && (g.hubs || []).length ? 'Linked only from the index, or not at all.' : 'No links in or out. <a href="#" data-kn="tab" data-kn-tab="settings">See Checks</a>'
    const seg = (key, vals) => `<div class="seg" role="group">${vals.map(([v, l]) => `<button data-kn="gopt" data-key="${key}" data-val="${v}" aria-pressed="${String(o[key]) === String(v)}">${l}</button>`).join('')}</div>`
    const sw = (key, label, sub) => `<div class="kn-gc-row"><span><b>${label}</b>${sub ? `<span class="set-sub">${sub}</span>` : ''}</span><button class="sw${o[key] ? ' on' : ''}" role="switch" aria-checked="${!!o[key]}" data-kn="gopt" data-key="${key}" data-val="${!o[key]}" aria-label="${esc(key === 'isolated' ? 'Show isolated pages' : label)}"></button></div>`
    const sel = o.sel && g.nodes.find((n) => n.id === o.sel)
    const tags = sel && !sel.tag ? (sel.tags || []).slice(0, 8).map((t) => `<span class="tag">#${esc(t)}</span>`).join('') : ''
    const card = sel ? `<div class="kn-gcard"><div class="kn-gcard-h"><b>${esc(sel.title || sel.id)}</b><button class="icon-btn" data-kn="gsel" data-id="" aria-label="Close">${IC.close}</button></div><div class="set-sub"><code>${esc(sel.id)}</code></div>
      <div class="kn-nums"><div><b>${g.edges.filter(([a]) => a === sel.id).length}</b><span>links out</span></div><div><b>${g.edges.filter(([, b]) => b === sel.id).length}</b><span>links in</span></div><div><b>${(sel.tags || []).length}</b><span>tags</span></div></div>
      ${tags ? `<div class="kn-gtags">${tags}</div>` : ''}
      ${sel.tag ? '' : `<div class="kn-acts"><button class="btn primary sm" data-kn="open-tab" data-path="${esc(sel.id)}">Open page</button><button class="btn sm" data-kn="ask-about" data-path="${esc(sel.id)}">${IC.ask} Ask about it</button></div><button class="btn ghost sm" data-kn="gopt" data-key="depth" data-val="${o.depth ? 0 : 1}">${IC.graph} ${o.depth ? 'The whole graph' : 'Its local graph'}</button>`}</div>` : ''
    const gr = graphGroups(g, o.color)
    const off = new Set(o.hidden || [])
    const legend = o.color === 'folder'
      ? `<div class="kn-legend">${gr.list.map(([fo, c]) => `<button class="kn-leg${off.has(fo) ? ' off' : ''}" data-kn="gfold" data-folder="${esc(fo)}" aria-pressed="${!off.has(fo)}" title="${off.has(fo) ? 'Show' : 'Hide'} the pages in ${esc(folderName(fo))}"><i style="background:${gr.color.get(fo)}"></i>${esc(folderName(fo))} <b>${nf(c)}</b></button>`).join('')}</div>`
      : `<div class="kn-legend">${gr.list.map(([t, c]) => `<span class="kn-leg"><i style="background:${gr.color.get(t)}"></i>#${esc(t)} <b>${nf(c)}</b></span>`).join('')}${gr.rest ? `<span class="kn-leg"><i style="background:${GREY}"></i>other or none <b>${nf(gr.rest)}</b></span>` : ''}</div>`
    const big = s.bigGraph === g.vault && o.depth ? '<span>Over 5,000 pages, so the graph starts around one page — Local graph <b>Off</b> draws them all</span>' : ''
    return `<div class="kn-graph-wrap"><div class="kn-graph" id="kn-graph"></div>
      <div class="kn-gctl"><div class="kn-gfind"><input class="search" id="kn-gfind" placeholder="Find pages and paths" aria-label="Find in the graph" value="${esc(s.gq)}" autocomplete="off" spellcheck="false"><span class="kn-gfind-n" id="kn-gfind-n" aria-live="polite"></span></div>
        <div class="kn-gc-row">Colour by ${seg('color', [['folder', 'Folder'], ['tag', 'Tag']])}</div>
        <div class="kn-gc-row">Local graph ${seg('depth', [[0, 'Off'], [1, '1'], [2, '2'], [3, '3']])}</div>
        <div class="menu-sep"></div>
        ${sw('hideIndex', 'Hide index pages', g.hubs && g.hubs.length ? `${esc(g.hubs.map((h) => h.split('/').pop()).join(', '))} links to most pages; hidden, the real structure shows.` : '')}
        ${sw('isolated', `Show isolated pages${isolated ? ` <span class="tag kn-warn-tag">${isolated}</span>` : ''}`, isolated ? alone : '')}
        ${sw('tags', 'Tags as nodes')}
      </div>
      <div class="kn-gstats">${big}<span><b>${nf(f.nodes.filter((n) => !n.tag).length)}</b> pages</span><span><b>${nf(f.edges.length)}</b> links</span>${o.hideIndex && (g.hubs || []).length ? '<span>index hidden</span>' : ''}${off.size ? `<span>${many(off.size, 'folder')} hidden</span>` : ''}</div>
      ${card}${legend}
      <div class="kn-gzoom"><button class="icon-btn" data-kn="gzoom" data-f="in" aria-label="Zoom in" title="Zoom in">${IC.plus}</button><button class="icon-btn" data-kn="gzoom" data-f="out" aria-label="Zoom out" title="Zoom out">${IC.minus}</button><button class="icon-btn" data-kn="gzoom" data-f="fit" aria-label="Fit the graph" title="Fit the graph">${IC.fit}</button></div></div>`
  }
  function drawGraph() {
    const s = st(), g = s.graph, box = document.getElementById('kn-graph')
    if (!g || !box) return
    const o = s.gopt
    if (!gview || gview.vault !== g.vault) {
      if (gview) gview.destroy()
      gview = graphCanvas({
        click: (id) => { const x = st().gopt; if (id || !x.depth) { x.sel = id; render() } },
        open: (id) => { if (!id.startsWith('#')) openPage(id) },
        // The controls sit over the graph's left side: fit it to what's left of them.
        pad: () => { const c = document.querySelector('.kn-gctl'); return { l: c ? c.offsetLeft + c.offsetWidth + 16 : 16, r: 16, t: 16, b: 48 } },
        aria: (n, m) => `Graph of ${many(n, 'page')} and ${many(m, 'link')}`,
      })
      gview.vault = g.vault
    }
    gview.mount(box)
    const gr = graphGroups(g, o.color)
    // What is shown; a new `rev` alone (a file changed on disk) keeps the camera and the layout as they are.
    const shown = `${g.mode}:${o.hideIndex}:${o.isolated}:${o.tags}:${o.depth}:${o.depth ? o.sel : ''}:${(o.hidden || []).join('\n')}`
    if (gview.shown !== shown || gview.rev !== g.rev) {
      const f = knFilterGraph(g, { hideIndex: o.hideIndex, isolated: o.isolated, tags: o.tags, focus: o.depth ? o.sel : null, depth: o.depth, hidden: o.hidden })
      gview.set(f.nodes.map((n) => ({ ...n, title: n.title || n.id, label: knShortLabel(n.title || n.id.split('/').pop()), color: gr.colorOf(n), shape: n.tag ? 'tag' : '' })), f.edges, gview.shown === shown ? 'keep' : '')
      gview.shown = shown; gview.rev = g.rev; gview.ckey = o.color
    } else if (gview.ckey !== o.color) { gview.paint(gr.colorOf); gview.ckey = o.color }
    gview.select(o.sel || null)
    const n = gview.search(s.gq), el = document.getElementById('kn-gfind-n')
    if (el) el.textContent = s.gq.trim() ? (n ? nf(n) : 'none') : ''
  }
  function drawMini() {
    const s = st(), p = s.page, box = document.getElementById('kn-mini')
    if (!p || !box || !p.local) return
    if (!mview) mview = graphCanvas({ labels: 'hover', maxFit: 1.6, long: 34, forces: { distance: 18, charge: 26 }, click: (id) => { if (id && id !== (st().page || {}).path) openPage(id) }, aria: (n, m) => `This page's local graph: ${many(n, 'page')} and ${many(m, 'link')}` })
    mview.mount(box)
    const key = `${p.vault}:${p.path}:${p.base}`
    if (mview.key === key) return
    mview.key = key
    mview.set(p.local.nodes.map((n) => ({ id: n.id, title: n.title || n.id, label: knShortLabel(n.title || n.id.split('/').pop(), 24), color: n.me ? '#9b78ff' : '#6cc4f0', pin: !!n.me })), p.local.edges, 'fresh')
  }

  // ── a vault's Settings ──
  function settingsView() {
    const s = st(), x = s.settings, v = vault()
    if (!x || !v || x.vault.id !== v.id) return '<div class="kn-vset"><div class="skeleton" style="padding:24px"><i></i><i></i><i></i></div></div>'
    const d = v.detected || {}, P = v.paths || {}
    const row = (t, sub, ctl, id) => `<div class="set-row"${id ? ` id="${id}"` : ''}><div><b>${t}</b><div class="set-sub">${sub}</div></div><div class="set-ctl">${ctl}</div></div>`
    const editing = s.ovr.key
    const change = (key, label, value, sub) => editing === key
      ? `<div class="set-row"><div><b>${label}</b><div class="kn-inline"><input class="search" id="kn-ovr" value="${esc(s.ovr.value)}" aria-label="${esc(label)}" spellcheck="false"><button class="btn primary sm" data-kn="ovr-save">Save</button><button class="btn ghost sm" data-kn="ovr-cancel">Cancel</button>${(v.overrides || {})[key] ? '<button class="btn ghost sm" data-kn="ovr-reset">As detected</button>' : ''}</div>${s.ovr.error ? `<div class="error">${esc(s.ovr.error)}</div>` : ''}</div><div></div></div>`
      : row(label, `${value ? `<code>${esc(value)}</code>` : '<span class="set-sub">none found</span>'}${sub ? ` — ${sub}` : ''}${(v.overrides || {})[key] ? ' <span class="tag">changed by you</span>' : ''}`, `<button class="btn ghost sm" data-kn="ovr" data-key="${key}" data-value="${esc(value || '')}">Change</button>`)
    const nav = [['vs-about', 'What Claude knows'], ['vs-structure', 'Structure'], ['vs-minutes', 'Meeting minutes'], ['vs-people', 'People'], ['vs-ingest', 'Ingest'], ['vs-ask', 'Ask'], ['vs-schema', 'Schema & vocabulary'], ['vs-skills', 'Skills'], ['vs-git', 'Git & AI']]
    const m = v.minutes || {}
    const sel = (key, opts, val) => `<select class="set-in" data-kn-set="${key}" aria-label="${esc(key)}">${opts.map(([k, l]) => `<option value="${k}"${k === val ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`
    const past = x.past && x.past.count ? row(`Save past minutes <span class="tag">${x.past.count}</span>`, `Earlier calls that fit this rule and aren't saved here yet${x.past.first && x.past.first.length ? `: ${x.past.first.slice(0, 3).map((f) => esc(f.title)).join(', ')}${x.past.count > 3 ? '…' : ''}` : ''}. One note each${v.commit ? ', one commit' : ''}.`, `<button class="btn sm" data-kn="past"${s.busy.past ? ' disabled' : ''}>${s.busy.past ? 'Saving…' : `Save ${x.past.count}…`}</button>`) : ''
    const skills = (x.skills || []).filter((k) => k.kind !== 'agents')
    const agents = (x.skills || []).filter((k) => k.kind === 'agents')
    const skillRow = (k) => row(`${esc(k.name)} <span class="tag">${k.kind === 'command' ? '.claude/commands' : '.claude/skills'}</span>`, k.description ? `<span class="kn-clamp" title="${esc(k.description)}">${esc(k.description)}</span>` : 'no description', `<button class="btn sm" data-kn="run-skill" data-name="${esc(k.name)}" title="Claude Code opens in this vault; /${esc(k.name)} is copied to paste there">Run in Claude</button>${toPage(k.path) ? `<button class="btn ghost sm" data-kn="open-tab" data-path="${esc(toPage(k.path))}">Open</button>` : ''}`)
    const twinRow = x.has_twin || x.global_twin || x.twin_made ? row(`Use /twin from any Claude Code session${x.global_twin ? ` <span class="tag ok">installed as /${esc(x.global_twin)}</span>` : ''}`, x.global_twin ? `In <code>~/.claude/skills/${esc(x.global_twin)}/</code> — your own Claude Code. Sessions on other AI profiles don't see it.` : `A copy of this vault's twin skill with its paths, in <code>~/.claude/skills/${esc(x.global_twin_name)}/</code> — shown first, yours to remove.`, x.global_twin ? `<button class="btn sm" data-kn="twin-global-ask">Update…</button><button class="btn ghost sm" data-kn="twin-remove">Remove</button>` : `<button class="btn sm" data-kn="twin-global-ask">Install…</button>`)
      : row('twin <span class="tag acc">Echo starter</span>', 'Find, answer and remember — not in this vault. Adds <code>.claude/skills/twin/SKILL.md</code>; nothing else changes.', `<button class="btn sm" data-kn="twin-add"${s.busy.twin ? ' disabled' : ''}>Add…</button>`)
    const g = v.git
    const profiles = (typeof ai === 'function' ? ai().profiles : []) || []
    // Settings → Ingest (K15-03): the vault's skill, or the one Echo finds; Ask's Research (D39).
    const ingSkill = x.ingest_skill, skillChosen = (v.ingest || {}).skill || ''
    const skillSel = skills.length ? `<select class="set-in" id="kn-set-ingest-skill" data-kn-set="ingest.skill" aria-label="The ingest skill"><option value=""${skillChosen ? '' : ' selected'}>${esc(x.ingest_found ? `Found: ${x.ingest_found}` : 'None found')}</option>${skills.map((k) => `<option value="${esc(k.name)}"${k.name === skillChosen ? ' selected' : ''}>${esc(k.name)}</option>`).join('')}</select>` : '<span class="set-sub">no skills</span>'
    return `<div class="kn-vset"><nav class="kn-vset-nav">${nav.map(([id, l]) => `<button class="set-nav" data-kn="vs-go" data-to="${id}">${l}</button>`).join('')}<button class="set-nav" data-kn="tab" data-kn-tab="health">Health<span class="kn-nav-r" aria-hidden="true">→</span></button><span class="grow"></span><button class="set-nav danger" data-kn="remove-ask">Remove from Echo…</button></nav>
    <div class="kn-vset-main" data-keep-scroll>
      ${hooks.about ? hooks.about(v) : ''}
      <section class="set-sec" id="vs-structure"><h3>Structure</h3>${v.structure === 'confirmed' ? '' : `<div class="kn-warn kn-structure-b"><span class="grow"><b>Echo found this vault's shape and doesn't use it yet.</b> ${d.pages ? `Its pages look to be in <code>${esc(d.pages)}/</code>${d.sources ? `, its sources in <code>${esc(d.sources)}/</code>` : ''}${d.templates ? `, its templates in <code>${esc(d.templates)}/</code>` : ''}; until` : 'Until'} you confirm it, Echo reads the whole folder as pages, as Obsidian vaults 0.8 did. Changing a folder below confirms it too.</span><button class="btn primary sm" data-kn="confirm-structure"${s.busy.structure ? ' disabled' : ''}>${s.busy.structure ? 'Confirming…' : 'Confirm the structure'}</button></div>`}<div class="set-card">
        ${row('Name', '', `<input class="set-in" data-kn-set="name" value="${esc(v.name)}" aria-label="The vault's name">`)}
        ${change('pages', 'Pages live in', P.pages === '' ? '(the folder itself)' : P.pages, d.obsidian ? 'Obsidian opens this folder.' : '')}
        ${change('index', 'Index', P.index, x.index_bytes ? `${kb(x.index_bytes)}${x.index_bytes > 60000 ? ' — large: Claude searches it rather than reading it whole' : ''}` : '')}
        ${change('notes', 'Meeting notes', P.notes, d.notes_count != null ? `${many(d.notes_count, 'note')}, named <code>${esc(P.naming || '{date}-{slug}.md')}</code>` : '')}
        ${change('sources', 'Sources', P.sources, `never edited by Echo${(d.ledgers || []).length ? ` · ledgers ${d.ledgers.map((l) => `<code>${esc(l)}</code>`).join(', ')}` : ''}`)}
        ${row('Read again', 'Detect the structure again — your changes above stay.', `<button class="btn sm" data-kn="reread"${s.busy.reread ? ' disabled' : ''}>Read again</button>`)}
      </div></section>
      <section class="set-sec" id="vs-minutes"><h3>Meeting minutes</h3><div class="set-card">
        ${row('Save each call\'s minutes here', 'After Echo writes them. Calls recorded with another AI profile are never saved here by themselves.', sel('minutes', [['auto', 'Automatically'], ['ask', 'Only when I ask'], ['off', 'Never']], m.mode))}
        ${row('As', `<code>${esc(P.notes || 'notes')}/${esc(P.naming || '{date}-{slug}.md')}</code> · a row in <code>${esc((P.index || 'the index').split('/').pop())}</code> · client and thread in the properties · tag`, `<input class="set-in sm" data-kn-set="tag" value="${esc(x.meeting_tag)}" aria-label="The tag meeting notes get">`)}
        ${row('Also include', 'The transcript and the meeting chat stay in Echo unless you add them.', `<label class="kn-check"><input type="checkbox" data-kn-set="transcript"${m.transcript ? ' checked' : ''}> Transcript</label><label class="kn-check"><input type="checkbox" data-kn-set="chat"${m.chat ? ' checked' : ''}> Chat</label>`)}
        ${row('Preview', 'How a call lands here: the newest call\'s note and its index row. Nothing is written.', '<button class="btn ghost sm" data-kn="sample">Preview…</button>')}
        ${past}
      </div></section>
      <section class="set-sec" id="vs-people"><h3>People</h3><div class="set-card">
        ${row('Person pages', `Echo's people of the threads whose calls come here, a page each in <code>${esc((x.people || {}).dir || 'people')}/</code>. Echo writes only its own properties — <code>origin</code>, <code>echo</code>, <code>reports_to</code>, <code>reports</code>, <code>threads</code>; the rest of a page is yours. ${m.mode === 'auto' ? 'Updated with each call\'s minutes and once a day.' : 'Only when you click: this vault\'s minutes aren\'t saved automatically.'}${(x.people || {}).last ? ` Last: ${esc(String(x.people.last.at || '').slice(0, 10))}, ${many(x.people.last.added || 0, 'new page')}, ${x.people.last.changed || 0} changed.` : ''}${(x.people || {}).theirs ? ` <span class="warn">${x.people.theirs === 1 ? '1 person has' : `${nf(x.people.theirs)} people have`} a page of yours: Update person pages adopts ${x.people.theirs === 1 ? 'it' : 'them'}.</span>` : ''}${((x.people || {}).kept_first || []).map((k) => ` <span class="warn">${esc(k.name)}: your page has its own ${esc((k.keys || []).join(', '))}, so Echo leaves it.</span>`).join('')}${(x.people || {}).kept > ((x.people || {}).kept_first || []).length ? ` <span class="warn">And ${nf(x.people.kept - x.people.kept_first.length)} more.</span>` : ''}${(x.people || {}).unknown ? ` <span class="set-sub">${x.people.unknown === 1 ? '1 thread' : `${nf(x.people.unknown)} threads`} left out: Echo can't tell ${x.people.unknown === 1 ? 'its' : 'their'} AI profile yet.</span>` : ''}`, `<button class="btn sm" data-kn="people-sync"${s.busy.people ? ' disabled' : ''}>${s.busy.people ? 'Updating…' : 'Update person pages'}</button>`)}
      </div></section>
      <section class="set-sec" id="vs-ingest"><h3>Ingest</h3><div class="set-card">
        ${row('The ingest skill', ingSkill ? `Runs on a copy of the vault when you prepare changes. In <code>${esc(ingSkill.path)}</code>.` : 'None found: Ingest offers the starter\'s <code>process-inbox</code>.', skillSel)}
        ${row('New calls\' minutes', 'After a call\'s minutes are saved here by their rule. Only calls on this vault\'s AI profile.', `<div class="kn-radios" id="kn-set-ingest-calls" role="radiogroup" aria-label="New calls\' minutes">${knCallsRule((v.ingest || {}).calls).map((o) => `<label class="kn-radio"><input type="radio" id="kn-set-ingest-calls-${o.k}" name="kn-ingest-calls" value="${o.k}" data-kn-set="ingest.calls"${o.on ? ' checked' : ''}><span><b>${esc(o.label)}</b><span class="set-sub">${esc(o.sub)}</span></span></label>`).join('')}</div>`)}
        ${row('Prepared in batches', 'With Add and prepare changes: one run over everything queued, once this many sources wait or the first has waited this many hours — never during a call.', `<span class="kn-batch"><input class="set-in sm" type="number" min="1" max="100" id="kn-set-batch-sources" data-kn-set="ingest.batch_sources" value="${esc(String((v.ingest || {}).batch_sources || 5))}" aria-label="Sources in a batch"> sources or <input class="set-in sm" type="number" min="1" max="168" id="kn-set-batch-hours" data-kn-set="ingest.batch_hours" value="${esc(String((v.ingest || {}).batch_hours || 24))}" aria-label="Hours the first source waits at most"> hours</span>`)}
        ${row('What a run may do', 'Read and write pages in its copy, with this skill only. No commands, no web. A step of the skill that needs a command is skipped and named in the run\'s report.', '<span class="tag">no commands</span>')}
      </div></section>
      <section class="set-sec" id="vs-ask"><h3>Ask</h3><div class="set-card">
        ${row('Ask the vault', 'Claude Code in the vault\'s folder, in Echo\'s panel: its <code>CLAUDE.md</code>, skills and rules for agents come with it. You ask there; its conversation is kept.', `<button class="btn ghost sm" data-kn="ask">${IC.ask} Ask the vault</button>`)}
      </div></section>
      <section class="set-sec" id="vs-schema"><h3>Schema & vocabulary</h3><div class="set-card">
        ${(d.schema || []).length ? row(d.schema.map((f) => `<code>${esc(f)}</code>`).join(' · '), 'How agents work in this vault — the rules every skill follows', toPage(d.schema[0]) ? `<button class="btn ghost sm" data-kn="open-tab" data-path="${esc(toPage(d.schema[0]))}">Open</button>` : '') : row('No rules for agents', 'An <code>AGENTS.md</code> or <code>CLAUDE.md</code> at the vault\'s root tells Claude how to work here.', '')}
        ${(d.taxonomies || []).map((t) => row(`<code>${esc(t)}</code>`, /TAG/i.test(t) ? `${x.tags != null ? `${x.tags} tags · ` : ''}the type tag first` : `${x.terms != null ? `${x.terms} terms with their mishearings` : 'canonical names and terms'}`, toPage(t) ? `<button class="btn ghost sm" data-kn="open-tab" data-path="${esc(toPage(t))}">Open</button>` : '')).join('')}
      </div></section>
      <section class="set-sec" id="vs-skills"><h3>Skills</h3><div class="set-card">
        ${skills.map(skillRow).join('') || row('No skills', 'Skills in <code>.claude/skills</code> or <code>.claude/commands</code> appear here.', '')}
        ${agents.length ? row(`${agents.length} for other agents`, `${agents.map((k) => esc(k.name)).join(' · ')} — in <code>.agents/skills/</code>`, '') : ''}
        ${twinRow}
      </div></section>
      <section class="set-sec" id="vs-checks"><h3>Checks</h3><div class="kn-info">${IC.info}<span>Checks are in <button class="kn-lnk" data-kn="tab" data-kn-tab="health">Health</button>.</span></div></section>
      <section class="set-sec" id="vs-git"><h3>Git & AI</h3><div class="set-card">
        ${row('Git', g ? `${(g.remotes || []).length ? `<code>${esc(g.remotes.join(', '))}</code> · ` : ''}${IC.git} ${esc(g.branch || 'detached HEAD')}${g.changed ? ` · ${g.changed} file${g.changed === 1 ? '' : 's'} changed and not committed — yours; Echo never commits them` : ' · clean'}${g.busy ? ` · <span class="warn">${esc(g.busy)}</span>` : ''}` : (st().data || {}).git ? 'Not a git repository — pages have no history in Echo.' : 'git isn\'t installed — pages have no history in Echo.', `<button class="btn ghost sm" data-kn="reveal" data-path="">Reveal</button>`)}
        ${g ? row('Commit what Echo writes', v.commit ? 'One commit per change, only Echo\'s files; never a push, pull or branch switch.' : 'Off: Echo writes the files and leaves committing to you.', `<button class="sw${v.commit ? ' on' : ''}" role="switch" aria-checked="${!!v.commit}" data-kn="set-bool" data-key="commit" data-val="${!v.commit}" aria-label="Commit what Echo writes"></button>`) : ''}
        ${row('AI for this vault', 'Ask the vault opens Claude Code on this profile. Only calls recorded on it are saved here by themselves.', `<select class="set-in" data-kn-set="profile" aria-label="AI profile">${profiles.map((p) => `<option value="${esc(p.id)}"${p.id === v.profile ? ' selected' : ''}>${esc(p.name)}</option>`).join('') || `<option>${esc(v.profile)}</option>`}</select>`)}
        ${x.in_home && v.profile !== (st().data || {}).default_profile ? row('Inside Echo\'s data folder', 'Claude · Echo (the folder session) can read every file of the data folder, this vault too, whatever its profile.', '') : ''}
        ${row('Echo\'s index of this vault', `In Echo's data folder, not in the vault${x.cache_bytes ? ` · ${kb(x.cache_bytes)}` : ''} · rebuilt on its own`, `<button class="btn ghost sm" data-kn="reread">Rebuild</button>`)}
      </div></section>
    </div></div>`
  }

  // ── Health (spec K16): the score and its trend, how Health checks (*Run AI checks*, the check going with *Stop*), the
  // findings by group and kind, the finding shown with its fix as a diff — an AI finding with its quotes. Findings are
  // named by key only, and a fix is sent back with the base and sha of the diff shown (ruling R37). Titles, page names,
  // lines, quotes, the check's note, reasons and diff lines are others' words: esc(). ──
  function hl() {
    const s = st()
    if (!s.hl || s.hl.vault !== s.vault) s.hl = knHealthState(s.vault)
    return s.hl
  }
  /** After a change to the vault's settings (the meeting tag, the index, the pages' folder…): Health emptied — how it is
   *  looked at kept — and asked again, since the poll watches the pages' rev and a setting doesn't change it. */
  function hlReset(reload = true) {
    const s = st(), v = vault()
    s.hl = knHealthState(s.vault, s.hl && s.hl.vault === s.vault ? s.hl : null)
    if (reload && v && v.available !== false) loadHealth({ detail: s.tab === 'health' }).then(render)
  }
  /** Once the page is drawn, focus the first of `selectors` that is there and enabled: where the user was. */
  const focusOn = (...selectors) => setTimeout(() => { for (const q of selectors) { const el = document.querySelector(q); if (el && !el.disabled) { el.focus(); return } } })
  const kindId = (k) => `kn-fi-${String(k.kind).replace(/[^\w-]/g, '')}${k.ignored ? '-x' : ''}`
  const hlList = () => { const h = hl(), d = h.data || {}; return knHealthList(d.findings, { filter: h.filter, ignored: d.ignored, showIgnored: h.showIgnored }) }
  const hlFinding = (key) => { const d = hl().data || {}; return [...(d.findings || []), ...(d.ignored || [])].find((f) => f.key === key) || null }
  const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  /** A finding's pages, each once with its lines. */
  const pagesOf = (f) => { const m = new Map(); for (const [p, l] of (f && f.pages) || []) { if (!m.has(p)) m.set(p, []); if (l != null) m.get(p).push(l) } return [...m] }
  const where = (p, lines) => `${p}${lines.length ? ` · ${lines.length === 1 ? 'line' : 'lines'} ${lines.join(', ')}` : ''}`
  const hunkRows = (hunks) => (hunks || []).map((h, k) => (k ? '<div class="hd">…</div>' : '') + h.map(([o, l]) => `<div class="${o === '+' ? 'add' : o === '-' ? 'del' : ''}">${o === '+' ? '+' : o === '-' ? '−' : ' '} ${esc(l)}</div>`).join('')).join('')
  const pmOf = (x) => `<span class="kn-pm">${x.plus ? `<span class="a">+${x.plus}</span>` : ''}${x.plus && x.minus ? ' ' : ''}${x.minus ? `<span class="d">−${x.minus}</span>` : ''}</span>`
  function healthView() {
    const h = hl(), d = h.data
    if (!d) return `<div class="kn-hl">${h.error ? `<div class="kn-none"><p class="error">${esc(h.error)}</p></div>` : '<div class="skeleton" style="padding:24px"><i></i><i></i><i></i></div>'}</div>`
    const list = hlList(), sel = knHealthSelect(list, st().hlKey)
    // A check again that failed: said over what Health found before, until one works.
    const stale = h.error ? `<div class="kn-warn kn-hl-err" role="alert">${IC.warn}<span class="grow">Health couldn't check again: ${esc(h.error)}. What it found before is below.</span><button class="btn sm" data-kn="hl-retry" id="kn-hl-retry">Check again</button></div>` : ''
    return `<div class="kn-hl" data-keep-scroll><div class="kn-hl-in">${stale}${hlTop(list)}<div class="kn-hl-f${sel ? '' : ' kn-hl-none'}">${hlFindings(list, sel)}${sel ? hlDetail(sel) : ''}</div></div></div>`
  }
  /** The score card and *How Health checks* (K16-01). */
  function hlTop(list) {
    const h = hl(), d = h.data, v = vault(), sc = d.score || {}, total = sc.total == null ? 100 : sc.total
    const today = isoDay(), tr = knHealthTrend(d.history, today, 30), p = knTrendPath(tr.points, { w: 300, h: 44 })
    const word = total >= 80 ? 'Tidy' : total >= 60 ? 'Mostly tidy' : 'Needs tidying'
    const head = list.needs ? `${word}, with ${many(list.needs, 'thing')} only you can decide` : word
    const delta = tr.delta == null ? '' : `<span class="tag ${tr.delta >= 0 ? 'ok' : 'warn'}">${tr.delta >= 0 ? '+' : '−'}${Math.abs(tr.delta)} in 30 days</span>`
    const day = (x) => (x.day === today ? 'today' : new Date(`${x.day}T12:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' }))
    const since = tr.first && tr.first.day !== tr.last.day ? `${day(tr.first)} ${tr.first.score} · ${day(tr.last)} ${tr.last.score}` : 'The trend starts today: one point a day.'
    const dot = ([x, y], r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--accent)"/>`
    const spark = `<svg class="kn-spark" viewBox="0 0 300 44" preserveAspectRatio="none" aria-hidden="true"><path d="${p.area}" fill="var(--accent-soft)"/><path d="${p.line}" fill="none" stroke="var(--accent)" stroke-width="1.8" vector-effect="non-scaling-stroke"/>${p.dots.map((x) => dot(x, 2)).join('')}${p.end ? dot(p.end, 3) : ''}</svg>`
    const num = (x) => nf(Math.round(x * 10) / 10)
    const bars = (sc.categories || []).map(([name, pts, w]) => `<span>${esc(name)}</span><div class="kn-hbar" role="img" aria-label="${esc(name)}: ${num(pts)} of ${w}"><i style="width:${Math.max(0, Math.min(100, Math.round((pts / w) * 100)))}%"></i></div><span>${num(pts)}/${w}</span>`).join('')
    const prof = (typeof profileOf === 'function' && profileOf(v.profile)) || {}
    return `<div class="kn-hl-top">
      <div class="kn-card"><div class="kn-hl-score"><div class="kn-ring" style="--p:${total}%" role="img" aria-label="Score ${total} of 100"><span>${total}<small>of 100</small></span></div>
        <div class="kn-trend"><b>${esc(head)} ${delta}${sc.code_only ? '<span class="tag">code checks only</span>' : ''}</b>${spark}<div class="set-sub">${esc(since)} · checked ${esc(hm(new Date(h.at)))}</div></div>
        <div class="kn-hbars">${bars}</div></div></div>
      <div class="kn-card"><div class="kn-card-h"><h3>How Health checks</h3></div><div class="kn-hrun">
        <div class="r"><div><b>By code <span class="kn-mtag">no model</span></b><div class="set-sub">after every change Echo sees · checked ${esc(hm(new Date(h.at)))}</div></div><span class="tag ok">always</span></div>
        ${hlAiRow(esc(prof.name || v.profile || 'the vault\'s AI profile'))}
      </div></div></div>`
  }
  /** *How Health checks*' AI row (K16-01, -05): *Run AI checks* with the profile and the last check's time and cost; the
   *  check going with its pages, time and reads (or what it waits for, X-S2) and *Stop*; a failure said until the next
   *  check ends. `profile`: its name, escaped. */
  function hlAiRow(profile) {
    const s = st(), h = hl(), d = h.data, ls = knLintState(d.lint, d.ai)
    const head = '<b>AI checks <span class="kn-mtag ai">AI</span></b>'
    if (ls.state === 'running') {
      const L = h.linting && h.linting.id === ls.run ? h.linting : null
      const x = (L && L.data) || (d.lint && d.lint.last) || {}, since = Date.parse(x.at)
      const sub = ls.waiting || x.waiting ? `${esc(String(ls.waiting || x.waiting).replace(/\.$/, ''))}. Recording comes first.`
        : `Reading ${many(x.pages || 0, 'page')} · <span${isNaN(since) ? '' : ` data-kn-elapsed="${since}"`}>${dur(x.seconds)}</span>${L && L.reads ? ` · ${many(L.reads, 'tool call')}` : ''}`
      return `<div class="r"><div>${head}<div class="set-sub">${sub}</div></div><span class="kn-lint-go"><span class="kn-spin" aria-hidden="true"></span><span>Checking…</span><button class="btn sm" id="kn-hl-lint-stop" data-kn="hl-lint-stop"${s.busy.lintstop ? ' disabled' : ''}>${s.busy.lintstop ? 'Stopping…' : 'Stop'}</button></span></div>`
    }
    const last = d.ai ? `last ${esc(whenOf(d.ai.at))}${d.ai.cost != null ? `, ${esc(usd(d.ai.cost))}` : ''}` : 'not run yet'
    // A stop of the user's own needs no word; a sign-in's or a quit's, and a failure, are said.
    const why = String(ls.reason || '').replace(/\.$/, '')
    const cost = ls.cost != null ? ` It cost ${usd(ls.cost)}.` : ''
    const said = ls.state === 'failed' ? `The last AI check failed. ${why ? why[0].toUpperCase() + why.slice(1) : 'It ended without finishing'}.${cost}`
      : ls.state === 'stopped' && /^Stopped ./.test(why) ? `The last AI check was ${why[0].toLowerCase()}${why.slice(1)}.${cost}` : ''
    const warn = said ? `<div class="kn-warn kn-lint-err"${ls.state === 'failed' ? ' role="alert"' : ''}>${IC.warn}<span class="grow">${esc(said)}</span></div>` : ''
    return `<div class="r"><div>${head}<div class="set-sub">when you ask · ${profile} · ${last}</div></div><button class="btn sm" id="kn-hl-lint" data-kn="hl-lint"${s.busy.lint ? ' disabled' : ''}>${s.busy.lint ? 'Starting…' : 'Run AI checks'}</button></div>${warn}`
  }
  /** The findings by group and kind, with the filters and *Show ignored*. */
  function hlFindings(list, sel) {
    const h = hl(), d = h.data
    const f = (id, label) => `<button class="${h.filter === id ? 'on' : ''}" id="kn-hlf-${id}" data-kn="hl-filter" data-kn-filter="${id}" aria-pressed="${h.filter === id}">${label}</button>`
    const fi = (k) => `<button class="kn-fi${sel && sel.kind === k ? ' on' : ''}${k.group === 'needs' && !k.ignored ? ' need' : ''}" id="${kindId(k)}" data-kn="hl-pick" data-kn-key="${esc(k.keys[0])}"${sel && sel.kind === k ? ' aria-current="true"' : ''}><span class="nb">${nf(k.n)}</span><b>${esc(k.name)}</b><span class="tg"><span class="kn-mtag${k.by === 'ai' ? ' ai' : ''}">${k.by === 'ai' ? 'AI' : 'code'}</span></span><span class="m">${esc(k.meta)}</span></button>`
    const groups = list.groups.map((g) => `<div class="kn-fg"><span>${esc(g.label)}</span><span>${esc(g.sub)}</span></div>${g.kinds.map(fi).join('')}`).join('')
    const none = list.groups.length ? '' : `<p class="set-sub kn-fnone">${h.filter === 'ai' && !d.ai ? 'AI checks haven\'t run yet.' : (d.findings || []).length ? 'Nothing under this filter.' : 'Nothing to fix. Echo checks again after every change it sees.'}</p>`
    const ign = (d.ignored || []).length ? `<button class="kn-lnk kn-fign" id="kn-hl-ignored" data-kn="hl-ignored" aria-pressed="${h.showIgnored}">${h.showIgnored ? 'Hide ignored' : `Show ignored (${nf(d.ignored.length)})`}</button>` : ''
    // What the last AI check kept and dropped (K16-06), until it is dismissed.
    const seen = (st().lintSeen || {})[st().vault]
    const kept = d.ai && seen !== d.ai.run ? `<div class="kn-dropped" id="kn-hl-kept">${IC.info}<span class="grow">AI checks ${esc(whenOf(d.ai.at))}: ${esc(knLintNotice(d.ai))}</span><button class="icon-btn" id="kn-hl-kept-ok" data-kn="hl-lint-ok" aria-label="Dismiss">${IC.close}</button></div>` : ''
    return `<div class="kn-flist"><div class="top"><span class="set-sub">${many(list.kinds, 'kind')} · ${nf(list.needs)} ${list.needs === 1 ? 'needs' : 'need'} you</span><div class="kn-filters" role="group" aria-label="Show">${f('all', 'All')}${f('needs', 'Needs you')}${f('code', 'By code')}${f('ai', 'AI')}</div></div>${groups}${none}${ign}${kept}</div>`
  }
  /** The kind shown: what it means, *Fix all* where it applies, its findings — the one shown open with its fix. */
  function hlDetail(sel) {
    const k = sel.kind, x = KN_HEALTH_KINDS[k.kind]
    const fixAll = x && x[2] && !k.ignored && k.fixAll > 1 ? `<button class="btn sm primary" id="kn-hl-fixall" data-kn="hl-fixall" data-kn-kind="${esc(k.kind)}">${esc(x[2](k.fixAll))}…</button>` : ''
    const keys = k.keys.slice(0, 50)
    if (!keys.includes(sel.key)) keys.push(sel.key)
    const more = k.n > keys.length ? `<div class="set-sub">and ${nf(k.n - keys.length)} more</div>` : ''
    const d = hl().data || {}, by = new Map([...(d.findings || []), ...(d.ignored || [])].map((f) => [f.key, f]))
    // An AI kind with one finding is headed by what the check named it.
    const title = k.by === 'ai' && k.n === 1 && by.get(k.keys[0]) ? by.get(k.keys[0]).title : x ? x[1](k.n) : k.name
    return `<div class="kn-fdet"><div class="kn-fdet-h"><div class="row"><h3>${esc(title)}</h3>${k.by === 'ai' ? '<span class="kn-mtag ai">AI</span>' : ''}${k.ignored ? '<span class="kn-mtag">ignored</span>' : k.group === 'needs' ? '<span class="kn-mtag you">needs you</span>' : ''}${fixAll}</div><p>${esc(k.why || '')}</p></div>
      <div class="kn-fdet-b">${keys.map((key, i) => (key === sel.key ? hlOpen(by.get(key), i) : hlRow(by.get(key), i))).join('')}${more}</div></div>`
  }
  /** A finding of the kind, not the one shown: a row to open it. */
  function hlRow(f, i) {
    if (!f) return ''
    const [p, lines] = pagesOf(f)[0] || ['', []]
    return `<button class="kn-fx kn-fx-row" id="kn-fx-${i}" data-kn="hl-pick" data-kn-key="${esc(f.key)}">${IC.file}<span><code>${esc(where(p, lines))}</code><span class="set-sub">${esc(f.title)}</span></span></button>`
  }
  /** The finding shown (K16-07): its pages with their lines (*Open*), the ways to fix it, the fix's diff — or why there
   *  is none —, and *Ask about it* · *Ignore* · *Fix*. It takes its row's id (`i`), so a row opened from the keyboard keeps
   *  the focus. */
  function hlOpen(f, i) {
    if (!f) return ''
    const s = st(), h = hl(), dt = h.detail, v = vault()
    const card = `class="kn-fx on" id="kn-fx-${i}" tabindex="-1"`
    const pages = pagesOf(f).map(([p, lines], j) => `<div class="kn-fx-p"><code>${esc(where(p, lines))}</code><button class="btn ghost sm" id="kn-hl-open-${j}" data-kn="open" data-path="${esc(p)}">Open</button></div>`).join('')
    const head = `<div class="kn-fx-h">${IC.file}<div><b>${esc(f.title)}</b>${pages}</div></div>`
    if (!dt || dt.key !== f.key) return `<div ${card}>${head}<div class="skeleton" style="padding:12px"><i></i><i></i></div></div>`
    const choices = dt.choices || [], fixes = choices.filter((c) => c.choice !== 'create' && c.choice !== 'taxonomy')
    const fx = dt.fix || {}, cur = fx.error ? h.choice[f.key] || '' : fx.choice || ''
    const listed = fixes.some((c) => c.choice === cur)
    // A single way to fix it isn't offered as a choice when it is Echo's own (properties, an index row).
    const pick = !fixes.length || (fixes.length === 1 && listed && !h.choice[f.key]) ? ''
      : fixes.length > 4 ? `<div class="kn-fx-ch"><select class="set-in" id="kn-hl-choice" data-kn-hl-choice="${esc(f.key)}" aria-label="How to fix it">${listed ? '' : '<option value="">Pick one…</option>'}${fixes.map((c) => `<option value="${esc(c.choice)}"${c.choice === cur ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}</select></div>`
        : `<div class="kn-fx-ch" role="group" aria-label="How to fix it">${fixes.map((c, j) => `<button class="btn sm${c.choice === cur ? ' on' : ''}" id="kn-hlc-${j}" data-kn="hl-choice" data-kn-key="${esc(f.key)}" data-kn-choice="${esc(c.choice)}" aria-pressed="${c.choice === cur}">${esc(c.label)}</button>`).join('')}</div>`
    const to = choices.find((c) => c.choice === cur && c.to)
    const only = !pick && listed && fixes.find((c) => c.choice === cur)
    const toLine = to ? `<div class="kn-fx-to set-sub">→ <b>${esc(to.to)}</b>${to.why ? ` · ${esc(to.why)}` : ''}${fx.guess ? ' · a guess' : ''}</div>`
      : only ? `<div class="kn-fx-to set-sub">${esc(only.label)}</div>` : ''
    const diff = (fx.hunks || []).length ? `<div class="kn-diff">${hunkRows(fx.hunks)}</div>` : ''
    const why = dt.error || (fx.error && (f.fixable || fixes.length) ? fx.error : '')
    const reason = why ? `<div class="kn-fx-why set-sub">${esc(String(why).replace(/\.$/, ''))}.</div>` : ''
    const tax = choices.some((c) => c.choice === 'taxonomy') && ((v.detected || {}).taxonomies || []).find((t) => /TAG/i.test(t))
    const ok = !!(diff && fx.base && fx.sha), busy = s.busy.hlfix
    const note = ok ? (fx.guess ? 'A guess, so Fix all leaves it out. Written only if the page still reads as it does now.' : 'Written only if the page still reads as it does now.') : ''
    const ai = f.by === 'ai' ? hlAi(f, dt) : ''
    const acts = `<button class="btn ghost sm" id="kn-hl-ask" data-kn="hl-ask" data-kn-key="${esc(f.key)}">${IC.ask} Ask about it</button>`
      + `<button class="btn ghost sm" id="kn-hl-ign" data-kn="hl-ignore" data-kn-key="${esc(f.key)}" data-kn-on="${!dt.ignored}">${dt.ignored ? 'List again' : 'Ignore'}</button>`
      + (choices.some((c) => c.choice === 'create') && dt.new_page ? `<button class="btn sm" id="kn-hl-create" data-kn="hl-create" data-name="${esc(dt.new_page.name)}" data-kn-folder="${esc(dt.new_page.folder)}">Create the page</button>` : '')
      + (tax ? `<button class="btn sm" id="kn-hl-tax" data-kn="open" data-path="${esc(tax)}">Open the taxonomy</button>` : '')
      + (ok ? `<button class="btn primary sm" id="kn-hl-fix" data-kn="hl-fix"${busy ? ' disabled' : ''}>${busy ? 'Fixing…' : 'Fix'}</button>` : '')
    return `<div ${card}>${head}${ai}${pick}${toLine}${diff ? `<div class="kn-fx-d">${pmOf(fx)}</div>${diff}` : ''}${reason}<div class="kn-fx-f"><span class="grow">${note}</span>${acts}</div></div>`
  }
  /** An AI finding's evidence (K16-07): a contradiction's two quotes side by side, older · newer, with their dates; else
   *  each page's quote; then the check's note. A quote is the page's own text where Echo found it, the note the check's
   *  words: esc(). */
  function hlAi(f, dt) {
    const a = dt.ai || {}, qs = a.quotes || [], vs = f.kind === 'contradiction' ? knVersus(qs) : null
    const day = (x) => (x ? new Date(`${x}T12:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '')
    const quote = (q) => `<code>${esc(where(q.path, [q.line]))}</code><q>${esc(q.text)}</q>`
    const quotes = vs ? `<div class="kn-vs">${vs.map((q) => `<div${q.side === 'Newer' ? ' class="newer"' : ''}><span class="lbl"><span>${q.side || ''}</span><span>${esc(day(q.date))}</span></span>${quote(q)}</div>`).join('')}</div>`
      : qs.map((q) => `<div class="kn-quote">${quote(q)}</div>`).join('')
    const note = a.note ? `<div class="kn-aibox"><span class="kn-mtag ai">AI</span><span>${esc(a.note)}</span></div>` : ''
    return `<div class="kn-fx-ai">${quotes}${note}<div class="set-sub">Echo found each quote on its page, word for word, and shows it as the page has it${f.fixable ? '; the text its fix changes is there just once' : ''}. Findings whose quotes aren't in the pages are dropped, never shown.</div></div>`
  }
  /** *Fix all* (K16-04): every fix of the kind as Echo found it, ticked; a guess is never one (R36). */
  async function openFixAll(kind) {
    const s = st(), v = vault()
    const x = (s.sheet = { kind: 'fixall', fixKind: kind, fixes: null, findings: [], off: new Set(), error: null })
    render()
    try {
      const d = await get(`api/kn/${enc(v.id)}/health?fixes=${enc(kind)}`)
      if (d.error) throw new Error(d.error)
      x.fixes = d.fixes || []
      x.findings = d.findings || []
    } catch (e) { x.error = String(e.message || e); x.fixes = [] }
    if (st().sheet !== x) return
    render()
    // The keyboard goes to the sheet: its first fix, else Apply, else Cancel.
    const first = knFixAll(x.fixes, x.findings, x.off).shown.findIndex((r) => !r.error)
    focusOn(`#kn-fa-${first}`, '#kn-fa-apply', '#kn-fa-cancel')
  }
  function fixAllSheet() {
    const x = st().sheet, k = KN_HEALTH_KINDS[x.fixKind] || []
    if (!x.fixes) return sheet('Fix all', '<div class="skeleton"><i></i><i></i><i></i></div>', '<span class="grow"></span><button class="btn ghost" id="kn-fa-cancel" data-kn="sheet-close">Cancel</button>', IC.check)
    const fa = knFixAll(x.fixes, x.findings, x.off, { open: x.open })
    const row = (r, i) => `<div class="kn-fixall-row"><input type="checkbox" id="kn-fa-${i}" data-kn-fixall="${esc(r.key)}"${r.on ? ' checked' : ''}${r.error ? ' disabled' : ''} aria-label="${esc(`Fix ${r.title || r.path}`)}"><div class="kn-fx"><div class="kn-fx-h">${IC.file}<div><code>${esc(where(r.path, r.line == null ? [] : [r.line]))}</code><div class="set-sub">${esc(r.title)}</div></div>${r.error ? '' : pmOf(r)}</div>${r.error ? `<div class="kn-fx-why set-sub">${esc(String(r.error).replace(/\.$/, ''))}.</div>` : `<div class="kn-diff">${hunkRows(r.hunks)}</div>`}</div></div>`
    const body = `<p class="set-sub">Each fix as Echo found it. Untick any you'd rather leave.</p>${x.error ? `<p class="error">${esc(x.error)}</p>` : ''}${fa.shown.map(row).join('') || '<p class="set-sub">Nothing left to fix here.</p>'}${fa.more ? `<button class="kn-lnk kn-fa-more" id="kn-fa-more" data-kn="hl-fa-more">${nf(fa.more.n)} more, ${fa.more.ticked === fa.more.n ? 'ticked' : `${nf(fa.more.ticked)} ticked`} — show them</button>` : ''}`
    return sheet(esc(k[2] ? k[2](fa.rows.length) : 'Fix all'), body, `<span class="kn-fa-foot" id="kn-fixall-f">${fixAllFoot(fa, x.fixKind)}</span>`, IC.check)
  }
  /** The sheet's foot: how many files (index rows also write the vault's log line), whether they are committed, *Apply
   *  N* — redrawn alone when a fix is (un)ticked, so the checkbox keeps the focus. */
  function fixAllFoot(fa, kind) {
    const s = st(), v = vault(), n = fa.items.length, log = kind === 'not_in_index' && n && (v.detected || {}).log
    const commits = v.commit ? 'one commit of these files' : v.git ? 'commits are off for this vault: the files are written, nothing is committed' : 'the files are written'
    return `<span class="set-sub grow">${many(fa.files, 'file')}${log ? ` and a line in ${esc(log)}` : ''} · ${commits}</span><button class="btn ghost" id="kn-fa-cancel" data-kn="sheet-close">Cancel</button><button class="btn primary" id="kn-fa-apply" data-kn="hl-fixall-go"${!n || s.busy.fixall ? ' disabled' : ''}>${s.busy.fixall ? 'Applying…' : `Apply ${n}`}</button>`
  }
  /** After *Fix* or *Fix all*: Health checked again, what was written and what wasn't said, and the focus put on the
   *  first of `selectors` there (the next finding's same button, else the finding shown, else its kind). */
  async function fixed(r, selectors) {
    const d = hl().data || {}, m = knFixSummary(r, [...(d.findings || []), ...(d.ignored || [])])
    await loadHealth()
    render()
    if (m.wait) say(m.text); else done(m.text)
    focusOn(...selectors, '.kn-fx.on', '.kn-fi.on')
  }
  async function fixOne() {
    const v = vault(), dt = hl().detail, fx = (dt && dt.fix) || {}
    if (!fx.base || !fx.sha) return
    try { await fixed(await run('kn_fix', { id: v.id, key: dt.key, choice: fx.choice || '', base: fx.base, sha: fx.sha }, 'hlfix'), ['#kn-hl-fix']) } catch (err) { say(`Not fixed: ${err.message || err}`) }
  }
  async function fixAllGo() {
    const s = st(), x = s.sheet, v = vault(), items = knFixAll(x.fixes, x.findings, x.off).items
    if (!items.length) return
    try {
      const r = await run('kn_fix_all', { id: v.id, items }, 'fixall')
      if (st().sheet === x) s.sheet = null
      await fixed(r, ['#kn-hl-fixall'])
    } catch (err) {
      // The sheet closed meanwhile: said, not lost.
      if (st().sheet === x) { x.error = String(err.message || err); render() } else say(`Not fixed: ${err.message || err}`)
    }
  }
  async function ignoreFinding(key, on) {
    const v = vault()
    try { await run('kn_ignore', { id: v.id, key, on }, 'hlignore'); await loadHealth(); render(); done(on ? 'Ignored: it no longer counts. Show ignored lists it.' : 'Listed again.'); focusOn('#kn-hl-ign', '.kn-fx.on', '.kn-fi.on') } catch (err) { say(String(err.message || err)) }
  }
  /** *Ask about it*: Claude Code in the vault (Echo's panel), the finding said above it to ask about. */
  function askAboutFinding(key) {
    const f = hlFinding(key), v = vault()
    if (!f || !v) return
    askVault()
    say(`Ask Claude in the panel about this: ${f.title}.`)
  }
  /** *Run AI checks* (K16-05): started on the vault's profile, then followed while Health shows it. */
  async function runLint() {
    const v = vault()
    if (!v || st().busy.lint) return
    try { await run('kn_lint', { id: v.id }, 'lint') } catch (e) { return say(`Not started: ${String(e.message || e).replace(/\.$/, '')}.`) }
    await loadHealth({ detail: false })
    render()
    focusOn('#kn-hl-lint-stop', '#kn-hl-lint')
  }
  async function stopLint() {
    const v = vault(), d = hl().data, id = d && d.lint && d.lint.running
    if (!id) return
    try { await run('kn_lint_stop', { id: v.id, run: id }, 'lintstop') } catch (e) { say(String(e.message || e)) }
  }
  /** While an AI check goes and Health shows it: its state asked again every 1.5 s — drawn when something came — and,
   *  once it ends, Health checked again (its findings, the score) and the focus back on *Run AI checks*. */
  async function pollLint() {
    const h = hl(), v = vault(), id = h.data && h.data.lint && h.data.lint.running
    if (!v || !id || (h.linting && h.linting.id === id)) return
    const L = (h.linting = { id, next: 0, data: null, reads: 0 })
    const mine = () => hl() === h && h.linting === L && st().vault === v.id && st().tab === 'health' && shown()
    try {
      while (mine()) {
        let x
        try { x = await get(`api/kn/${enc(v.id)}/lint/${enc(id)}?from=${L.next}`) } catch { x = null }
        if (!mine()) return
        if (x && !x.error) {
          const before = `${L.reads}|${(L.data || {}).waiting || ''}`
          L.reads += (x.events || []).filter((e) => e.type === 'tool').length
          if (x.next != null) L.next = x.next
          L.data = x
          if (x.state !== 'running') {
            // Ended: never followed again, even should Health's answer not come.
            h.linting = null
            if (h.data && h.data.lint) h.data.lint.running = null
            await loadHealth()
            render()
            if (x.state === 'stopped' && x.reason === 'Stopped') done('Stopped. Nothing was kept.')
            return focusOn('#kn-hl-lint')
          }
          if (`${L.reads}|${x.waiting || ''}` !== before) render()
        }
        await sleep(1500)
      }
    } finally { if (h.linting === L) h.linting = null }
  }
  async function pickChoice(key, choice) {
    const h = hl()
    h.choice[key] = choice
    render()
    await loadFinding()
    render()
  }

  // ── Ingest (spec K14, K15): the sources in the vault's inbox, the first open's question, a run of the vault's own
  // skill on a copy (its steps and tool rows), the review change by change, the last runs; the Add a source sheet. The
  // page names sources by their paths in the queue Echo gave, runs by their ids and changes by their paths — never a file
  // to pick: files are picked or dropped in Rust. Titles, subjects, paths, quotes, notes, reasons and diff lines are
  // others' words: esc(); a source's and a run's text come as Echo's own HTML. ──
  function ing() {
    const s = st()
    if (!s.ing || s.ing.vault !== s.vault) s.ing = { vault: s.vault, data: null, error: null, loading: false, filter: 'all', showDone: {}, sel: '', unchecked: new Set(), run: null, review: null, open: {}, src: null, skipping: null }
    return s.ing
  }
  const ingestShown = () => shown() && st().tab === 'ingest' && !!vault()
  const dayAt = (at) => {
    const d = new Date(at)
    if (isNaN(d)) return ''
    const t = new Date(), y = new Date(Date.now() - 864e5)
    const day = d.toDateString() === t.toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
    return `${day} ${hm(d)}`
  }
  const dur = (s) => { s = Math.max(0, Math.round(Number(s) || 0)); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s` }
  const bytes = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`)
  const SRC_IC = { echo: () => IC.call, mail: () => IC.mail, teams: () => IC.chat, web: () => IC.globe }
  const srcIcon = (kind) => (SRC_IC[kind] || (() => IC.file))()
  const KIND_WORD = { echo: 'from Echo', mail: 'mail', teams: 'Teams chat', web: 'web page' }
  /** The vault's sources, the first open's question, the skill, the runs (`/ingest`); for the tab's number too. */
  async function loadIngest() {
    const v = vault(), g = ing()
    try {
      const d = await get(`api/kn/${enc(v.id)}/ingest`)
      if (ing() !== g) return
      if (d.error) { g.error = d.error; return }
      Object.assign(g, { data: d, error: null })
    } catch (e) { g.error = String(e.message || e) }
  }
  /** The Ingest tab: the sources, then the run the route names (its review when it waits for one), else the source
   *  picked — the first New one by default — with its text when it is Markdown. */
  async function loadIngestTab() {
    await loadIngest()
    const g = ing(), id = st().ingRun, d = g.data
    if (id) return loadRun(id)
    if (!d) return
    const all = d.sources || []
    // By default the first New source, else one whose run stopped (Run again), else the newest.
    if (!all.some((x) => x.path === g.sel)) g.sel = ((all.find((x) => x.state === 'new') || all.find((x) => knSourceState(x, d.runs) === 'failed') || all[0]) || {}).path || ''
    await loadSource()
  }
  /** The source picked, read as Pages reads it (a Markdown source only, shown read-only: K14-10). */
  async function loadSource() {
    const g = ing(), v = vault(), src = ((g.data || {}).sources || []).find((x) => x.path === g.sel)
    if (!src || !(src.meta || {}).markdown) { g.src = null; return }
    if (g.src && g.src.path === src.path && g.src.size === src.meta.size && g.src.page) return
    const want = src.path, mine = (g.src = { path: want, size: src.meta.size, page: null })
    let p
    try { p = await get(`api/kn/${enc(v.id)}/page?path=${enc(want)}`) } catch (e) { p = { error: String(e.message || e) } }
    if (ing() === g && g.src === mine) mine.page = p
  }
  /** Run `id` as it goes (K15-06): its state, time and cost, and its events after the ones already here; its changes
   *  once it waits for review. */
  /** Open run `id` (the route's) and load it. */
  async function loadRun(id) {
    const g = ing()
    return fetchRun(g, knRunOpen(g, id))
  }
  /** Run `r`'s state and its events after those here (`?from=`) — only while it is the run shown, one load at a time
   *  (`kn-ingest-poll`); its review once it waits for one. Never opens another run. */
  async function fetchRun(g, r) {
    const v = vault()
    if (!knRunMayLoad(g, r)) return false
    r.loading = true
    const from = r.next
    let d
    try { d = await get(`api/kn/${enc(v.id)}/ingest/${enc(r.id)}?from=${from}`) } catch (e) { d = { error: String(e.message || e) } }
    r.loading = false
    if (ing() !== g || !knRunTake(g, r, from, d, Date.now())) return false
    if (d.error) { r.error = /no run/.test(d.error) ? 'This run isn\'t one of this vault\'s any more.' : d.error; return true }
    // Its row in the list of runs follows it: its state, what it waits for, what it cost.
    const x = r.data, row = ((g.data || {}).runs || []).find((y) => y.id === r.id)
    if (row) Object.assign(row, { state: x.state, waiting: x.waiting, reason: x.reason, changes: x.changes, kept: x.kept, cost: x.cost, to_answer: x.to_answer })
    if (x.state === 'review') await loadReview(r.id)
    else if (g.run === r) g.review = null
    return true
  }
  /** While a run goes and Ingest shows it: asked again each second; drawn only when something came. When it ends, the
   *  sources and runs follow. */
  async function pollRun() {
    const g = ing(), r = g.run
    if (!r || r.polling || !r.data || r.data.state !== 'running') return
    r.polling = true
    // Still the run shown, going, with Ingest on screen — asked again after each wait (another run may be open since).
    const mine = () => ing() === g && g.run === r && ingestShown() && r.data.state === 'running'
    try {
      while (mine()) {
        await sleep(1000)
        if (!mine()) return
        const before = `${r.next}|${r.data.state}|${r.data.waiting || ''}`
        await fetchRun(g, r)
        if (ing() !== g || g.run !== r) return
        if (r.data.state !== 'running') { await loadIngest(); render(); return }
        if (`${r.next}|${r.data.state}|${r.data.waiting || ''}` !== before) render()
      }
    } finally { r.polling = false }
  }
  async function loadReview(id) {
    const v = vault(), g = ing(), old = g.review && g.review.run === id ? g.review : null
    const keep = { pending: old ? old.pending : {}, cmp: old ? old.cmp : {}, more: old ? old.more : {} }
    try {
      const d = await get(`api/kn/${enc(v.id)}/ingest/${enc(id)}/changes`)
      // Only into the run shown (another may be open since).
      if (ing() !== g || !g.run || g.run.id !== id) return
      if (d.error) throw new Error(d.error)
      g.review = { run: id, data: d, error: null, ...keep }
    } catch (e) { if (ing() === g && g.run && g.run.id === id) g.review = { run: id, data: old && old.data, error: String(e.message || e), ...keep } }
  }

  function ingestView() {
    const g = ing(), d = g.data
    if (!d) return `<div class="kn-ing kn-ing-one">${g.error ? `<div class="kn-none"><p class="error">${esc(g.error)}</p><button class="btn sm" id="kn-ing-retry" data-kn="ing-retry">Look again</button></div>` : '<div class="skeleton" style="padding:24px"><i></i><i></i><i></i></div>'}</div>`
    // The first open's question stands until answered (R40), but never hides a run the route names.
    const first = !st().ingRun && knFirstOpen(d)
    if (first) return firstOpenView(first)
    return `<div class="kn-ing">${ingQueue(d)}<div class="kn-idet" data-keep-scroll>${ingDetail(d)}</div></div>`
  }
  /** K14-09: the files already there, done or new — asked until answered (R40), with what the vault keeps itself. */
  function firstOpenView(first) {
    const v = vault(), det = v.detected || {}
    const q = esc(first.text).replace(esc(`${first.folder}/`), `<code>${esc(first.folder)}/</code>`)
    const ledgers = (det.ledgers || []).map((l) => `<div><code>${esc(l)}</code><span>this vault's own record — shown, never written</span></div>`).join('')
    const log = det.log ? `<div><code>${esc(det.log)}</code><span>its <code>processed</code> lines count as done either way</span></div>` : '<div><code>log.md</code><span>none here — in a vault with one, its <code>processed</code> lines count as done</span></div>'
    const busy = st().busy.ingbase
    return `<div class="kn-ing kn-ing-one" data-keep-scroll><div class="kn-first"><span class="kn-first-ic">${IC.tray}</span><h2>${q}</h2>
      <p>Echo keeps its own list of what it has processed for this vault, so nothing is processed twice and nothing is skipped without saying so. Files your skills already turned into pages should start as done.</p>
      <div class="kn-ledgers">${ledgers}${log}</div>
      <div class="kn-acts"><button class="btn primary" id="kn-first-done" data-kn="ing-baseline" data-kn-done="true"${busy ? ' disabled' : ''}>Mark them done</button><button class="btn" id="kn-first-new" data-kn="ing-baseline" data-kn-done="false"${busy ? ' disabled' : ''}>Treat them as new</button></div>
      <div class="set-sub">Nothing in the folder changes. New ones can be prepared or skipped one by one.</div></div></div>`
  }
  /** The ticked New sources for *Prepare changes*: every New one unless unticked. */
  function ingChecked(d) {
    const g = ing()
    return (d.sources || []).filter((x) => x.state === 'new' && !g.unchecked.has(x.path)).map((x) => x.path)
  }
  function srcMeta(r) {
    const m = r.meta || {}
    if (r.state === 'skipped' && r.note) return r.note
    const parts = [KIND_WORD[r.kind] || '', whenOf(m.added || m.modified), m.size != null ? bytes(m.size) : '', m.anyway ? 'another AI profile' : '']
    return parts.filter(Boolean).join(' · ')
  }
  /** The queue (K14-08), the last runs (K15-11) and *Prepare changes* (K15-01, -03). */
  function ingQueue(d) {
    const s = st(), g = ing(), v = vault()
    const q = knIngestQueue(d.sources, d.runs, { filter: g.filter, showDone: g.showDone }), c = q.counts
    const f = (id, label, n) => `<button class="${g.filter === id ? 'on' : ''}" id="kn-ingf-${id}" data-kn="ing-filter" data-kn-filter="${id}" aria-pressed="${g.filter === id}">${label} ${nf(n)}</button>`
    const ticked = new Set(ingChecked(d))
    let i = 0
    const row = (r) => {
      const k = i++, on = !s.ingRun && g.sel === r.path
      const cb = r.selectable ? `<input type="checkbox" class="kn-sr-cb" id="kn-srcc-${k}" data-kn-src-check="${esc(r.path)}"${ticked.has(r.path) ? ' checked' : ''}${d.running ? ' disabled' : ''} aria-label="${esc(`Prepare changes from ${r.title}`)}">` : '<span class="kn-sr-cb" aria-hidden="true"></span>'
      return `<div class="kn-sr${on ? ' on' : ''}">${cb}<button class="kn-sr-b" id="kn-src-${k}" data-kn="ing-src" data-path="${esc(r.path)}" title="${esc(r.path)}"${on ? ' aria-current="true"' : ''}><span class="k ${esc(r.kind)}">${srcIcon(r.kind)}</span><b>${esc(r.title)}</b><span class="kn-st ${r.chip[0]}">${r.chip[0] === 'run' ? SPIN : ''}${esc(r.chip[1])}</span><span class="m${r.state === 'skipped' || r.state === 'failed' ? ' warn' : ''}">${esc(srcMeta(r))}</span></button></div>`
    }
    const groups = q.groups.map((gr) => `<div class="kn-q-g"><span>${esc(gr.label)}</span><span>${nf(gr.n)}</span></div>${gr.rows.map(row).join('')}${gr.folded
      ? `<button class="kn-q-more" id="kn-qdone-${gr.id}" data-kn="ing-done" data-kn-group="${gr.id}" aria-expanded="false"><span>${nf(gr.folded)} done</span><span>show</span></button>`
      : g.filter === 'all' && g.showDone[gr.id] ? `<button class="kn-q-more" id="kn-qdone-${gr.id}" data-kn="ing-done" data-kn-group="${gr.id}" aria-expanded="true"><span>Done ones shown</span><span>hide</span></button>` : ''}`).join('')
    const none = !c.all ? `<div class="kn-q-none"><p>Nothing in <code>${esc(d.folder)}/</code> yet.</p><p class="set-sub">Add files, a call or memo, mail or a Teams chat, or a web page. ${d.create ? esc(`${d.create}.`) : ''}</p></div>`
      : !q.groups.length ? '<p class="set-sub kn-q-none">Nothing under this filter.</p>' : ''
    const titleOf = (p) => ((d.sources || []).find((x) => x.path === p) || {}).title || String(p).split('/').pop()
    const runs = (d.runs || []).slice(0, 10).map((r) => `<button class="kn-q-run${s.ingRun === r.id ? ' on' : ''}" id="kn-runr-${esc(r.id)}" data-kn="ing-run" data-kn-run="${esc(r.id)}"${s.ingRun === r.id ? ' aria-current="true"' : ''}>${r.state === 'running' ? SPIN : r.state === 'failed' || r.state === 'stopped' ? IC.warn : ''}<span>${esc(dayAt(r.at))} · ${esc(knRunLine(r, titleOf).text)}</span></button>`).join('')
    const runsBox = runs ? `<div class="kn-q-g"><span>Runs</span><span>the last ${nf(Math.min(10, d.runs.length))}</span></div>${runs}` : ''
    const sel = [...ticked], busy = s.busy.ingprep, max = d.max_sources || 20
    const going = (d.runs || []).find((r) => r.id === d.running)
    const foot = !d.skill ? `<div class="kn-q-f"><div class="set-sub">This vault has no ingest skill, so nothing can be prepared yet.</div><div class="row"><span class="grow"></span><button class="btn sm primary" id="kn-ing-skill" data-kn="ing-skill">Add the starter's process-inbox…</button></div></div>`
      : d.running ? `<div class="kn-q-f"><div class="row"><span class="set-sub grow">${going ? esc(`${many(going.sources.length, 'source')} being prepared`) : 'A run is going'}</span><button class="btn sm" id="kn-ing-prep" disabled>A run is going</button></div></div>`
        : `<div class="kn-q-f"><div class="row"><span class="set-sub grow">${sel.length ? `<b>${nf(sel.length)} selected</b>${sel.length > max ? ` · ${nf(max)} at a time` : ''}` : 'Nothing selected'}</span><button class="btn sm primary" id="kn-ing-prep" data-kn="ing-prepare"${!sel.length || busy ? ' disabled' : ''}>${busy ? 'Starting…' : 'Prepare changes'}</button></div><div class="set-sub">with <code>${esc(d.skill.name)}</code> on a copy of the vault · ${esc(d.profile_name || profName(v.profile))}</div></div>`
    return `<div class="kn-q"><div class="kn-q-h"><div class="row"><b>Sources</b><button class="btn sm" id="kn-ing-add" data-kn="ing-add">${IC.plus} Add a source</button></div><div class="kn-filters" role="group" aria-label="Show">${f('all', 'All', c.all)}${f('new', 'New', c.new)}${f('waiting', 'Waiting', c.waiting)}${f('done', 'Done', c.done)}</div></div>
      <div class="kn-q-list" data-keep-scroll>${groups}${none}${runsBox}</div>${foot}</div>`
  }
  function ingDetail(d) {
    const g = ing(), id = st().ingRun
    if (id) return runDetail(d, id)
    const src = (d.sources || []).find((x) => x.path === g.sel)
    if (src) return sourceDetail(d, src)
    return `<div class="kn-idet-in"><div class="kn-none"><p>${(d.sources || []).length ? 'Pick a source to see it as it came, or a run to see what it did.' : 'Add a source, then prepare changes: the vault\'s own skill works on a copy, and nothing is written until you approve it.'}</p><button class="btn sm" data-kn="ing-add">${IC.plus} Add a source</button></div></div>`
  }
  /** A source (K14-10): as it came, its state and what can be done with it. */
  function sourceDetail(d, src) {
    const s = st(), g = ing(), m = src.meta || {}
    const state = knSourceState(src, d.runs), chip = knSourceChip(state, m)
    const run = (d.runs || []).find((r) => r.id === m.run)
    const reveal = `<button class="icon-btn" id="kn-src-reveal" data-kn="reveal" data-kn-in-vault="1" data-path="${esc(src.path)}" title="${/Windows/.test(navigator.userAgent) ? 'Show in Explorer' : 'Show in Finder'}" aria-label="${/Windows/.test(navigator.userAgent) ? 'Show in Explorer' : 'Show in Finder'}">${IC.folder}</button>`
    const open = m.markdown ? `<button class="btn sm ghost" id="kn-src-open" data-kn="open" data-path="${esc(src.path)}">Open</button>` : ''
    const off = d.running || !d.skill || s.busy.ingprep ? ' disabled' : ''
    const acts = state === 'new' ? `<button class="btn sm primary" id="kn-src-prep" data-kn="ing-prepare-one" data-path="${esc(src.path)}"${off}>Prepare changes</button><button class="btn sm" id="kn-src-skip" data-kn="ing-skip" data-path="${esc(src.path)}">Skip</button>`
      : state === 'failed' && run ? `<button class="btn sm primary" id="kn-src-again" data-kn="ing-again" data-kn-run="${esc(run.id)}"${d.running || s.busy.ingprep ? ' disabled' : ''}>Run again</button>`
        : (state === 'review' || state === 'preparing') && run ? `<button class="btn sm primary" id="kn-src-run" data-kn="ing-run" data-kn-run="${esc(run.id)}">${state === 'review' ? 'Review the changes' : 'Watch the run'}</button>`
          : state === 'done' && m.run ? `<button class="btn sm" id="kn-src-requeue" data-kn="ing-requeue" data-path="${esc(src.path)}"${s.busy.ingrq ? ' disabled' : ''}>Prepare again</button>` : ''
    const skip = g.skipping === src.path ? `<div class="kn-inline kn-skip"><input class="search" id="kn-skip-note" placeholder="Why skip it? (optional)" aria-label="Why skip it (optional)" maxlength="500"><button class="btn sm" id="kn-skip-go" data-kn="ing-skip-go" data-path="${esc(src.path)}">Skip it</button><button class="btn ghost sm" data-kn="ing-skip-x">Cancel</button></div>` : ''
    const line = state === 'failed' && run ? `<div class="kn-warn">${IC.warn}<span class="grow">${esc(String(run.reason || 'Its run didn\'t finish').replace(/\.$/, ''))}. Run again prepares the same sources.</span></div>`
      : state === 'review' ? `<div class="kn-info">${IC.info}<span>Its changes wait for your review.</span></div>`
        : state === 'preparing' ? `<div class="kn-info">${IC.info}<span>Being prepared now, on a copy of the vault.</span></div>`
          : state === 'done' ? `<div class="kn-info">${IC.check}<span>${m.run && m.kept != null ? (m.kept ? `Done: ${many(m.kept, 'change')} of its run kept.` : 'Done — nothing kept. Prepare again puts it back.') : m.by === 'baseline' ? 'Marked done when Ingest first opened.' : `Done: ${esc(((vault() || {}).detected || {}).log || 'log.md')} says it was processed.`}</span></div>`
            : state === 'skipped' ? `<div class="kn-info">${IC.info}<span>Skipped${m.note ? `: ${esc(String(m.note).replace(/\.$/, ''))}` : ''}. It counts as done.</span></div>` : ''
    const anyway = m.anyway ? `<div class="kn-info">${IC.call}<span>Added anyway: this call was recorded on another AI profile than the vault's.</span></div>` : ''
    const p = g.src && g.src.path === src.path ? g.src.page : null
    const body = !m.markdown ? `<div class="kn-info">${IC.file}<span>Echo shows Markdown sources here. This one goes to Claude as it is when you prepare changes${/\.(docx?|pptx?|xlsx?)$/i.test(src.path) ? ' — Claude can\'t read Word, PowerPoint or Excel files: add a PDF copy' : ''}.</span></div>`
      : !p ? '<div class="kn-srcdoc"><div class="skeleton"><i></i><i></i><i></i></div></div>'
        : p.error ? `<div class="kn-srcdoc"><p class="error">${esc(p.error)}</p></div>` : `<div class="kn-srcdoc kn-doc selectable">${p.html || ''}</div>`
    const where = [KIND_WORD[src.kind] ? KIND_WORD[src.kind].replace(/^\w/, (x) => x.toUpperCase()) : 'A file', m.size != null ? bytes(m.size) : '', whenOf(m.added || m.modified)].filter(Boolean).join(' · ')
    return `<div class="kn-idet-in"><div class="kn-idet-h"><span class="k ${esc(src.kind)}">${srcIcon(src.kind)}</span><div><h2>${esc(src.title)}</h2><span class="set-sub">${esc(where)} · <span class="kn-st ${chip[0]}">${esc(chip[1])}</span></span><code class="set-sub">${esc(src.path)}</code></div>
      <div class="kn-acts2">${acts}${open}${reveal}</div></div>${skip}${line}${anyway}${body}
      <div class="kn-info">${IC.lock}<span>Sources are never edited. Echo keeps <code>${esc(d.folder)}/</code> as it came, so every page can point back to these words.</span></div></div>`
  }
  /** A run (K15-06, -08, -11): going, waiting for review, or ended. */
  function runDetail(d, id) {
    const s = st(), g = ing(), r = g.run
    if (!r || r.id !== id || !r.data) return `<div class="kn-idet-in">${r && r.id === id && r.error ? `<div class="kn-none"><p class="error">${esc(r.error)}</p><button class="btn sm" data-kn="ing-back">Back to the sources</button></div>` : '<div class="skeleton" style="padding:12px 0"><i></i><i></i><i></i></div>'}</div>`
    const x = r.data, rv = knRunView(r.events), v = vault()
    if (x.state === 'running') return liveView(d, x, rv)
    if (x.state === 'review') return reviewView(d, x, rv)
    const titleOf = (p) => ((d.sources || []).find((y) => y.path === p) || {}).title || String(p).split('/').pop()
    const list = `<div class="kn-run-src">${(x.sources || []).map((p) => `<div>${IC.file}<span>${esc(titleOf(p))}</span><code>${esc(p)}</code></div>`).join('')}</div>`
    const stats = [dayAt(x.at), x.seconds != null ? dur(x.seconds) : '', x.tokens_in ? `${kTok(x.tokens_in)} in · ${kTok(x.tokens_out)} out` : '', x.cost ? usd(x.cost) : ''].filter(Boolean).join(' · ')
    const back = '<button class="btn sm ghost" data-kn="ing-back">Back to the sources</button>'
    if (x.state === 'failed' || x.state === 'stopped') {
      const busy = s.busy.ingprep
      return `<div class="kn-idet-in"><div class="kn-runh">${IC.warn}<div><b>${x.state === 'failed' ? 'The run failed' : 'The run stopped'} · ${many((x.sources || []).length, 'source')}</b><div class="set-sub">${esc(stats)}</div></div></div>
        <div class="kn-warn" role="alert">${IC.warn}<span class="grow">${esc(String(x.reason || 'It didn\'t finish').replace(/\.$/, ''))}.</span><button class="btn sm primary" id="kn-run-again" data-kn="ing-again" data-kn-run="${esc(x.id)}"${d.running || busy ? ' disabled' : ''}>${busy ? 'Starting…' : 'Run again'}</button></div>
        ${list}${runToolsHtml(rv, true)}<div class="kn-acts">${back}<button class="btn sm ghost" id="kn-run-discard" data-kn="ing-discard">Discard the run</button></div><div class="set-sub">Its log and copy stay 30 days, for Run again.</div></div>`
    }
    const kept = x.state === 'done' ? (x.kept ? `${many(x.kept, 'change')} of ${nf(x.changes || 0)} written into ${esc(v.name)}.` : 'Nothing was kept.') : 'Discarded — nothing was written.'
    const again = (d.sources || []).filter((y) => (x.sources || []).includes(y.path) && y.state === 'done' && (y.meta || {}).run === x.id).map((y) => y.path)
    return `<div class="kn-idet-in"><div class="kn-runh">${x.state === 'done' ? IC.check : IC.close}<div><b>${x.state === 'done' ? 'Done' : 'Discarded'} · ${many((x.sources || []).length, 'source')}</b><div class="set-sub">${esc(stats)}</div></div></div>
      <div class="kn-info">${IC.info}<span>${kept}${again.length ? ' Prepare again makes its sources New.' : ''}</span></div>${list}
      <div class="kn-acts">${back}${again.length ? `<button class="btn sm" id="kn-run-requeue" data-kn="ing-requeue-run"${s.busy.ingrq ? ' disabled' : ''}>Prepare again</button>` : ''}</div></div>`
  }
  /** The run's tool rows, through Ask's renderer (K13-03). */
  function runToolsHtml(rv, ended) {
    return rv.tools.length ? toolsHtml({ items: rv.tools }, ended, ing().open, 'ing-tool') : ''
  }
  function liveView(d, x, rv) {
    const s = st(), v = vault(), wait = x.waiting || rv.waiting
    const since = Date.parse(x.at)
    const skill = (d.skill && d.skill.name) || 'the ingest skill'
    const head = `<div class="kn-runh"><span class="kn-spin big" aria-hidden="true"></span><div><b>Preparing changes · ${many((x.sources || []).length, 'source')}</b><div class="set-sub"><span><code>${esc(skill)}</code> on a copy of the vault</span><span>${esc(profName(x.profile || v.profile))}</span><span${isNaN(since) ? '' : ` data-kn-elapsed="${since}"`}>${dur(x.seconds)}</span>${rv.result ? `<span>${kTok(rv.result.tokens_in)} in · ${kTok(rv.result.tokens_out)} out</span>` : ''}</div></div><button class="btn sm" id="kn-run-stop" data-kn="ing-stop"${s.busy.ingstop ? ' disabled' : ''}>${s.busy.ingstop ? 'Stopping…' : 'Stop'}</button></div>`
    const waitLine = wait ? `<div class="kn-runline wait">${IC.clock}<span>${esc(String(wait).replace(/\.$/, ''))}. Recording comes first: the run starts once it is done.</span></div>` : ''
    const copy = rv.copy ? `<div class="kn-runline">${IC.folder}<span>Copied the vault. ${esc(rv.copy)}</span></div>` : `<div class="kn-runline">${IC.folder}<span>Copied the vault.</span></div>`
    const steps = rv.steps.length ? `<div class="kn-steps2" aria-label="Its steps">${rv.steps.map((t) => `<div class="kn-st2 kn-s-${esc(t.state)}"><i>${t.state === 'done' ? IC.check : ''}</i><span>${esc(t.text)}</span>${t.state === 'active' ? '<span class="r">now</span>' : ''}</div>`).join('')}</div>`
      : `<div class="kn-steps2"><div class="kn-st2 kn-s-${wait ? 'todo' : 'active'}"><i></i><span>${wait ? 'Waiting to start' : `Starting ${esc(skill)}`}</span></div></div>`
    const errs = rv.errors.map((t) => `<div class="kn-warn" role="alert">${IC.warn}<span class="grow">${esc(t)}</span></div>`).join('')
    return `<div class="kn-idet-in">${head}${waitLine}${copy}${steps}${runToolsHtml(rv, false)}${errs}
      <div class="kn-safe">${IC.lock}<span>Nothing is written into ${esc(v.name)} until you approve. The run can read and write only its copy.</span></div></div>`
  }
  /** At most this many lines of a change's diff before *Show N more lines*. */
  const DIFF_SHOWN = 14
  function foldedHunks(hunks, open) {
    const total = (hunks || []).reduce((a, h) => a + h.length, 0)
    if (open || total <= DIFF_SHOWN + 2) return { hunks: hunks || [], more: 0 }
    const out = []
    let left = DIFF_SHOWN
    for (const h of hunks) { if (left <= 0) break; out.push(h.slice(0, left)); left -= h.length }
    return { hunks: out, more: total - DIFF_SHOWN }
  }
  /** One change (K15-08): its file, kind, +/−, why; its diff, what D28 left out, the words it came from; its answer. */
  function changeCard(c, i) {
    const rv = ing().review, id = `kn-ch-${i}`, p = esc(c.path)
    const tags = `<span class="tag${c.tag ? ` ${c.tag}` : ''}">${esc(c.kind)}</span>${c.adds ? '<span class="tag">adds only</span>' : ''}${c.edited ? '<span class="tag acc">your text</span>' : ''}${c.plus || c.minus ? pmOf(c) : ''}${c.why ? `<span class="kn-chg-why">${esc(c.why)}</span>` : ''}`
    const b = (act, label, cls = 'btn sm ghost', extra = '', as = act) => `<button class="${cls}" id="${id}-${as}" data-kn="ing-ch" data-kn-do="${act}" data-path="${p}"${extra}>${label}</button>`
    const cmp = !!rv.cmp[c.path]
    const acts = c.blocked ? '<span class="set-sub">Can\'t be written</span>'
      : c.busy ? `<span class="set-sub">${SPIN} Saving…</span>`
        : c.state === 'undecided' ? b('reject', 'Reject') + b('edit', `${IC.edit} Edit`) + b('approve', 'Approve', 'btn sm')
          : c.state === 'approved' ? `<span class="kn-ok">${IC.check} Approved</span>${b('reject', 'Reject', 'btn sm ghost', '', 'unapprove')}`
            : c.state === 'rejected' ? `<span class="set-sub">Rejected</span>${b('approve', 'Approve', 'btn sm ghost', '', 'again')}`
              : c.state === 'written' ? `<span class="kn-ok">${IC.check} Written</span>`
                : c.changed ? b('compare', cmp ? 'Hide the diff' : 'Compare', 'btn sm ghost', ` aria-expanded="${cmp}"`) + b('reject', 'Keep the vault\'s') + (cmp ? b('take', 'Take the run\'s', 'btn sm primary') : '') : ''
    const f = foldedHunks(c.hunks, !!rv.more[c.path])
    const diff = f.hunks.length ? `<div class="kn-diff" id="${id}-diff" tabindex="-1" aria-label="${esc(`The change to ${c.path}`)}">${hunkRows(f.hunks)}</div>${f.more ? `<button class="kn-chg-more" id="${id}-more" data-kn="ing-more" data-path="${p}">Show ${many(f.more, 'more line')}</button>` : ''}` : ''
    let body = ''
    const retag = c.retagged ? `<div class="kn-note-line kn-chg-retag">${IC.info}<span>${esc(c.retagged)}</span></div>` : ''
    if (c.blocked) body = `<div class="kn-left-out">${IC.warn}<span>${esc(c.blocked)}. Echo leaves it out of the write.</span></div>${diff}`
    else if (c.changed) body = `<div class="kn-left-out">${IC.warn}<span>Changed in the vault since the run, so it isn't written. ${cmp ? 'Below is what Take the run\'s writes over the vault\'s file now: − lines are the vault\'s.' : 'Compare shows what Take the run\'s would write over it.'}</span></div>${cmp ? diff : ''}`
    else if (c.state !== 'rejected') {
      const left = c.left ? `<div class="kn-left-out">${IC.warn}<div><span>${esc(String(c.left.note).replace(/\.$/, ''))}.</span>${c.left.lines.map((l) => `<code class="kn-left-l">${esc(l)}</code>`).join('')}</div></div>` : ''
      const quotes = c.quotes.map((q) => `<div class="kn-qt">“${esc(q.text)}”<small>${esc(q.source)}</small></div>`).join('')
      const from = `<div class="kn-from"><span class="lbl">${c.quotes.length ? IC.check : IC.info}${c.quotes.length ? 'Came from' : 'The words it came from'}</span>${quotes}${c.invented ? `<div class="kn-qt none">${esc(c.invented)}</div>` : ''}${c.fromNote ? `<div class="kn-qt none">${esc(c.fromNote)}</div>` : ''}</div>`
      body = diff + retag + left + (c.state === 'written' ? '' : from)
    }
    const cls = c.state === 'approved' || c.state === 'written' ? ' okd' : c.state === 'rejected' ? ' rej' : c.blocked ? ' blk' : c.changed ? ' chg' : ''
    return `<div class="kn-chg${cls}" id="${id}"><div class="kn-chg-h"><span class="n">${c.state === 'approved' || c.state === 'written' ? IC.check : c.n}</span><div><code title="${p}">${p}</code><span class="set-sub">${tags}</span></div><div class="kn-acts2">${acts}</div></div>${body}</div>`
  }
  function reviewView(d, x, rv) {
    const s = st(), g = ing(), v = vault(), r = g.review
    if (!r || r.run !== x.id || (!r.data && !r.error)) return '<div class="kn-idet-in"><div class="skeleton" style="padding:12px 0"><i></i><i></i><i></i></div></div>'
    if (!r.data) return `<div class="kn-idet-in"><div class="kn-none"><p class="error">${esc(r.error)}</p><button class="btn sm" data-kn="ing-retry">Look again</button></div></div>`
    const R = knIngestReview(r.data.changes, r.pending), busy = s.busy.ingwrite
    const ended = x.ended ? new Date(x.ended) : null
    const skill = (d.skill && d.skill.name) || ''
    const stats = [ended && !isNaN(ended) ? `Ready at ${hm(ended)}` : '', x.seconds != null ? dur(x.seconds) : '', x.tokens_in ? `${kTok(x.tokens_in)} in · ${kTok(x.tokens_out)} out` : '', x.cost ? usd(x.cost) : ''].filter(Boolean).map(esc).join(' · ') + (skill ? ` · <code>${esc(skill)}</code>` : '')
    const bar = `<div class="kn-rbar"><div class="grow"><b>${many(R.counts.all, 'change')} from ${many((x.sources || []).length, 'source')}</b><div class="set-sub">${stats}</div></div>
      <button class="btn sm ghost" id="kn-rv-discard" data-kn="ing-discard">Discard the run</button><button class="btn sm" id="kn-rv-rest" data-kn="ing-rest"${R.rest && !busy && !s.busy.ingrest ? '' : ' disabled'}>${s.busy.ingrest ? 'Approving…' : 'Approve the rest'}</button>${R.finish ? `<button class="btn sm primary" id="kn-rv-write" data-kn="ing-write"${busy ? ' disabled' : ''}>${busy ? 'Finishing…' : 'Finish the run'}</button>` : `<button class="btn sm primary" id="kn-rv-write" data-kn="ing-write"${R.write.can && !busy ? '' : ' disabled'}>${busy ? 'Writing…' : `Write ${nf(R.write.n)} approved`}</button>`}</div>`
    const said = rv.said[rv.said.length - 1]
    const report = said && said.html ? `<div class="kn-card kn-run-said"><div class="kn-card-h"><h3>What the run said</h3></div><div class="kn-doc selectable">${said.html}</div></div>` : ''
    const err = r.error ? `<div class="kn-warn" role="alert">${IC.warn}<span class="grow">${esc(r.error)}</span></div>` : ''
    return `${bar}<div class="kn-idet-in">${err}${R.cards.map(changeCard).join('') || '<p class="set-sub">The run changed nothing.</p>'}
      <div class="kn-note-line">${IC.info}<span>${R.finish ? 'Nothing is left to decide. <b>Finish the run</b> marks its sources done with what was kept.' : `Undecided changes stay here for later. <b>Write</b> puts the approved ones into ${esc(v.name)} — each only if its file hasn't changed since the run.`}</span></div>${report}</div>`
  }

  // ── Ingest's actions ──
  /** Focus the first undecided change's Approve after one is answered, else Write, else Approve the rest. */
  const focusNext = () => focusOn('.kn-chg [id$="-approve"]:not([disabled])', '#kn-rv-write:not([disabled])', '#kn-rv-rest', '#kn-rv-discard')
  async function prepare(paths) {
    const v = vault(), g = ing()
    if (!paths.length) return
    try {
      const r = await run('kn_ingest_run', { id: v.id, sources: paths }, 'ingprep')
      g.unchecked = new Set()
      await loadIngest()
      goVault(v.id, 'ingest', r.run)
      if (r.left) say(`Echo prepares ${nf(r.sources.length)} sources at a time: ${nf(r.left)} more wait for the next run.`)
    } catch (e) { say(`Not started: ${String(e.message || e).replace(/\.$/, '')}.`) }
  }
  async function runAgain(id) {
    const v = vault()
    try { const r = await run('kn_ingest_run', { id: v.id, again: id }, 'ingprep'); await loadIngest(); goVault(v.id, 'ingest', r.run) } catch (e) { say(`Not started: ${String(e.message || e).replace(/\.$/, '')}.`) }
  }
  async function stopRun() {
    const v = vault(), g = ing(), id = st().ingRun
    const r = g.run && g.run.id === id ? g.run : null
    try { await run('kn_ingest_stop', { id: v.id, run: id }, 'ingstop') } catch (e) { return say(String(e.message || e)) }
    // Until it says it stopped — on the run shown only, never a second load beside the poll's.
    for (let i = 0; i < 20 && r && ing() === g && g.run === r && r.data && r.data.state === 'running'; i++) {
      await sleep(300)
      if (ing() !== g || g.run !== r) break
      await fetchRun(g, r)
    }
    await loadIngest()
    render()
  }
  async function decide(path, decision, extra = {}) {
    const g = ing(), v = vault(), rv = g.review, id = st().ingRun
    if (!rv || rv.pending[path]) return
    rv.pending[path] = decision
    render()
    try { await run('kn_change', { id: v.id, run: id, path, decision, ...extra }) } catch (e) { say(`Not saved: ${String(e.message || e).replace(/\.$/, '')}.`) }
    delete rv.pending[path]
    if (decision === 'take') delete rv.cmp[path]
    await loadReview(id)
    await loadIngest()
    render()
    focusNext()
  }
  async function approveRest() {
    const v = vault(), id = st().ingRun
    try { await run('kn_change', { id: v.id, run: id, rest: true }, 'ingrest') } catch (e) { say(String(e.message || e)) }
    await loadReview(id)
    await loadIngest()
    render()
    focusOn('#kn-rv-write:not([disabled])', '#kn-rv-discard')
  }
  async function writeApproved() {
    const v = vault(), id = st().ingRun
    let r
    try { r = await run('kn_ingest_apply', { id: v.id, run: id }, 'ingwrite') } catch (e) { return say(`Not written: ${String(e.message || e).replace(/\.$/, '')}.`) }
    const m = r.finished && !(r.written || []).length && !(r.changed_since || []).length ? { text: r.of ? `The run is done: ${nf(r.kept)} of its ${nf(r.of)} changes kept.` : 'The run is done: it changed nothing.', wait: false } : knWriteSummary(r, v.name)
    await loadRun(id)
    await loadIngest()
    st().tree = null
    render()
    if (m.wait) say(m.text); else done(m.text)
    focusOn('.kn-chg [id$="-compare"]', '.kn-chg [id$="-approve"]', '#kn-rv-write:not([disabled])', '.kn-q-run.on')
  }
  function discardRun() {
    const v = vault(), id = st().ingRun, x = ing().run && ing().run.data
    const waiting = x && x.state === 'review'
    askFirst('Discard the run?', waiting ? 'Its changes go and nothing is written. Its sources are Done — nothing kept; Prepare again puts them back.' : 'Its log and copy go; Run again is no longer offered.', 'Discard', async () => {
      try { await run('kn_ingest_discard', { id: v.id, run: id }, 'ingdiscard') } catch (e) { return say(String(e.message || e)) }
      await loadIngest()
      // The run's address is gone with it: replaced, so Back never opens a run that isn't there.
      goVault(v.id, 'ingest', '', { replace: true })
      done(waiting ? 'Discarded. Nothing was written.' : 'Discarded.')
    }, true)
  }
  async function requeue(paths) {
    const v = vault()
    try {
      await run('kn_ingest_requeue', { id: v.id, paths }, 'ingrq')
      await loadIngest()
      render()
      // A source the vault's log.md calls processed stays done whatever Echo's list says (D30).
      const all = (ing().data || {}).sources || [], isNew = paths.filter((p) => (all.find((x) => x.path === p) || {}).state === 'new').length, kept = paths.length - isNew
      const log = (v.detected || {}).log || 'log.md'
      const text = `${isNew ? `${many(isNew, 'source')} ${isNew === 1 ? 'is' : 'are'} New again.` : ''}${kept ? `${isNew ? ' ' : ''}${many(kept, 'source')} ${kept === 1 ? 'stays' : 'stay'} done: ${log} says ${kept === 1 ? 'it was' : 'they were'} processed.` : ''}`
      if (kept) say(text); else done(text)
      focusOn('#kn-run-requeue', '#kn-src-requeue', '#kn-src-prep', '#kn-ing-prep:not([disabled])', '.kn-q-run.on', '.kn-sr.on .kn-sr-b')
    } catch (e) { say(String(e.message || e).replace(/^\w/, (x) => x.toUpperCase())) }
  }
  async function skipSource(path) {
    const v = vault(), g = ing(), note = ((document.getElementById('kn-skip-note') || {}).value || '').trim()
    try { await run('kn_source_skip', { id: v.id, path, note: note || null }, 'ingskip') } catch (e) { return say(String(e.message || e)) }
    g.skipping = null
    await loadIngest()
    render()
    done('Skipped. It counts as done.')
    focusOn('.kn-sr.on .kn-sr-b')
  }
  async function baseline(isDone) {
    const v = vault()
    try {
      const r = await run('kn_baseline', { id: v.id, done: isDone }, 'ingbase')
      await loadIngestTab()
      render()
      done(isDone ? `${many(r.marked, 'file')} marked done.` : `${many(r.marked, 'file')} ${r.marked === 1 ? 'is' : 'are'} New.`)
      focusOn('#kn-ing-prep:not([disabled])', '#kn-ing-add')
    } catch (e) { say(String(e.message || e)) }
  }
  async function addInboxSkill() {
    const s = st(), v = vault()
    try {
      await run('kn_ingest_skill', { id: v.id }, 'ingskill')
      s.sheet = null
      try { s.data = await get(knState()) } catch { /* the app restarting */ }
      s.settings = null
      await loadIngest()
      render()
      done('process-inbox is in the vault: .claude/skills/process-inbox/SKILL.md.')
      focusOn('#kn-ing-prep:not([disabled])', '#kn-ing-add')
    } catch (e) { if (s.sheet) { s.sheet.error = String(e.message || e); render() } else say(String(e.message || e)) }
  }
  function skillSheet() {
    const x = st().sheet, d = ing().data || {}, busy = st().busy.ingskill
    const body = `<p>The twin starter's skill for an inbox: it turns each source into pages, index rows and log lines. Echo writes only <code>.claude/skills/process-inbox/SKILL.md</code>.</p><pre class="kn-skill-text selectable">${esc(d.starter_skill || '')}</pre>${x.error ? `<p class="error">${esc(x.error)}</p>` : ''}`
    return sheet('Add the starter\'s process-inbox', body, `<span class="grow"></span><button class="btn ghost" id="kn-skill-cancel" data-kn="sheet-close">Cancel</button><button class="btn primary" id="kn-skill-go" data-kn="ing-skill-go"${busy ? ' disabled' : ''}>${busy ? 'Adding…' : 'Add process-inbox'}</button>`, IC.bolt)
  }
  /** *Edit* (K15-08): the change's whole proposed text in an editor; the user's text replaces the run's. */
  async function openChangeEdit(path) {
    const s = st(), v = vault(), id = st().ingRun
    const x = (s.sheet = { kind: 'chedit', run: id, path, text: null, error: null })
    render()
    let d
    try { d = await get(`api/kn/${enc(v.id)}/ingest/${enc(id)}/text?path=${enc(path)}`) } catch (e) { d = { error: String(e.message || e) } }
    if (st().sheet !== x) return
    if (d.error) { x.error = d.error; x.text = '' } else x.text = d.text
    s.focus = 'kn-chedit'
    render()
  }
  function changeEditSheet() {
    const x = st().sheet, busy = st().busy.ingedit
    const body = x.text == null ? '<div class="skeleton"><i></i><i></i><i></i></div>'
      : `<p class="set-sub">The run's text for <code>${esc(x.path)}</code>. Yours replaces it and is written whole — an index's or a log's no longer as added lines.</p><textarea id="kn-chedit" class="kn-chedit" spellcheck="true" aria-label="The change's text">${esc(x.text)}</textarea>${x.error ? `<p class="error">${esc(x.error)}</p>` : ''}`
    return sheet('Edit the change', body, `<span class="set-sub grow">Nothing is written before Write.</span><button class="btn ghost" id="kn-chedit-cancel" data-kn="sheet-close">Cancel</button><button class="btn primary" id="kn-chedit-go" data-kn="ing-edit-go"${x.text == null || busy ? ' disabled' : ''}>${busy ? 'Saving…' : 'Use my text'}</button>`, IC.edit)
  }
  async function editGo() {
    const s = st(), x = s.sheet, v = vault()
    const text = (document.getElementById('kn-chedit') || {}).value
    if (!x || text == null) return
    try {
      await run('kn_change', { id: v.id, run: x.run, path: x.path, decision: 'edit', text }, 'ingedit')
      if (st().sheet === x) s.sheet = null
      await loadReview(x.run)
      await loadIngest()
      render()
      done('Your text replaces the run\'s. It is approved.')
      focusNext()
    } catch (e) { if (st().sheet === x) { x.error = String(e.message || e); render() } else say(String(e.message || e)) }
  }

  // ── the Add a source sheet (K14-02…06, K14-03b) ──
  function openAdd(tab = 'files', pick = null) {
    const s = st(), g = ing()
    s.menu = null
    s.sheet = { kind: 'source', tab, pick, call: null, include: { transcript: false, chat: false }, mismatch: null, calls: null, q: '', hits: null, hit: null, days: 7, url: '', busy: false, picking: false, error: null, signed: null }
    s.focus = tab === 'web' ? 'kn-src-url' : tab === 'files' ? (pick ? 'kn-src-go' : 'kn-src-choose') : 'kn-src-q'
    render()
    if (tab === 'call') findSourceCalls('')
    if (!g.data) loadIngest().then(render)
  }
  function srcTab(tab) {
    const s = st(), x = s.sheet
    if (!x || x.kind !== 'source') return
    Object.assign(x, { tab, q: '', hits: null, hit: null, error: null })
    s.focus = tab === 'web' ? 'kn-src-url' : tab === 'files' ? 'kn-src-choose' : 'kn-src-q'
    render()
    if (tab === 'call') findSourceCalls('')
  }
  function findSourceCalls(q) {
    const x = st().sheet, v = vault()
    clearTimeout(timing._srcTimer)
    timing._srcTimer = setTimeout(async () => {
      let r
      try { r = await get(`api/kn/${enc(v.id)}/calls?q=${enc(q)}`) } catch { return }
      if (st().sheet !== x || x.q !== q || x.tab !== 'call') return
      x.calls = r.calls || []
      patchEl('kn-src-list', sourceList())
    }, q ? 150 : 0)
  }
  function findMail(q) {
    const x = st().sheet, v = vault()
    clearTimeout(timing._srcTimer)
    if (!q.trim()) { x.hits = null; return patchEl('kn-src-list', sourceList()) }
    timing._srcTimer = setTimeout(async () => {
      let r
      try { r = await get(`api/kn/${enc(v.id)}/m365?q=${enc(q)}`) } catch (e) { r = { error: String(e.message || e) } }
      if (st().sheet !== x || x.q !== q || x.tab !== 'mail') return
      if (r.signed_in === false && ing().data) { ing().data.m365 = false; return render() }
      x.hits = r.results || []
      x.error = r.error || (r.errors ? Object.values(r.errors).join(' · ') : null)
      patchEl('kn-src-list', sourceList())
    }, 300)
  }
  async function chooseFiles() {
    const x = st().sheet
    if (!x || x.picking) return
    x.picking = true
    render()
    try { const p = await run('kn_pick_files', {}); if (st().sheet === x && p && p.seq != null) x.pick = p } catch (e) { if (st().sheet === x) x.error = String(e.message || e) }
    x.picking = false
    render()
    focusOn('#kn-src-go:not([disabled])', '#kn-src-choose')
  }
  /** Files dropped on the window while the activity shows (`ctx.onFileDrop`: names and handles, never paths): the sheet
   *  opens with them while Ingest shows, or takes them when it is open; elsewhere a drop does nothing. */
  function dropped(files) {
    const s = st()
    if (!files || !files.length) return
    const open = s.sheet && s.sheet.kind === 'source'
    if (!knTakesDrops({ view: shown() ? 'brain' : '', active: true, tab: s.tab, vault: !!vault(), sheet: s.sheet && s.sheet.kind })) return
    const r = { seq: 'drop', files: files.map((f) => ({ name: f.name, size: f.size })), handles: files }
    if (open) { Object.assign(s.sheet, { tab: 'files', pick: r, error: null }); render(); return focusOn('#kn-src-go:not([disabled])') }
    openAdd('files', r)
  }
  /** The call or memo, mail or chat list — drawn alone while its search field keeps the focus. */
  function sourceList() {
    const x = st().sheet, v = vault()
    if (x.tab === 'call') {
      if (!x.calls) return '<div class="kn-pk-none">Finding…</div>'
      if (!x.calls.length) return `<div class="kn-pk-none">${x.q ? `No call or memo with minutes matches “${esc(x.q)}”.` : 'No calls or memos with minutes yet.'}</div>`
      return `<div class="kn-pick-l" role="radiogroup" aria-label="Calls and memos">${x.calls.slice(0, 40).map((c, i) => {
        const on = x.call && x.call.name === c.name
        const people = (c.people || []).length
        const tags = `${c.note ? `<span class="tag ok">note saved in ${esc(v.name)}</span>` : ''}${c.profile_ok ? '' : `<span class="tag warn">${esc(c.profile_name || c.profile || 'another profile')} — another AI profile</span>`}`
        return `<button class="kn-pl${on ? ' on' : ''}" role="radio" aria-checked="${!!on}" id="kn-scall-${i}" data-kn="src-call" data-kn-i="${i}"><span class="kn-dot${on ? ' on' : ''}" aria-hidden="true"><i></i></span><span class="k">${c.memo ? IC.memo : IC.call}</span><b>${esc(c.title)}</b><span class="set-sub">${esc(c.date || '')}</span><span class="m">${c.memo ? 'a memo' : people ? `${nf(people)} ${people === 1 ? 'person' : 'people'}` : ''}${c.profile_ok && c.profile_name ? ` · ${esc(c.profile_name)}` : ''} ${tags}</span></button>`
      }).join('')}</div>`
    }
    if (x.tab === 'mail') {
      if (!x.q.trim()) return '<div class="kn-pk-none">Type to search mail and Teams chats of the last 90 days.</div>'
      if (!x.hits) return '<div class="kn-pk-none">Searching…</div>'
      const err = x.error ? `<p class="error">${esc(x.error)}</p>` : ''
      if (!x.hits.length) return `${err}<div class="kn-pk-none">Nothing matches “${esc(x.q)}”.</div>`
      return `${err}<div class="kn-pick-l" role="radiogroup" aria-label="Mail and chats">${x.hits.slice(0, 25).map((h, i) => {
        const on = x.hit && x.hit.id === h.id && x.hit.kind === h.kind, mail = h.kind === 'mail'
        const from = (h.from && (h.from.name || h.from.email)) || ''
        const range = on && !mail ? ` · <select class="set-in kn-days" id="kn-src-days" data-kn-src-days aria-label="Which days of the chat">${[7, 14, 30].map((n) => `<option value="${n}"${x.days === n ? ' selected' : ''}>the last ${n} days</option>`).join('')}</select>` : ''
        return `<div class="kn-pl${on ? ' on' : ''}"><button class="kn-pl-b" role="radio" aria-checked="${!!on}" id="kn-smail-${i}" data-kn="src-hit" data-kn-i="${i}"><span class="kn-dot${on ? ' on' : ''}" aria-hidden="true"><i></i></span><span class="k ${mail ? 'mail' : 'teams'}">${mail ? IC.mail : IC.chat}</span><b>${esc(mail ? h.subject || '(no subject)' : 'Teams chat')}</b><span class="set-sub">${esc(h.at ? whenOf(h.at) : '')}</span></button><span class="m">${esc([from, h.summary].filter(Boolean).join(' · '))}${range}</span></div>`
      }).join('')}</div>`
    }
    return ''
  }
  function sourceFoot() {
    const s = st(), x = s.sheet, d = ing().data || {}
    const a = knAddState(x, { m365: d.m365 !== false })
    const folder = d.folder || 'raw_inbox'
    const what = x.tab === 'web' ? `Into <code>${esc(folder)}/web/</code>` : a.count ? `${many(a.count, x.tab === 'files' ? 'file' : 'source')} · written into this vault only` : ''
    return `<span class="set-sub grow">${what}</span><button class="btn ghost" id="kn-src-cancel" data-kn="sheet-close">Cancel</button><button class="btn primary" id="kn-src-go" data-kn="src-go"${a.can ? '' : ' disabled'}>${x.busy ? 'Adding…' : esc(a.label)}</button>`
  }
  function sourceSheet() {
    const x = st().sheet, g = ing(), d = g.data || {}, v = vault()
    const folder = d.folder || 'raw_inbox'
    const tabs = `<div class="kn-stabs" role="tablist" aria-label="What to add">${[['files', IC.upload, 'Files'], ['call', IC.call, 'A call or memo'], ['mail', IC.mail, 'Mail or Teams'], ['web', IC.globe, 'A web page']].map(([id, ic, l]) => `<button class="tab" role="tab" id="kn-stab-${id}" data-kn="src-tab" data-kn-tab="${id}" aria-selected="${x.tab === id}">${ic}${l}</button>`).join('')}</div>`
    const create = d.create ? `<div class="kn-note-line">${IC.info}<span>${esc(d.create)}.</span></div>` : ''
    let body = ''
    if (x.tab === 'files') {
      const mac = /Mac/.test(navigator.platform || navigator.userAgent || '')
      const taken = new Set((d.sources || []).map((y) => y.path))
      const list = x.pick && (x.pick.files || []).length ? `<div class="kn-pick-l">${x.pick.files.map((f) => `<div class="kn-pl"><span class="kn-ok-ic${f.too_big ? ' warn' : ''}">${f.too_big ? IC.warn : IC.check}</span><span class="k">${IC.file}</span><b>${esc(f.name)}</b><span class="set-sub">${esc(bytes(f.size || 0))}</span><span class="m${f.too_big ? ' warn' : ''}">${f.too_big ? 'Over 50 MB — not added. Keep it elsewhere and add its transcript.' : `→ <code>${esc(folder)}/${esc(f.name)}</code> · ${taken.has(`${folder}/${f.name}`) ? 'that name is taken: it gets a number' : 'copied byte for byte'}`}</span></div>`).join('')}</div>` : ''
      body = `<div class="kn-drop">${IC.upload}<b>${mac ? 'Drop files on this window' : 'Files from your computer'}</b>${mac ? '<span class="set-sub">or</span>' : ''}<button class="btn sm" id="kn-src-choose" data-kn="src-choose"${x.picking ? ' disabled' : ''}>${x.picking ? 'Choosing…' : 'Choose files…'}</button></div>${list}${knDropNote(x.pick) ? `<div class="kn-note-line warn">${IC.warn}<span>${esc(knDropNote(x.pick))}</span></div>` : ''}
        <div class="kn-note-line">${IC.info}<span>Files go into <code>${esc(folder)}/</code> as they are and are never edited. Claude reads Markdown, text, PDF and images; for Word or PowerPoint, add a PDF copy too.</span></div>${create}`
    } else if (x.tab === 'call') {
      const c = x.call, mm = c && x.mismatch && x.mismatch.name === c.name ? x.mismatch : null
      const inc = (k, label, has) => `<label class="kn-check"><input type="checkbox" data-kn-src-inc="${k}"${x.include[k] && has ? ' checked' : ''}${has ? '' : ' disabled'}> ${label}</label>`
      body = `<input class="search" id="kn-src-q" placeholder="Find a call or memo" aria-label="Find a call or memo" value="${esc(x.q)}" autocomplete="off" spellcheck="false"><div id="kn-src-list">${sourceList()}</div>
        ${mm ? `<div class="kn-warn" role="alert">${IC.warn}<span class="grow">This call's text goes only to <b>${esc(mm.call_name)}</b>; ${esc(v.name)} is read by <b>${esc(mm.vault_name)}</b>. Add anyway lets that profile's runs read its minutes.</span></div>` : ''}
        ${c ? `<div class="kn-field"><span>Include</span><div class="kn-inline"><label class="kn-check"><input type="checkbox" checked disabled> Minutes</label>${inc('transcript', 'Transcript', c.transcript)}${inc('chat', 'Chat', c.chat)}</div></div>
        <div class="kn-src-pre">${esc(folder)}/echo/ · kind: ${c.memo ? 'memo' : 'call'}${c.note ? ` · note: ${esc(c.note)}` : ''}</div>` : ''}
        <div class="kn-note-line">${IC.info}<span>The minutes go in as they are${c && c.note ? '. Its note is already in this vault, so the skill is told to add to it, not write another' : ''}. Nothing is processed until you prepare changes.</span></div>${create}`
    } else if (x.tab === 'mail') {
      body = d.m365 === false ? `<div class="kn-info">${IC.info}<span>Mail and Teams chats come through Echo's Microsoft 365 sign-in, and Echo isn't signed in. Sign in from <button class="kn-lnk" id="kn-src-m365" data-kn="src-m365">Settings → Calendar &amp; chat</button>.</span></div>`
        : `<input class="search" id="kn-src-q" placeholder="Search mail and Teams chats" aria-label="Search mail and Teams chats" value="${esc(x.q)}" autocomplete="off" spellcheck="false"><div id="kn-src-list">${sourceList()}</div>
        <div class="kn-note-line">${IC.info}<span>Read with Echo's Microsoft 365 sign-in. Mail carries no AI profile in Echo; it will be read by this vault's profile, ${esc(d.profile_name || profName(v.profile))}. Attachments are named, not downloaded.</span></div>${create}`
    } else {
      const a = knAddState(x)
      body = `<div class="kn-field"><span>Address</span><input class="search kn-in kn-url" id="kn-src-url" placeholder="https://" aria-label="The page's address" value="${esc(x.url)}" autocomplete="off" spellcheck="false"></div><div id="kn-src-note" class="set-sub kn-indent">${esc(a.note || '')}</div>
        <div class="kn-note-line">${IC.info}<span>Echo reads a page on a site you listed in Knowledge's settings (Settings → Plugins → Knowledge → Its settings) at once. Any other page, Echo asks you for its address in its own box — leave this empty to go straight there.</span></div>
        <div class="kn-note-line">${IC.lock}<span>Read once, now — never again by itself. Only the address is sent — no cookies, nothing from your vault. Echo keeps the page's main text as Markdown and its pictures beside it; menus, footers and scripts are left out. A page that builds itself with JavaScript isn't read yet.</span></div>${create}`
    }
    const err = x.error && x.tab !== 'mail' ? `<p class="error" role="alert">${esc(x.error)}</p>` : ''
    return sheet(`Add a source to ${esc(v.name)}`, body + err, `<span class="kn-fa-foot" id="kn-src-f">${sourceFoot()}</span>`, IC.tray, tabs)
  }
  async function addGo() {
    const s = st(), x = s.sheet, v = vault(), g = ing()
    if (!x || x.kind !== 'source') return
    const d = g.data || {}
    if (!knAddState(x, { m365: d.m365 !== false }).can) return
    const args = knAddArgs(x, isoDay())
    x.busy = true; x.error = null
    render()
    let r
    try { r = await run('kn_source_add', { id: v.id, ...args }, 'srcadd', x.pick && x.pick.handles ? { files: x.pick.handles } : undefined) } catch (e) {
      if (st().sheet === x) { x.busy = false; x.error = String(e.message || e); render(); return focusOn('#kn-src-url', '#kn-src-q', '#kn-src-choose') }
      return say(`Not added: ${e.message || e}`)
    }
    x.busy = false
    // A call on another AI profile: said on that call, with *Add anyway* (X-P3).
    if (r && r.mismatch) { x.mismatch = { ...r.mismatch, name: x.call.name }; render(); return focusOn('#kn-src-go') }
    // Echo's box for a web page's address, cancelled: nothing added, the sheet as it was.
    if (r && r.cancelled) { render(); return focusOn('#kn-src-url') }
    if (st().sheet === x) s.sheet = null
    const added = (r.added || (r.path ? [r] : [])), refused = r.refused || []
    const folder = d.folder || 'raw_inbox'
    const commits = added.map((a) => String(a.committed || '')).filter((c) => /^skipped: /.test(c))
    const pics = r.pictures ? ` with ${many(r.pictures, 'picture')}` : ''
    const picsLeft = r.pictures_failed ? ` ${many(r.pictures_failed, 'picture')} couldn't be saved and ${r.pictures_failed === 1 ? 'keeps its web address' : 'keep their web addresses'}.` : ''
    const text = [added.length === 1 ? `Added ${added[0].path}${pics}.${picsLeft}` : added.length ? `Added ${nf(added.length)} files to ${folder}/.` : '',
      refused.length ? `Not added: ${refused.map((f) => (String(f.why).includes(f.name) ? String(f.why) : `${f.name} — ${f.why}`).replace(/\.$/, '')).join('; ')}.` : '',
      commits.length ? `Not committed: ${commits[0].slice(9).replace(/\.$/, '')}.` : ''].filter(Boolean).join(' ')
    if (added.length) { g.sel = added[0].path; if (g.filter !== 'all' && g.filter !== 'new') g.filter = 'all' }
    await loadIngest()
    if (s.tab !== 'ingest' || s.ingRun) goVault(v.id, 'ingest', '')
    else { render(); loadSource().then(render) }
    if (refused.length || commits.length || !added.length) say(text || 'Nothing was added.'); else done(text)
  }

  // ── sheets: connect, new vault, new page, rows, remove, global twin, save minutes ──
  /** Ask before an action, in the page: the window's webview shows no confirm() dialogs. */
  function askFirst(title, text, yes, run, danger = false) { st().asking = { title, text, yes, run, danger }; render() }
  function askSheet() {
    const a = st().asking
    const inner = `<div class="kn-sheet-h"><h2>${esc(a.title)}</h2></div><div class="kn-sheet-b"><p>${esc(a.text)}</p></div><div class="kn-sheet-f"><span class="grow"></span><button class="btn ghost" data-kn="ask-no">Cancel</button><button class="btn ${a.danger ? 'danger' : 'primary'}" data-kn="ask-yes">${esc(a.yes)}</button></div>`
    // Over a call's page: inside Echo's sheet, as the save sheet is.
    if (framed) return `<div class="kn-sheet kn-ask kn-framed">${inner}</div>`
    return `<div class="kn-sheet-back kn-ask-back" data-kn="ask-back"><div class="kn-sheet kn-ask" role="alertdialog" aria-modal="true" aria-label="${esc(a.title)}">${inner}</div></div>`
  }
  /** The sheet closed (Cancel, Esc, a click beside it, leaving the activity): a folder picked for it and not
   *  connected is given back (`unpick`). */
  function dropSheet() {
    const s = st(), x = s.sheet
    s.sheet = null
    for (const root of knUnpickOf(x, null)) call('unpick', { root }).catch(() => {})
  }
  /** A sheet: over the activity, or (`framed`) inside Echo's own sheet over a call's page (`ctx.ui.sheet`). */
  let framed = false
  function sheet(titleHtml, body, foot, icon = IC.gem, steps = '') {
    if (framed) return `<div class="kn-sheet kn-framed"><div class="kn-sheet-h"><span class="kn-gem">${icon}</span><h2>${titleHtml}</h2><button class="icon-btn" data-kn="sheet-close" aria-label="Close">${IC.close}</button></div>${steps}<div class="kn-sheet-b">${body}</div><div class="kn-sheet-f">${foot}</div></div>`
    return `<div class="kn-sheet-back" data-kn="sheet-back"><div class="kn-sheet" role="dialog" aria-modal="true" aria-label="${esc(titleHtml.replace(/<[^>]+>/g, ''))}"><div class="kn-sheet-h"><span class="kn-gem">${icon}</span><h2>${titleHtml}</h2><button class="icon-btn" data-kn="sheet-close" aria-label="Close">${IC.close}</button></div>${steps}<div class="kn-sheet-b">${body}</div><div class="kn-sheet-f">${foot}</div></div></div>`
  }
  function connectSheet() {
    const s = st(), x = s.sheet
    const steps = ['Folder', 'What Echo found', 'Meetings & AI'].map((l, i) => `<span class="${i + 1 === x.step ? 'on' : i + 1 < x.step ? 'done' : ''}"><i>${i + 1 < x.step ? '✓' : i + 1}</i>${l}</span>`).join('')
    const stepsHtml = `<div class="kn-steps-bar">${steps}</div>`
    const p = x.picked
    let body = '', foot = ''
    if (x.step === 1) {
      const chosen = p ? `<div class="kn-field"><span>Folder</span><div class="kn-inline"><span class="kn-path" title="${esc(p.path)}"><code><bdi>${esc(short(p.path))}</bdi></code></span><button class="btn" data-kn="pick"${x.picking ? ' disabled' : ''}>${x.picking ? 'Choosing…' : 'Choose another…'}</button></div></div>` : `<div class="kn-field"><span>Folder</span><div class="kn-inline"><button class="btn primary" data-kn="pick"${x.picking ? ' disabled' : ''}>${x.picking ? 'Choosing…' : 'Choose…'}</button></div></div>`
      const refused = p && p.refused ? `<div class="kn-warn">${IC.warn}<span>${esc(p.refused)}</span></div>` : ''
      const empty = p && p.empty && !p.refused ? `<div class="kn-info">${IC.info}<span>This folder is empty. Start a new vault in it instead — Echo's twin starter puts the structure and skills there. <button class="btn sm" data-kn="new-here">Start a vault here…</button></span></div>` : ''
      const nomd = p && !p.empty && !p.refused && p.detected && p.detected.md_files === 0 ? `<div class="kn-info">${IC.info}<span>No Markdown pages here yet. It can be connected anyway; pages appear as you add them.</span></div>` : ''
      body = `${chosen}${refused}${empty}${nomd}<div class="kn-info">${IC.info}<span>Any folder of Markdown: an Obsidian vault, a git repository, a shared drive's folder. Echo only reads it now; nothing in it changes until you save something from Echo.</span></div>`
      foot = `<span class="set-sub grow">Nothing changes until you press Connect.</span><button class="btn ghost" data-kn="sheet-close">Cancel</button><button class="btn primary" data-kn="step" data-step="2"${p && !p.refused && !p.empty ? '' : ' disabled'}>Next</button>`
    } else if (x.step === 2) {
      const d = (p && p.detected) || {}
      const f = (k, label, val, sub) => `<div class="kn-found-r"><span class="${val ? 'ok' : 'none'}">${val ? IC.check : '—'}</span><span class="k">${label}</span><span class="v">${val ? `<code>${esc(val)}</code>` : '<span class="set-sub">none found</span>'}${sub ? ` <span class="set-sub">${sub}</span>` : ''}</span></div>`
      const size = p.index_bytes ? `${kb(p.index_bytes)}${p.index_bytes > 60000 ? ' — large: Claude will search it' : ''}` : ''
      body = `<div class="kn-found">
        ${f('pages', 'Pages', d.pages === '' ? '(the folder itself)' : d.pages, `${many(d.md_files, 'page')}${d.obsidian ? ' · Obsidian settings found' : ''}`)}
        ${f('index', 'Index', d.index, size)}
        ${f('notes', 'Meeting notes', d.notes, d.notes ? `${many(d.notes_count, 'note')} · ${esc(d.naming)}` : 'Echo makes <code>notes/</code> when it saves the first')}
        ${f('tax', 'Tags and terms', (d.taxonomies || []).map((t) => t.split('/').pop()).join(' · '), '')}
        ${f('schema', 'Rules for agents', (d.schema || []).join(' · '), '')}
        ${f('skills', 'Skills', (d.skills || []).length ? String(d.skills.length) : '', (d.skills || []).slice(0, 3).map((k) => esc(k.name)).join(', ') + ((d.skills || []).length > 3 ? ', …' : ''))}
        ${f('sources', 'Sources', [d.sources, d.staging].filter(Boolean).join(' · '), d.sources || d.staging ? 'never edited by Echo' : '')}
        ${f('ledgers', 'Ledgers', (d.ledgers || []).length ? String(d.ledgers.length) : '', esc((d.ledgers || []).join(', ')))}
        ${f('git', 'Git', p.git ? `${(p.git.remotes || []).join(', ') || 'no remote'} · ${p.git.branch || 'detached'}` : '', '')}
      </div>${p.git && p.git.changed ? `<div class="kn-warn">${IC.warn}<span><b>${p.git.changed} file${p.git.changed === 1 ? ' is' : 's are'} changed and not committed.</b> They're yours: Echo never commits them.</span></div>` : ''}
      <p class="note-line">${IC.info}<span>Echo keeps its index of these pages in its own data folder — the vault gets no new files. Anything here can be changed later in the vault's Settings.</span></p>`
      foot = `<span class="set-sub grow">Nothing in your folder has changed.</span><button class="btn ghost" data-kn="step" data-step="1">Back</button><button class="btn primary" data-kn="step" data-step="3">Next</button>`
    } else {
      const profiles = (typeof ai === 'function' ? ai().profiles : []) || []
      const def = (typeof ai === 'function' ? ai().default : '') || 'system'
      const radio = (val, label, sub) => `<label class="kn-radio"><input type="radio" name="kn-minutes" value="${val}" data-kn-form="minutes"${x.minutes === val ? ' checked' : ''}><span><b>${label}</b>${sub ? `<span class="set-sub">${sub}</span>` : ''}</span></label>`
      body = `<div class="kn-lbl">Meeting minutes</div>
        ${radio('auto', 'Save each call\'s minutes here automatically', `Right after Echo writes them, in <code>${esc((p.detected && p.detected.notes) || 'notes')}/</code>, with a row in the index.`)}
        ${radio('ask', 'Only when I ask', 'A call\'s ⋯ → Save to Knowledge.')}
        ${radio('off', 'Never', '')}
        <div class="kn-field"><span>Name</span><input class="search kn-in" id="kn-name" value="${esc(x.name || p.name || '')}" aria-label="The vault's name"></div>
        <div class="kn-field"><span>Read by</span><select class="set-in" data-kn-form="profile" aria-label="AI profile">${profiles.map((q) => `<option value="${esc(q.id)}"${q.id === (x.profile || def) ? ' selected' : ''}>${esc(q.name)}</option>`).join('')}</select></div>
        <p class="set-sub kn-indent">Ask sessions in this vault use this profile. Calls recorded with another profile are never saved here by themselves.</p>
        ${p.git ? `<label class="kn-check"><input type="checkbox" data-kn-form="commit"${x.commit ? ' checked' : ''}><span><b>Commit what Echo saves</b> <span class="set-sub">— off: Echo writes the files and you commit. On: one commit per note, only Echo's files, never a push.</span></span></label>` : ''}
        ${x.error ? `<p class="error">${esc(x.error)}</p>` : ''}`
      foot = `<span class="set-sub grow">You can change all of this later.</span><button class="btn ghost" data-kn="step" data-step="2">Back</button><button class="btn primary" data-kn="connect-go"${s.busy.connect ? ' disabled' : ''}>${s.busy.connect ? 'Connecting…' : 'Connect'}</button>`
    }
    return sheet('Connect a folder', body, foot, IC.folder, stepsHtml)
  }
  function newSheet() {
    const s = st(), x = s.sheet, d = st().data || {}
    // As the app names the folder (recorder::slugify): letters and digits kept, the rest a dash.
    const slug = String(x.name || 'my-twin').toLowerCase().replace(/[^\p{Alphabetic}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'vault'
    const folder = x.picked ? x.picked.path : 'no folder yet'
    const tree = `my-vault/
├── AGENTS.md · CLAUDE.md      <em>the rules: structure, page format, index, tags</em>
├── README.md                  <em>getting started</em>
├── log.md                     <em>what changed, one line each</em>
├── raw_inbox/                 <em>sources, never edited</em>
├── .claude/skills/
│   ├── twin/                  <em>/twin — find, answer, remember</em>
│   └── process-inbox/         <em>/process-inbox — sources → pages</em>
└── knowledge/                 <em>the pages · Obsidian opens this</em>
    ├── CATALOG.md             <em>the index, a table per section</em>
    ├── TAG_TAXONOMY.md · TERMS_TAXONOMY.md
    ├── profile/DIGITAL_PROFILE.md   <em>who you are — yours to fill</em>
    ├── topics/ clients/ activities/ notes/ media/ action-items/
    └── templates/             <em>meeting note, page</em>`.replace('my-vault', esc(x.picked ? (x.picked.name || 'vault') : slug))
    const noGit = !d.git
    const body = `<div class="kn-field"><span>Name</span><input class="search kn-in" id="kn-name" value="${esc(x.name || '')}" placeholder="My twin" aria-label="The vault's name"></div>
      <div class="kn-field"><span>Folder</span><div class="kn-inline"><span class="kn-path" title="${esc(folder)}"><code><bdi>${esc(short(folder))}</bdi></code></span><button class="btn" data-kn="pick-new"${x.picking ? ' disabled' : ''}>${x.picking ? 'Choosing…' : 'Pick or make a folder…'}</button></div></div>
      <p class="set-sub kn-indent">${x.picked ? (x.picked.refused ? `<span class="warn">${esc(x.picked.refused)}</span>` : x.picked.empty ? 'An empty folder — the vault goes in it.' : '<span class="warn">This folder isn\'t empty — choose a new or empty one.</span>') : 'Pick or make a folder — an empty one, or a new one made in the picker (New Folder).'}</p>
      <div><div class="kn-lbl">What Echo puts in it</div><pre class="kn-tree-pre">${tree}</pre></div>
      <label class="kn-check"><input type="checkbox" data-kn-form="git"${x.git && !noGit ? ' checked' : ''}${noGit ? ' disabled' : ''}><span><b>Make it a git repository</b> <span class="set-sub">${noGit ? '— git isn\'t installed; a plain folder works the same, without history.' : '— one first commit, and Echo commits what it saves here (a switch in Settings). Add a remote later to back it up.'}</span></span></label>
      <label class="kn-check"><input type="checkbox" data-kn-form="auto"${x.auto ? ' checked' : ''}><span><b>Save my meeting minutes here automatically</b></span></label>
      <p class="note-line">${IC.info}<span>Your name, from Settings → About me, goes into the profile and the README. Nothing else is yours yet.</span></p>
      ${x.error ? `<p class="error">${esc(x.error)}</p>` : ''}`
    const blocked = x.picked && (!x.picked.empty || x.picked.refused)
    const foot = `<span class="set-sub grow">24 files in a new folder.</span><button class="btn ghost" data-kn="sheet-close">Cancel</button><button class="btn primary" data-kn="new-go"${blocked || s.busy.new ? ' disabled' : ''}>${s.busy.new ? 'Creating…' : 'Create'}</button>`
    return sheet('Start a new vault', body, foot, IC.plus)
  }
  function newPageSheet() {
    const s = st(), x = s.sheet, t = s.tree || { pages: [], root: '' }
    const folders = [...new Set(t.pages.map((p) => p.path.split('/').slice(0, -1).join('/')))].sort()
    const root = t.root || ''
    if (!folders.includes(root)) folders.unshift(root)
    const templates = x.templates || []
    const body = `<div class="kn-field"><span>Name</span><input class="search kn-in" id="kn-pname" value="${esc(x.name || '')}" placeholder="Pricing model" aria-label="The page's name"></div>
      <div class="kn-field"><span>In</span><select class="set-in" data-kn-form="folder" aria-label="Folder">${folders.map((f) => `<option value="${esc(f)}"${f === x.folder ? ' selected' : ''}>${esc(f || '(the vault)')}</option>`).join('')}</select></div>
      ${templates.length ? `<div class="kn-field"><span>From</span><select class="set-in" data-kn-form="template" aria-label="Template"><option value="">The vault's page format</option>${templates.map((tp) => `<option value="${esc(tp)}"${tp === x.template ? ' selected' : ''}>${esc(tp.split('/').pop())}</option>`).join('')}</select></div>` : ''}
      <label class="kn-check"><input type="checkbox" data-kn-form="row"${x.row ? ' checked' : ''}><span><b>Add a row to the index</b> <span class="set-sub">— in the table for its folder, when the index has one.</span></span></label>
      ${x.error ? `<p class="error">${esc(x.error)}</p>` : ''}`
    const foot = `<span class="set-sub grow">It opens in the editor.</span><button class="btn ghost" data-kn="sheet-close">Cancel</button><button class="btn primary" data-kn="newpage-go"${s.busy.newpage ? ' disabled' : ''}>Create page</button>`
    return sheet('New page', body, foot, IC.file)
  }
  function rowsSheet() {
    const s = st(), x = s.sheet
    const body = !x.rows ? '<div class="skeleton"><i></i><i></i></div>' : `<p class="set-sub">Each row goes in the table of its folder's section in the index${vault() && vault().commit ? ', in one commit' : ''}. Nothing else changes.</p><div class="kn-rows">${x.rows.map((r) => `<div class="kn-rowp"><div class="kn-rowp-h"><code>${esc(r.path.replace(/^[^/]*\//, ''))}</code><span class="tag">${esc(r.section || '—')}</span></div><div class="kn-rowp-b" title="${esc(r.row || '')}"><span>${esc(r.desc || '')}</span><span class="set-sub">${esc(r.date || '')}</span></div></div>`).join('')}</div>${x.error ? `<p class="error">${esc(x.error)}</p>` : ''}`
    const ok = x.rows ? x.rows.filter((r) => !/^skipped|already/.test(r.section)).length : 0
    return sheet('Add to the index', body, `<span class="set-sub grow">${x.rows ? `${ok} of ${x.rows.length} will be added` : ''}</span><button class="btn ghost" data-kn="sheet-close">Cancel</button><button class="btn primary" data-kn="rows-go"${!ok || s.busy.rows ? ' disabled' : ''}>Add ${ok} row${ok === 1 ? '' : 's'}</button>`, IC.index)
  }
  function removeSheet() {
    const v = vault()
    return sheet(`Remove ${esc(v.name)} from Echo?`, `<p>Echo forgets this vault and its own index of it. <b>The folder and every file in it stay as they are</b> — connect it again any time.</p><p class="set-sub"><code>${esc(v.root)}</code></p>`, `<span class="grow"></span><button class="btn ghost" data-kn="sheet-close">Keep it</button><button class="btn danger" data-kn="remove-go">Remove from Echo</button>`, IC.gem)
  }
  function twinSheet() {
    const s = st(), x = s.sheet, v = vault()
    const t = x.text
    const name = esc(x.name || (t && t.name) || '')
    const body = `<div class="kn-field"><span>Name</span><span class="kn-inline"><code class="kn-dim">~/.claude/skills/</code><input class="search kn-in sm" id="kn-twin-name" value="${name}" aria-label="The skill's name" spellcheck="false"><code class="kn-dim">/SKILL.md</code></span></div>
      <p class="set-sub">${t && t.own ? 'This vault\'s own <code>twin</code> skill' : 'Echo\'s starter <code>twin</code> skill'}, its paths made absolute to the vault, so <code>/${name}</code> works in any folder. Read it before you install it: every Claude Code session of yours will be able to use it.</p>
      ${t && t.taken_by ? `<p class="error">/${esc(t.name)} is ${esc(t.taken_by)}'s twin skill already: choose another name.</p>` : ''}${t && t.installed && t.installed !== t.name ? `<p class="set-sub">Installed now as /${esc(t.installed)}: Install takes that one out and adds /${esc(t.name)}.</p>` : ''}
      ${!t ? '<div class="skeleton"><i></i><i></i></div>' : `<pre class="kn-rowpre kn-twin-text" tabindex="0" aria-label="The file Echo writes">${esc(t.text)}</pre>`}
      ${v && v.profile !== 'system' ? `<div class="kn-warn">${IC.warn}<span><b>This vault is read on ${esc(profName(v.profile))}.</b> From your own Claude Code the skill reads it with that Claude Code's own account and settings, not this profile's.</span></div>` : ''}
      <p class="set-sub">It goes into your own Claude Code (<code>~/.claude</code>); sessions on other AI profiles don't see it. Remove takes out only Echo's copy.</p>${x.error ? `<p class="error">${esc(x.error)}</p>` : ''}`
    return sheet('Use /twin from any Claude Code session', body, `<span class="grow"></span><button class="btn ghost" data-kn="sheet-close">Cancel</button><button class="btn primary" data-kn="twin-global"${t && !t.taken_by ? '' : ' disabled'}>Install</button>`, IC.ask)
  }
  /** The twin skill into the user's own Claude Code (Echo #776 `ctx.claude.installSkill`, `uses.skills`): on this click,
   *  before anything else is awaited (Echo takes it only while the click is fresh); the text the sheet showed, or the
   *  one Settings would show (Update). Echo never writes over a skill that isn't the plugin's own. */
  // The click's work is model.js's (`knTwinInstall`, `knTwinRemove`): the host reserves the name first, the new skill
  // goes in before the old one comes out.
  async function twinGlobal(v) {
    const s = st(), x = s.sheet && s.sheet.kind === 'twin' ? s.sheet : null
    const say2 = (m) => { if (x && st().sheet === x) { x.error = m; render() } else say(m) }
    if (!ctx.claude || typeof ctx.claude.installSkill !== 'function') return say2('This Echo can\'t add a skill to your own Claude Code.')
    const t = x && x.text
    const name = (x && x.name) || (t && t.name) || ''
    // Only the text the sheet shows, as it shows it (its name typed since: read again first).
    if (!t || t.name !== name) return say2('Wait for the skill\'s text to show, then Install.')
    let r
    try { r = await knTwinInstall({ claude: ctx.claude, call, vault: v.id, name, text: t.text, old: (s.settings && s.settings.global_twin) || null, reservedAt: t.reserved_at }) } catch (err) { if (err.again) t.reserved_at = Date.now(); return say2(String(err.message || err)) }
    if (x && st().sheet === x) s.sheet = null
    await loadSettings(); render()
    const oldNote = r.old && r.old.error ? ` /${r.old.name} is still there: ${r.old.error}.` : r.old ? ` /${r.old.name} is out.` : ''
    done(`/${name} is in your Claude Code: ~/.claude/skills/${name}/SKILL.md.${oldNote}`)
  }
  async function twinRemove(v) {
    const name = st().settings && st().settings.global_twin
    if (!name) return
    if (!ctx.claude || typeof ctx.claude.removeSkill !== 'function') return say('This Echo can\'t change your own Claude Code\'s skills.')
    let r
    try { r = await knTwinRemove({ claude: ctx.claude, call, vault: v.id, name }) } catch (err) { return say(String(err.message || err)) }
    await loadSettings(); render()
    done(r.gone ? `/${name} was no longer in your Claude Code (removed with the plugin, or by you): forgotten here.` : `/${name} is out of your Claude Code.`)
  }
  async function loadTwinText() {
    const s = st(), x = s.sheet, v = vault()
    if (!x || x.kind !== 'twin' || !v) return
    const want = x.name || ''
    try { const t = await get(`api/kn/${enc(v.id)}/twin-text?name=${enc(want)}&reserve=1`); if (st().sheet === x && (x.name || '') === want) { x.text = t; if (!x.name) x.name = t.name } } catch (err) { x.error = String(err.message || err) }
    render()
  }
  function sampleSheet() {
    const x = st().sheet, p = x.preview
    const body = p === undefined ? '<div class="skeleton"><i></i><i></i></div>'
      : !p ? '<p class="set-sub">No call with minutes on this vault\'s AI profile yet. After the next one, this shows how it lands here.</p>'
        : `<p class="set-sub">The newest call, <b>${esc(p.title)}</b>, as the vault's rule would save it. Nothing is written.</p>
      <div class="kn-field"><span>File</span><code>${esc(p.path)}</code></div>
      <div class="kn-field"><span>Index row</span>${p.row ? `<pre class="kn-rowpre">${esc(p.row)}</pre>` : '<span class="set-sub">none — the index has no table for notes</span>'}</div>
      <pre class="kn-rowpre kn-twin-text" tabindex="0" aria-label="The note">${esc(p.note || '')}</pre>`
    return sheet('How a call lands here', body, '<span class="grow"></span><button class="btn primary" data-kn="sheet-close">Close</button>', IC.gem)
  }
  function saveSheet() {
    const s = st(), x = s.sheet, pv = x.preview
    const vs = ((S.call && S.call.knowledge && S.call.knowledge.vaults) || []).filter((v) => v.available)
    const body = `<div class="kn-field"><span>Vault</span><select class="set-in" data-kn-form="svault" aria-label="Vault">${vs.map((v) => `<option value="${esc(v.id)}"${v.id === x.vault ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>
      ${!pv ? '<div class="skeleton"><i></i><i></i></div>' : `<div class="kn-field"><span>As</span><span class="kn-inline"><code class="kn-dim">${esc(pv.path.split('/').slice(0, -1).join('/'))}/</code><input class="search kn-in sm kn-stem" id="kn-stem" value="${esc(x.stem != null ? x.stem : pv.stem)}" aria-label="File name">.md</span></div>
      ${pv.exists && !x.stemEdited ? '<p class="set-sub kn-indent warn">A note with this name is there — it gets -2.</p>' : ''}
      <div class="kn-field"><span>Index row</span>${pv.row ? `<pre class="kn-rowpre">${esc(pv.row)}</pre>` : '<span class="set-sub">This vault has no index.</span>'}</div>
      ${pv.index ? `<div class="kn-field"><span></span><span class="set-sub">→ <code>${esc(pv.index)}</code></span></div>` : ''}
      <div class="kn-field"><span>Include</span><div class="kn-inline"><label class="kn-check"><input type="checkbox" checked disabled> Minutes</label><label class="kn-check"><input type="checkbox" data-kn-form="transcript"${x.transcript ? ' checked' : ''}> Transcript</label><label class="kn-check"><input type="checkbox" data-kn-form="chat"${x.chat ? ' checked' : ''}> Chat</label></div></div>
      ${pv.profile_ok ? '' : `<div class="kn-warn">${IC.warn}<span><b>This call's text goes only to ${esc(profName(pv.call_profile))}.</b> ${esc(vs.find((v) => v.id === x.vault) ? vs.find((v) => v.id === x.vault).name : 'This vault')} is read by <b>${esc(profName(pv.vault_profile))}</b> — saving it there lets that profile's sessions read these minutes.</span></div>`}
      <p class="set-sub">${pv.commit ? `Commits only this note${pv.people ? ', the index row and its people\'s pages' : ' and the index row'}${pv.branch ? ` on <code>${esc(pv.branch)}</code>` : ''}.` : 'Commits are off for this vault — you commit.'}</p>`}
      ${x.error ? `<p class="error">${esc(x.error)}</p>` : ''}`
    const saved = ((S.call && S.call.knowledge && S.call.knowledge.record && S.call.knowledge.record.saved) || []).map((e) => e.vault)
    const foot = `<span class="set-sub grow">${saved.length ? `Already in ${esc(saved.map((id) => (vs.find((v) => v.id === id) || { name: id }).name).join(', '))}.` : 'Nothing is written before you save.'}</span><button class="btn ghost" data-kn="sheet-close">Cancel</button><button class="btn primary" data-kn="save-minutes-go"${!pv || s.busy.saveMinutes ? ' disabled' : ''}>${pv && !pv.profile_ok ? 'Save anyway' : 'Save'}</button>`
    return sheet('Save the minutes to Knowledge', body, foot, IC.gem)
  }
  const profName = (id) => { const p = typeof profileOf === 'function' && profileOf(id); return p ? p.name : (id || 'another profile') }
  function overlay(inFrame = false) {
    const s = st()
    framed = !!inFrame
    // In Echo's frame one sheet at a time: a question asked first stands over the sheet it came from.
    try { return inFrame && s.asking ? askSheet() : sheetView() + (s.asking ? askSheet() : '') } finally { framed = false }
  }
  function sheetView() {
    const s = st()
    if (!s.sheet) return ''
    switch (s.sheet.kind) {
      case 'connect': return connectSheet()
      case 'new': return newSheet()
      case 'newpage': return newPageSheet()
      case 'rows': return rowsSheet()
      case 'remove': return removeSheet()
      case 'twin': return twinSheet()
      case 'save': return saveSheet()
      case 'sample': return sampleSheet()
      case 'fixall': return fixAllSheet()
      case 'source': return sourceSheet()
      case 'chedit': return changeEditSheet()
      case 'skill': return skillSheet()
    }
    return ''
  }

  // ── Home (spec-2 K11): what's new, what waits, how the vault is doing, and Ask in a card — from Echo's caches; git's
  // part comes after the first draw (K11-10). Every title, path, name and message is others' words: `esc()` ──
  function homeSt() {
    const s = st()
    if (!s.home || s.home.vault !== s.vault) s.home = { vault: s.vault, data: null, error: null, filter: 'all', polls: 0 }
    return s.home
  }
  async function loadHome() {
    const v = vault(), g = homeSt()
    if (!v) return
    try {
      const d = await get(`api/kn/${enc(v.id)}/home`)
      if (homeSt() !== g) return
      if (d.error) g.error = d.error; else Object.assign(g, { data: d, error: null })
    } catch (e) { g.error = String(e.message || e) }
    // git is read on a thread of its own: Home asks again until its part is there (a few times, then the 2 s poll's rev).
    if (g.data && g.data.whats_new && ['reading', 'pending'].includes(g.data.whats_new.git) && g.polls < 20) {
      g.polls++
      setTimeout(() => { if (homeSt() === g && homeShown()) loadHome().then(render) }, 700)
    } else g.polls = 0
  }
  const HOME_WHO = { minutes: 'echo', people: 'echo', starter: 'echo', editor: 'echo', 'new-page': 'echo', ingest: 'ingest', ask: 'ask', health: 'health', outside: 'out' }
  const HOME_SUG = { meeting: IC.cal, note: IC.file, actions: IC.tasks, contradiction: IC.warn }
  const HOME_KIND = { echo: 'Echo', mail: 'mail', teams: 'Teams', web: 'web', file: 'files' }
  /** A path as the vault's pages see it (the pages root left off). */
  const inPages = (p) => { const r = ((vault() || {}).paths || {}).pages || ''; return r && String(p).startsWith(`${r}/`) ? String(p).slice(r.length + 1) : String(p) }
  function homeView() {
    const g = homeSt(), d = g.data
    if (!d) return `<div class="kn-h-wrap">${g.error ? `<div class="kn-none"><p class="error">${esc(g.error)}</p></div>` : '<div class="skeleton" style="padding:24px"><i></i><i></i><i></i></div>'}</div>`
    const c = knHomeCards(d, new Date())
    const left = `${d.fresh ? homeSteps() : ''}${homeAsk(d)}${homeNews(d)}`
    const right = `${homeHealth(d, c.health)}${homeComing(c.coming)}${d.fresh ? '' : homeHubs(d.hubs)}${homeVault(d.vault, d.whats_new)}`
    return `<div class="kn-h-wrap" data-keep-scroll><div class="kn-h"><div class="kn-h-col">${left}</div><div class="kn-h-col">${right}</div></div></div>`
  }
  /** A new vault's three steps (K11-09; the welcome card that was on its index page). */
  function homeSteps() {
    const v = vault(), r = knHomeRecord(v.minutes, v.paths)
    const record = r.code.reduce((h, x) => h.replace(esc(x), `<code>${esc(x)}</code>`), esc(r.text))
    return `<div class="kn-h-welcome"><h2>Your twin is ready</h2><p>A folder of Markdown you own${v.git ? ', in git,' : ''} with an index, a schema and two skills. Three things make it yours:</p><div class="kn-h-steps">
      <div class="kn-h-step"><h3><span class="n">1</span>Add a source</h3><p>Files, a call or memo, a mail thread or a web page. Its <code>process-inbox</code> skill turns them into pages, and you review each change.</p><button class="btn sm primary" data-kn="ing-add" id="kn-h-add1">${IC.tray} Add a source</button></div>
      <div class="kn-h-step"><h3><span class="n">2</span>Record a call</h3><p>${record}</p><button class="btn sm" data-kn="tab" data-kn-tab="settings" id="kn-h-minutes">Meeting minutes: ${esc(r.word)}</button></div>
      <div class="kn-h-step"><h3><span class="n">3</span>Ask your twin</h3><p>Claude Code opens in the vault, in Echo's panel: it reads your pages, with the vault's own skills and rules.</p><button class="btn sm" data-kn="ask" id="kn-h-ask3">${IC.ask} Ask the vault</button></div></div></div>`
  }
  /** The Ask card (K11-01): Ask the vault — Claude Code in the vault, in Echo's panel. */
  function homeAsk(d) {
    const v = vault()
    return `<div class="kn-card kn-h-ask"><div class="kn-card-h"><h3>${IC.ask} Ask ${esc(v.name)}</h3>${d.fresh ? '' : '<span class="set-sub">Claude Code, in the vault\'s folder</span>'}</div><p class="set-sub kn-h-asklead">Claude Code opens in Echo's panel with this vault as its project — its <code>CLAUDE.md</code>, skills and rules for agents come with it. You ask there; Echo types nothing for you.</p><div class="kn-acts"><button class="btn primary sm" data-kn="ask" id="kn-h-ask">${IC.ask} Ask the vault</button></div></div>`
  }
  /** What's new (K11-04): who changed what in the last 14 days, a row opening its page. */
  function homeNews(d) {
    const g = homeSt(), w = d.whats_new || {}, rows = knHomeNews(w.rows, g.filter, w.notes || ''), now = new Date()
    const f = (id, label) => `<button class="${g.filter === id ? 'on' : ''}" data-kn="home-f" data-kn-f="${id}" aria-pressed="${g.filter === id}" id="kn-h-f-${id}">${label}</button>`
    const row = (r, i) => {
      const pm = r.plus != null || r.minus != null ? pmOf(r) : ''
      const inner = `<span class="ic${r.kind === 'new' ? ' new' : ''}">${r.kind === 'new' ? IC.plus : IC.edit}</span><span class="tt"><b>${esc(r.title)}</b>${r.path ? `<code>${esc(inPages(r.path))}</code>` : ''}</span><span class="t">${pm}<span>${esc(knWhen(r.at, now))}</span></span><span class="by"><span class="kn-h-who ${HOME_WHO[r.by] || ''}">${esc(r.who)}</span>${r.detail ? `<span>${esc(r.detail)}</span>` : ''}</span>`
      return r.path ? `<button class="kn-h-chg" data-kn="open" data-path="${esc(r.path)}" title="${esc(r.path)}" id="kn-h-chg${i}">${inner}</button>` : `<div class="kn-h-chg">${inner}</div>`
    }
    const none = rows.length ? '' : `<p class="set-sub kn-h-none">${g.filter === 'new' ? 'No new pages' : g.filter === 'notes' ? 'No notes changed' : 'Nothing changed'} in the last 14 days.</p>`
    const reading = w.git === 'reading' ? `<div class="set-sub kn-h-git">${SPIN} Reading git…</div>` : ''
    return `<div class="kn-card"><div class="kn-card-h kn-h-wrapline"><h3>What's new</h3><span class="set-sub">the last 14 days · who changed what</span><span class="grow"></span><div class="kn-h-mini" role="group" aria-label="Show">${f('all', 'All')}${f('new', 'New pages')}${f('notes', 'Notes')}</div><button class="kn-lnk" data-kn="home-recent" id="kn-h-recent">All changes</button></div><div class="kn-h-chgs">${rows.map(row).join('')}${none}${reading}</div></div>`
  }
  /** The Health card (K11-05): the score, its 30 days, the first three that need you, what code can fix. */
  function homeHealth(d, c) {
    const hd = d.health || {}, tr = knHealthTrend(hd.history, isoDay(), 30), p = knTrendPath(tr.points, { w: 200, h: 38 })
    const dot = ([x, y], r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--accent)"/>`
    const spark = `<svg class="kn-spark kn-h-spark" viewBox="0 0 200 38" preserveAspectRatio="none" aria-hidden="true"><path d="${p.area}" fill="var(--accent-soft)"/><path d="${p.line}" fill="none" stroke="var(--accent)" stroke-width="1.8" vector-effect="non-scaling-stroke"/>${p.dots.map((x) => dot(x, 2)).join('')}${p.end ? dot(p.end, 3) : ''}</svg>`
    const delta = tr.delta == null ? '' : `<span class="tag ${tr.delta >= 0 ? 'ok' : 'warn'}">${tr.delta >= 0 ? '+' : '−'}${Math.abs(tr.delta)} in 30 days</span>`
    const lines = c.lines.map((l, i) => `<button class="kn-h-nl" data-kn="hl-pick" data-kn-key="${esc(l.key)}" id="kn-h-nl${i}">${IC.warn}<span><b>${esc(l.title)}</b><span class="set-sub">${esc(l.sub)}</span></span></button>`).join('')
    return `<div class="kn-card"><div class="kn-card-h"><h3>Health</h3>${delta}<span class="grow"></span><button class="kn-lnk" data-kn="tab" data-kn-tab="health" id="kn-h-health">Open Health</button></div>
      <div class="kn-h-score"><div class="kn-ring kn-h-ring" style="--p:${c.score}%" role="img" aria-label="Score ${c.score} of 100"><span>${c.score}<small>of 100</small></span></div><div class="kn-h-grow">${c.nothing ? '<b>Nothing to fix</b>' : ''}${spark}<div class="set-sub">${esc(c.sub)}</div></div></div>
      ${lines ? `<div class="kn-lbl">Needs you · ${nf(c.needs)}</div><div class="kn-h-nlist">${lines}</div>` : ''}${c.fixable ? `<div class="set-sub">${esc(c.fixable)}</div>` : ''}</div>`
  }
  /** Coming in (K11-06): what waits for review, what isn't processed, the run going — else "Nothing waiting." */
  function homeComing(c) {
    const rows = []
    if (c.waiting) rows.push(`<div class="kn-h-ci"><span class="big">${nf(c.waiting.n)}</span><div class="kn-h-grow">${c.waiting.n === 1 ? 'change waits' : 'changes wait'} for your review<div class="set-sub">${esc(c.waiting.sources)}</div></div><button class="btn sm primary" id="kn-h-review" ${c.waiting.run ? `data-kn="ing-run" data-kn-run="${esc(c.waiting.run)}"` : 'data-kn="tab" data-kn-tab="ingest"'}>Review</button></div>`)
    if (c.fresh) rows.push(`<div class="kn-h-ci"><span class="big">${nf(c.fresh.n)}</span><div class="kn-h-grow">${c.fresh.n === 1 ? 'source' : 'sources'} not processed yet<div class="kn-h-chips">${c.fresh.kinds.map(([k, n]) => `<span class="tag${k === 'echo' ? ' acc' : ''}">${esc(HOME_KIND[k] || k)} ${nf(n)}</span>`).join('')}</div></div><button class="btn sm" data-kn="home-prep" id="kn-h-prep">Prepare changes</button></div>`)
    if (c.running) rows.push(`<div class="kn-h-ci"><span class="kn-spin" aria-hidden="true"></span><div class="kn-h-grow">Preparing changes<div class="set-sub">${esc(c.running.step)}</div></div><button class="btn sm" data-kn="ing-run" data-kn-run="${esc(c.running.run)}" id="kn-h-run">Open</button></div>`)
    const body = c.error ? `<p class="error">${esc(c.error)}</p>` : c.nothing ? `<div class="set-sub">Nothing waiting.</div><button class="btn sm kn-h-add" data-kn="ing-add" id="kn-h-add">${IC.tray} Add a source</button>` : rows.join('')
    return `<div class="kn-card"><div class="kn-card-h"><h3>Coming in</h3><span class="grow"></span>${c.nothing ? '' : '<button class="kn-lnk" data-kn="tab" data-kn-tab="ingest" id="kn-h-ingest">Ingest</button>'}</div>${body}</div>`
  }
  /** Most linked (K11-07): where to start reading. */
  function homeHubs(h) {
    if (!h || (!h.index && !(h.pages || []).length)) return ''
    const row = (path, sub, i) => `<button class="kn-h-hub" data-kn="open" data-path="${esc(path)}" id="kn-h-hub${i}"><code>${esc(inPages(path))}</code><span>${esc(sub)}</span></button>`
    return `<div class="kn-card"><div class="kn-card-h"><h3>Most linked</h3><span class="set-sub">where to start reading</span></div><div>${h.index ? row(h.index.path, `the index · ${many(h.index.links, 'link')}`, 'i') : ''}${(h.pages || []).map((p, i) => row(p.path, `${nf(p.in)} in`, i)).join('')}</div></div>`
  }
  /** The vault card (K11-08). */
  function homeVault(x, w) {
    const v = vault(), git = (x && x.git) || null, now = new Date()
    if (!x) return ''
    const last = git && git.last ? ` · “${esc(git.last.subject)}” · ${esc(knWhen(git.last.at, now))}` : ''
    const branch = (git && git.branch) || (v.git && v.git.branch) || ''
    const said = { none: 'not a git repository', 'no-git': 'git isn\'t installed', failed: 'git didn\'t answer' }[(w || {}).git]
    const gitLine = said ? esc(said) : git ? `${esc(branch || 'detached')}${last}` : `${esc(branch)}${branch ? ' · ' : ''}reading…`
    const index = x.index ? `<code>${esc(String(x.index).split('/').pop())}</code>${x.index_bytes != null ? ` · ${esc(kb(x.index_bytes))}` : ''}` : 'none'
    return `<div class="kn-card"><div class="kn-card-h"><h3>${esc(v.name)}</h3><span class="grow"></span><button class="kn-lnk" data-kn="tab" data-kn-tab="settings" id="kn-h-settings">Settings</button></div>
      <div class="kn-h-kv"><span>Folder</span><code title="${esc(v.root)}">${esc(short(v.root))}</code><span>Pages</span><span><code>${esc(x.pages_root ? `${x.pages_root}/` : '(the folder itself)')}</code>${x.obsidian ? ' · Obsidian' : ''}</span><span>Index</span><span>${index}</span><span>Git</span><span>${gitLine}</span><span>AI</span><span>${esc(x.profile_name || x.profile || '')}</span><span>Holds</span><span>${esc(`${many(x.pages, 'page')} · ${many(x.tags, 'tag')} · ${many(x.skills, 'skill')}`)}</span></div></div>`
  }

  // ── the view ──
  function view() {
    const s = st(), v = vault()
    if (!s.data) { load().then(render); return '<div class="kn"><div class="skeleton" style="padding:20px"><i></i><i></i><i></i></div></div>' }
    // No vault named in the route (Knowledge just opened): the one last open, else the first.
    if (!v && vaults().length) {
      let last = null
      last = lastVaultStored()
      const id = (vaults().find((x) => x.id === (s.lastVault || last)) || vaults()[0]).id
      s.vault = id
      // The address names it, in place: no step in the window's history (Back leaves Knowledge, as it came).
      setTimeout(() => go(knRouteOf({ vault: id, tab: s.tab || 'home', path: here() }), { replace: true }))
      loadVault().then(render)
      return `<div class="kn">${head()}${tabs()}<div class="kn-body"><div class="skeleton" style="padding:20px"><i></i><i></i><i></i></div></div></div>`
    }
    if (!v) return `<div class="kn">${head()}<div class="kn-tabs kn-tabs-empty"></div><div class="kn-body">${emptyView()}</div></div>`
    if (v.available === false) return `<div class="kn">${head()}<div class="kn-tabs kn-tabs-empty"></div><div class="kn-body">${missingView(v)}</div></div>`
    const body = s.tab === 'home' ? homeView() : s.tab === 'graph' ? graphView() : s.tab === 'settings' ? settingsView() : s.tab === 'health' ? healthView() : s.tab === 'ingest' ? ingestView() : pagesView()
    // A vault inside a hidden folder (Echo changes nothing there): said once, above every tab — nothing is tried again.
    const ro = v.read_only ? `<div class="kn-warn kn-ro" role="status">${IC.warn}<span>${esc(v.read_only)}.</span></div>` : ''
    return `<div class="kn">${head()}${tabs()}${ro}<div class="kn-body">${body}</div></div>`
  }
  function after() {
    const s = st()
    if (s.tab === 'graph') drawGraph()
    if (s.tab === 'pages' && s.rail === 'links') drawMini()
    if (s.tab === 'settings' && vault() && hooks.aboutAfter) hooks.aboutAfter(vault())
    if (s.tab === 'ingest' && vault()) { pollRun(); tickRunning() }
    if (s.tab === 'health' && vault()) { pollLint(); tickRunning() }
    if (s.scrollTo) { const el = document.getElementById(s.scrollTo); if (el) el.scrollIntoView({ block: 'start' }); s.scrollTo = null }
    if (s.focus) {
      const el = document.getElementById(s.focus)
      if (el) { el.focus(); if (el.select && s.focusSelect) el.select() }
      s.focus = null; s.focusSelect = false
    }
  }

  // ── actions ──
  function openPage(path) {
    const s = st()
    const go = () => { s.edit = null; s.ver = null; s.menu = null; goVault(s.vault, 'pages', path) }
    if (s.edit && s.edit.dirty) return askFirst('Leave this page?', 'Your text isn\'t saved. It stays in this window: Edit on this page brings it back.', 'Leave', go)
    go()
  }
  async function startEdit() {
    const s = st(), p = s.page, v = vault()
    if (!p || !p.editable) return
    const draft = store() && knRestoreDraft(store(), v.id, p.path, p.base)
    s.edit = { path: p.path, base: p.base, text: draft != null ? draft : (p.text || ''), dirty: draft != null, preview: p.html, message: `Edit ${p.path}` }
    s.focus = 'kn-edit'
    render()
  }
  let previewTimer = null
  function onEditInput(text) {
    const s = st(), v = vault()
    if (!s.edit) return
    s.edit.text = text
    s.edit.dirty = true
    if (store()) knKeepDraft(store(), v.id, s.edit.path, s.edit.base, text)
    clearTimeout(previewTimer)
    previewTimer = setTimeout(async () => {
      const e = st().edit
      if (!e) return
      try { const r = await run('kn_preview', { id: v.id, path: e.path, text: e.text }); if (st().edit === e) { e.preview = withExt(r.html); const pane = document.querySelector('.kn-preview'); if (pane) pane.innerHTML = e.preview } } catch { /* the preview waits */ }
    }, 600)
    const crumbs = document.querySelector('.kn-editing .kn-crumbs')
    if (crumbs && !crumbs.textContent.includes('not saved')) crumbs.insertAdjacentText('beforeend', ' · not saved')
  }
  async function save(force) {
    const s = st(), v = vault(), e = s.edit
    if (!e) return
    const msg = document.getElementById('kn-msg')
    if (msg) e.message = msg.value
    const base = force && e.conflict ? e.conflict.base : e.base
    try {
      const r = await run('kn_save_page', { id: v.id, path: e.path, text: e.text, base, message: e.message }, 'save')
      if (store()) knDropDraft(store(), v.id, e.path)
      s.edit = null
      s.page = null
      await loadPage()
      await loadTree()
      // Why a commit was skipped is said once per vault and reason (X-G4); after that the save is just saved.
      const why = /^skipped/.test(r.commit || '') ? r.commit.replace(/^skipped: /, '') : null
      const told = (s.toldSkip = s.toldSkip || new Set()), key = `${v.id}:${why}`
      if (why && !told.has(key)) { told.add(key); say(`Saved. Not committed: ${why}.`) } else done(why ? 'Saved, not committed.' : r.commit && r.commit !== 'off' ? `Saved and committed (${r.commit}).` : 'Saved.')
    } catch (err) {
      const m = String(err.message || err)
      if (/changed_on_disk/.test(m)) {
        try { const p = await get(`api/kn/${enc(v.id)}/page?path=${enc(e.path)}`); e.conflict = { base: p.base, text: p.text, mtime: p.mtime } } catch { /* gone */ }
        render()
      } else say(`Not saved: ${m}`)
    }
  }
  async function openConnect() {
    const s = st()
    if (!shown()) go(home())
    s.switcher = false
    s.sheet = { kind: 'connect', step: 1, picked: null, minutes: 'auto', commit: false, name: '' }
    render()
  }
  async function doPick(forNew) {
    const s = st(), x = s.sheet
    if (!x) return
    x.picking = true
    render()
    const p = await pick(forNew ? 'new' : 'connect')
    x.picking = false
    if (p) {
      // A folder picked before and not connected is given back, and an empty one to connect (nothing to connect).
      const back = knUnpickOf(x, p)
      x.picked = p
      if (!forNew) { x.name = p.name || ''; x.error = null }
      for (const root of back) call('unpick', { root }).catch(() => {})
    }
    render()
  }
  async function connectGo() {
    const s = st(), x = s.sheet
    const name = (document.getElementById('kn-name') || {}).value || x.name
    try {
      const r = await run('kn_add', knConnectArgs(x, name), 'connect')
      x.connected = true
      s.sheet = null
      await refreshAll()
      goVault(r.vault.id, 'home')
      done(`${r.vault.name} is connected — nothing in its folder changed.`)
    } catch (err) { x.error = String(err.message || err); render() }
  }
  async function newGo() {
    const s = st(), x = s.sheet
    const name = ((document.getElementById('kn-name') || {}).value || '').trim()
    if (!name) { x.error = 'A vault needs a name.'; s.focus = 'kn-name'; return render() }
    // Echo gives a plugin only the folders the user picks: the vault goes in one picked (or made) in the picker.
    if (!x.picked || x.picked.refused || !x.picked.empty) { x.error = 'Pick or make a folder for the vault first.'; return render() }
    try {
      const r = await run('kn_new', { name, pick: x.picked ? x.picked.path : undefined, git: !!x.git, minutes: x.auto ? 'auto' : 'ask' }, 'new')
      s.sheet = null
      await refreshAll()
      const left = (r.left_out || []).map((f) => f.path)
      const ready = r.git === 'committed' ? `${r.vault.name} is ready, in git.` : r.git === 'no identity' ? `${r.vault.name} is ready. git has no name and email set, so the first commit wasn't made.` : `${r.vault.name} is ready.`
      const leftNote = left.length ? ` Not written: ${left.join(', ')} — ${r.left_out[0].why}.` : ''
      // The plugin's setting says the twin skill goes to the user's own Claude Code: its sheet, to read and Install.
      if (r.skills && r.skills.offer === 'twin') {
        goVault(r.vault.id, 'settings')
        s.vault = r.vault.id; s.tab = 'settings'
        s.sheet = { kind: 'twin', name: '', text: null }
        render()
        loadTwinText()
        return done(`${ready} Its twin skill is for your own Claude Code: read it, then Install.${leftNote}`)
      }
      goVault(r.vault.id, 'home')
      done(`${ready}${leftNote}`)
    } catch (err) { x.error = String(err.message || err); render() }
  }
  /** K6-02's sheet. */
  async function openNewPage(name) {
    const s = st(), v = vault()
    // From Home or Health the tree may not be loaded yet: the sheet lists its folders.
    if (!s.tree || s.tree.vault !== v.id) await loadTree()
    s.sheet = { kind: 'newpage', name: name || '', folder: knNewPageFolder(name, s.tree ? s.tree.root : undefined, s.path), template: '', row: true, templates: await listTemplates(v) }
    s.focus = 'kn-pname'
    render()
  }
  /** The vault's page templates (the pages tree hides their folder). */
  async function listTemplates(v) {
    if (!v.paths || !v.paths.templates) return []
    try { return (await get(`api/kn/${enc(v.id)}/settings`)).templates || [] } catch { return [] }
  }
  async function newPageGo() {
    const s = st(), x = s.sheet, v = vault()
    const name = ((document.getElementById('kn-pname') || {}).value || '').trim()
    if (!name) { x.error = 'A page needs a name.'; s.focus = 'kn-pname'; return render() }
    try {
      const r = await run('kn_new_page', { id: v.id, folder: x.folder, name, template: x.template || null, row: !!x.row }, 'newpage')
      s.sheet = null
      await loadTree()
      s.path = r.path
      s.page = null
      goVault(v.id, 'pages', r.path)
      await loadPage()
      await startEdit()
    } catch (err) { x.error = String(err.message || err); render() }
  }
  async function openRows(paths) {
    const s = st(), v = vault()
    s.sheet = { kind: 'rows', paths, rows: null }
    render()
    try { const r = await get(`api/kn/${enc(v.id)}/rows?paths=${enc(JSON.stringify(paths))}`); if (r.error) throw new Error(r.error); s.sheet.rows = r.rows } catch (e) { s.sheet.error = String(e.message || e); s.sheet.rows = [] }
    render()
  }
  async function rowsGo() {
    const s = st(), x = s.sheet, v = vault()
    try {
      const r = await run('kn_index_add', { id: v.id, paths: x.paths }, 'rows')
      s.sheet = null
      await loadTree()
      if (s.tab === 'settings') await loadSettings()
      if (s.path) await loadPage()
      done(`${r.added} row${r.added === 1 ? '' : 's'} added to the index${r.commit && !/^(off|skipped)/.test(r.commit) ? ' and committed' : ''}.`)
    } catch (e) { x.error = String(e.message || e); render() }
  }
  async function setVault(key, value) {
    const v = vault()
    try {
      const r = await run('kn_set', { id: v.id, key, value })
      const i = st().data.vaults.findIndex((x) => x.id === v.id)
      if (i >= 0) st().data.vaults[i] = r.vault
      hlReset()
      if (st().tab === 'settings') await loadSettings()
      render()
    } catch (e) { say(String(e.message || e)) }
  }
  // ── what Ingest's run and Health draw with (#17 kept them with Ask): the tool rows, the spinner, sizes and costs ──
  const TOOL_IC = { Read: IC.file, Grep: IC.search, Glob: IC.search, Skill: IC.bolt, Edit: IC.edit, Write: IC.edit, WebSearch: IC.globe, WebFetch: IC.globe, Agent: IC.agent, Task: IC.agent }
  const SPIN = '<span class="kn-spin" aria-hidden="true"></span>'
  const homeShown = () => shown() && st().tab === 'home' && !!vault()
  const kTok = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0))
  const usd = (c) => (c < 0.01 ? '<$0.01' : `$${c.toFixed(2)}`)
  const patchEl = (id, html) => { const el = document.getElementById(id); if (el) patch(el, html) }
  /** When, in a few words: 10:01 · yesterday · Mon · 28 Oct. */
  function whenOf(at) {
    if (!at) return ''
    const d = new Date(at)
    if (isNaN(d)) return ''
    const days = (Date.now() - d) / 864e5
    return d.toDateString() === new Date().toDateString() ? hm(d) : days < 6 ? d.toLocaleDateString([], { weekday: 'short' }) : d.toLocaleDateString([], { day: 'numeric', month: 'short' })
  }
  /** The time of a run going (its rows' `data-kn-since`, Ingest's and the AI checks' `data-kn-elapsed`), each second. */
  let runTimer = null
  function tickRunning() {
    const draw = () => {
      const now = Date.now()
      for (const el of document.querySelectorAll('[data-kn-since]')) el.textContent = `${Math.max(0, Math.round((now - Number(el.dataset.knSince)) / 1000))} s`
      // An ingest run's time so far.
      for (const el of document.querySelectorAll('[data-kn-elapsed]')) el.textContent = dur((now - Number(el.dataset.knElapsed)) / 1000)
    }
    const any = () => document.querySelector('[data-kn-since], [data-kn-elapsed]')
    draw()
    if (runTimer || !any()) return
    runTimer = setInterval(() => { if (!any()) { clearInterval(runTimer); runTimer = null } else draw() }, 1000)
  }
  function toolsHtml(b, ended, opened, act) {
    const secs = (ms) => `${(ms / 1000).toFixed(1)} s`
    const where = (w) => (w ? ` ${/^in /.test(w) ? `in <code>${esc(w.slice(3))}</code>` : esc(w)}` : '')
    const pm = (t) => esc(t).replace(/(\+\d+)/, '<span class="a">$1</span>').replace(/(−\d+)/, '<span class="d">$1</span>')
    const detail = (r) => `<div class="kn-tdet">${r.input && Object.keys(r.input).length ? `<div class="kn-tdet-h">Asked</div><pre>${esc(JSON.stringify(r.input, null, 2))}</pre>` : ''}${r.preview ? `<div class="kn-tdet-h">Result</div><pre>${esc(r.preview)}</pre>` : ''}${r.path && /\.md$/i.test(r.path) ? `<button class="btn ghost sm" data-kn="open" data-path="${esc(r.path)}">${IC.file} Open the page</button>` : ''}</div>`
    const one = (r, sub) => {
      const open = opened[r.id]
      const icon = r.running ? SPIN : r.error ? IC.warn : TOOL_IC[r.name] || IC.bolt
      const target = r.target ? ` ${r.code ? `<code>${esc(r.target)}</code>` : esc(r.target)}` : ''
      const time = r.running && r.at ? `<span data-kn-since="${r.at}"></span>` : r.at && r.done ? secs(r.done - r.at) : ''
      return `<button class="kn-trow${sub ? ' sub' : ''}${r.running ? ' run' : ''}${r.error ? ' err' : ''}" data-kn="${act}" data-id="${esc(r.id)}" aria-expanded="${!!open}"><span class="ti">${icon}</span><span class="tx"><span class="tv">${esc(r.verb)}</span>${target}${where(r.where)}${r.pm ? ` <span class="kn-pm">${pm(r.pm)}</span>` : ''}${r.note ? ` <span class="td">· ${esc(r.note)}</span>` : ''}</span><span class="tt">${time}</span></button>${open ? detail(r) : ''}`
    }
    const rows = knToolRows(b.items, { ended }).map((r) => {
      if (r.kind !== 'fold') return one(r)
      const open = opened[`f:${r.id}`]
      return `<button class="kn-trow fold${r.running ? ' run' : ''}" data-kn="${act}" data-id="f:${esc(r.id)}" aria-expanded="${!!open}"><span class="ti">${r.running ? SPIN : IC.files}</span><span class="tx"><span class="tv">${esc(r.text)}</span>${r.errors ? ` <span class="td err">· ${r.errors} failed</span>` : ''}</span><span class="tt"><span class="kn-car">${open ? '▾' : '▸'}</span></span></button>${open ? r.rows.map((x) => one(x, true)).join('') : ''}`
    }).join('')
    return `<div class="kn-tools">${rows}</div>`
  }

  // ── the call page (Echo's `call.header`, `call.menu` and `call.minutes` slots, wired in client.js): the chip, the ⋯
  // menu's items, the minutes' line, the save sheet ──
  function callChip(c) {
    const k = c && c.knowledge
    // Until minutes are saved into vaults (a later version), the chip says so and promises nothing.
    if (k && k.later) return (k.vaults || []).length ? `<span class="kn-chip off kn-chip-later" title="${esc(k.later)}">${IC.gem} Knowledge: saving minutes comes in a later version</span>` : ''
    const x = knChipState(k)
    if (x.state === 'none' && !(k && k.vaults && k.vaults.length && st().chip === c.name)) return ''
    const s = st()
    const open = s.chip === c.name
    const cls = { will: 'will', saved: 'done', kept: 'kept', failed: 'kept', stale: 'will', off: 'off', removed: 'off' }[x.state] || 'will'
    const arrow = x.state === 'saved' ? ' ↗' : x.state === 'will' || x.state === 'off' ? ' ▾' : ''
    const menu = open ? chipMenu(c, x) : ''
    return `<span class="kn-rel kn-end"><button class="kn-chip ${cls}" data-kn="chip" data-kn-call="${esc(c.name)}" aria-haspopup="menu" aria-expanded="${open}" title="${esc(x.error || x.label || '')}">${x.state === 'kept' || x.state === 'failed' ? IC.warn : IC.gem} ${esc(x.label)}${arrow}</button>${menu}</span>`
  }
  function chipMenu(c, x) {
    const k = c.knowledge || {}
    const vs = (k.vaults || []).filter((v) => v.available)
    const targets = new Set((k.targets || []).map((v) => v.id))
    const choice = (k.record || {}).choice
    if (x.state === 'kept') {
      return `<div class="kn-pop" role="dialog"><h4>The minutes were written again — ${esc(x.label.replace(' · not updated', ''))} kept your version</h4><p>You changed <code>${esc((x.path || '').split('/').pop())}</code> after Echo saved it, so Echo didn't write over it.</p><div class="kn-acts"><button class="btn sm" data-kn="chip-open" data-vault="${esc(x.vault)}" data-path="${esc(x.path)}">Open the note</button><button class="btn sm" data-kn="save-as-new" data-kn-call="${esc(c.name)}" data-vault="${esc(x.vault)}">Save as a new note</button><button class="btn ghost sm" data-kn="save-replace" data-kn-call="${esc(c.name)}" data-vault="${esc(x.vault)}">Replace with the new minutes</button></div></div>`
    }
    if (x.state === 'failed') {
      return `<div class="kn-pop" role="dialog"><h4>The minutes weren't saved to ${esc(x.label.replace("Couldn't save to ", ''))}</h4><p>${esc(x.error || '')}</p><div class="kn-acts"><button class="btn sm primary" data-kn="save-again" data-kn-call="${esc(c.name)}" data-vault="${esc(x.vault)}">Save again</button></div></div>`
    }
    if (x.state === 'stale') {
      return `<div class="kn-pop" role="dialog"><h4>The minutes changed since you saved them</h4><p>Update the note in ${esc(x.label.replace('Update in ', ''))} with the new minutes? A note you changed is never written over.</p><div class="kn-acts"><button class="btn sm primary" data-kn="save-again" data-kn-call="${esc(c.name)}" data-vault="${esc(x.vault)}">Update</button></div></div>`
    }
    // A vault on another AI profile never takes this call by itself (its text stays on the call's profile); the
    // call's ⋯ → Save to Knowledge… can, after a warning.
    const items = vs.map((v) => k.profile && v.profile !== k.profile
      ? `<button class="menu-item kn-mi" role="menuitemradio" aria-checked="false" disabled title="This call's text stays on its own AI profile; ⋯ → Save to Knowledge… can save it there after a warning."><span class="kn-sp"></span><span class="grow">${esc(v.name)}</span><span class="kn-mi-r">another AI profile</span></button>`
      : `<button class="menu-item kn-mi${(choice ? choice === v.id : targets.has(v.id)) ? ' on' : ''}" role="menuitemradio" aria-checked="${choice ? choice === v.id : targets.has(v.id)}" data-kn="choose" data-kn-call="${esc(c.name)}" data-vault="${esc(v.id)}">${(choice ? choice === v.id : targets.has(v.id)) ? IC.check : '<span class="kn-sp"></span>'}<span class="grow">${esc(v.name)}</span><span class="kn-mi-r">${v.mode === 'auto' ? 'automatically' : v.mode === 'ask' ? 'when I ask' : 'never'}</span></button>`).join('')
    return `<div class="menu kn-chip-menu" role="menu"><div class="kn-menu-h">Save this call's minutes to</div>${items}<div class="menu-sep"></div><button class="menu-item kn-mi${choice === 'none' ? ' on' : ''}" role="menuitem" data-kn="choose" data-kn-call="${esc(c.name)}" data-vault="none">${choice === 'none' ? IC.check : '<span class="kn-sp"></span>'}Don't save this call</button>${choice ? `<button class="menu-item kn-mi" role="menuitem" data-kn="choose" data-kn-call="${esc(c.name)}" data-vault="">Back to the vaults' rules</button>` : ''}<div class="kn-menu-foot">Saved after the minutes are written — never the audio, the transcript or the chat unless the vault asks for them.</div></div>`
  }
  /** The call's ⋯ items (`call.menu`): *Open in <vault>* once saved, *Save to Knowledge…* — each `{id, label, run}`. */
  function callMenu(c) {
    const k = c && c.knowledge
    if (!k || !(k.vaults || []).length || !c.notes) return []
    const x = knChipState(k)
    const saved = (k.record && k.record.saved) || []
    const out = []
    const last = saved[saved.length - 1]
    if (last && x.vault) out.push({ id: 'open', label: `Open in ${((k.vaults || []).find((v) => v.id === last.vault) || { name: 'Knowledge' }).name}`, run: () => openSavedNote(last.vault, last.path) })
    out.push({ id: 'save', label: saved.length ? 'Save to another vault…' : 'Save to Knowledge…', run: () => openSave(c.name) })
    return out
  }
  function countdownLine(c) {
    if (c && c.knowledge && c.knowledge.later) return ''
    const x = knChipState(c && c.knowledge)
    if (x.state !== 'will') return ''
    const names = x.label.replace('Minutes → ', '')
    return `<p class="kn-then">${IC.gem}<span>Then saved to <b>${esc(names)}</b>, with a row in the index.</span></p>`
  }
  async function openSave(callName, vaultId) {
    const s = st(), k = (S.call && S.call.knowledge) || {}
    const first = knSaveVault(k, vaultId)
    if (!first) return say('No vault to save into — connect one in Knowledge first.')
    s.chip = null
    s.sheet = { kind: 'save', call: callName, vault: first, preview: null, transcript: false, chat: false }
    render()
    await loadPreview()
  }
  async function loadPreview() {
    const s = st(), x = s.sheet
    if (!x || x.kind !== 'save') return
    try {
      const pv = await get(`api/kn/${enc(x.vault)}/preview?call=${enc(x.call)}&stem=${enc(x.stem || '')}`)
      if (pv.error) throw new Error(pv.error)
      x.preview = pv; x.transcript = pv.transcript; x.chat = pv.chat
    } catch (e) { x.error = String(e.message || e) }
    render()
  }
  async function saveMinutes(args, busy = 'saveMinutes') {
    try {
      const r = await run('kn_save_minutes', args, busy)
      if (r && r.mismatch) return r
      st().sheet = null
      st().chip = null
      if (typeof loadCall === 'function' && S.selected) await loadCall(S.selected)
      render()
      if (r && r.state === 'kept') say('You changed that note in the vault, so Echo kept your version.')
      else if (r && r.path) done(`Saved to ${r.path}${r.commit && !/^(off|skipped)/.test(r.commit) ? ', committed' : ''}.`)
      return r
    } catch (e) { if (st().sheet) { st().sheet.error = String(e.message || e); render() } else say(`Not saved: ${e.message || e}`) }
  }

  // ── Settings → From plugins → Knowledge: the vaults ──
  function settingsVaults() {
    const d = st().data
    if (!d) { load().then(render); return '' }
    const rows = d.vaults.map((v) => `<div class="set-row"><div class="kn-vrow"><span class="kn-gem">${IC.gem}</span><div><b>${esc(v.name)}${v.minutes && v.minutes.mode === 'auto' ? ' <span class="tag acc">★ minutes</span>' : ''}${v.available === false ? ` <span class="tag warn">${v.given === false ? 'pick its folder again' : 'folder not found'}</span>` : ''}</b><div class="set-sub kn-path-line" title="${esc(v.root)}"><code><bdi>${esc(short(v.root))}</bdi></code></div><div class="set-sub">${[v.pages != null ? many(v.pages, 'page') : '', v.git || v.in_git ? 'git' : '', v.minutes.mode === 'ask' ? 'minutes when I ask' : v.minutes.mode === 'off' ? 'no minutes' : '', esc(profName(v.profile))].filter(Boolean).join(' · ')}</div></div></div><div class="set-ctl"><button class="btn sm" data-kn="settings-open" data-id="${esc(v.id)}">Open</button></div></div>`).join('')
    const add = `<div class="set-row"><div><b>Add a vault</b><div class="set-sub">Connect a folder you already have, or start a new one from Echo's twin starter.</div></div><div class="set-ctl"><button class="btn sm" data-kn="connect">Connect a folder…</button><button class="btn sm" data-kn="new">Start a new vault…</button></div></div>`
    return `<div class="set-sec"><h3>Vaults</h3><div class="set-card">${rows}${add}</div><p class="set-foot">Each vault's structure, meeting minutes and skills are in Knowledge → the vault → Settings, and its checks in the vault's Health.</p></div>`
  }
  /** ⌘K's Knowledge actions (`ctx.palette.add`): each finds the vault last open (else the first) when it runs. */
  function paletteActions(add) {
    const ready = async () => {
      if (!st().data) await load()
      const s = st()
      if (!s.vault && vaults().length) s.vault = (vaults().find((x) => x.id === s.lastVault) || vaults()[0]).id
      return vault()
    }
    const inVault = (fn) => async () => { const v = await ready(); if (!v) { go(home()); return say('Connect a vault first: Knowledge → Connect a folder…') } if (v.available === false) return goVault(v.id, 'home'); return fn(v) }
    add('Knowledge', 'Connect a folder…', async () => { await ready(); go(home()); openConnect() }, { keywords: 'vault obsidian knowledge second brain add' })
    add('Knowledge', 'Start a new vault…', async () => { await ready(); go(home()); openNew() }, { keywords: 'vault twin knowledge create' })
    add('Knowledge', 'Find a page…', inVault((v) => { goVault(v.id, 'pages', st().path); st().focus = 'kn-find'; render() }), { keywords: 'open page knowledge search' })
    add('Knowledge', 'Ask the vault…', inVault(() => askVault()), { keywords: 'claude question chat conversation knowledge ask' })
    add('Knowledge', 'Add a source…', inVault((v) => { goVault(v.id, 'ingest', ''); openAdd('files') }), { keywords: 'ingest inbox file mail teams chat web page call memo knowledge' })
    add('Knowledge', 'Prepare changes', inVault((v) => { goVault(v.id, 'ingest', ''); focusOn('#kn-ing-prep:not([disabled])', '#kn-ing-add') }), { keywords: 'ingest inbox process sources knowledge run' })
    add('Knowledge', 'Open Health', inVault((v) => goVault(v.id, 'health', st().hlKey)), { keywords: 'checks score broken links fix index tidy knowledge' })
    add('Knowledge', 'Run AI checks', inVault((v) => { goVault(v.id, 'health', st().hlKey); runLint() }), { keywords: 'health lint contradictions duplicates stale summary claude knowledge' })
    add('Knowledge', 'Save the minutes to Knowledge…', async () => {
      await ready()
      const c = S.call
      if (!c || !c.notes || !c.knowledge || !(c.knowledge.vaults || []).length) return say('Open a call with minutes first, then save them to Knowledge.')
      return openSave(c.name)
    }, { keywords: 'vault note export minutes call' })
  }
  function openNew() {
    const d = st().data || {}
    if (!shown()) go(home())
    st().switcher = false
    st().sheet = { kind: 'new', name: '', picked: null, git: !!d.git, auto: true }
    st().focus = 'kn-name'
    render()
  }
  // ── events ──
  ctx.listen('click', async (e) => {
    const s = st()
    // A link in a page: another page (the activity's own route, as Echo's writer keeps it), a missing one to make (Echo
    // marks it, with no href), the web (`data-ext`: Echo opens it).
    const a = e.target.closest && e.target.closest('.kn-doc a, .kn-props a')
    if (a && !a.matches('[data-echo-link], a[href^="echo://"], a[data-ext]')) {
      e.preventDefault()
      if (a.hasAttribute('data-md-missing')) return openNewPage(String(a.getAttribute('data-md-missing')).split('#')[0])
      const href = a.getAttribute('href') || ''
      const r = knParseRoute(href)
      if (r) return r.vault === s.vault && r.tab === 'pages' && r.path ? openPage(r.path) : go(href.slice(1))
      if (href.startsWith('#kn-name:')) {
        const name = (knDecode(href.slice(9)) ?? href.slice(9)).toLowerCase()
        const t = (s.tree || { pages: [] }).pages.find((p) => p.path.split('/').pop().replace(/\.md$/i, '').toLowerCase() === name || String(p.title).toLowerCase() === name)
        return t ? openPage(t.path) : openNewPage(knDecode(href.slice(9)) ?? href.slice(9))
      }
      return
    }
    const t = e.target.closest && e.target.closest('[data-kn]')
    // A click outside an open menu closes it.
    if (!t || !t.closest('.menu, .kn-pop')) {
      if (s.switcher && !(t && t.dataset.kn === 'switcher')) { s.switcher = false; if (!t) return render() }
      if (s.menu && !(t && t.dataset.kn === 'menu')) { s.menu = null; if (!t) return render() }
      if (s.chip && !(t && t.dataset.kn === 'chip')) { s.chip = null; if (!t) return render() }
    }
    if (!t) return
    const d = t.dataset
    const v = vault()
    switch (d.kn) {
      case 'switcher': s.switcher = !s.switcher; return render()
      case 'vault': s.switcher = false; return goVault(d.id, s.tabs[d.id] || 'home')
      case 'recall': s.switcher = false; return go('settings/brain') // Settings → Intake (its id stays brain)
      case 'connect': return openConnect()
      case 'new': return openNew()
      case 'tab': e.preventDefault(); s.menu = null; return goVault(s.vault, d.knTab, d.knTab === 'pages' ? s.path : d.knTab === 'health' ? s.hlKey : d.knTab === 'ingest' ? s.ingRun : '')
      case 'menu': s.menu = s.menu === d.menu ? null : d.menu; return render()
      // Show in Finder / Explorer (Echo's `ctx.system.reveal`, on this click): the vault, or a page by its place in it.
      case 'reveal': {
        s.menu = null
        render()
        if (!v) return
        const pf = (v.paths || {}).pages || ''
        // A source's path is the vault's own; a page's is under the pages folder.
        const rel = !d.path ? '' : d.knInVault ? d.path : pf ? `${pf}/${d.path}` : d.path
        try { await ctx.system.reveal(v.root, rel) } catch (err) { say(String((err && err.message) || err)) }
        return
      }
      // Obsidian's link: Echo opens it (`data-ext`); the menu closes after.
      case 'obsidian': s.menu = null; setTimeout(render); return
      case 'copy': s.menu = null; try { ctx.ui.copy(d.text) } catch (err) { return say(String(err.message || err)) } return done('Copied.')
      case 'confirm-structure': try { await run('kn_confirm_structure', { id: s.vault }, 'structure'); s.tree = null; s.page = null; s.path = ''; await refreshAll(); await loadSettings(); render(); done('The structure is confirmed: Echo reads the vault by it.') } catch (err) { say(String(err.message || err)) } return
      case 'give-again': try { const r = await run('kn_give_again', { id: s.vault }, 'give'); if (r && r.cancelled) return; await refreshAll(); done(`${vault() ? vault().name : 'The vault'}'s folder is given again.`) } catch (err) { say(String(err.message || err)) } return
      case 'reread': try { await run('kn_reread', { id: s.vault }, 'reread'); await refreshAll(); done('Read again.') } catch (err) { say(String(err.message || err)) } return
      // Ask the vault: Claude Code in the vault, in Echo's panel; a page or a skill is said, a skill's command copied.
      case 'ask': return askVault()
      case 'ask-about': {
        const title = ((s.tree && s.tree.pages.find((p) => p.path === d.path)) || {}).title || d.path.split('/').pop().replace(/\.md$/i, '')
        askVault()
        return say(`Ask Claude in the panel about ${title} (${d.path}).`)
      }
      case 'run-skill': {
        let copied = false
        try { ctx.ui.copy(`/${d.name} `); copied = true } catch { /* said below */ }
        askVault()
        return done(copied ? `/${d.name} is copied: paste it in Claude.` : `Type /${d.name} in Claude.`)
      }
      // Home (K11)
      case 'home-f': homeSt().filter = d.knF; return render()
      case 'home-recent': s.filter = 'recent'; s.q = ''; s.hits = null; return goVault(s.vault, 'pages', s.path)
      case 'home-prep': goVault(s.vault, 'ingest', ''); return focusOn('#kn-ing-prep:not([disabled])', '#kn-ing-add')
      case 'newpage': return openNewPage(d.name)
      case 'filter': s.filter = d.filter; s.q = ''; s.hits = null; return render()
      case 'tree-retry': s.treeError = null; render(); await loadVault(); return render()
      case 'fold': if (s.open.has(d.path)) s.open.delete(d.path); else s.open.add(d.path); return render()
      case 'open': return openPage(d.path)
      case 'open-tab': return openPage(d.path)
      case 'edit': return startEdit()
      case 'edit-cancel':
        if (s.edit && s.edit.dirty) return askFirst('Stop editing?', 'Your text isn\'t saved. It stays in this window: Edit brings it back.', 'Stop editing', () => { s.edit = null; render() })
        s.edit = null; return render()
      case 'save': return save(false)
      case 'keep-mine': return askFirst('Save your text over the change on disk?', `The change made outside Echo is replaced by your text${v && v.commit ? '; the history keeps both' : ''}.`, 'Save mine', () => save(true), true)
      case 'take-theirs': if (s.edit && s.edit.conflict) { if (store()) knDropDraft(store(), v.id, s.edit.path); s.edit = null; s.page = null; await loadPage(); render() } return
      case 'compare': if (s.edit) { s.edit.compare = !s.edit.compare; render() } return
      case 'rail': s.menu = null; s.rail = d.rail; if (d.rail === 'history') await loadHistory(); return render()
      case 'version': s.ver = { rev: d.rev, loading: true }; render(); try { s.ver = await get(`api/kn/${enc(v.id)}/version?path=${enc(s.path)}&rev=${enc(d.rev)}`) } catch (err) { s.ver = null; say(String(err.message || err)) } return render()
      case 'ver-close': s.ver = null; return render()
      case 'restore': return askFirst('Write this version back?', 'The current text stays in the history.', 'Restore', async () => { try { const r = await run('kn_restore', { id: v.id, path: s.path, rev: d.rev }, 'restore'); s.ver = null; s.page = null; await loadPage(); await loadHistory(); done(r.commit && !/^(off|skipped)/.test(r.commit) ? 'Restored, in a new commit.' : 'Restored.') } catch (err) { say(String(err.message || err)) } })
      case 'gopt': {
        const val = d.val === 'true' ? true : d.val === 'false' ? false : /^\d+$/.test(d.val) ? Number(d.val) : d.val
        s.gopt[d.key] = val
        if (d.key === 'depth' && val && !s.gopt.sel) s.gopt.depth = 0
        if (d.key === 'tags') { s.graph = null; await loadGraph() }
        return render()
      }
      case 'gsel': s.gopt.sel = d.id || null; if (!d.id) s.gopt.depth = 0; return render()
      case 'gzoom': if (gview) { if (d.f === 'fit') gview.fit(); else gview.zoom(d.f === 'in' ? 1.4 : 1 / 1.4) } return
      case 'gfold': { const h = new Set(s.gopt.hidden || []); if (h.has(d.folder)) h.delete(d.folder); else h.add(d.folder); s.gopt.hidden = [...h]; return render() }
      case 'vs-go': { const el = document.getElementById(d.to); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return }
      case 'ovr': s.ovr = { key: d.key, value: d.value }; s.focus = 'kn-ovr'; s.focusSelect = true; return render()
      case 'ovr-cancel': s.ovr = {}; return render()
      case 'ovr-reset': { const k = s.ovr.key; s.ovr = {}; await setVault(k, ''); return }
      case 'ovr-save': {
        const val = (document.getElementById('kn-ovr') || {}).value || ''
        try { const r = await run('kn_set', { id: v.id, key: s.ovr.key, value: val }); const i = s.data.vaults.findIndex((x) => x.id === v.id); if (i >= 0) s.data.vaults[i] = r.vault; s.ovr = {}; s.tree = null; s.graph = null; hlReset(); await loadSettings(); render() } catch (err) { s.ovr.error = String(err.message || err); render() }
        return
      }
      // Ingest (K14, K15): the queue, a source, a run, the review, the Add a source sheet
      case 'ing-retry': await loadIngestTab(); return render()
      case 'ing-add': return openAdd('files')
      case 'ing-filter': ing().filter = d.knFilter; return render()
      case 'ing-done': { const g = ing(); g.showDone[d.knGroup] = !g.showDone[d.knGroup]; render(); return focusOn(`#kn-qdone-${d.knGroup}`, '.kn-sr.on .kn-sr-b') }
      case 'ing-src': {
        const g = ing()
        g.sel = d.path; g.skipping = null
        if (s.ingRun) return goVault(s.vault, 'ingest', '')
        render(); await loadSource(); return render()
      }
      case 'ing-run': return goVault(s.vault, 'ingest', d.knRun)
      case 'ing-back': return goVault(s.vault, 'ingest', '')
      case 'ing-prepare': { const dd = ing().data; return dd ? prepare(ingChecked(dd)) : undefined }
      case 'ing-prepare-one': return prepare([d.path])
      case 'ing-again': return runAgain(d.knRun)
      case 'ing-stop': return stopRun()
      case 'ing-skip': ing().skipping = d.path; s.focus = 'kn-skip-note'; return render()
      case 'ing-skip-x': ing().skipping = null; render(); return focusOn('#kn-src-skip')
      case 'ing-skip-go': return skipSource(d.path)
      case 'ing-requeue': return requeue([d.path])
      case 'ing-requeue-run': {
        const g = ing(), x = g.run && g.run.data, dd = g.data
        return x && dd ? requeue(dd.sources.filter((y) => (x.sources || []).includes(y.path) && y.state === 'done' && (y.meta || {}).run === x.id).map((y) => y.path)) : undefined
      }
      case 'ing-baseline': return baseline(d.knDone === 'true')
      case 'ing-skill': s.sheet = { kind: 'skill', error: null }; render(); return focusOn('#kn-skill-go')
      case 'ing-skill-go': return addInboxSkill()
      case 'ing-tool': { const g = ing(); g.open[d.id] = !g.open[d.id]; return render() }
      case 'ing-ch': {
        const rv = ing().review
        if (d.knDo === 'edit') return openChangeEdit(d.path)
        // A change made in the vault since the run: its overwrite diff first, then *Take the run's*.
        if (d.knDo === 'compare') { if (rv) rv.cmp[d.path] = !rv.cmp[d.path]; render(); return focusOn(`#${t.id.replace(/-compare$/, '-take')}`, `#${t.id}`) }
        // *Take the run's* over the vault's file as Compare showed it: a later edit refuses it (the host checks the sha).
        if (d.knDo === 'take') { const c = ((rv && rv.data && rv.data.changes) || []).find((x) => x.path === d.path); return decide(d.path, 'take', c && c.vault_sha !== undefined ? { sha: c.vault_sha } : {}) }
        return decide(d.path, d.knDo)
      }
      case 'ing-more': { const rv = ing().review; if (rv) rv.more[d.path] = true; render(); return focusOn(`#${t.id.replace(/-more$/, '-diff')}`) }
      case 'ing-rest': return approveRest()
      case 'ing-write': return writeApproved()
      case 'ing-discard': return discardRun()
      case 'ing-edit-go': return editGo()
      case 'src-tab': return srcTab(d.knTab)
      case 'src-choose': return chooseFiles()
      case 'src-call': { const x = s.sheet; if (!x || !x.calls) return; x.call = x.calls[Number(d.knI)] || null; x.include = { transcript: false, chat: false }; return render() }
      case 'src-hit': { const x = s.sheet; if (!x || !x.hits) return; x.hit = x.hits[Number(d.knI)] || null; x.days = 7; patchEl('kn-src-list', sourceList()); patchEl('kn-src-f', sourceFoot()); return focusOn(`#${t.id}`) }
      case 'src-go': return addGo()
      case 'src-m365': s.sheet = null; render(); return go('settings/calendar')
      // Health (K16-01, -04, -07)
      case 'hl-filter': hl().filter = d.knFilter; render(); await loadFinding(); return render()
      case 'hl-pick': hl().picked = true; return goVault(s.vault, 'health', d.knKey)
      case 'hl-retry': await loadHealth(); return render()
      case 'hl-fa-more': if (s.sheet && s.sheet.kind === 'fixall') { s.sheet.open = true; render(); focusOn('#kn-fa-4') } return
      case 'hl-ignored': hl().showIgnored = !hl().showIgnored; render(); await loadFinding(); return render()
      case 'hl-choice': return pickChoice(d.knKey, d.knChoice)
      case 'hl-fix': return fixOne()
      case 'hl-ignore': return ignoreFinding(d.knKey, d.knOn === 'true')
      case 'hl-ask': return askAboutFinding(d.knKey)
      case 'hl-create': {
        const folder = d.knFolder
        await openNewPage(d.name)
        const x = st().sheet
        // In the linking page's folder, when the sheet lists it.
        if (x && x.kind === 'newpage' && (st().tree || { pages: [] }).pages.some((p) => p.path.split('/').slice(0, -1).join('/') === folder)) { x.folder = folder; render() }
        return
      }
      case 'hl-fixall': return openFixAll(d.knKind)
      case 'hl-fixall-go': return fixAllGo()
      case 'hl-lint': return runLint()
      case 'hl-lint-stop': return stopLint()
      case 'hl-lint-ok': { const ai = (hl().data || {}).ai; if (ai) { s.lintSeen = { ...(s.lintSeen || {}), [s.vault]: ai.run }; render() } return focusOn('#kn-hl-lint', '.kn-fi.on') }
      case 'set-bool': return setVault(d.key, d.val)
      case 'scope-clear': await setVault('clients', ''); return setVault('threads', '')
      case 'rows': return openRows([d.path])
      case 'rows-go': return rowsGo()
      case 'past': {
        const n = ((s.settings || {}).past || {}).count
        return askFirst(`Save the minutes of ${n} past call${n === 1 ? '' : 's'} into ${v.name}?`, `One note each${v.commit ? ', in one commit' : ''}.`, 'Save', async () => {
          try { const r = await run('kn_past', { id: v.id, apply: true }, 'past'); await loadSettings(); await loadTree(); done(`${r.saved} note${r.saved === 1 ? '' : 's'} saved${r.skipped ? `; ${r.skipped} skipped` : ''}.`) } catch (err) { say(String(err.message || err)) }
          render()
        })
      }
      case 'people-sync': {
        try { const r = await run('kn_people_sync', { id: v.id }, 'people'); await loadSettings(); await loadTree(); done(r.added + r.changed + (r.adopted || 0) ? `${many(r.added, 'new person page')}, ${r.changed + (r.adopted || 0)} changed${v.commit && r.commit && !String(r.commit).startsWith('skipped') && r.commit !== 'off' ? ', one commit' : ''}.` : 'The person pages are up to date.') } catch (err) { say(String(err.message || err)) }
        return render()
      }
      case 'twin-add': return askFirst(`Add the twin skill to ${v.name}?`, 'Echo writes only .claude/skills/twin/SKILL.md.', 'Add', async () => { try { await run('kn_twin', { id: v.id, op: 'add' }, 'twin'); await run('kn_reread', { id: v.id }); await refreshAll(); await loadSettings(); render(); done('The twin skill is in the vault.') } catch (err) { say(String(err.message || err)) } })
      case 'sample': { const x = s.sheet = { kind: 'sample' }; render(); try { x.preview = await get(`api/kn/${enc(v.id)}/sample`) } catch (err) { x.preview = null; say(String(err.message || err)) } return st().sheet === x ? render() : undefined }
      case 'twin-global-ask': s.sheet = { kind: 'twin', name: (s.settings && s.settings.global_twin) || '', text: null }; render(); return loadTwinText()
      case 'twin-global': return twinGlobal(v)
      case 'twin-remove': return twinRemove(v)
      case 'remove-ask': s.sheet = { kind: 'remove' }; return render()
      case 'remove-go': try { const name = v.name; await run('kn_remove', { id: v.id }, 'remove'); s.sheet = null; s.vault = ''; s.lastVault = null; try { localStorage.removeItem(VAULT_KEY) } catch { /* off */ } await refreshAll(); go(KN_BASE, { replace: true }); done(`${name} is no longer in Echo. Its folder is as it was.`) } catch (err) { say(String(err.message || err)) } return
      case 'settings-open': return goVault(d.id, 'settings')
      // sheets
      case 'sheet-close': dropSheet(); return render()
      case 'sheet-back': if (e.target === t) { dropSheet(); render() } return
      case 'ask-back': if (e.target === t) { s.asking = null; render() } return
      case 'ask-no': s.asking = null; return render()
      case 'ask-yes': { const a = s.asking; s.asking = null; render(); return a && a.run() }
      case 'pick': return doPick(false)
      case 'pick-new': return doPick(true)
      case 'pick-default': { const back = knUnpickOf(s.sheet, null); s.sheet.picked = null; for (const root of back) call('unpick', { root }).catch(() => {}); return render() }
      case 'new-here': { const p = s.sheet.picked; s.sheet = { kind: 'new', name: p.name || '', picked: p, git: !!(s.data || {}).git, auto: true }; s.focus = 'kn-name'; return render() }
      case 'step': { const x = s.sheet; if (d.step === '3') x.name = x.name || (x.picked && x.picked.name) || ''; x.step = Number(d.step); return render() }
      case 'connect-go': return connectGo()
      case 'new-go': return newGo()
      case 'newpage-go': return newPageGo()
      // the call page
      case 'chip': s.chip = s.chip === d.knCall ? null : d.knCall; {
        const x = knChipState(S.call && S.call.knowledge)
        if (x.state === 'saved' && s.chip) { s.chip = null; return openSavedNote(x.vault, x.path) }
      } return render()
      case 'chip-open': s.chip = null; return openSavedNote(d.vault, d.path)
      case 'choose': try { await run('kn_call_choice', { call: d.knCall, vault: d.vault || null }); s.chip = null; if (typeof loadCall === 'function') await loadCall(S.selected); render() } catch (err) { say(String(err.message || err)) } return
      case 'save-as-new': return saveMinutes({ call: d.knCall, vault: d.vault, new: true })
      case 'save-replace': return askFirst('Write the new minutes over your version?', 'Your changes to the note are replaced by the new minutes.', 'Replace', () => saveMinutes({ call: d.knCall, vault: d.vault, replace: true }), true)
      case 'save-again': return saveMinutes({ call: d.knCall, vault: d.vault })
      case 'save-minutes-go': {
        const x = s.sheet, stem = (document.getElementById('kn-stem') || {}).value
        const r = await saveMinutes({ call: x.call, vault: x.vault, stem: stem && stem !== (x.preview || {}).stem ? stem : '', transcript: !!x.transcript, chat: !!x.chat, anyway: !(x.preview || {}).profile_ok })
        if (r && r.mismatch) { x.error = 'Not saved: the profiles differ.'; render() }
        return
      }
    }
  })
  function openSavedNote(vaultId, path) {
    goVault(vaultId, 'pages', path)
  }
  ctx.listen('input', (e) => {
    const t = e.target
    if (t.id === 'kn-edit') return onEditInput(t.value)
    if (t.id === 'kn-find') {
      const s = st(), v = vault(), q = t.value
      s.q = q
      clearTimeout(timing._findTimer)
      timing._findTimer = setTimeout(async () => {
        if (!q.trim()) { s.hits = null; return render() }
        try { const r = await get(`api/kn/${enc(v.id)}/find?q=${enc(q)}`); if (st().q === q) { s.hits = r; render() } } catch { /* app restarting */ }
      }, 120)
      return
    }
    if (t.id === 'kn-gfind') { const s = st(); s.gq = t.value; const n = gview ? gview.search(t.value) : 0, el = document.getElementById('kn-gfind-n'); if (el) el.textContent = t.value.trim() ? (n ? nf(n) : 'none') : ''; return }
    if (t.id === 'kn-stem') { const x = st().sheet; if (x) x.stemEdited = true; return }
    if (t.id === 'kn-name') { const x = st().sheet; if (x) { x.name = t.value; if (x.kind === 'new') render() } return }
    if (t.id === 'kn-twin-name') { const x = st().sheet; if (x) { x.name = t.value.trim(); x.text = null; clearTimeout(timing._twinTimer); timing._twinTimer = setTimeout(loadTwinText, 250) } return }
    // Ingest's Add a source sheet: a call's, a mail's or a chat's search; a web page's address.
    if (t.id === 'kn-src-q') {
      const x = st().sheet
      if (!x || x.kind !== 'source') return
      x.q = t.value
      if (x.tab === 'call') return findSourceCalls(t.value)
      x.hits = null; x.hit = null
      patchEl('kn-src-list', sourceList()); patchEl('kn-src-f', sourceFoot())
      return findMail(t.value)
    }
    if (t.id === 'kn-src-url') {
      const x = st().sheet
      if (!x || x.kind !== 'source') return
      x.url = t.value; x.error = null
      patchEl('kn-src-f', sourceFoot())
      const n = document.getElementById('kn-src-note')
      if (n) n.textContent = knAddState(x).note || ''
      return
    }
  })
  ctx.listen('change', async (e) => {
    const t = e.target, s = st()
    if (t.dataset.knSet) {
      const key = t.dataset.knSet
      const val = t.type === 'checkbox' ? String(t.checked) : t.value
      if (key === 'name' && !val.trim()) { t.value = vault().name; return }
      return setVault(key, val)
    }
    // Ingest: a New source ticked for Prepare changes or not; what a call's source includes; a chat's days.
    if (t.dataset.knSrcCheck !== undefined) { const g = ing(); if (t.checked) g.unchecked.delete(t.dataset.knSrcCheck); else g.unchecked.add(t.dataset.knSrcCheck); return render() }
    if (t.dataset.knSrcInc && s.sheet && s.sheet.kind === 'source') { s.sheet.include[t.dataset.knSrcInc] = t.checked; return }
    if (t.dataset.knSrcDays !== undefined && s.sheet && s.sheet.kind === 'source') { s.sheet.days = Number(t.value) || 7; return }
    if (t.dataset.knHlChoice && t.value) return pickChoice(t.dataset.knHlChoice, t.value)
    if (t.dataset.knFixall && s.sheet && s.sheet.kind === 'fixall') {
      const x = s.sheet
      if (t.checked) x.off.delete(t.dataset.knFixall); else x.off.add(t.dataset.knFixall)
      return patchEl('kn-fixall-f', fixAllFoot(knFixAll(x.fixes, x.findings, x.off), x.fixKind))
    }
    if (t.dataset.knForm && s.sheet) {
      const k = t.dataset.knForm
      if (k === 'minutes') s.sheet.minutes = t.value
      else if (k === 'profile') s.sheet.profile = t.value
      else if (k === 'commit') s.sheet.commit = t.checked
      else if (k === 'git') s.sheet.git = t.checked
      else if (k === 'auto') s.sheet.auto = t.checked
      else if (k === 'folder') s.sheet.folder = t.value
      else if (k === 'template') s.sheet.template = t.value
      else if (k === 'row') s.sheet.row = t.checked
      else if (k === 'transcript') s.sheet.transcript = t.checked
      else if (k === 'chat') s.sheet.chat = t.checked
      else if (k === 'svault') { s.sheet.vault = t.value; s.sheet.preview = null; s.sheet.stem = null; s.sheet.stemEdited = false; render(); return loadPreview() }
      if (k === 'name') return
    }
  })
  ctx.listen('keydown', (e) => {
    const s = st()
    if (e.key === 'Escape' && s.asking) { s.asking = null; e.stopPropagation(); return render() }
    if (e.key === 'Escape' && (s.sheet || s.switcher || s.menu || s.chip)) { if (s.sheet) dropSheet(); s.switcher = false; s.menu = null; s.chip = null; e.stopPropagation(); return render() }
    // A missing page in a page (Echo's writer gives it no href): Enter makes it, as a click does.
    if (e.key === 'Enter' && e.target.matches && e.target.matches('.kn-doc [data-md-missing]')) { e.preventDefault(); return openNewPage(String(e.target.getAttribute('data-md-missing')).split('#')[0]) }
    if (e.target.id === 'kn-edit' && (e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); return save(false) }
    if (e.target.id === 'kn-find' && e.key === 'Enter') { const h = s.hits && s.hits.hits[0]; if (h) openPage(h.path) }
    if (e.target.id === 'kn-gfind' && e.key === 'Enter' && gview) { const id = gview.best(); if (id) { s.gopt.sel = id; gview.center(id); render() } }
    if (e.target.id === 'kn-name' && e.key === 'Enter' && s.sheet) { if (s.sheet.kind === 'new') newGo(); else if (s.sheet.kind === 'connect' && s.sheet.step === 3) connectGo() }
    if (e.target.id === 'kn-pname' && e.key === 'Enter') newPageGo()
    if (e.target.id === 'kn-ovr' && e.key === 'Enter') { const b = document.querySelector('[data-kn="ovr-save"]'); if (b) b.click() }
    if (e.target.id === 'kn-src-url' && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); return addGo() }
    if (e.target.id === 'kn-skip-note' && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); const b = document.getElementById('kn-skip-go'); return b ? skipSource(b.dataset.path) : undefined }
    if (e.target.id === 'kn-chedit' && (e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); return editGo() }
  }, true)
  // Leaving the window with unsaved text: the draft is kept; ask anyway.
  ctx.listenWindow('beforeunload', (e) => { if (S && S.kn && S.kn.edit && S.kn.edit.dirty) { e.preventDefault(); e.returnValue = '' } })

  return {
    view, after, tick, load, loadVault, route: routeTo, home, overlay, data: () => st().data, vault: () => vault(), callChip, callMenu, countdownLine,
    settingsVaults, paletteActions, dropped, askVault, sheetKind: () => (st().sheet ? st().sheet.kind : null),
    closeSheet: () => dropSheet(), asking: () => !!st().asking, closeAsking: () => { st().asking = null }, editing: () => knPageEditing(S.kn),
    badge: () => {
      const s = st(), h = s.hl && s.hl.vault === s.vault && s.hl.data, gi = s.ing && s.ing.vault === s.vault && s.ing.data
      return (gi ? knIngestWaiting(gi.runs) : 0) + (h ? knHealthList(h.findings).needs : 0)
    },
  }
}
