// Knowledge (the plugin `obsidian`) — the client half: its own activity "Knowledge", full screen, which is
// onetest-ai/echo-plugins#17's Knowledge 0.1.1 client ported as it was (`view.js`, `model.js`, its look in
// `knowledge.css`): a vault's Home, Pages, Graph, Ingest, Health and Settings. #17's Ask is gone: "Ask the vault" opens
// Claude Code in Echo's panel, in the vault. The vault's Settings keep 0.8's "What Claude knows about it" (the
// When-line and the five parts — each changed in place —, the first reading to check and confirm, a new reading
// proposed) and "For whom" (its clients and threads), drawn with #17's Settings classes; the logic is here.
// Echo's generic slots carry the rest: the call's chip (`call.header`), its ⋯ items (`call.menu`), the line while its
// minutes come (`call.minutes`), the save sheet over a call's page (`ctx.ui.sheet`), ⌘K (`ctx.palette`), files dropped
// on the activity (`ctx.onFileDrop`), the activity's badge and its editing guard. Settings keeps a small section that
// lists the vaults and opens them here. Every word and style of it ships in this plugin.

const ACT = 'knowledge'
// A folder holding notes: the activity's icon.
const NOTES_ICON = (n) => `<svg width="${n}" height="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M8 12h8M8 15.5h5"/></svg>`
// 0.8's description of a vault for Claude: the When-line, then its five parts.
const PARTS = [
  ['what', 'What it is'],
  ['where', 'Where things are'],
  ['how', 'How notes are written'],
  ['can', 'What Claude can do'],
  ['leave', 'Leave alone'],
]
const KINDS = { engagement: 'Engagement', team: 'Team wiki', personal: 'Personal knowledge', journal: 'Journal', other: 'Notes' }

