// Knowledge (the plugin `obsidian`) — the client half: its own Settings section (Settings → From plugins → Knowledge)
// and the Knowledge activity (a vault's notes and graph). In the section: Vaults as vertical tabs (those waiting for the user first);
// the chosen vault: who it is for, what is inside, and what Claude will be told about it — each part edited in place.

const GEM = (n) => `<svg width="${n}" height="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5 19 8l-2 10-5 3.5L7 18 5 8z"/><path d="M12 2.5 10 12l2 9.5M5 8l5 4 7 6M19 8l-9 4"/></svg>`
const SECTION = 'obsidian:main'
const PARTS = [
  ['what', 'What it is'],
  ['where', 'Where things are'],
  ['how', 'How notes are written'],
  ['can', 'What Claude can do'],
  ['leave', 'Leave alone'],
]
const KINDS = { engagement: 'Engagement', team: 'Team wiki', personal: 'Personal knowledge', journal: 'Journal', other: 'Notes' }
const COLORS = ['#4fb3d9', '#5f8fe0', '#e0a96d', '#b98cff', '#3ccf91', '#e07fa3', '#d9c84f', '#7fd0c0']

const CSS = `
/* the Knowledge activity */
.ob { display: grid; grid-template-columns: 250px minmax(0, 1fr) 300px; height: 100%; min-height: 0; }
.ob-side { border-right: 1px solid var(--line); display: flex; flex-direction: column; min-height: 0; }
.ob-side .ob-top { padding: 12px 12px 6px; display: flex; flex-direction: column; gap: 6px; }
.ob-side select, .ob-side input { width: 100%; box-sizing: border-box; }
.ob-seg { display: inline-flex; border: 1px solid var(--line-strong); border-radius: 6px; overflow: hidden; align-self: flex-start; }
.ob-seg button { border: 0; background: none; color: var(--text-2); font: inherit; font-size: 12px; padding: 3px 10px; }
.ob-seg button.on { background: var(--accent-soft); color: var(--text); font-weight: 600; }
.ob-tree { overflow: auto; padding: 4px 6px 12px; flex: 1; min-height: 0; }
.ob-fx { display: flex; align-items: center; gap: 6px; width: 100%; border: 0; background: none; color: var(--text); font: inherit; font-size: 12.5px; text-align: left; padding: 3px 8px; border-radius: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ob-fx:hover { background: var(--hover); }
.ob-fx.on { background: var(--accent-soft); font-weight: 600; }
.ob-fx.d { font-weight: 600; color: var(--text); }
.ob-fx.sk { color: var(--text-3); }
.ob-fx .n { margin-left: auto; font-size: 11px; color: var(--text-3); font-weight: 400; }
.ob-mid { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
/* the note tabs: on the page's own colour, edge to edge in height; a thin line above the strip; the open one lifted a shade */
.ob-tabs { display: flex; align-items: stretch; height: 36px; padding: 0 4px; background: var(--surface); border-top: 1px solid var(--line-strong); border-bottom: 1px solid var(--line); overflow-x: auto; overflow-y: hidden; flex: none; scrollbar-width: none; }
.ob-tabs::-webkit-scrollbar { display: none; }
.ob-tab { position: relative; display: flex; align-items: center; gap: 4px; padding: 0 6px 0 12px; border: 0; background: none; color: var(--text-3); font: inherit; font-size: 12.5px; white-space: nowrap; min-width: 0; max-width: 200px; flex: 0 1 auto; }
.ob-tab .t { overflow: hidden; text-overflow: ellipsis; }
.ob-tab + .ob-tab::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 1px; background: var(--line-strong); }
.ob-tab:hover { color: var(--text-2); background: var(--line); }
.ob-tab:hover::before, .ob-tab:hover + .ob-tab::before, .ob-tab.on::before, .ob-tab.on + .ob-tab::before { display: none; }
.ob-tab.on { background: var(--line); color: var(--text); font-weight: 600; }
.ob-tab .x { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 4px; font-size: 14px; line-height: 1; opacity: 0; flex: none; }
.ob-tab:hover .x, .ob-tab.on .x { opacity: 0.55; }
.ob-tab .x:hover { opacity: 1; background: var(--line-strong); }
.ob-tab.g { margin-left: auto; padding: 0 12px; gap: 6px; flex: none; }
.ob-tab.g::before { display: none; }
.ob-body { overflow: auto; padding: 4px 28px 28px; flex: 1; min-height: 0; }
/* inside Echo's Knowledge section: the browser fills the pane edge to edge (its own panes have their padding) */
.br-pane:has(> .ob) { padding: 0; gap: 0; overflow: hidden; }
.br-pane > .ob { flex: 1; height: auto; min-height: 0; }
.ob-path { font-size: 11.5px; color: var(--text-3); padding-top: 8px; }
.ob-h1 { font-size: 24px; font-weight: 700; margin: 10px 0 8px; }
.ob-props { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 4px 12px; font-size: 12.5px; padding: 8px 0 12px; border-bottom: 1px solid var(--line); margin-bottom: 8px; }
.ob-props span:nth-child(odd) { color: var(--text-3); }
.ob-wl { border: 0; background: none; color: var(--accent); font: inherit; padding: 0; cursor: pointer; }
.ob-wl.miss { color: var(--text-3); text-decoration: underline dotted; cursor: default; }
.ob-tag { display: inline-flex; padding: 0 7px; border-radius: 10px; font-size: 12px; background: var(--accent-soft); color: var(--accent); margin: 0 4px 4px 0; border: 0; font: inherit; }
.ob-right { border-left: 1px solid var(--line); overflow: auto; padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }
.ob-h4 { font-size: 10.5px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-top: 6px; }
.ob-gbox { height: 220px; border: 1px solid var(--line); border-radius: 8px; position: relative; }
.ob-full { flex: 1; min-height: 0; position: relative; }
.ob-full .ob-gbox { position: absolute; inset: 0; height: auto; border: 0; border-radius: 0; }
.ob-gbar { display: flex; align-items: center; gap: 10px; padding: 8px 14px; border-bottom: 1px solid var(--line); flex: none; }
.ob-bl { font-size: 12px; padding: 5px 0; border-top: 1px solid var(--line); }
.ob-bl button { border: 0; background: none; padding: 0; color: var(--accent); font: inherit; font-weight: 600; text-align: left; }
.ob-legend { position: absolute; left: 12px; bottom: 12px; background: var(--panel, var(--bg)); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; font-size: 12px; display: flex; flex-direction: column; gap: 3px; max-height: 40%; overflow: auto; }
.ob-legend i { display: inline-block; width: 9px; height: 9px; border-radius: 5px; margin-right: 6px; }
.ob-err { padding: 16px; }
.ob-empty { margin: auto; max-width: 420px; text-align: center; padding-top: 80px; display: flex; flex-direction: column; gap: 10px; align-items: center; }

.obs { display: flex; height: 100%; min-height: 0; margin: -24px -28px; }
.obs-tabs { width: 236px; flex: 0 0 236px; border-right: 1px solid var(--line); display: flex; flex-direction: column; gap: 1px; overflow: auto; padding-bottom: 10px; }
.obs-tabs .obs-top { display: flex; align-items: center; gap: 8px; padding: 16px 12px 8px; }
.obs-tabs .obs-top b { font-size: 16px; font-weight: 650; flex: 1; }
.obs-q { margin: 0 12px 6px; }
.obs-g { font-size: 10.5px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; margin: 10px 14px 4px; }
.obs-t { display: flex; align-items: center; gap: 9px; margin: 0 6px; padding: 6px 8px; border-radius: 7px; border: 0; background: none; color: inherit; font: inherit; text-align: left; }
.obs-t:hover { background: var(--hover); }
.obs-t.on { background: var(--accent-soft); box-shadow: inset 2px 0 0 var(--accent); }
.obs-t .n { font-size: 13px; font-weight: 550; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.obs-t.on .n { font-weight: 650; }
.obs-t .s { font-size: 11.5px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.obs-dot { width: 7px; height: 7px; border-radius: 4px; flex: none; background: var(--text-3); }
.obs-dot.ok { background: var(--ok, #3ccf91); } .obs-dot.warn { background: var(--warn, #f0a24a); } .obs-dot.bad { background: var(--danger, #ff6b81); }
.obs-main { flex: 1; min-width: 0; padding: 16px 24px; display: flex; flex-direction: column; gap: 12px; overflow: auto; }
.obs-head { display: flex; align-items: center; gap: 12px; }
.obs-icon { width: 42px; height: 42px; border-radius: 12px; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; flex: none; }
.obs-name { font-size: 19px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.obs-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-3); margin-top: 2px; white-space: nowrap; overflow: hidden; flex-wrap: wrap; }
.obs-meta .sep { opacity: 0.6; }
.obs-cl { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 8px; border-radius: 10px; font-size: 11.5px; font-weight: 600; background: rgba(79,179,217,0.16); color: #3a9cc4; }
.obs-cl button { border: 0; background: none; color: inherit; padding: 0; font: inherit; opacity: 0.7; }
.obs-meta select { height: 22px; font-size: 11.5px; border-radius: 6px; border: 1px dashed var(--line-strong); background: transparent; color: var(--text-2); }
.obs-ib { width: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; }
.obs-banner { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px; background: rgba(240,162,74,0.08); border: 1px solid rgba(240,162,74,0.3); font-size: 13px; }
.obs-banner.busy { background: var(--accent-soft); border-color: var(--line); }
.obs-banner.bad { background: rgba(255,107,129,0.08); border-color: rgba(255,107,129,0.35); }
.obs-bar { display: flex; gap: 2px; height: 12px; border-radius: 6px; overflow: hidden; }
.obs-bar i { display: block; height: 100%; }
.obs-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 8px; }
.obs-legend span { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; }
.obs-legend .sk { color: var(--text-3); }
.obs-legend .sw { width: 9px; height: 9px; border-radius: 3px; }
.obs-legend .c { color: var(--text-3); }
.obs-card { border: 1px solid var(--line); border-radius: 10px; padding: 10px 16px 12px; }
.obs-when { border: 1px solid var(--accent-line, rgba(155,120,255,0.35)); background: var(--accent-soft); border-radius: 8px; padding: 9px 12px; margin: 4px 0 6px; cursor: text; }
.obs-when .l { font-size: 11px; font-weight: 650; color: var(--accent); text-transform: uppercase; letter-spacing: 0.06em; }
.obs-when .t { font-size: 13.5px; line-height: 1.55; margin-top: 2px; }
.obs-part { display: grid; grid-template-columns: 160px minmax(0,1fr); gap: 14px; padding: 8px 6px; border-radius: 8px; border-top: 1px solid var(--line); cursor: text; }
.obs-part:hover, .obs-when:hover { background: var(--hover); }
.obs-part .l { font-size: 12px; font-weight: 600; color: var(--text-2); padding-top: 1px; }
.obs-part .t { font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
.obs-part .t:empty::before { content: 'Nothing yet — click to write it'; color: var(--text-3); }
.obs-edit textarea { width: 100%; box-sizing: border-box; min-height: 90px; resize: vertical; font: inherit; font-size: 13px; line-height: 1.55; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--accent); background: var(--bg); color: var(--text); }
.obs-edit .row { display: flex; gap: 6px; justify-content: flex-end; margin-top: 6px; }
.obs-empty { margin: auto; max-width: 440px; text-align: center; display: flex; flex-direction: column; gap: 10px; align-items: center; }
.obs-menu { position: relative; }
.obs-menu .pop { position: absolute; right: 0; top: 32px; z-index: 5; background: var(--panel, var(--bg)); border: 1px solid var(--line-strong); border-radius: 8px; padding: 4px; min-width: 180px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
.obs-menu .pop button { display: block; width: 100%; text-align: left; border: 0; background: none; color: inherit; font: inherit; font-size: 12.5px; padding: 6px 10px; border-radius: 5px; }
.obs-menu .pop button:hover { background: var(--hover); }
.obs-menu .pop .danger { color: var(--danger, #ff6b81); }
`

export function apply(ctx) {
  const { esc } = ctx.ui
  let data = null, error = '', sel = null, q = '', editing = null, draft = '', menu = false, removing = false
  let pending = null, notice = '' // a picked folder waiting for "connect anyway"; a one-line note above the vault
  let loading = null, loadedAt = 0, seen = ''

  // Echo takes its style and listeners out when it is switched off or updated (no doubled clicks after an update).
  ctx.ui.style(CSS)
  const here = () => { const w = ctx.where(); return w.view === 'settings' && w.section === SECTION }
  // `view` again: one request at a time; `force` waits for one in flight and asks again (it may predate a change).
  // The window is drawn again only when something changed (typing in a field keeps its focus).
  const load = (force) => {
    if (loading) return force ? loading.then(() => load(true)) : loading
    loading = (async () => {
      let changed = !!force
      try { const d = await ctx.call('view'); const j = JSON.stringify(d); changed = changed || j !== seen || !!error; seen = j; data = d; error = '' } catch (e) { changed = changed || error !== e.message; error = e.message }
      loadedAt = Date.now(); loading = null
      if (data && (!sel || !data.vaults.some((v) => v.id === sel))) sel = (data.vaults.find((v) => v.state !== 'ready') || data.vaults[0] || {}).id || null
      if (changed && !editing) ctx.render()
      // While a vault is being read, the page follows it.
      const busy = data && data.vaults.some((v) => v.state === 'analysing')
      const w = ctx.where()
      if (busy && (here() || /^obsidian:/.test(w.tab || ''))) setTimeout(load, 2500)
    })()
    return loading
  }
  // Each time the section or the activity is shown, the vaults are read again (never a stale copy after an add,
  // an analysis finished elsewhere, or the Inbox's link).
  const fresh = () => { if (data && !loading && Date.now() - loadedAt > 3000) load() }
  const op = async (command, args) => {
    try { const r = await ctx.call(command, args); error = ''; await load(true); return r } catch (e) { error = e.message; await load(true); return null }
  }
  const addVault = async (args) => {
    const r = await op('add', args)
    if (!r || r.cancelled) return
    if (r.check) { pending = r.check; return ctx.render() }
    pending = null
    if (r.id) { sel = r.id; editing = null; menu = false; removing = false; notice = r.already ? 'That folder is connected already — here it is.' : ''; ctx.render() }
  }
  const pendingHtml = () => {
    if (!pending) return ''
    const folder = pending.root.split(/[\\/]/).filter(Boolean).pop() || pending.root
    return `<div class="obs-banner" style="text-align:left"><span class="obs-dot warn"></span><div style="flex:1"><b>${esc(folder)} has no notes yet.</b>
      There is nothing to describe; you would write the description yourself, or Echo reads it again once it has notes. Connect it anyway?</div>
      <button class="btn" data-obs-pend-no>Cancel</button><button class="btn primary" data-obs-pend-yes>Connect anyway</button></div>`
  }
  const ago = (secs) => { if (!secs) return ''; const m = Math.round((Date.now() / 1000 - secs) / 60); return m < 60 ? `changed ${Math.max(1, m)} min ago` : m < 48 * 60 ? `changed ${Math.round(m / 60)} h ago` : `changed ${Math.round(m / 1440)} days ago` }
  const nameOf = (b) => (b.client ? (data.clients.find((c) => c.id === b.client) || {}).name : (data.threads.find((t) => t.id === b.thread) || {}).name) || b.client || b.thread
  const forWhom = (v) => (v.belongs || []).map(nameOf).join(', ')
  const dot = (v) => (v.state === 'ready' ? 'ok' : v.state === 'failed' ? 'bad' : v.state === 'review' || v.state === 'empty' ? 'warn' : '')
  const sub = (v) => v.state === 'analysing' ? 'Reading it…' : v.state === 'failed' ? 'Couldn’t be read' : v.state === 'review' ? 'Check the description' : v.state === 'empty' ? 'No notes yet' : `${v.notes != null ? `${Number(v.notes).toLocaleString()} notes · ` : ''}${forWhom(v) || 'yours'}`

  const tabs = () => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    const match = (v) => !words.length || words.every((w) => `${v.name} ${forWhom(v)} ${(v.description || {}).when || ''}`.toLowerCase().includes(w))
    const shown = data.vaults.filter(match)
    const needs = shown.filter((v) => v.state !== 'ready')
    const ready = shown.filter((v) => v.state === 'ready').sort((a, b) => a.name.localeCompare(b.name))
    const tab = (v) => `<button class="obs-t${v.id === sel ? ' on' : ''}" data-obs-sel="${esc(v.id)}"><span class="obs-dot ${dot(v)}"></span><span style="min-width:0;flex:1"><div class="n">${esc(v.name)}</div><div class="s">${esc(sub(v))}</div></span></button>`
    return `<div class="obs-tabs">
      <div class="obs-top"><b>Knowledge</b><button class="btn primary" data-obs-add style="height:24px;padding:0 9px">+ Vault</button></div>
      ${data.vaults.length > 6 ? `<input class="search obs-q" id="obs-q" value="${esc(q)}" placeholder="Find a vault or client" aria-label="Find a vault">` : ''}
      ${needs.length ? `<div class="obs-g">Needs you</div>${needs.map(tab).join('')}` : ''}
      ${ready.length ? `<div class="obs-g">Vaults · ${ready.length}</div>${ready.map(tab).join('')}` : ''}
      ${words.length && !shown.length ? '<p class="set-sub" style="padding:0 14px">Nothing matches.</p>' : ''}
    </div>`
  }

  const part = (v, key, label, text) => {
    if (editing === key) {
      return `<div class="obs-part obs-edit" style="cursor:default"><div class="l">${esc(label)}</div><div><textarea id="obs-draft" data-obs-key="${key}" ${key === 'when' ? 'maxlength="250"' : ''}>${esc(draft)}</textarea>
        <div class="row">${key === 'when' ? `<span class="set-sub" style="margin-right:auto">${draft.length}/250 — the only line Claude sees until it opens the vault</span>` : ''}<button class="btn" data-obs-cancel>Cancel</button><button class="btn primary" data-obs-save="${key}">Save</button></div></div></div>`
    }
    if (key === 'when') return `<div class="obs-when" data-obs-edit="when" title="Click to change it"><div class="l">When Claude looks here</div><div class="t">${esc(text || 'Nothing yet — click to write it')}</div><div class="set-sub" style="margin-top:4px">Claude finds your vaults by this line when an answer may be in your notes, and reads the rest only then${forWhom(v) ? ` · on ${esc(forWhom(v))}’s pages it is pointed straight here` : ''}</div></div>`
    return `<div class="obs-part" data-obs-edit="${key}" title="Click to change it"><div class="l">${esc(label)}</div><div class="t">${esc(text || '')}</div></div>`
  }

  const detail = (v) => {
    const d = v.description || {}
    const kind = KINDS[v.kind] || 'Vault'
    const chips = (v.belongs || []).map((b, i) => `<span class="obs-cl">${esc(nameOf(b))}<button data-obs-unbelong="${i}" aria-label="Not for ${esc(nameOf(b))}">×</button></span>`).join('')
    const taken = new Set((v.belongs || []).map((b) => b.client || b.thread))
    const options = [...data.clients.filter((c) => !taken.has(c.id)).map((c) => `<option value="client:${esc(c.id)}">${esc(c.name)}</option>`), ...data.threads.filter((t) => !taken.has(t.id)).map((t) => `<option value="thread:${esc(t.id)}">Thread · ${esc(t.name)}</option>`)].join('')
    const add = options ? `<select data-obs-belong aria-label="For a client or thread"><option value="">${chips ? '+' : '+ for a client or thread'}</option>${options}</select>` : ''
    const meta = [`<span>${esc(kind)}</span>`, chips ? `<span class="sep">·</span><span>for</span>${chips}${add}` : add ? `<span class="sep">·</span>${add}` : '', v.notes != null ? `<span class="sep">·</span><span>${Number(v.notes).toLocaleString()} notes</span>` : '', v.latest ? `<span class="sep">·</span><span>${ago(v.latest)}</span>` : '', v.in_git ? '<span class="sep">·</span><span>kept in git</span>' : '',
      v.is_vault === false ? '<span class="sep">·</span><span title="No .obsidian folder: Echo keeps its links and tags itself; open it in Obsidian with “Open folder as vault” any time">a folder of notes</span>'
        : ''].join('')
    const openUrl = `obsidian://open?path=${encodeURIComponent(v.root)}`
    const head = `<div class="obs-head"><span class="obs-icon">${GEM(22)}</span>
      <div style="flex:1;min-width:0"><div class="obs-name" title="${esc(v.root)}">${esc(v.name)}</div><div class="obs-meta">${meta}</div></div>
      ${v.confirmed ? `<button class="btn" data-ob-browse="${esc(v.id)}">Browse</button>` : ''}
      <a class="btn obs-ib" data-ext href="${esc(openUrl)}" title="Open in Obsidian" aria-label="Open in Obsidian">↗</a>
      <span class="obs-menu"><button class="btn obs-ib" data-obs-menu aria-label="More">⋯</button>${menu ? `<div class="pop"><button data-obs-again>Read it again</button><button data-obs-rename>Rename…</button><button class="danger" data-obs-remove>Remove from Echo</button></div>` : ''}</span></div>`
    const banner = v.state === 'analysing' ? `<div class="obs-banner busy"><span class="spinner"></span><div style="flex:1"><b>Echo is reading ${esc(v.name)}.</b> It looks at the folders and the first lines of some notes, then Claude describes it — about a minute.</div></div>`
      : v.state === 'failed' ? `<div class="obs-banner bad"><div style="flex:1"><b>It couldn’t be read.</b> ${esc(v.error || '')}</div><button class="btn primary" data-obs-again>Try again</button></div>`
      : v.state === 'review' ? `<div class="obs-banner"><span class="obs-dot warn"></span><div style="flex:1"><b>Echo read this vault for the first time.</b> Check what Claude will be told about it, fix what’s wrong, then confirm.</div><button class="btn primary" data-obs-confirm>Looks right</button></div>`
      : v.state === 'empty' ? `<div class="obs-banner"><span class="obs-dot warn"></span><div style="flex:1"><b>No notes here yet.</b> Echo has nothing to describe. Write below what Claude should know about it and confirm, or read it again once it has notes.</div><button class="btn" data-obs-again>Read it again</button>${d.when ? '<button class="btn primary" data-obs-confirm>Looks right</button>' : ''}</div>`
      : v.proposed ? `<div class="obs-banner"><div style="flex:1"><b>Echo read it again.</b> A new description is ready — yours stays until you choose.</div><button class="btn" data-obs-proposed="0">Keep mine</button><button class="btn primary" data-obs-proposed="1">Use the new one</button></div>` : ''
    const removeAsk = removing ? `<div class="confirm"><span>Remove ${esc(v.name)} from Echo? Claude in Echo stops seeing it; the vault itself isn’t touched.</span><button class="btn" data-obs-remove-cancel>Cancel</button><button class="btn primary" style="background:var(--danger);border-color:var(--danger)" data-obs-remove-yes>Remove</button></div>` : ''
    const inside = (v.inside || []).slice(0, 10)
    const total = inside.reduce((n, f) => n + f.n, 0)
    const insideCard = inside.length ? `<section><div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px"><b style="font-size:13px;font-weight:650;flex:1">What’s inside</b><span class="set-sub">${Number(v.notes || total).toLocaleString()} notes</span></div>
      <div class="obs-bar">${inside.map((f, i) => `<i style="flex:${f.n};background:${f.skip ? 'var(--line-strong)' : COLORS[i % COLORS.length]}" title="${esc(f.name)}: ${f.n}"></i>`).join('')}</div>
      <div class="obs-legend">${inside.map((f, i) => `<span class="${f.skip ? 'sk' : ''}"><span class="sw" style="background:${f.skip ? 'var(--line-strong)' : COLORS[i % COLORS.length]}"></span>${esc(f.name)}${f.skip ? ' · left alone' : ''} <span class="c">${f.n}</span></span>`).join('')}</div></section>` : ''
    const desc = v.state === 'analysing' && !d.when ? '' : `<section class="obs-card"><div style="display:flex;align-items:center;gap:8px;margin:2px 0 4px"><b style="font-size:13px;font-weight:650;flex:1">What Claude knows about it</b><span class="set-sub">click any part to change it</span></div>
      ${part(v, 'when', 'When Claude looks here', d.when)}${PARTS.map(([k, l]) => part(v, k, l, d[k])).join('')}</section>`
    return `<div class="obs-main">${pendingHtml()}${notice ? `<p class="set-sub">${esc(notice)}</p>` : ''}${head}${removeAsk}${banner}${error ? `<p class="error">${esc(error)}</p>` : ''}${insideCard}${desc}</div>`
  }

  // ── the Knowledge activity: browse a vault as Obsidian shows it ──
  const A = { base: 'obsidian:vaults', echoN: -1, browse: {}, notes: {}, opens: {}, tabs: {}, side: 'files', q: '', tag: '', folded: new Set(), gmode: 'links', color: 'folder', graph: {}, loading: {}, errors: {}, zoomed: new Set() }
  // Open notes and the chosen tab, per vault.
  const opened = (vault) => (A.opens[vault] = A.opens[vault] || [])
  const PAL = ['#4fb3d9', '#9b78ff', '#e0a96d', '#3ccf91', '#e07fa3', '#5f8fe0', '#d9c84f', '#7fd0c0', '#f0a24a', '#b98cff']
  const colorOf = (k) => PAL[[...String(k)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PAL.length]
  // Echo decodes the hash already: the path after the vault is as written.
  const route = () => { const r = ctx.where().route || ''; const i = r.indexOf('/'); return i < 0 ? { vault: r, path: '' } : { vault: r.slice(0, i), path: r.slice(i + 1) } }
  // One request per key at a time; a failure is shown with Retry, never asked again by itself.
  const fetchOnce = (key, fn) => {
    if (A.loading[key] || A.errors[key]) return
    A.loading[key] = true
    fn().catch((e) => { A.errors[key] = (e && e.message) || String(e) }).finally(() => { A.loading[key] = false; ctx.render() })
  }
  const failed = (key) => A.errors[key] ? `<div class="ob-err"><span class="error">${esc(A.errors[key])}</span> <button class="btn" data-ob-retry="${esc(key)}">Retry</button></div>` : ''
  const openNote = (vault, path) => {
    if (!opened(vault).includes(path)) opened(vault).push(path)
    A.tabs[vault] = path
    ctx.go(`${A.base}/${vault}/${encodeURIComponent(path)}`)
  }
  // The note's HTML with its wikilinks as links — replaced in text only (never in an attribute or code), its own
  // title as a first heading left out (it is shown above).
  const wikify = (n, vault) => {
    const t = document.createElement('template')
    t.innerHTML = n.html
    const first = t.content.firstElementChild
    if (first && first.tagName === 'H1' && first.textContent.trim() === n.title.trim()) first.remove()
    const re = new RegExp(`⟦${n.marker}:(\\d+)⟧`, 'g')
    const walker = document.createTreeWalker(t.content, NodeFilter.SHOW_TEXT)
    const hits = []
    for (let x = walker.nextNode(); x; x = walker.nextNode()) if (re.test(x.nodeValue) && !x.parentElement.closest('code, pre')) hits.push(x)
    for (const x of hits) {
      const frag = document.createDocumentFragment()
      let last = 0
      for (const m of x.nodeValue.matchAll(re)) {
        frag.append(x.nodeValue.slice(last, m.index))
        const w = n.wikilinks[+m[1]]
        if (w) {
          const el = document.createElement(w.path ? 'button' : 'span')
          el.className = w.path ? 'ob-wl' : 'ob-wl miss'
          el.textContent = w.shown
          if (w.path) { el.dataset.obOpen = w.path; el.dataset.obVault = vault; el.title = w.path } else el.title = 'Not in this vault yet'
          frag.append(el)
        }
        last = m.index + m[0].length
      }
      frag.append(x.nodeValue.slice(last))
      x.replaceWith(frag)
    }
    return t.innerHTML
  }
  const treeHtml = (b, vault, cur) => {
    const words = A.q.toLowerCase().split(/\s+/).filter(Boolean)
    let notes = b.notes
    if (A.tag) notes = notes.filter((n) => n.tags.includes(A.tag))
    if (words.length) notes = notes.filter((n) => words.every((w) => `${n.title} ${n.path}`.toLowerCase().includes(w)))
    const item = (n, depth) => `<button class="ob-fx${n.path === cur ? ' on' : ''}${n.skip ? ' sk' : ''}" style="padding-left:${8 + depth * 12}px" data-ob-open="${esc(n.path)}" data-ob-vault="${esc(vault)}" title="${esc(n.path)}">${esc(n.title)}</button>`
    if (words.length || A.tag) return (A.tag ? `<button class="ob-fx d" data-ob-tag="">#${esc(A.tag)} <span class="n">clear ×</span></button>` : '') + notes.map((n) => item(n, 0)).join('') || '<p class="set-sub" style="padding:8px">Nothing matches.</p>'
    // Folders as a tree, notes under them.
    const root = { dirs: {}, notes: [] }
    for (const n of notes) {
      let d = root
      for (const part of (n.folder ? n.folder.split('/') : [])) d = d.dirs[part] = d.dirs[part] || { dirs: {}, notes: [] }
      d.notes.push(n)
    }
    const count = (d) => d.notes.length + Object.values(d.dirs).reduce((k, x) => k + count(x), 0)
    const walk = (d, prefix, depth) => Object.keys(d.dirs).sort().map((name) => {
      const key = prefix ? `${prefix}/${name}` : name, sub = d.dirs[name], shut = A.folded.has(key)
      const sk = depth === 0 && b.notes.some((n) => n.skip && n.path.startsWith(name + '/'))
      return `<button class="ob-fx d${sk ? ' sk' : ''}" style="padding-left:${8 + depth * 12}px" data-ob-fold="${esc(key)}">${shut ? '▸' : '▾'} ${esc(name)}${sk ? ' · left alone' : ''}<span class="n">${count(sub)}</span></button>${shut ? '' : walk(sub, key, depth + 1) + sub.notes.map((n) => item(n, depth + 1)).join('')}`
    }).join('')
    return walk(root, '', 0) + root.notes.map((n) => item(n, 0)).join('')
  }
  const noteHtml = (n, vault, root) => {
    // A property's [[links]] open their note here.
    const linked = (text) => {
      let out = '', last = 0
      for (const m of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
        out += esc(text.slice(last, m.index))
        const target = m[1].split('|')[0].split('#')[0].trim(), path = (n.prop_links || {})[target], shown = (m[1].split('|')[1] || target).trim()
        out += path ? `<button class="ob-wl" data-ob-open="${esc(path)}" data-ob-vault="${esc(vault)}">${esc(shown)}</button>` : `<span class="ob-wl miss">${esc(shown)}</span>`
        last = m.index + m[0].length
      }
      return out + esc(text.slice(last))
    }
    const props = Object.entries(n.props || {}).map(([k, v]) => `<span>${esc(k)}</span><span>${linked(Array.isArray(v) ? v.join(', ') : String(v))}</span>`).join('')
    return `<div class="ob-path">${esc(n.path)} · <a data-ext href="${esc('obsidian://open?path=' + encodeURIComponent(root + '/' + n.path))}">Open in Obsidian ↗</a></div>
      <div class="ob-h1">${esc(n.title)}</div>
      ${props ? `<div class="ob-props">${props}</div>` : ''}
      <div class="doc">${wikify(n, vault)}</div>`
  }
  const rightHtml = (n, vault) => !n ? '<p class="set-sub">Open a note to see what links to it.</p>' : `
      <div class="ob-h4">Local graph</div><div class="ob-gbox" id="ob-g-local"></div>
      <div class="ob-h4">Backlinks · ${n.backlinks.length}</div>
      ${n.backlinks.map((b) => `<div class="ob-bl"><button data-ob-open="${esc(b.path)}" data-ob-vault="${esc(vault)}">${esc(b.title)}</button>${b.line ? `<div class="set-sub">${esc(b.line)}</div>` : ''}</div>`).join('') || '<p class="set-sub">No note links here.</p>'}
      ${n.tags.length ? `<div class="ob-h4">Tags</div><div>${n.tags.map((t) => `<button class="ob-tag" data-ob-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
      ${n.in_echo.length ? `<div class="ob-h4">In Echo</div>${n.in_echo.map((x) => `<div class="ob-bl"><button data-ob-echo="${esc(x.kind === 'client' ? `client/${x.id}/overview` : `project/${x.id}/brief`)}">${esc(x.name)}</button> <span class="set-sub">${x.kind === 'client' ? 'client' : 'thread'}</span></div>`).join('')}` : ''}`
  const groupsOf = (gd) => {
    const groups = {}
    for (const x of gd.nodes) {
      const grp = x.tag ? '#tags' : A.color === 'tag' ? (x.tags[0] ? '#' + x.tags[0] : '(no tag)') : x.folder
      if (!groups[grp]) groups[grp] = x.tag ? '#8a8a95' : PAL[Object.keys(groups).filter((k) => k !== '#tags').length % PAL.length]
    }
    return groups
  }
  const graphHtml = (vault) => `<div class="ob-gbar"><span class="ob-seg">${[['links', 'Links'], ['tags', 'Tags'], ['both', 'Both']].map(([k, l]) => `<button class="${A.gmode === k ? 'on' : ''}" data-ob-gmode="${k}">${l}</button>`).join('')}</span>
      <span class="set-sub">Colour by</span><span class="ob-seg">${[['folder', 'Folder'], ['tag', 'Tag']].map(([k, l]) => `<button class="${A.color === k ? 'on' : ''}" data-ob-color="${k}">${l}</button>`).join('')}</span>
      <input class="search" id="ob-gfind" placeholder="Find a note or tag" aria-label="Find in the graph" style="width:200px" value="${esc(A.gq || '')}"></div>
      <div class="ob-full"><div class="ob-gbox" id="ob-g-full"></div>${(() => { const gd = A.graph[`${vault}|${A.gmode}`]; return gd ? `<div class="ob-legend">${Object.entries(groupsOf(gd)).slice(0, 12).map(([k, c]) => `<span><i style="background:${c}"></i>${esc(k)}</span>`).join('')}</div>` : '' })()}</div>`
  if (ctx.activities) ctx.activities.add({
    id: 'vaults',
    label: 'Knowledge',
    icon: GEM(20),
    render() {
      A.base = 'obsidian:vaults'
      if (!data) { if (!error) load(); return '<div class="skeleton" style="padding:20px"><i></i><i></i></div>' }
      fresh()
      const vaults = data.vaults.filter((v) => v.confirmed || v.state === 'ready')
      if (!vaults.length) return `<div class="ob-empty"><span class="obs-icon">${GEM(22)}</span><h2 style="margin:0">No vault to browse yet</h2><p class="set-sub">Connect a vault you already have; once you confirm what Echo tells Claude about it, it opens here.</p><button class="btn primary" data-ob-settings>Connect a vault</button></div>`
      return browserHtml(vaults)
    },
    after() {
      if (!data) return
      A.base = 'obsidian:vaults'
      browserAfter(data.vaults.filter((v) => v.confirmed || v.state === 'ready'))
    },
  })
  function browserAfter(vaults) {
    if (!vaults.length) return
    {
      const r = route(), v = (vaults.find((x) => x.id === r.vault) || vaults[0] || {})
      const g = ctx.ui.graph
      const open = opened(v.id)
      const cur = A.tabs[v.id] === 'graph' ? 'graph' : r.path || A.tabs[v.id] || open[open.length - 1] || ''
      const n = cur && cur !== 'graph' ? A.notes[`${v.id}|${cur}`] : null
      if (n) {
        g.draw(document.getElementById('ob-g-local'), `obl:${v.id}|${cur}`, () => {
          const G = ctx.ui.newGraph()
          n.local.nodes.forEach((x, i) => G.addNode(x.id, { x: Math.cos(i * 2.4) * 50, y: Math.sin(i * 2.4) * 50, size: x.me ? 9 : 5, color: x.me ? '#9b78ff' : colorOf(x.folder || '-'), label: x.title, pinLabel: true }))
          for (const [a, b2] of n.local.edges) if (G.hasNode(a) && G.hasNode(b2) && !G.hasEdge(a, b2)) G.addEdge(a, b2, { size: 1, color: '#8a8a9566' })
          return G
        }, { click: (id) => { if (id !== cur) openNote(v.id, id) } })
        const ls = g.live && g.live.get('ob-g-local')
        if (ls && !A.zoomed.has(`obl:${v.id}|${cur}`)) { A.zoomed.add(`obl:${v.id}|${cur}`); ls.sigma.getCamera().setState({ ratio: 1.6 }) }
      }
      const gd = cur === 'graph' && A.graph[`${v.id}|${A.gmode}`]
      if (gd) {
        const key = `obg:${v.id}|${A.gmode}|${A.color}`
        // Each group its own colour, in order (a hash would give two folders one colour) — as the legend shows.
        const groups = groupsOf(gd)
        const st = g.draw(document.getElementById('ob-g-full'), key, () => {
          const G = ctx.ui.newGraph()
          const deg = {}
          for (const [a, b2] of gd.edges) { deg[a] = (deg[a] || 0) + 1; deg[b2] = (deg[b2] || 0) + 1 }
          gd.nodes.forEach((x, i) => {
            const grp = x.tag ? '#tags' : A.color === 'tag' ? (x.tags[0] ? '#' + x.tags[0] : '(no tag)') : x.folder
            const col = groups[grp]
            const d = deg[x.id] || 0
            if (!d && !x.tag && A.gmode !== 'tags') return // orphans hidden
            G.addNode(x.id, { x: Math.cos(i) * (100 + i % 50), y: Math.sin(i) * (100 + i % 50), size: x.tag ? 4 : 3 + Math.sqrt(d) * 1.6, color: col, label: x.title, pinLabel: d > 6, group: grp })
          })
          for (const [a, b2] of gd.edges) if (G.hasNode(a) && G.hasNode(b2) && a !== b2 && !G.hasEdge(a, b2)) G.addEdge(a, b2, { size: 0.6, color: '#8a8a9544' })
          return G
        }, { click: (id) => { if (!id.startsWith('#')) openNote(v.id, id) } })
        // A small vault isn't drawn as a few huge circles: the camera steps back once.
        if (st && st.graph && st.graph.order < 60 && !A.zoomed.has(key)) { A.zoomed.add(key); st.sigma.getCamera().setState({ ratio: 2.2 }) }

      }
    }
  }
  function browserHtml(vaults) {
      const r = route()
      const v = vaults.find((x) => x.id === r.vault) || vaults[0]
      const b = A.browse[v.id]
      if (!b) { fetchOnce(`b:${v.id}`, async () => { A.browse[v.id] = await ctx.call('browse', { id: v.id }) }); return failed(`b:${v.id}`) || '<div class="skeleton" style="padding:20px"><i></i><i></i><p class="set-sub">Reading the vault…</p></div>' }
      const open = opened(v.id)
      if (r.path && r.path !== 'graph' && !open.includes(r.path)) open.push(r.path)
      const cur = A.tabs[v.id] === 'graph' ? 'graph' : r.path || A.tabs[v.id] || open[open.length - 1] || ''
      const n = cur && cur !== 'graph' ? A.notes[`${v.id}|${cur}`] : null
      if (cur && cur !== 'graph' && !n) fetchOnce(`n:${v.id}|${cur}`, async () => { A.notes[`${v.id}|${cur}`] = await ctx.call('note', { id: v.id, path: cur }) })
      if (cur === 'graph' && !A.graph[`${v.id}|${A.gmode}`]) fetchOnce(`g:${v.id}|${A.gmode}`, async () => { A.graph[`${v.id}|${A.gmode}`] = await ctx.call('graph', { id: v.id, mode: A.gmode }) })
      const side = `<aside class="ob-side"><div class="ob-top">
          ${vaults.length > 1 ? `<select class="set-in" data-ob-switch aria-label="Vault">${vaults.map((x) => `<option value="${esc(x.id)}"${x.id === v.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : `<b style="font-size:14px">${esc(v.name)}</b>`}
          <input class="search" id="ob-q" placeholder="Search notes" value="${esc(A.q)}" aria-label="Search notes">
          <span class="ob-seg"><button class="${A.side === 'files' ? 'on' : ''}" data-ob-side="files">Files</button><button class="${A.side === 'tags' ? 'on' : ''}" data-ob-side="tags">Tags</button></span></div>
        <div class="ob-tree">${A.side === 'tags' && !A.tag ? b.tags.map((t) => `<button class="ob-fx" data-ob-tag="${esc(t.tag)}">#${esc(t.tag)}<span class="n">${t.n}</span></button>`).join('') || '<p class="set-sub" style="padding:8px">No tags.</p>' : treeHtml(b, v.id, cur)}</div></aside>`
      const tabs = `<div class="ob-tabs">${open.map((p) => { const nn = A.notes[`${v.id}|${p}`]; return `<button class="ob-tab${p === cur ? ' on' : ''}" data-ob-open="${esc(p)}" data-ob-vault="${esc(v.id)}" title="${esc(p)}"><span class="t">${esc(nn ? nn.title : p.split('/').pop().replace(/\.md$/, ''))}</span><span class="x" data-ob-close="${esc(p)}" title="Close">×</span></button>` }).join('')}<button class="ob-tab g${cur === 'graph' ? ' on' : ''}" data-ob-graph><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M7.3 11 16.7 6M7.3 13l9.4 5"/></svg>Graph</button></div>`
      const body = cur === 'graph' ? failed(`g:${v.id}|${A.gmode}`) + graphHtml(v.id) : `<div class="ob-body">${n ? noteHtml(n, v.id, v.root) : cur ? failed(`n:${v.id}|${cur}`) || '<div class="skeleton" style="padding:20px"><i></i><i></i></div>' : '<p class="set-sub" style="padding-top:24px">Pick a note on the left, or open the Graph.</p>'}</div>`
      return `<div class="ob">${side}<section class="ob-mid">${tabs}${body}</section><aside class="ob-right">${rightHtml(n, v.id)}</aside></div>`
  }
  ctx.listen('click', (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-ob-retry],[data-ob-open],[data-ob-close],[data-ob-graph],[data-ob-side],[data-ob-tag],[data-ob-fold],[data-ob-gmode],[data-ob-color],[data-ob-echo],[data-ob-settings],[data-ob-browse]')
    if (!t) return
    const d = t.dataset
    if (d.obRetry) { delete A.errors[d.obRetry]; return ctx.render() }
    if (d.obClose) { ev.stopPropagation(); const r = route(), o = opened(r.vault); A.opens[r.vault] = o.filter((p) => p !== d.obClose); const next = A.opens[r.vault][A.opens[r.vault].length - 1] || ''; A.tabs[r.vault] = next; return ctx.go(`${A.base}/${r.vault}${next ? '/' + encodeURIComponent(next) : ''}`) }
    if (d.obOpen) return openNote(d.obVault || route().vault, d.obOpen)
    if ('obGraph' in d) { A.tabs[route().vault || (data.vaults.find((x) => x.confirmed) || {}).id] = 'graph'; return ctx.render() }
    if (d.obSide) { A.side = d.obSide; A.tag = ''; return ctx.render() }
    if (d.obTag != null) { A.tag = d.obTag; A.side = 'files'; return ctx.render() }
    if (d.obFold) { A.folded.has(d.obFold) ? A.folded.delete(d.obFold) : A.folded.add(d.obFold); return ctx.render() }
    if (d.obGmode) { A.gmode = d.obGmode; return ctx.render() }
    if (d.obColor) { A.color = d.obColor; return ctx.render() }
    if (d.obEcho) return ctx.go(d.obEcho)
    if ('obSettings' in d) return ctx.go(`settings/${SECTION}`)
    if (d.obBrowse) return ctx.go(`obsidian:vaults/${d.obBrowse}`)
  })
  ctx.listen('change', (ev) => { if (ev.target.matches && ev.target.matches('[data-ob-switch]')) { A.tag = ''; const v = ev.target.value, t = A.tabs[v]; ctx.go(`${A.base}/${v}${t && t !== 'graph' ? '/' + encodeURIComponent(t) : ''}`) } })
  ctx.listen('input', (ev) => {
    if (ev.target.id === 'ob-q') { A.q = ev.target.value; ctx.render(); const el = document.getElementById('ob-q'); if (el) { el.focus(); el.setSelectionRange(A.q.length, A.q.length) } }
    if (ev.target.id === 'ob-gfind') { A.gq = ev.target.value; const r = route(); const st = ctx.ui.graph.live && ctx.ui.graph.live.get('ob-g-full'); if (st) ctx.ui.graph.find('ob-g-full', A.gq) ; void r }
  })

  ctx.settings.section({
    id: 'main',
    label: 'Knowledge',
    icon: GEM(16),
    badge: () => (data ? data.vaults.filter((v) => v.state === 'review' || v.state === 'failed' || v.state === 'empty').length || '' : ''),
    render() {
      if (!data) { if (!error) load(); return error ? `<p class="error">${esc(error)}</p><button class="btn" data-obs-reload>Try again</button>` : '<div class="skeleton" style="padding:20px"><i></i><i></i></div>' }
      fresh()
      if (!data.vaults.length) {
        return `<div class="obs-empty" style="padding-top:80px"><span class="obs-icon">${GEM(22)}</span><h2 style="margin:0">Your Knowledge vaults</h2>
          <p class="set-sub">Connect a folder of notes you already keep — an Obsidian vault, any folder of Markdown. Echo reads it and describes it for Claude — what it is, where things are, what Claude may do with it — you correct that, and Claude in Echo knows where to look. Your vault isn’t changed by Echo.</p>
          ${pendingHtml() || '<button class="btn primary" data-obs-add>+ Vault</button>'}${error ? `<p class="error">${esc(error)}</p>` : ''}</div>`
      }
      const v = data.vaults.find((x) => x.id === sel) || data.vaults[0]
      return `<div class="obs">${tabs()}${detail(v)}</div>`
    },
  })
  ctx.settings.add({ render: () => ctx.ui.setCard('', [
    ctx.ui.setRow('Vaults', `${data ? data.vaults.length : '…'} connected — set them up in their own section.`, '<button class="btn" data-obs-open>Open</button>'),
  ]) })
  ctx.palette.add({ label: 'Knowledge: vaults', keywords: 'knowledge obsidian vault notes', run: () => ctx.go(`settings/${SECTION}`) })
  ctx.palette.add({ label: 'Knowledge: connect a vault', keywords: 'knowledge obsidian vault add connect folder', run: () => { ctx.go(`settings/${SECTION}`); addVault() } })

  const cur = () => data && data.vaults.find((v) => v.id === sel)
  ctx.listen('click', async (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-obs-sel],[data-obs-add],[data-obs-edit],[data-obs-cancel],[data-obs-save],[data-obs-confirm],[data-obs-again],[data-obs-menu],[data-obs-remove],[data-obs-remove-yes],[data-obs-remove-cancel],[data-obs-rename],[data-obs-unbelong],[data-obs-proposed],[data-obs-open],[data-obs-pend-yes],[data-obs-pend-no],[data-obs-reload]')
    if (!t) { if (menu && here()) { menu = false; ctx.render() } return }
    const d = t.dataset
    if ('obsOpen' in d) return ctx.go(`settings/${SECTION}`)
    if ('obsReload' in d) { error = ''; data = null; ctx.render(); return load(true) }
    if ('obsPendYes' in d) return pending && addVault({ root: pending.root, anyway: true })
    if ('obsPendNo' in d) { const p = pending; pending = null; ctx.render(); if (p) ctx.call('unpick', { root: p.root }).catch(() => {}); return }
    if (d.obsSel) { notice = ''; sel = d.obsSel; editing = null; menu = false; removing = false; return ctx.render() }
    if ('obsAdd' in d) return addVault()
    if (d.obsEdit) { if (editing) return; const v = cur(); editing = d.obsEdit; draft = (v.description || {})[editing] || ''; ctx.render(); const ta = document.getElementById('obs-draft'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length) } return }
    if ('obsCancel' in d) { editing = null; return ctx.render() }
    if (d.obsSave) { const ta = document.getElementById('obs-draft'); const key = d.obsSave; editing = null; await op('save', { id: sel, key, text: ta ? ta.value : draft }); return }
    if ('obsConfirm' in d) return op('confirm', { id: sel })
    if ('obsAgain' in d) { menu = false; return op('analyse', { id: sel }) }
    if ('obsMenu' in d) { ev.stopPropagation(); menu = !menu; return ctx.render() }
    if ('obsRemove' in d) { menu = false; removing = true; return ctx.render() }
    if ('obsRemoveCancel' in d) { removing = false; return ctx.render() }
    if ('obsRemoveYes' in d) { removing = false; const id = sel; sel = null; return op('remove', { id }) }
    if ('obsRename' in d) {
      menu = false
      const v = cur()
      editing = null
      ctx.render()
      // Renamed in place (the window has no prompt dialog): Enter keeps it, Esc drops it.
      const el = document.querySelector('.obs-name')
      if (el) {
        el.contentEditable = 'true'; el.focus()
        const done = (keep) => { el.contentEditable = 'false'; const n = el.textContent.trim(); if (keep && n && n !== v.name) op('rename', { id: v.id, name: n }); else ctx.render() }
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); done(true) } if (e.key === 'Escape') done(false) })
        el.addEventListener('blur', () => done(true), { once: true })
      }
      return
    }
    if (d.obsUnbelong != null) { const v = cur(); const b = (v.belongs || []).filter((_, i) => i !== +d.obsUnbelong); return op('belongs', { id: v.id, belongs: b }) }
    if (d.obsProposed != null) return op('take_proposed', { id: sel, take: d.obsProposed === '1' })
  })
  ctx.listen('change', (ev) => {
    const t = ev.target
    if (t.matches && t.matches('[data-obs-belong]') && t.value) {
      const v = cur()
      const [kind, id] = t.value.split(':')
      op('belongs', { id: v.id, belongs: [...(v.belongs || []), { [kind]: id }] })
    }
  })
  ctx.listen('input', (ev) => {
    if (ev.target.id === 'obs-q') { q = ev.target.value; ctx.render(); const el = document.getElementById('obs-q'); if (el) { el.focus(); el.setSelectionRange(q.length, q.length) } }
    if (ev.target.id === 'obs-draft') { draft = ev.target.value; const c = ev.target.closest('.obs-edit') && ev.target.closest('.obs-edit').querySelector('.set-sub'); if (c && ev.target.dataset.obsKey === 'when') c.textContent = `${draft.length}/250 — the only line Claude sees until it opens the vault` }
  })
}