export async function apply(ctx) {
  const { esc } = ctx.ui
  const v1 = new URL(import.meta.url).search
  await ctx.ui.stylesheet('knowledge.css')
  const { createKnowledge } = await import(`./view.js${v1}`)
  const { knParseRoute, KN_BASE } = await import(`./model.js${v1}`)
  const { applyRows } = await import(`./rows.js${v1}`)
  applyRows(ctx)

  // ── the call the window shows, and each call's Knowledge (the host half's `call_knowledge`) ──
  const calls = new Map()
  let callNow = null
  const withK = (c) => (c ? { ...c, knowledge: calls.get(c.name) || null } : null)
  const asking = new Set()
  const refreshCall = async (c = callNow) => {
    if (!c || asking.has(c.name)) return
    asking.add(c.name)
    try {
      const k = await ctx.call('call_knowledge', { call: c })
      const was = JSON.stringify(calls.get(c.name) || null)
      calls.set(c.name, k)
      if (JSON.stringify(k) !== was) ctx.render()
    } catch { /* the chip waits for the next draw */ } finally { asking.delete(c.name) }
  }

  // ── the activity's redraws: Echo leaves its box as it is while the user types in it (`editing()`); a redraw the view
  // itself asks for goes through once, the field typed in keeps its text, caret and scroll ──
  let force = false, held = null, sheetBox = null
  const shown = () => ctx.where().view === KN_BASE
  const keepField = () => {
    const el = document.activeElement
    held = el && el.id && /^(TEXTAREA|INPUT)$/.test(el.tagName) && el.closest('.kn') ? { id: el.id, a: el.selectionStart, b: el.selectionEnd, top: el.scrollTop } : null
  }
  const redraw = () => {
    if (shown()) { keepField(); force = true }
    syncSheet()
    ctx.render()
  }
  // Outside the activity only the save sheet (opened from a call's page) and a question asked from it are drawn — in
  // Echo's sheet over the window, the view's sheet inside it; any other sheet the activity had open is closed (a
  // folder picked for it given back).
  function syncSheet() {
    if (!view) return
    const kind = view.sheetKind(), asking = view.asking()
    if (!shown() && kind && kind !== 'save') view.closeSheet()
    if (!shown() && (view.sheetKind() === 'save' || asking)) {
      const html = view.overlay(true)
      const label = asking ? 'Knowledge asks first' : 'Save the minutes to Knowledge'
      const close = () => { sheetBox = null; if (view.asking()) view.closeAsking(); else view.closeSheet(); ctx.render() }
      if (!sheetBox || !sheetBox.isConnected) sheetBox = ctx.ui.sheet(html, { label, onClose: close })
      else ctx.ui.patch(sheetBox, html)
    } else if (sheetBox) { sheetBox = null; ctx.ui.closeSheet() }
  }

  // ── What Claude knows about it, and For whom (0.8's, in the vault's Settings) ──
  let about = { key: null, draft: '', error: '', vault: null }
  const reload = async () => { await view.load(); redraw() }
  const op = async (command, args) => {
    try { const r = await ctx.call(command, args); about.error = ''; await reload(); return r } catch (e) { about.error = String((e && e.message) || e); redraw(); return null }
  }
  const D = () => view.data() || { clients: [], threads: [] }
  const nameOf = (b) => (b.client ? ((D().clients || []).find((c) => c.id === b.client) || {}).name : ((D().threads || []).find((t) => t.id === b.thread) || {}).name) || b.client || b.thread
  const forWhom = (v) => (v.belongs || []).map(nameOf).join(', ')
  const SPIN = '<span class="kn-spin" aria-hidden="true"></span>'
  const row = (t, sub, ctl, id) => `<div class="set-row"${id ? ` id="${id}"` : ''}><div><b>${t}</b><div class="set-sub">${sub}</div></div><div class="set-ctl">${ctl}</div></div>`
  const part = (v, key, label, text) => {
    if (about.key === key && about.vault === v.id) {
      return `<div class="set-row kn-about-edit"><div><b>${esc(label)}</b><textarea class="kn-about-ta" id="kn-about-draft" data-kn-about-key="${key}"${key === 'when' ? ' maxlength="250"' : ''} aria-label="${esc(label)}">${esc(about.draft)}</textarea>
        <div class="kn-inline">${key === 'when' ? `<span class="set-sub grow" id="kn-about-count">${about.draft.length}/250 — the only line Claude sees until it opens the vault</span>` : '<span class="grow"></span>'}<button class="btn ghost sm" data-kn-about="cancel">Cancel</button><button class="btn primary sm" data-kn-about="save" data-key="${key}">Save</button></div></div><div></div></div>`
    }
    const sub = key === 'when'
      ? `${text ? `<span class="kn-about-t">${esc(text)}</span>` : '<span class="kn-about-none">Nothing yet</span>'}<span class="kn-about-why">Claude finds your vaults by this line when an answer may be in your notes, and reads the rest only then${forWhom(v) ? ` · on ${esc(forWhom(v))}'s pages it is pointed straight here` : ''}.</span>`
      : text ? `<span class="kn-about-t">${esc(text)}</span>` : '<span class="kn-about-none">Nothing yet</span>'
    return row(esc(label), sub, `<button class="btn ghost sm" data-kn-about="edit" data-key="${key}">${text ? 'Change' : 'Write it'}</button>`)
  }
  const aboutHtml = (v) => {
    const d = v.description || {}
    const banner = v.state === 'analysing' ? `<div class="kn-info kn-about-b">${SPIN}<span><b>Echo is reading ${esc(v.name)}.</b> It looks at the folders and the first lines of some notes, then Claude describes it — about a minute.</span></div>`
      : v.state === 'failed' ? `<div class="kn-warn kn-about-b" role="alert"><span class="grow"><b>It couldn't be read.</b> ${esc(v.error || '')}</span><button class="btn primary sm" data-kn-about="again">Try again</button></div>`
        : v.state === 'review' ? `<div class="kn-warn kn-about-b"><span class="grow"><b>Echo read this vault for the first time.</b> Check what Claude will be told about it, fix what's wrong, then confirm.</span><button class="btn primary sm" data-kn-about="confirm">Looks right</button></div>`
          : v.state === 'empty' ? `<div class="kn-info kn-about-b"><span class="grow"><b>No notes here yet.</b> Echo has nothing to describe. Write below what Claude should know about it and confirm, or read it again once it has notes.</span><button class="btn sm" data-kn-about="again">Read it again</button>${d.when ? '<button class="btn primary sm" data-kn-about="confirm">Looks right</button>' : ''}</div>`
            : v.proposed ? `<div class="kn-info kn-about-b"><span class="grow"><b>Echo read it again.</b> A new description is ready — yours stays until you choose.</span><button class="btn sm" data-kn-about="proposed" data-take="0">Keep mine</button><button class="btn primary sm" data-kn-about="proposed" data-take="1">Use the new one</button></div>` : ''
    const taken = new Set((v.belongs || []).map((b) => b.client || b.thread))
    const chips = (v.belongs || []).map((b, i) => `<span class="tag kn-about-chip">${esc(nameOf(b))}<button class="kn-about-x" data-kn-about="unbelong" data-i="${i}" aria-label="Not for ${esc(nameOf(b))}">×</button></span>`).join('')
    const options = [...(D().clients || []).filter((c) => !taken.has(c.id)).map((c) => `<option value="client:${esc(c.id)}">${esc(c.name)}</option>`), ...(D().threads || []).filter((t) => !taken.has(t.id)).map((t) => `<option value="thread:${esc(t.id)}">Thread · ${esc(t.name)}</option>`)].join('')
    const add = options ? `<select class="set-in" data-kn-about-belong aria-label="For a client or thread"><option value="">Add a client or thread…</option>${options}</select>` : ''
    const kind = KINDS[v.kind] || 'Vault'
    const facts = [kind, v.notes != null ? `${Number(v.notes).toLocaleString()} notes` : '', v.in_git ? 'kept in git' : '', v.is_vault === false ? 'a folder of notes (no .obsidian)' : ''].filter(Boolean).join(' · ')
    const desc = v.state === 'analysing' && !d.when ? '' : `<div class="set-card">${part(v, 'when', 'When Claude looks here', d.when)}${PARTS.map(([k, l]) => part(v, k, l, d[k])).join('')}</div>`
    return `<section class="set-sec" id="vs-about"><h3>What Claude knows</h3>${banner}${about.error && about.vault === v.id ? `<p class="error">${esc(about.error)}</p>` : ''}
      <div class="set-card">${row('For whom', `${chips || 'Yours — no client or thread yet.'}<span class="kn-about-why">On a client's or thread's pages, Claude is pointed straight to this vault.</span>`, add)}
      ${row('What Echo read', esc(facts), `<button class="btn ghost sm" data-kn-about="again"${v.state === 'analysing' ? ' disabled' : ''}>Read it again</button>`)}</div>
      ${desc}<p class="set-foot">What Claude in Echo is told about this vault: Echo wrote it from the vault's own notes; you correct it. It goes to Claude as notes about the vault, never as instructions.</p></section>`
  }
  // While a vault is being read, its Settings follow it.
  let following = null
  const aboutAfter = (v) => {
    if (v.state !== 'analysing' || following) return
    following = setTimeout(async () => { following = null; await reload() }, 2500)
  }
  ctx.onUnload(() => { if (following) clearTimeout(following) })

  let lastHash = null
  const view = await createKnowledge(ctx, {
    render: redraw,
    call: () => (ctx.where().view === 'calls' ? withK(callNow) : null),
    refreshCall: () => refreshCall(),
    about: aboutHtml,
    aboutAfter,
  })

  // ── the activity: its own routes (`#obsidian:knowledge/<vault>/<tab>/<path>`), the view drawn whole, its sheets in it ──
  ctx.activities.add({
    id: ACT,
    label: 'Knowledge',
    icon: NOTES_ICON(20),
    render() {
      const h = location.hash
      if (h !== lastHash) {
        lastHash = h
        const r = knParseRoute(h)
        if (r) { view.route(r); if (view.data()) view.loadVault().then(redraw) }
      }
      return view.view() + view.overlay(false)
    },
    after() {
      force = false
      view.after()
      if (held) {
        const el = document.getElementById(held.id)
        if (el && document.activeElement !== el) { el.focus(); try { el.setSelectionRange(held.a, held.b) } catch { /* not a text field */ } el.scrollTop = held.top }
        held = null
      }
    },
    badge: () => { const n = view.badge(); return n > 0 ? n : '' },
    editing: () => !force && (view.editing() || about.key !== null),
  })
  // Polled while Knowledge shows (2 s, as #677's window did): a change on disk shows within a tick.
  const tick = setInterval(() => { if (shown()) view.tick().catch(() => {}) }, 2000)
  ctx.onUnload(() => clearInterval(tick))
  ctx.onFileDrop((files) => view.dropped(files))

  // ── a call's page ──
  ctx.slots.add('call.header', {
    id: 'chip',
    label: 'Knowledge',
    render: (call) => { callNow = call; return view.callChip(withK(call)) },
    after: (box, call) => { callNow = call; refreshCall(call) },
  })
  const menuItem = (t, id) => (t && t.call ? view.callMenu(withK({ ...t.call, notes: !!t.call.notes })).find((x) => x.id === id) : null)
  for (const id of ['open', 'save']) {
    ctx.slots.add('call.menu', {
      label: (t) => (menuItem(t, id) || {}).label,
      when: (t) => !!menuItem(t, id),
      run: (t) => { const x = menuItem(t, id); if (x) x.run() },
    })
  }
  ctx.slots.add('call.minutes', { id: 'then', label: 'Knowledge', render: (call) => view.countdownLine(withK(call)) })

  // ── Settings: a small section listing the vaults, each opened in the activity ──
  ctx.settings.section({ id: 'main', label: 'Knowledge', icon: NOTES_ICON(16), render: () => view.settingsVaults() })
  ctx.settings.add({ render: () => ctx.ui.setCard('', [ctx.ui.setRow('Your vaults', 'Home, Pages, Graph, Ingest, Health and Settings — in the folders you own.', '<button class="btn" data-kn-open>Open Knowledge</button>')]) })
  view.paletteActions((group, label, run, o = {}) => ctx.palette.add({ group, label, run, keywords: o.keywords || '' }))

  // ── its own clicks and fields (the view's are in view.js) ──
  ctx.listen('click', async (e) => {
    const t = e.target.closest && e.target.closest('[data-kn-about], [data-kn-open]')
    if (!t) return
    if (t.hasAttribute('data-kn-open')) return ctx.go(view.home())
    const v = view.vault()
    if (!v) return
    const d = t.dataset
    switch (d.knAbout) {
      case 'edit': about = { key: d.key, draft: (v.description || {})[d.key] || '', error: '', vault: v.id }; redraw(); setTimeout(() => { const ta = document.getElementById('kn-about-draft'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length) } }); return
      case 'cancel': about = { key: null, draft: '', error: '', vault: null }; return redraw()
      case 'save': { const ta = document.getElementById('kn-about-draft'); const text = ta ? ta.value : about.draft; about = { key: null, draft: '', error: '', vault: v.id }; return op('save', { id: v.id, key: d.key, text }) }
      case 'confirm': about.vault = v.id; return op('confirm', { id: v.id })
      case 'again': about.vault = v.id; return op('analyse', { id: v.id })
      case 'proposed': about.vault = v.id; return op('take_proposed', { id: v.id, take: d.take === '1' })
      case 'unbelong': about.vault = v.id; return op('belongs', { id: v.id, belongs: (v.belongs || []).filter((_, i) => i !== Number(d.i)) })
    }
  })
  ctx.listen('change', (e) => {
    const t = e.target
    if (!(t.matches && t.matches('[data-kn-about-belong]')) || !t.value) return
    const v = view.vault()
    if (!v) return
    const [kind, id] = t.value.split(':')
    about.vault = v.id
    op('belongs', { id: v.id, belongs: [...(v.belongs || []), { [kind]: id }] })
  })
  ctx.listen('input', (e) => {
    if (e.target.id !== 'kn-about-draft') return
    about.draft = e.target.value
    const c = document.getElementById('kn-about-count')
    if (c) c.textContent = `${about.draft.length}/250 — the only line Claude sees until it opens the vault`
  })
  ctx.listen('keydown', (e) => {
    if (e.target.id !== 'kn-about-draft') return
    if (e.key === 'Escape') { e.stopPropagation(); about = { key: null, draft: '', error: '', vault: null }; redraw() }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); const b = document.querySelector('[data-kn-about="save"]'); if (b) b.click() }
  }, true)
}
