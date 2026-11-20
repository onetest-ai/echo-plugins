// Retell - client half: a left-bar page, built as a listening app.
//   Listen   : continue where you stopped, what is being made, the next articles of the reading list.
//   Library  : a tree of topics (playlists) with their articles; search and filters; one clear state per row.
//   Player   : the original (left) and the retelling (right) side by side, the current words lit; a side panel with the
//              memo, the terms of the original, the fact check and the questions; one player bar. The sound goes on in a
//              small bar when you leave the article.
// Voice files live in the plugin's store and are served to the window from /plugin/retell/store/…
export function apply(ctx) {
  const ID = 'retell'
  const esc = (s) => ctx.ui.esc(String(s == null ? '' : s))
  const $ = (id) => document.getElementById(id)
  const S = {
    list: null, digests: [], topics: [], view: 'listen', open: null, filter: 'all', q: '', dlg: null, draft: '', menu: null, topen: {}, dall: {},
    dtab: null, vmode: 'both', health: null, error: '', starting: false, qa: null, selText: '', scroll: { left: 0, right: 0 }, sc: { listen: 0, library: 0 },
    flash: null, sleepAt: 0, sleepI: 0, lastRep: 0, hlSrc: null, scrollCur: false, timer: null, vtimer: null, ttimer: null, htimer: null,
    itemDlg: { d: '', n: 0 }, learn: null, lt: [], lpacks: [], lpoll: null, pr: { scope: '', n: 8, level: 'B2', quizzes: [], phrases: [], quiz: null, qi: 0, draft: '', note: '', mic: null, timer: null, focus: false, busy: false, rec: null, spoken: null, talks: [], talk: null, rv: null, rstate: null, tcorrect: 'gentle', tbrain: 'claude', twait: 'normal', tbusy: false }, tdlg: { id: '', name: '', parent: '' }, mdlg: { id: '', topic: '' }, addLen: 'normal', addLang: '', addPages: '', addSplit: 'all', hits: {}, hitsQ: '', searchT: null,
  }
  const P = { i: -1, want: false, waiting: false, rate: 1, audio: new Audio(), pendingT: 0 }
  const LABEL = { queued: 'Waiting for its turn…', fetching: 'Getting the article…', writing: 'Writing the retelling…', voicing: 'Making the voice…', ready: 'Ready', error: 'Needs attention' }
  const BUSY = ['queued', 'fetching', 'writing', 'voicing']
  const SLEEPS = [0, 15, 30, 45]
  const mb = (n) => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB')
  const size = (a) => (a.bytes || 0) + (a.audio_bytes || 0) + (a.timings_bytes || 0) + (a.img_bytes || 0) + (a.qa_bytes || 0) + (a.qa_audio_bytes || 0)
  const mmss = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') }
  const svg = (d, w = 18, fill) => `<svg viewBox="0 0 20 20" width="${w}" height="${w}" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="flex:none">${d}</svg>`
  const IC = {
    play: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="flex:none"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="flex:none"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    doc: svg('<path d="M5 3h7l3 3v11H5zM12 3v3h3M7.5 10h5M7.5 13h5"/>'), vid: svg('<rect x="3" y="5" width="14" height="10" rx="2"/><path d="M8.5 8v4l3.5-2z"/>'),
    folder: svg('<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H8l1.5 2h6A1.5 1.5 0 0 1 17 8.5v6a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z"/>'),
    dots: svg('<circle cx="5" cy="10" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="15" cy="10" r="1"/>'),
    prev: svg('<path d="M5 4v12M15 4l-8 6 8 6z"/>'), next: svg('<path d="M15 4v12M5 4l8 6-8 6z"/>'), plus: svg('<path d="M10 4v12M4 10h12"/>'), back: svg('<path d="M12 5 7 10l5 5"/>'),
    ask: svg('<path d="M4 5h12v8H9l-3 3v-3H4z"/>'),
  }

  // Echo's own look: a small chevron that turns, a ⋯ icon button, its menu.
  const CHEV = (open) => `<svg class="rt-chv${open ? ' open' : ''}" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`
  const DOTS = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>'
  const mi = (attrs, label, danger) => `<button class="menu-item${danger ? ' danger' : ''}" role="menuitem" ${attrs}>${label}</button>`
  const menuBtn = (id, items) => `<span class="rt-menu${S.menu === id ? ' open' : ''}"><button class="icon-btn" data-rt="menu" data-id="${esc(id)}" aria-haspopup="menu" aria-expanded="${S.menu === id}" aria-label="More">${DOTS}</button>${S.menu === id ? `<div class="menu" role="menu">${items}</div>` : ''}</span>`

  if (!$('rt-css')) {
    const st = document.createElement('style'); st.id = 'rt-css'
    st.textContent = `
      #rt-app{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--text)}
      #rt-app .btn{display:inline-flex;flex-direction:row;align-items:center;gap:6px;white-space:nowrap;height:auto;min-height:28px;line-height:1.2}
      .rt-top{display:flex;align-items:center;gap:4px;padding:10px 18px;border-bottom:1px solid var(--line);flex-wrap:wrap}
      .rt-brand{font-weight:650;font-size:15px;margin-right:10px}
      .rt-tab{border:0;background:none;padding:6px 11px;border-radius:var(--r-control);color:var(--text-2);font:inherit;font-weight:500;cursor:default}
      .rt-tab:hover{background:var(--line)}
      .rt-tab[aria-current="page"]{background:var(--accent-soft);color:var(--accent-ink)}
      .rt-sp{flex:1}
      .rt-health{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--text-2);padding:3px 10px;border:1px solid var(--line-strong);border-radius:999px}
      .rt-health i{width:8px;height:8px;border-radius:50%;background:var(--me);display:inline-block}.rt-health.down i{background:var(--danger)}.rt-health.none i{background:var(--text-3)}
      #rt-main{flex:1;min-height:0;position:relative}
      .rt-sc{height:100%;overflow-y:auto;box-sizing:border-box}
      .rt-wrap{max-width:920px;margin:0 auto;padding:18px 18px 36px;display:flex;flex-direction:column;gap:16px}
      .rt-card{border:1px solid var(--line);border-radius:var(--r-panel);padding:12px 16px;background:var(--surface)}
      .rt-h{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);margin:0 0 6px}
.rt-modes{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:14px}
.rt-mode{display:flex;flex-direction:column;gap:8px;border:1px solid var(--line);border-radius:var(--r-control);padding:12px 14px;background:color-mix(in srgb,var(--accent) 3%,transparent)}
.rt-mode>.btn{margin-top:auto;align-self:flex-start}
.rt-mt{font-weight:600;font-size:14px}
.rt-rv{display:flex;flex-direction:column;gap:8px}
.rt-lbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
.rt-litem{display:flex;flex-direction:column;gap:2px;padding-bottom:10px;border-bottom:1px solid var(--line)}
.rt-litem:last-child{border-bottom:0;padding-bottom:0}
.rt-vline code{font-size:12px}
.rt-wrap input[type=text]{height:auto!important;min-height:32px;padding:5px 10px!important;border-radius:var(--r-control);border:1px solid var(--line-strong);background:var(--surface);color:var(--text);font:inherit;box-sizing:border-box}
.rt-rv-ru{font-size:19px;font-weight:600;line-height:1.35}
.rt-rv-en{font-size:19px;font-weight:600;line-height:1.4;color:var(--accent-ink);margin-top:6px}
.rt-rv-fl{font-family:ui-monospace,Consolas,monospace;letter-spacing:.04em;color:var(--text-2)}
.rt-rv-miss{text-decoration:line-through;text-decoration-color:var(--danger);color:var(--danger)}
.rt-rv-grades{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.rt-rv-grades .btn{grid-area:auto!important;display:flex!important;flex-direction:column;align-items:center;gap:1px;height:auto!important;padding:6px 4px!important}
.rt-rv-grades .btn span{font-size:11px;opacity:.75;font-weight:400}
.rt-practise .set-sub{margin:0}
      .rt-chip{display:inline-flex;align-items:center;gap:5px;padding:1px 8px;border-radius:999px;font-size:11.5px;font-weight:500;background:var(--line);color:var(--text-2);white-space:nowrap}
      .rt-chip.ok{background:color-mix(in srgb,var(--me) 14%,transparent);color:var(--me)}.rt-chip.bad{background:color-mix(in srgb,var(--danger) 13%,transparent);color:var(--danger)}.rt-chip.acc{background:var(--accent-soft);color:var(--accent-ink)}
      .rt-bar{height:5px;border-radius:3px;background:var(--line-strong);overflow:hidden}.rt-bar>i{display:block;height:100%;background:var(--accent);border-radius:3px}
      .rt-bar.work>i{background:repeating-linear-gradient(45deg,var(--accent),var(--accent) 8px,color-mix(in srgb,var(--accent) 60%,transparent) 8px,color-mix(in srgb,var(--accent) 60%,transparent) 16px)}
      /* the tree: no lines, no frame; a chevron that turns, rows like Echo's thread list */
      .rt-tree{display:flex;flex-direction:column;gap:1px}
      .rt-ghead{display:flex;align-items:center;gap:8px;padding:5px 6px 5px 2px;border-radius:var(--r-control);cursor:default;margin-top:4px}
      .rt-ghead:hover{background:color-mix(in srgb,var(--text) 5%,transparent)}
      .rt-chev{flex:none;width:20px;height:22px;display:grid;place-items:center;color:var(--text-3);border-radius:5px}
      .rt-chv{transition:transform .12s ease}.rt-chv.open{transform:rotate(90deg)}
      .rt-ghead:hover .rt-chev{color:var(--text)}
      .rt-gname{flex:1;min-width:0;font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .rt-gn{flex:none;font-size:11.5px;color:var(--text-3);font-variant-numeric:tabular-nums}
      .rt-kids{padding-left:22px;display:flex;flex-direction:column;gap:1px}
      .rt-ic{flex:none;width:22px;height:22px;border-radius:22%;display:inline-flex;align-items:center;justify-content:center;background:var(--line);color:var(--text-2)}
      .rt-ic.dir{background:var(--accent-soft);color:var(--accent-ink)}
      .rt-ic svg{width:14px;height:14px}
      .rt-prow{display:flex;align-items:center;gap:9px;padding:6px 6px 6px 8px;border-radius:var(--r-control);cursor:default}
      .rt-prow:hover{background:color-mix(in srgb,var(--text) 5%,transparent)}
      .rt-pt{flex:1;min-width:0;display:flex;flex-direction:column}
      .rt-pt b{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .rt-pm{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:11.5px;color:var(--text-3)}
      .rt-pm .rt-bar{width:90px}
      .rt-prow .icon-btn,.rt-ghead .icon-btn{opacity:0}
      .rt-prow:hover .icon-btn,.rt-ghead:hover .icon-btn,.rt-prow .icon-btn:focus-visible,.rt-ghead .icon-btn:focus-visible,.rt-menu.open .icon-btn{opacity:1}
      .rt-menu{position:relative;flex:none}.rt-menu .menu{top:28px}
      .rt-play-big{width:54px;height:54px;border-radius:50%;border:0;background:var(--accent);color:#fff;display:grid;place-items:center;cursor:default;flex:none}
      .rt-play-big:hover{background:var(--accent-strong)}
      .rt-seg{display:inline-flex;border:1px solid var(--line-strong);border-radius:var(--r-control);overflow:hidden}
      .rt-seg button{border:0;background:transparent;padding:5px 10px;color:var(--text-2);font:inherit;cursor:default}.rt-seg button+button{border-left:1px solid var(--line-strong)}
      .rt-seg button:hover{background:var(--line)}
      .rt-seg button[aria-pressed="true"]{background:var(--accent-soft);color:var(--accent-ink);font-weight:600}
      /* player */
      .rt-player{display:flex;flex-direction:column;height:100%;min-height:0}
      .rt-phead{display:flex;gap:10px;align-items:center;padding:8px 18px;border-bottom:1px solid var(--line);flex-wrap:wrap}
      .rt-phead .rt-ttl{font-weight:650;flex:1;min-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .rt-pbody{flex:1;display:flex;min-height:0;position:relative}
      .rt-cols{flex:1;display:flex;min-width:0;min-height:0}
      .rt-pane{flex:1;min-width:0;overflow-y:auto;padding:0 24px 30px}
      .rt-pane+.rt-pane{border-left:1px solid var(--line)}
      .rt-pane>.rt-h{padding:12px 0 6px;margin:0 0 6px}
      @media(min-width:861px){.rt-pane>.rt-h{position:sticky;top:0;background:var(--surface);z-index:1}}
      .rt-cols.only-r #rt-left,.rt-cols.only-o #rt-right{display:none}
      .rt-drawer{width:360px;flex:none;border-left:1px solid var(--line);display:flex;flex-direction:column;min-height:0;background:var(--surface)}
      .rt-dbody{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px}
      .rt-dtabs{display:flex;border-bottom:1px solid var(--line)}
      .rt-dtabs button{flex:1;border:0;background:transparent;padding:10px 4px;color:var(--text-2);border-bottom:2px solid transparent;cursor:default;font:inherit;font-weight:500}
      .rt-dtabs button:hover{color:var(--text)}
      .rt-dtabs button[aria-selected="true"]{color:var(--accent-ink);border-bottom-color:var(--accent)}
      .rt-bottom{border-top:1px solid var(--line);padding:8px 18px 10px;display:flex;flex-direction:column;gap:6px}
      #rt-track{position:relative;height:18px;display:flex;align-items:center;cursor:default}
      #rt-track .rl{position:absolute;left:0;right:0;height:5px;border-radius:3px;background:var(--line-strong)}
      #rt-fill{position:absolute;left:0;height:5px;border-radius:3px;background:var(--accent);width:0}
      #rt-knob{position:absolute;width:13px;height:13px;border-radius:50%;background:var(--accent);margin-left:-6px;left:0;box-shadow:0 0 0 3px var(--accent-soft)}
      #rt-track .ch{position:absolute;top:3px;width:2px;height:12px;background:var(--surface);border-radius:1px}
      .rt-ctl{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
      .rt-ctl .tm{font-variant-numeric:tabular-nums;color:var(--text-2);min-width:92px}
      .rt-ctl .chn{flex:1;min-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-3);font-size:12.5px}
      .rt-pp{width:40px;height:40px;border-radius:50%;border:0;background:var(--accent);color:#fff;display:grid;place-items:center;cursor:default}
      .rt-pp:hover{background:var(--accent-strong)}
      .rt-mini{display:flex;align-items:center;gap:12px;padding:8px 18px;border-top:1px solid var(--line);background:var(--surface)}
      .rt-mini .inf{flex:1;min-width:0;cursor:default}.rt-mini .inf b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
      .rt-pb{margin:0 -8px 8px;padding:6px 8px;border-radius:8px;cursor:default;line-height:1.6}
      .rt-orig{margin:0 -6px 10px;padding:2px 6px;border-radius:6px;transition:background .3s;line-height:1.6}
      .rt-on{background:color-mix(in srgb,var(--warn) 40%,transparent)!important}.rt-cur{background:var(--accent-soft)!important}
      .rt-w.rt-now{background:var(--warn);color:#1d2330;border-radius:4px}
      .rt-term{background:color-mix(in srgb,var(--accent) 20%,transparent);border-radius:3px;padding:0 2px;cursor:default}.rt-term.rt-flash{outline:2px solid var(--accent)}
      .rt-tcard{display:flex;gap:10px;align-items:baseline;padding:8px 10px;border:1px solid var(--line-strong);border-radius:var(--r-panel);cursor:default}.rt-tcard:hover{border-color:var(--accent)}
      .rt-ans{border:1px solid var(--line);border-radius:var(--r-panel);padding:8px 12px}
      .rt-ov{position:absolute;border:2px solid var(--warn);border-radius:6px;box-shadow:0 0 0 9999px rgba(0,0,0,.5);pointer-events:none;z-index:2}.rt-ov span{position:absolute;left:0;top:100%;margin-top:6px;background:var(--warn);color:#fff;font-size:13px;padding:2px 8px;border-radius:5px;white-space:nowrap}
      .rt-dlg{position:absolute;inset:0;background:rgba(10,8,25,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:20;overflow:auto}
      .rt-box{background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--r-panel);box-shadow:var(--shadow);width:min(540px,100%);max-height:100%;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:12px}
      .rt-box textarea,.rt-box select,.rt-box input[type=text]{width:100%;padding:6px 10px!important;border-radius:var(--r-control);border:1px solid var(--line-strong);font:inherit;line-height:1.35;background:var(--surface);color:var(--text);box-sizing:border-box}
      .rt-box select,.rt-box input[type=text]{height:auto!important;min-height:34px}
      .rt-box>*{flex-shrink:0}
      .rt-foot{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
      @media(max-width:860px){.rt-drawer{position:absolute;right:0;top:0;bottom:0;z-index:6;width:min(360px,92%);box-shadow:var(--shadow)}.rt-cols{flex-direction:column}.rt-pane+.rt-pane{border-left:0;border-top:1px solid var(--line)}}`
    document.head.appendChild(st)
  }

  // ── data ──
  const refreshAll = async () => {
    try { S.list = await ctx.call('list', {}) } catch (e) { S.error = e.message || String(e) }
    try { S.digests = await ctx.call('digests', {}) } catch (e) { /* no reading list yet */ }
    try { S.topics = await ctx.call('topics', {}) } catch (e) { /* none yet */ }
  }
  const load = async () => { await refreshAll(); await refreshHealth(); ctx.render() }
  const act = async (command, args) => {
    S.error = ''
    try { const r = await ctx.call(command, args || {}); await load(); return r } catch (e) { S.error = e.message || String(e); ctx.render() }
  }
  const refreshHealth = async () => { try { S.health = await ctx.call('health', {}) } catch (e) { /* later */ } }
  const paintHealth = () => {
    const el = $('rt-health'); if (!el) return
    const h = S.health || {}
    el.className = 'rt-health' + (!h.configured ? ' none' : h.ok === false ? ' down' : '')
    el.lastChild.textContent = !h.configured ? 'Voice server: not set' : h.ok === false ? (h.error ? 'Voice server: ' + h.error : 'Voice server not answering') : h.ok ? 'Voice server online' : 'Voice server: checking…'
    el.title = 'Settings → Retell voice'
  }
  // While something is being made, look again every 2 s (not while the user is typing in the search box).
  const busy = () => S.list && S.list.articles.some((a) => BUSY.includes(a.status) || a.voice_status === 'making')
  const poll = () => {
    if (busy() && !S.timer) S.timer = setInterval(async () => {
      const f = document.activeElement
      if (!(f && (f.id === 'rt-q2' || f.id === 'rt-add'))) { await refreshAll(); if (S.view !== 'player') ctx.render() }
      if (!busy()) { clearInterval(S.timer); S.timer = null }
    }, 2000)
    if (!S.htimer) { S.htimer = setInterval(async () => { await refreshHealth(); paintHealth() }, 30000); setTimeout(async () => { await refreshHealth(); paintHealth() }, 4000) }
  }

  // ── statuses in plain words ──
  const etaOf = (a) => {
    if (a.status !== 'voicing' || !a.voice_t0 || !(a.voice_done > 0)) return ''
    const left = Math.max(0, (a.voice_total - a.voice_done) * (Date.now() - a.voice_t0) / a.voice_done / 1000)
    return left < 45 ? 'less than a minute left' : `about ${Math.round(left / 60)} min left`
  }
  const humanError = (e) => String(e || '').replace(/^Stopped \(what is done is kept\)$/, 'Stopped. What was made is kept.')
  const stateOf = (a) => {
    if (a.status === 'queued') return { chip: a.queue_pos > 1 ? `Waiting · ${a.queue_pos}${a.queue_pos === 2 ? 'nd' : a.queue_pos === 3 ? 'rd' : 'th'} in the queue` : 'Waiting · next', tone: '' }
    if (a.status === 'voicing') {
      const tot = a.voice_total || 0, dn = a.voice_done || 0
      return { chip: `Voice ${dn} of ${tot || '?'}${etaOf(a) ? ' · ' + etaOf(a) : ''}`, tone: 'acc', bar: tot ? dn / tot : 0, note: a.voice_note || '' }
    }
    if (BUSY.includes(a.status)) return { chip: a.status === 'writing' && a.stage ? a.stage : LABEL[a.status], tone: 'acc', work: true }
    if (a.status === 'error') return { chip: a.has_script ? 'Needs attention' : 'Failed', tone: 'bad', note: humanError(a.error) }
    if (a.listened >= 0.9) return { chip: '✓ Listened', tone: 'ok' }
    if (a.listened > 0) return { bar: a.listened, label: `${Math.round(a.listened * 100)}%` }
    return { chip: 'New', tone: 'acc' }
  }
  const stateHtml = (a) => {
    const st = stateOf(a)
    return `${st.chip ? `<span class="rt-chip ${st.tone || ''}">${esc(st.chip)}</span>` : ''}${st.bar !== undefined ? `<div class="rt-bar ${st.work ? 'work' : ''}"><i style="width:${Math.round(st.bar * 100)}%"></i></div>${st.label ? `<span class="set-sub">${esc(st.label)}</span>` : ''}` : ''}${st.work ? '<div class="rt-bar work"><i style="width:100%"></i></div>' : ''}${st.note ? `<span class="set-sub">${esc(st.note)}</span>` : ''}`
  }
  const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch (e) { return '' } }

  // ── the player ──
  const blocks = () => (S.open && S.open.script ? S.open.script.blocks : [])
  const T = () => (S.open && S.open.timings) || {}
  // A block's length: kept with the article (the window measured it once), else a guess from its text (~14 characters a second).
  const lenOf = (b) => ((T()[b.id] || {}).duration || b.text.length / 14)
  const dur = (i) => lenOf(blocks()[i])
  const avail = () => (S.open.entry.voice_status === 'ready' ? blocks().length : S.open.entry.voice_done || 0)
  const total = () => blocks().reduce((s, b) => s + lenOf(b), 0)
  const before = (i) => blocks().slice(0, i).reduce((s, b) => s + lenOf(b), 0)
  // The time of each word. Kept timings (articles voiced before) as they are; else the words are spread over the block's
  // length by their length, with a breath after a comma and a longer one after a sentence (the standard speech call gives
  // no word times, so the highlight follows the voice closely, not exactly).
  const estCache = {}
  const wordTimes = (i) => {
    const b = blocks()[i]; if (!b) return []
    const kept = (T()[b.id] || {}).words; if (kept && kept.length) return kept
    const d = (P.i === i && Number.isFinite(P.audio.duration) && P.audio.duration > 0) ? P.audio.duration : lenOf(b)
    const key = b.id + '|' + d.toFixed(2); if (estCache.key === key) return estCache.t
    const ws = wordsOf(b), wt = ws.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1 + (/[.!?…]["»”)]*$/.test(w) ? 7 : /[,;:—–]["»”)]*$/.test(w) ? 3 : 0))
    const sum = wt.reduce((s, x) => s + x, 0) || 1, lead = Math.min(0.2, d * 0.03), span = Math.max(0.1, d - lead * 2)
    let at = lead; const t = ws.map((w, k) => { const s = at; at += wt[k] / sum * span; return { word: w, start: s, end: at } })
    estCache.key = key; estCache.t = t; return t
  }
  // The window measures each voiced block once (the file's own length) and the plugin keeps it with the article.
  const measuring = { on: false, done: new Set() }
  const measureVoices = async () => {
    if (measuring.on || !S.open) return
    measuring.on = true
    try {
      const art = S.open.entry.id, a = new Audio(); a.preload = 'metadata'
      for (let i = 0; i < avail(); i++) {
        if (!S.open || S.open.entry.id !== art) break
        const b = blocks()[i], k = art + '/' + b.id; if ((T()[b.id] || {}).duration || measuring.done.has(k)) continue
        measuring.done.add(k)
        const d = await new Promise((res) => { const fin = (v) => { a.onloadedmetadata = a.onerror = null; res(v) }; a.onloadedmetadata = () => fin(a.duration); a.onerror = () => fin(0); setTimeout(() => fin(0), 8000); a.src = `/plugin/${ID}/store/articles/${art}/audio/${b.id}.mp3` })
        if (Number.isFinite(d) && d > 0 && S.open && S.open.entry.id === art) { const tm = S.open.timings || (S.open.timings = {}); if (tm[b.id]) tm[b.id].duration = d; else tm[b.id] = { duration: d }; ctx.call('voice_length', { id: art, b: b.id, duration: d }).catch(() => {}) }
      }
      a.src = ''
      paintCtl()
    } finally { measuring.on = false }
  }
  const curSecs = () => (P.i >= 0 ? before(P.i) + (P.audio.currentTime || 0) : 0)
  const blockEl = (i) => document.querySelector(`#rt-right [data-i="${i}"]`)
  const wordsOf = (b) => b.words || (b.words = b.text.split(/\s+/).filter(Boolean))
  // Chapters: the memo's top items, each at the first block that tells that part of the article.
  const chapters = () => {
    if (!S.open || !S.open.outline || !S.open.source) return []
    const order = {}; S.open.source.elements.forEach((e, n) => { order[e.id] = n })
    const out = []
    for (const it of S.open.outline.items || []) {
      if (!it.anchor || !(it.anchor in order)) continue
      const b = blocks().findIndex((x) => (order[x.anchor] ?? -1) >= order[it.anchor])
      if (b >= 0 && !out.some((c) => c.b === b)) out.push({ title: it.title, b })
    }
    return out.sort((x, y) => x.b - y.b)
  }
  const chapterAt = (b) => { let c = null; for (const ch of chapters()) if (b >= ch.b) c = ch; return c }

  // Where the listener is, sent to the plugin now and then and when playback stops (so "Continue" finds the place).
  const reportProgress = (force, done) => {
    if (!S.open || P.i < 0 || !total()) return
    if (!force && Date.now() - S.lastRep < 15000) return
    S.lastRep = Date.now()
    const f = done ? 1 : Math.min(1, curSecs() / total()), e = S.open.entry
    e.listened = Math.max(e.listened || 0, f); e.pos = { b: done ? 0 : P.i, t: done ? 0 : P.audio.currentTime || 0, f }
    ctx.call('progress', { id: e.id, frac: f, b: e.pos.b, t: e.pos.t }).catch(() => {})
  }
  const playIcon = () => (P.want && !P.waiting ? IC.pause : IC.play)
  const paintCtl = () => {
    const playing = P.want && !P.waiting
    for (const id of ['rt-play', 'rt-mplay']) { const el = $(id); if (el) { el.innerHTML = P.waiting ? '⏳' : playing ? IC.pause : IC.play; el.title = P.waiting ? 'Waiting for the voice…' : playing ? 'Pause' : 'Play' } }
    if (!S.open || !blocks().length) return
    const tot = total(), pos = curSecs(), pct = tot ? Math.min(100, pos / tot * 100) : 0
    const fill = $('rt-fill'); if (fill) fill.style.width = pct + '%'
    const knob = $('rt-knob'); if (knob) knob.style.left = pct + '%'
    const tm = $('rt-time'); if (tm) tm.textContent = `${mmss(pos)} / ${mmss(tot)}${S.open.entry.voice_status === 'ready' ? '' : '+'}`
    const ch = $('rt-chn'); if (ch) { const c = chapterAt(Math.max(0, P.i)); ch.textContent = c ? `Chapter: ${c.title}` : '' }
    const mb2 = $('rt-mbar'); if (mb2) mb2.style.width = pct + '%'
    const mt = $('rt-mtime'); if (mt) mt.textContent = `${mmss(pos)} / ${mmss(tot)}`
  }
  const paintCur = (scroll) => {
    document.querySelectorAll('#rt-right .rt-cur').forEach((e) => e.classList.remove('rt-cur'))
    document.querySelectorAll('#rt-left .rt-on').forEach((e) => e.classList.remove('rt-on'))
    document.querySelectorAll('#rt-right .rt-w.rt-now').forEach((e) => e.classList.remove('rt-now'))
    if (scroll) { clearOv(); S.hlSrc = null }
    if (P.i < 0) return
    const be = blockEl(P.i); if (be) { be.classList.add('rt-cur'); if (scroll) be.scrollIntoView({ block: 'center', behavior: 'smooth' }) }
    const b = blocks()[P.i]
    const src = b && b.anchor && document.querySelector(`#rt-left [data-src="${b.anchor}"]`)
    if (src) { src.classList.add('rt-on'); if (scroll) src.scrollIntoView({ block: 'center', behavior: 'smooth' }) }
  }
  const clearOv = () => document.querySelectorAll('#rt-left .rt-ov').forEach((o) => o.remove())
  const paintOv = (k) => {
    const b = blocks()[P.i], hs = (b && b.highlights) || []
    let cur = -1; hs.forEach((h, n) => { if (k >= (h.at_word || 0)) cur = n })
    const have = document.querySelector('#rt-left .rt-ov')
    if (cur < 0) { if (have) clearOv(); return }
    if (have && have.dataset.n === `${P.i}:${cur}`) return
    clearOv()
    const h = hs[cur], fig = document.querySelector(`#rt-left [data-src="${h.image}"]`); if (!fig) return
    const [x, y, w, hh] = h.bbox
    const o = document.createElement('div'); o.className = 'rt-ov'; o.dataset.n = `${P.i}:${cur}`
    Object.assign(o.style, { left: x * 100 + '%', top: y * 100 + '%', width: w * 100 + '%', height: hh * 100 + '%' })
    if (h.label) {
      const sp = document.createElement('span'); sp.textContent = h.label
      if (y + hh > 0.78) { sp.style.top = 'auto'; sp.style.bottom = '100%'; sp.style.margin = '0 0 6px' }
      if (x > 0.7) { sp.style.left = 'auto'; sp.style.right = '0' }
      o.appendChild(sp)
    }
    fig.appendChild(o)
  }
  const paintWord = () => {
    if (P.i < 0 || !S.open || S.view !== 'player') return
    const b = blocks()[P.i], t = wordTimes(P.i), el = blockEl(P.i)
    if (!el || !t.length) return
    const n = wordsOf(b).length, at = P.audio.currentTime
    let j = t.findIndex((w) => at >= w.start && at < w.end)
    if (j < 0 && at >= t[t.length - 1].end) j = t.length - 1
    const k = j < 0 ? -1 : Math.min(n - 1, Math.floor(j * n / t.length))
    el.querySelectorAll('.rt-w').forEach((s, m) => s.classList.toggle('rt-now', m === k))
    P.k = k
    paintOv(k)
  }
  const paintVoice = () => {
    const st = $('rt-vstat'), btn = $('rt-vbtn'); if (!st || !btn || !S.open) return
    const e = S.open.entry
    if (e.voice_status === 'making') { st.textContent = `Voice ${e.voice_done || 0} of ${e.voice_total || blocks().length}${etaOf({ ...e, status: 'voicing' }) ? ' · ' + etaOf({ ...e, status: 'voicing' }) : ''}`; btn.style.display = ''; btn.textContent = 'Stop'; btn.dataset.rt = 'vstop'; btn.dataset.id = e.id }
    else if (e.voice_status === 'ready') { st.textContent = ''; btn.style.display = 'none' }
    else { st.textContent = e.voice_status === 'error' ? humanError(e.voice_error) || 'The voice stopped' : 'No voice yet'; btn.style.display = ''; btn.textContent = e.voice_done > 0 ? `Continue from block ${e.voice_done + 1}` : 'Make the voice'; btn.dataset.rt = 'voice' }
  }

  // Start a block (at `off` seconds). `want`: keep playing (or stay paused, positioned, as when an article is opened).
  const playBlock = (i, off = 0) => {
    const bl = blocks()
    if (i >= bl.length) { P.want = false; P.waiting = false; P.audio.pause(); P.i = bl.length - 1; reportProgress(true, true); paintCtl(); return }
    P.i = Math.max(0, i); paintCur(true)
    if (P.i >= avail()) { P.waiting = true; P.audio.pause(); paintCtl(); return }   // continues when its voice is made
    P.waiting = false
    const src = `/plugin/${ID}/store/articles/${S.open.entry.id}/audio/${bl[P.i].id}.mp3`
    P.audio.playbackRate = P.rate
    if (P.audio.src.endsWith(src) && P.audio.readyState >= 1) P.audio.currentTime = off
    else { P.pendingT = off; P.audio.src = src }
    if (P.want) P.audio.play().catch((e) => { S.error = 'The window could not play the voice: ' + e; P.want = false; paintCtl() })
    paintCtl()
  }
  P.audio.addEventListener('loadedmetadata', () => {
    if (P.pendingT > 0) { try { P.audio.currentTime = P.pendingT } catch (e) { /* not seekable yet */ } } P.pendingT = 0
    // the block now playing has its true length: keep it (once) for the timeline and the highlight
    const b = S.open && P.i >= 0 && blocks()[P.i], d = P.audio.duration
    if (b && Number.isFinite(d) && d > 0 && !(T()[b.id] || {}).duration) {
      const tm = S.open.timings || (S.open.timings = {}); tm[b.id] = { ...(tm[b.id] || {}), duration: d }
      ctx.call('voice_length', { id: S.open.entry.id, b: b.id, duration: d }).catch(() => {})
    }
  })
  P.audio.addEventListener('ended', () => { if (P.want) playBlock(P.i + 1) })
  P.audio.addEventListener('timeupdate', () => {
    paintWord(); paintCtl()
    if (P.want) reportProgress(false)
    if (S.sleepAt && Date.now() > S.sleepAt) { S.sleepAt = 0; S.sleepI = 0; P.want = false; P.audio.pause(); reportProgress(true); paintCtl(); const sl = $('rt-sleep'); if (sl) sl.textContent = 'Sleep: off' }
  })
  const seekSecs = (t) => {
    t = Math.max(0, Math.min(total(), t)); let acc = 0, i = 0
    for (; i < blocks().length - 1; i++) { const d = dur(i); if (t < acc + d) break; acc += d }
    if (i >= avail()) { i = Math.max(0, avail() - 1); playBlock(i, 0); return }
    playBlock(i, Math.max(0, t - acc))
  }
  const stopPlayer = () => { reportProgress(true); P.want = false; P.waiting = false; P.audio.pause(); P.i = -1; if (S.vtimer) { clearInterval(S.vtimer); S.vtimer = null } }
  const togglePlay = () => {
    if (!S.open || !blocks().length) return
    if (P.want) { P.want = false; P.waiting = false; P.audio.pause(); reportProgress(true); paintCtl(); return }
    P.want = true
    if (P.i < 0 || (P.audio.ended && P.i >= blocks().length - 1)) playBlock(0)
    else if (!P.audio.src) playBlock(P.i)
    else { P.audio.play().catch(() => {}); paintCtl() }
    paintCtl()
  }

  // The voice is being made: look again every 3 s, repaint only what changed (the panes keep their scroll).
  const watchVoice = () => {
    if (S.vtimer || !S.open) return
    S.vtimer = setInterval(async () => {
      if (!S.open) { clearInterval(S.vtimer); S.vtimer = null; return }
      try {
        const l = await ctx.call('list', {}); const e = l.articles.find((a) => a.id === S.open.entry.id)
        if (!e) return
        const grew = (e.voice_done || 0) !== (S.open.entry.voice_done || 0) || e.voice_status !== S.open.entry.voice_status
        const keepPos = S.open.entry.pos, keepL = S.open.entry.listened
        S.open.entry = e; if (keepPos) S.open.entry.pos = keepPos; if (keepL > (e.listened || 0)) S.open.entry.listened = keepL
        if (grew) { S.open.timings = await ctx.call('timings', { id: e.id }); paintVoice(); paintCtl(); if (P.waiting && P.i < avail()) playBlock(P.i) }
        else paintVoice()
        if (e.voice_status !== 'making') { clearInterval(S.vtimer); S.vtimer = null }
      } catch (err) { /* the next tick tries again */ }
    }, 3000)
  }

  // Open an article: paused at the place the listener stopped (or at the start); `play` goes on from there.
  const openArticle = async (id, play) => {
    try {
      if (!(S.open && S.open.entry.id === id)) {
        stopPlayer(); stopQa()
        S.open = await ctx.call('get', { id }); S.qa = qaFresh(S.open.qa); S.scroll = { left: 0, right: 0 }; S.dtab = null; S.hlSrc = null
        S.error = ''
        const pos = S.open.entry.pos, ok = pos && pos.f < 0.97 && pos.b < blocks().length
        P.want = false; P.i = -1; P.audio.removeAttribute('src')
        S.view = 'player'; S.scrollCur = true
        ctx.render()
        if (blocks().length) playBlock(ok ? pos.b : 0, ok ? pos.t : 0)
      } else { S.view = 'player'; S.scrollCur = true; ctx.render() }
      if (play) { P.want = true; if (P.i < 0) playBlock(0); else { P.audio.play().catch(() => {}) } paintCtl() }
    } catch (e) { S.error = e.message || String(e); ctx.render() }
  }

  // ── terms: the original's wording and how the retelling says it ──
  const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const termList = () => ((S.open && S.open.terms && S.open.terms.terms) || [])
  const termMarker = () => {
    const ts = termList(); if (!ts.length) return { orig: (x) => esc(x), tell: (ws) => ws.map(() => -1) }
    const parts = ts.map((t, k) => ({ k, en: t.en })).sort((a, b) => b.en.length - a.en.length)
    const re = new RegExp('(?<![\\p{L}\\p{N}])(' + parts.map((p) => escRe(p.en)).join('|') + ')(?![\\p{L}\\p{N}])', 'giu')
    const norm = (w) => w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    const forms = []; ts.forEach((t, k) => (t.forms || []).forEach((f) => { const ws = f.split(/\s+/).map(norm).filter(Boolean); if (ws.length) forms.push({ k, ws }) }))
    forms.sort((a, b) => b.ws.length - a.ws.length)
    return {
      orig: (text) => {
        let out = '', last = 0
        for (const m of text.matchAll(re)) { const k = ts.findIndex((t) => t.en.toLowerCase() === m[0].toLowerCase()); out += esc(text.slice(last, m.index)) + (k >= 0 ? `<span class="rt-term" data-t="${k}">${esc(m[0])}</span>` : esc(m[0])); last = m.index + m[0].length }
        return out + esc(text.slice(last))
      },
      tell: (ws) => {
        const nw = ws.map(norm), mark = ws.map(() => -1)
        for (const f of forms) for (let i = 0; i + f.ws.length <= nw.length; i++) {
          if (f.ws.every((w, j) => nw[i + j] === w && mark[i + j] < 0)) for (let j = 0; j < f.ws.length; j++) mark[i + j] = f.k
        }
        return mark
      },
    }
  }
  const flashTerm = (k) => {
    S.flash = { k, until: Date.now() + 2600 }; paintFlash()
    const o = document.querySelector(`#rt-left .rt-term[data-t="${k}"]`); if (o) o.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
  const paintFlash = () => {
    document.querySelectorAll('.rt-flash').forEach((e) => e.classList.remove('rt-flash'))
    if (S.flash && Date.now() < S.flash.until) {
      document.querySelectorAll(`.rt-term[data-t="${S.flash.k}"]`).forEach((e) => e.classList.add('rt-flash'))
      setTimeout(() => { document.querySelectorAll('.rt-flash').forEach((e) => e.classList.remove('rt-flash')) }, Math.max(0, S.flash.until - Date.now()))
    }
  }
  const watchTerms = () => {
    if (S.ttimer || !S.open) return
    S.ttimer = setInterval(async () => {
      if (!S.open) { clearInterval(S.ttimer); S.ttimer = null; return }
      try { S.open.terms = await ctx.call('terms', { id: S.open.entry.id }) } catch (e) { /* later */ }
      if (!S.open.terms || S.open.terms.status !== 'working') { clearInterval(S.ttimer); S.ttimer = null; ctx.render() }
    }, 2000)
  }

  // ── questions ──
  // "Ask" pauses the story and notes where it was (the block, the sentence, a selected text); the answer comes as text,
  // kept apart as "from the article" and "beyond it", and is voiced only when asked for. "Back to the story" goes on from
  // the start of the sentence that was interrupted.
  const A = new Audio()   // the voice of an answer; the story's own player stays paused meanwhile
  const qaFresh = (items) => ({ items: items || [], draft: '', web: false, useCtx: true, ctx: null, sel: '', resume: null, focus: false, playing: null, timer: null })
  S.qa = qaFresh()
  const sentBounds = (i, k) => {
    const ws = wordsOf(blocks()[i]); let a = Math.max(0, Math.min(k, ws.length - 1)), z = a
    const end = (w) => /[.!?…]["»”)]*$/.test(w)
    while (a > 0 && !end(ws[a - 1])) a--
    while (z < ws.length - 1 && !end(ws[z])) z++
    return [a, z]
  }
  const sentText = (i, k) => { const [a, z] = sentBounds(i, k < 0 ? 0 : k); return wordsOf(blocks()[i]).slice(a, z + 1).join(' ') }
  const sentTime = (i, k) => {
    const b = blocks()[i], t = wordTimes(i); if (!t.length) return 0
    const [a] = sentBounds(i, k < 0 ? 0 : k)
    return (t[Math.min(t.length - 1, Math.floor(a * t.length / wordsOf(b).length))] || { start: 0 }).start
  }
  const srcLabel = (id) => {
    const e = ((S.open.source && S.open.source.elements) || []).find((x) => x.id === id)
    return !e ? id : e.tag === 'img' ? '[picture]' : e.text.slice(0, 30) + (e.text.length > 30 ? '…' : '')
  }
  const stopQa = () => { if (S.qa && S.qa.timer) clearInterval(S.qa.timer); A.pause() }
  const qaItemsHtml = () => [...S.qa.items].reverse().map((x) => {
    const head = `<div style="display:flex;gap:8px;align-items:center"><b style="flex:1">${esc(x.q)}${x.web ? ' <span class="set-sub">· web</span>' : ''}</b><button class="btn" data-rt="qdel" data-q="${esc(x.id)}" title="Delete this question">✕</button></div>`
    const wrap = (inner) => `<div class="rt-ans">${head}${inner}</div>`
    if (x.status === 'working') return wrap(`<div class="set-sub" style="margin-top:4px">${esc(x.stage || 'Thinking…')}</div>`)
    if (x.status === 'error') return wrap(`<p class="error" style="margin:4px 0 0">${esc(x.error)}</p>`)
    const lab = (t) => `<div class="set-sub" style="font-size:11px;letter-spacing:.06em;margin-top:8px">${t}</div>`
    const from = x.from ? `${lab('FROM THE ARTICLE')}<div>${esc(x.from.text)}</div><div style="margin-top:3px">${(x.from.anchors || []).map((a) => `<span class="rt-chip acc" data-rt="qsrc" data-anchor="${esc(a)}" style="cursor:pointer;margin:0 6px 4px 0">${esc(srcLabel(a))}</span>`).join('')}</div>` : ''
    const bey = x.beyond ? `${lab('BEYOND THE ARTICLE · ' + (x.web && x.beyond.checked ? 'CHECKED ON PAGES ECHO OPENED' : x.web ? 'GENERAL KNOWLEDGE · NO PAGE COULD CONFIRM IT' : 'GENERAL KNOWLEDGE'))}<div>${esc(x.beyond.text)}</div>${(x.beyond.sources || []).length ? `<div class="set-sub" style="margin-top:3px;word-break:break-all">${x.beyond.sources.map(esc).join('<br>')}</div>` : ''}` : ''
    const voice = x.audio === 'ready' ? `<button class="btn" data-rt="qplay" data-q="${esc(x.id)}">${S.qa.playing === x.id ? 'Pause' : 'Listen'}</button>`
      : x.audio === 'making' ? '<span class="set-sub">Making the voice…</span>'
      : `<button class="btn" data-rt="qvoice" data-q="${esc(x.id)}">Voice</button>${x.audio === 'error' ? ` <span class="error">${esc(x.audio_error)}</span>` : ''}`
    return wrap(`${from}${bey}<div style="margin-top:8px">${voice}</div>`)
  }).join('') || '<div class="set-sub">No questions yet. The story pauses while you ask.</div>'
  const askHtml = () => {
    const q = S.qa, notes = []
    if (q.ctx) notes.push(`Where you are: ${esc(q.ctx.label)} — “${esc(q.ctx.text)}”`)
    if (q.sel) notes.push(`Selected: “${esc(q.sel.slice(0, 160))}”`)
    return `${q.resume ? '<button class="btn primary" data-rt="qresume">Back to the story</button>' : ''}
      ${notes.length ? `<div class="set-sub">${notes.map((n) => `<div>${n}</div>`).join('')}<label><input type="checkbox" id="rt-ctx" ${q.useCtx ? 'checked' : ''}> use this as the context of the question</label></div>` : ''}
      <div style="display:flex;gap:8px;align-items:center"><input id="rt-q" class="search" placeholder="Your question…" value="${esc(q.draft)}" style="flex:1;min-width:0"><button class="btn primary" data-rt="send">Ask</button></div>
      <label class="set-sub"><input type="checkbox" id="rt-web" ${q.web ? 'checked' : ''}> search the web for the part beyond the article</label>
      <div id="rt-qa-items" style="display:flex;flex-direction:column;gap:8px">${qaItemsHtml()}</div>`
  }
  const paintQa = () => { const el = $('rt-qa-items'); if (el) el.innerHTML = qaItemsHtml() }
  const watchQa = () => {
    if (S.qa.timer || !S.open) return
    S.qa.timer = setInterval(async () => {
      if (!S.open) { clearInterval(S.qa.timer); S.qa.timer = null; return }
      try { S.qa.items = await ctx.call('qa', { id: S.open.entry.id }); paintQa() } catch (e) { /* the next tick tries again */ }
      if (!S.qa.items.some((x) => x.status === 'working' || x.audio === 'making')) { clearInterval(S.qa.timer); S.qa.timer = null }
    }, 2000)
  }
  const openAsk = () => {
    if (S.dtab === 'ask' && !P.want) { S.dtab = null; ctx.render(); return }
    S.qa.resume = P.i >= 0 ? { i: P.i, t: sentTime(P.i, P.k === undefined ? 0 : P.k) } : null
    P.want = false; P.waiting = false; P.audio.pause(); reportProgress(true); paintCtl()
    S.qa.ctx = P.i >= 0 ? { block: blocks()[P.i].id, label: `block ${P.i + 1}`, text: sentText(P.i, P.k === undefined ? 0 : P.k) } : null
    S.qa.sel = S.selText || ''; S.qa.useCtx = true; S.dtab = 'ask'; S.qa.focus = true
    ctx.render()
  }
  const resumeStory = () => {
    const r = S.qa.resume; A.pause(); S.qa.playing = null
    if (r) { P.want = true; playBlock(r.i, r.t) }
    ctx.render()
  }
  const sendQ = async () => {
    const q = (S.qa.draft || '').trim(); if (!q) return
    const c = S.qa.useCtx ? S.qa.ctx : null
    try {
      await ctx.call('ask', { id: S.open.entry.id, q, block: c ? c.block : '', text: c ? c.text : '', selection: S.qa.useCtx ? S.qa.sel : '', web: S.qa.web })
      S.qa.draft = ''; const inp = $('rt-q'); if (inp) inp.value = ''
      S.error = ''; S.qa.items = await ctx.call('qa', { id: S.open.entry.id }); paintQa(); watchQa()
    } catch (e) { S.error = e.message || String(e); ctx.render() }
  }
  const playAnswer = (qid) => {
    if (S.qa.playing === qid) { A.pause(); S.qa.playing = null } else {
      P.want = false; P.audio.pause(); paintCtl()
      A.src = `/plugin/${ID}/store/articles/${S.open.entry.id}/qa/${qid}.mp3`
      A.play().catch((e) => { S.error = 'The window could not play the answer: ' + e; ctx.render() }); S.qa.playing = qid
    }
    paintQa()
  }
  A.addEventListener('ended', () => { if (S.qa) { S.qa.playing = null; paintQa() } })

  // ── the side panel: memo, terms, facts, ask ──
  const memoHtml = () => {
    const o = S.open.outline
    if (!o || !Array.isArray(o.items) || !o.items.length) return '<div class="set-sub">No memo for this article.</div>'
    const chs = chapters()
    const item = (it) => { const ch = chs.find((c) => c.title === it.title); return `<div style="margin:0 0 10px"><div data-rt="mi" data-anchor="${esc(it.anchor || '')}" ${ch ? `data-b="${ch.b}"` : ''} style="font-weight:600;${it.anchor ? 'cursor:pointer' : ''}"><span class="set-sub" style="margin-right:6px">${esc(it.num)}.</span>${esc(it.title)}</div>${(it.points || []).length ? `<ul style="margin:3px 0 0;padding-left:22px">${it.points.map((q) => `<li style="margin:1px 0;font-size:14px">${esc(q)}</li>`).join('')}</ul>` : ''}${(it.children || []).length ? `<div style="margin:8px 0 0 14px;padding-left:10px;border-left:2px solid var(--line,#ddd)">${it.children.map(item).join('')}</div>` : ''}</div>` }
    return `<div class="set-sub">Click a title to jump to that place. The chapters are marks on the progress bar.</div>${o.items.map(item).join('')}`
  }
  const termsHtml = () => {
    const tt = S.open.terms, ts = termList()
    if (tt && tt.status === 'working') return '<div class="set-sub">Collecting the terms…</div>'
    if (!ts.length) return `<div class="set-sub">${tt && tt.status === 'error' ? 'The terms could not be collected: ' + esc(tt.error) : 'No terms list for this article yet.'}</div><div><button class="btn primary" data-rt="termsbuild">Build the terms list</button></div>`
    return `<div class="set-sub">Terms of the original and how the retelling says them. Click one to see it in both columns.</div>${ts.map((t, k) => `<div class="rt-tcard" data-rt="tcard" data-k="${k}" tabindex="0"><b>${esc(t.en)}</b><span class="set-sub">${esc(t.ru)}</span></div>`).join('')}<div><button class="btn" data-rt="termsbuild">Build again</button></div>`
  }
  const factsHtml = () => {
    const fc = S.open.factcheck
    if (!fc) return '<div class="set-sub">The facts of this article were not checked.</div>'
    const ix = {}; blocks().forEach((b, i) => { ix[b.id] = i })
    const fixed = fc.issues.filter((x) => x.applied).length
    const rows = fc.issues.map((x) => {
      const isBlock = x.where in ix, label = isBlock ? `Block ${ix[x.where] + 1}` : x.where.startsWith('outline:') ? `Memo ${x.where.slice(8).replace(/#(\d+)$/, ' · point $1')}` : 'A block removed'
      return `<div class="rt-ans"><div><b data-rt="${isBlock ? 'fjump' : 'dt'}" data-d="memo" data-i="${isBlock ? ix[x.where] : ''}" style="cursor:pointer">${esc(label)}</b> <span class="rt-chip ${x.severity === 'error' ? 'bad' : ''}">${esc(x.severity)}${x.type ? ' · ' + esc(x.type) : ''}</span> <span class="set-sub">${x.applied ? 'corrected' : 'not changed'}</span></div>
        <div style="margin-top:3px">“${esc(x.claim)}”</div><div class="set-sub" style="margin-top:3px">The article: ${esc(x.evidence)}</div>
        ${x.removed ? '<div style="margin-top:3px"><span class="set-sub">Removed: it could not be made true to the article.</span></div>' : (x.after || x.fix) ? `<div style="margin-top:3px"><span class="set-sub">${x.applied ? 'Now:' : 'Suggested:'}</span> ${esc(x.applied && x.after ? x.after : x.fix)}</div>` : ''}</div>`
    }).join('')
    return `<div class="rt-card"><b>${fc.checked} claims checked · ${fc.issues.length} issue${fc.issues.length === 1 ? '' : 's'} · ${fixed} corrected</b><div class="set-sub">${esc(fc.mode === 'fix' ? 'Mode: correct automatically' : fc.mode === 'report' ? 'Mode: report only' : fc.mode)}</div></div>${rows || '<div class="set-sub">Every claim of the retelling and the memo is supported by the article.</div>'}<div><button class="btn" data-rt="recheck">Check again</button></div>`
  }
  const drawerHtml = () => {
    const tabs = [['memo', 'Memo'], ['terms', 'Terms'], ['facts', 'Facts'], ['ask', 'Ask']]
    const body = S.dtab === 'memo' ? memoHtml() : S.dtab === 'terms' ? termsHtml() : S.dtab === 'facts' ? factsHtml() : askHtml()
    return `<aside class="rt-drawer"><div class="rt-dtabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-rt="dt" data-d="${k}" aria-selected="${S.dtab === k}">${l}${k === 'facts' && S.open.factcheck && S.open.factcheck.issues.length ? ` <span class="rt-chip">${S.open.factcheck.issues.length}</span>` : ''}</button>`).join('')}</div><div class="rt-dbody" id="rt-dbody">${body}</div></aside>`
  }

  // ── views ──
  const topBar = () => `<header class="rt-top"><div class="rt-brand">Retell</div>
    <button class="rt-tab" data-rt="nav" data-v="listen" aria-current="${S.view === 'listen' ? 'page' : 'false'}">Listen</button>
    <button class="rt-tab" data-rt="nav" data-v="library" aria-current="${S.view === 'library' || S.view === 'player' ? 'page' : 'false'}">Library</button>
    <button class="rt-tab" data-rt="nav" data-v="practice" aria-current="${S.view === 'practice' ? 'page' : 'false'}">Practice</button>
    <span class="rt-sp"></span><span class="rt-health" id="rt-health"><i></i><span>Voice server: checking…</span></span>
    <button class="btn primary" data-rt="add" style="display:inline-flex;gap:6px;align-items:center">${IC.plus}Add</button></header>`

  const artsOf = () => (S.list ? [...S.list.articles] : [])
  const openable = (a) => a.status === 'ready' || (a.status === 'error' && a.has_script)
  const lastPlayed = () => { const r = artsOf().filter((a) => a.status === 'ready' && a.played).sort((x, y) => String(y.played).localeCompare(String(x.played))); return r[0] || null }

  const listenHtml = () => {
    const arts = artsOf(), cur = lastPlayed() || arts.filter((a) => a.status === 'ready').sort((x, y) => String(y.created).localeCompare(String(x.created)))[0]
    const active = arts.filter((a) => ['fetching', 'writing', 'voicing'].includes(a.status)), waiting = arts.filter((a) => a.status === 'queued').sort((x, y) => (x.queue_pos || 0) - (y.queue_pos || 0))
    const working = [...active, ...waiting], workNow = active.find((a) => a.status !== 'voicing') || active[0] || waiting[0]
    let cont = ''
    if (cur) {
      const pos = cur.pos && cur.pos.f < 0.97 ? cur.pos : null, f = pos ? pos.f : (cur.listened >= 0.97 ? 1 : 0)
      cont = `<div class="rt-card" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><button class="rt-play-big" data-rt="cont" data-id="${esc(cur.id)}" title="${pos ? 'Continue' : 'Listen'}">${IC.play}</button>
        <div style="flex:1;min-width:220px"><div class="rt-h" style="margin:0">${pos ? 'Continue listening' : cur.listened >= 0.97 ? 'Listen again' : 'Start listening'}</div>
        <div style="font-size:20px;font-weight:600;line-height:1.25;margin:2px 0">${esc(cur.title)}</div>
        <div class="set-sub">${pos ? `${Math.round(f * 100)}% listened` : cur.listened >= 0.97 ? 'Listened to the end' : 'Not started'}</div>
        ${pos ? `<div class="rt-bar" style="margin-top:8px"><i style="width:${Math.round(f * 100)}%"></i></div>` : ''}</div>
        ${pos ? `<button class="btn" data-rt="restart" data-id="${esc(cur.id)}">Start over</button>` : ''}</div>`
    } else if (!working.length) {
      cont = `<div class="rt-card"><div style="font-size:18px;font-weight:600">Nothing to listen to yet</div><div class="set-sub" style="margin:4px 0 10px">Add a link or paste a text: Claude retells it and reads it aloud, and the original stays next to it.</div><button class="btn primary" data-rt="add">Add an article</button></div>`
    }
    const making = workNow ? `<div class="rt-card" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="rt-chip acc">Making now</span><div style="flex:1;min-width:200px"><b style="font-weight:500">${esc(workNow.title)}</b><div class="set-sub">${esc(stateOf(workNow).chip)}${stateOf(workNow).note ? ' — ' + esc(stateOf(workNow).note) : ''}</div></div>${workNow.status === 'voicing' ? `<div class="rt-bar" style="width:200px"><i style="width:${Math.round(stateOf(workNow).bar * 100)}%"></i></div><button class="btn" data-rt="vstop" data-id="${esc(workNow.id)}">Stop</button>` : '<div class="rt-bar work" style="width:200px"><i style="width:100%"></i></div>'}${waiting.length - (workNow && workNow.status === 'queued' ? 1 : 0) > 0 ? `<span class="rt-chip" title="${esc(waiting.map((w) => w.title).join(' · '))}">${waiting.length - (workNow && workNow.status === 'queued' ? 1 : 0)} waiting</span>` : ''}</div>` : ''
    const d = S.digests[0]
    const rl = d ? `<div><div class="rt-h">Reading list · ${esc(d.title)}</div><div class="rt-card">${digestItems(d, S.dall[d.id] ? 99 : 4)}${d.items.length > 4 && !S.dall[d.id] ? `<div class="rt-prow"><button class="btn" data-rt="dmore" data-d="${esc(d.id)}">Show all ${d.items.length}</button> <span class="set-sub">The whole list, with the other lists, is in the Library.</span></div>` : ''}</div></div>` : ''
    const L = S.list || { articles: [], total: 0 }
    const cap = L.max_mb ? L.max_mb * 1024 * 1024 : 0
    const store = `<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap" class="set-sub"><span>Storage</span><div class="rt-bar" style="width:160px"><i style="width:${cap ? Math.min(100, Math.round((L.total || 0) / cap * 100)) : 0}%"></i></div><span>${mb(L.total || 0)}${cap ? ' of ' + L.max_mb + ' MB' : ''} · the oldest unpinned articles are removed first (Settings → Plugins → Retell)</span></div>`
    return `<div class="rt-sc" id="rt-sc"><div class="rt-wrap">${S.error ? `<p class="error" style="margin:0">${esc(S.error)}</p>` : ''}${cont}${making}${rl}${store}</div></div>`
  }

  // Items of a reading list (a topic made from a digest): what happened to each, one button at a time.
  const itemRow = (d, it) => {
    const a = it.article, can = it.type !== 'video' && /^https?:\/\//i.test(it.url)
    let act = ''
    if (a && a.status === 'ready') act = `${a.listened >= 0.9 ? '<span class="rt-chip ok">✓ Listened</span>' : a.listened > 0 ? `<span class="rt-chip">${Math.round(a.listened * 100)}%</span>` : ''}<button class="btn" data-rt="open" data-id="${esc(a.id)}">${a.listened > 0 && a.listened < 0.9 ? 'Continue' : 'Listen'}</button>`
    else if (a && BUSY.includes(a.status)) act = `<span class="rt-chip acc">${esc(LABEL[a.status])}</span>`
    else if (a && a.status === 'error') act = '<span class="rt-chip bad">Needs attention</span>'
    else if (it.skipped) act = `<span class="set-sub">skipped</span> <button class="btn" data-rt="dskip" data-d="${esc(d.id)}" data-n="${it.n}" data-on="0">Undo</button>`
    else if (can) act = `<button class="btn primary" data-rt="dstart" data-d="${esc(d.id)}" data-n="${it.n}" ${S.starting ? 'disabled' : ''}>Retell</button><button class="btn" data-rt="dskip" data-d="${esc(d.id)}" data-n="${it.n}" data-on="1">Skip</button>`
    else act = `<span class="set-sub">${it.type === 'video' ? 'a video: open the link yourself' : 'no link'}</span>`
    return `<div class="rt-prow" style="${it.skipped ? 'opacity:.55' : ''}"><span class="rt-ic">${it.type === 'video' ? IC.vid : IC.doc}</span><span class="rt-pt"><b>${esc(it.title)}</b><span class="rt-pm">${esc([it.source, it.type, it.minutes ? it.minutes + ' min' : '', it.note].filter(Boolean).join(' · '))}</span>${it.why ? `<span class="rt-pm" style="white-space:normal">${esc(it.why)}</span>` : ''}${!can && it.url ? `<span class="rt-pm" style="user-select:all;word-break:break-all">${esc(it.url)}</span>` : ''}</span><div style="display:flex;gap:6px;align-items:center;flex:none">${act}</div></div>`
  }
  const digestItems = (d, max) => d.items.slice(0, max).map((it) => itemRow(d, it)).join('')

  // The library: a tree of topics. A topic holds sub-topics, the articles filed in it, and (a reading list) the items not made yet.
  const treeModel = () => {
    const arts = artsOf(), topics = S.topics || [], byId = {}
    topics.forEach((t) => { byId[t.id] = { ...t, kids: [], arts: [], pending: [], digest: null } })
    S.digests.forEach((d) => { const n = byId['d:' + d.id]; if (n) n.digest = d })
    const own = {}   // article id -> topic id by a digest item
    S.digests.forEach((d) => d.items.forEach((it) => { if (it.article) own[it.article.id] = 'd:' + d.id }))
    const unsorted = []
    arts.forEach((a) => { const tid = a.topic && byId[a.topic] ? a.topic : own[a.id] && byId[own[a.id]] ? own[a.id] : ''; if (tid) byId[tid].arts.push(a); else unsorted.push(a) })
    S.digests.forEach((d) => { const n = byId['d:' + d.id]; if (n) n.pending = d.items.filter((it) => !it.article) })
    // Parts of one document go in their order; the rest newest first (the list comes sorted so).
    Object.values(byId).forEach((n) => n.arts.sort((x, y) => (x.part && y.part && x.part.doc === y.part.doc ? x.part.k - y.part.k : 0)))
    const roots = []
    topics.forEach((t) => { const n = byId[t.id]; if (t.parent && byId[t.parent]) byId[t.parent].kids.push(n); else roots.push(n) })
    const sortT = (l) => { l.sort((a, b) => String(a.name).localeCompare(String(b.name))); l.forEach((n) => sortT(n.kids)) }
    sortT(roots)
    return { roots, unsorted, byId }
  }
  const matchArt = (a) => {
    const q = S.q.trim().toLowerCase()
    if (q && !(String(a.title).toLowerCase().includes(q) || hostOf(a.url).includes(q) || String(a.file || '').toLowerCase().includes(q) || (S.hitsQ === S.q.trim() && a.id in S.hits))) return false
    if (S.filter === 'progress') return a.status === 'ready' && a.listened > 0 && a.listened < 0.9
    if (S.filter === 'new') return a.status === 'ready' && !(a.listened > 0)
    if (S.filter === 'pin') return !!a.pinned
    return true
  }
  const matchItem = (it) => { const q = S.q.trim().toLowerCase(); return S.filter === 'all' && (!q || it.title.toLowerCase().includes(q)) }
  const subtreeCount = (n) => { let all = n.arts.length + n.pending.filter((i) => i.type !== 'video').length, done = n.arts.filter((a) => a.listened >= 0.9).length; n.kids.forEach((k) => { const c = subtreeCount(k); all += c[0]; done += c[1] }); return [all, done] }
  const visible = (n) => n.arts.some(matchArt) || n.pending.some(matchItem) || n.kids.some(visible) || (S.filter === 'all' && !S.q.trim())
  const artRow = (a) => {
    const oa = openable(a)
    const items = [a.status === 'ready' ? mi(`data-rt="pin" data-id="${esc(a.id)}" data-on="${a.pinned ? '0' : '1'}"`, a.pinned ? 'Unpin' : 'Pin (never removed)') : '', mi(`data-rt="mvdlg" data-id="${esc(a.id)}"`, 'Move to a topic…'),
      a.has_script && a.status === 'ready' ? mi(`data-rt="recheck2" data-id="${esc(a.id)}"`, 'Check the facts again') : '', BUSY.includes(a.status) && a.status !== 'queued' ? '' : mi(`data-rt="del" data-id="${esc(a.id)}"`, a.status === 'queued' ? 'Remove from the queue' : 'Delete', true)].join('')
    let btn = ''
    if (a.status === 'ready') btn = `<button class="btn" data-rt="open" data-id="${esc(a.id)}">${a.listened > 0 && a.listened < 0.9 ? 'Continue' : 'Listen'}</button>`
    else if (a.status === 'queued') btn = `<button class="btn" data-rt="del" data-id="${esc(a.id)}">Remove</button>`
    else if (a.status === 'voicing') btn = `<button class="btn" data-rt="vstop" data-id="${esc(a.id)}">Stop</button>`
    else if (a.status === 'error' && a.has_script) btn = `<button class="btn primary" data-rt="vhome" data-id="${esc(a.id)}">${a.voice_done > 0 ? 'Continue from block ' + (a.voice_done + 1) : 'Make the voice'}</button>`
    return `<div class="rt-prow" ${oa ? `data-rt="open" data-id="${esc(a.id)}"` : ''}><span class="rt-ic">${IC.doc}</span><span class="rt-pt"><b>${a.pinned ? '<span class="rt-chip" style="margin-right:6px">Pinned</span>' : ''}${esc(a.title)}</b><span class="rt-pm"><span>${esc(a.file ? 'file · ' + a.file : hostOf(a.url) || (a.url ? '' : 'pasted text'))}</span>${stateHtml(a)}</span>${S.q.trim() && S.hitsQ === S.q.trim() && S.hits[a.id] ? `<span class="rt-pm" style="white-space:normal">${esc(S.hits[a.id])}</span>` : ''}</span>${btn}${menuBtn('a:' + a.id, items)}</div>`
  }
  const head = (open, id, icon, name, count, menu) => `<div class="rt-ghead" role="button" tabindex="0" data-rt="ttoggle" data-id="${esc(id)}" aria-expanded="${open}"><span class="rt-chev">${CHEV(open)}</span><span class="rt-ic dir">${icon}</span><b class="rt-gname">${esc(name)}</b><span class="rt-gn" title="listened">${count}</span>${menu}</div>`
  const topicNode = (n, depth) => {
    if (!visible(n)) return ''
    const searching = !!S.q.trim() || S.filter !== 'all'
    const open = searching ? true : S.topen[n.id] !== false
    const [all, done] = subtreeCount(n)
    const items = [mi(`data-rt="topicdlg" data-new="1" data-parent="${esc(n.id)}"`, 'New sub-topic…'), mi(`data-rt="topicdlg" data-id="${esc(n.id)}"`, n.kind === 'digest' ? 'Move in the tree…' : 'Rename or move…'),
      n.kind === 'digest' ? mi(`data-rt="ddel" data-d="${esc(n.id.slice(2))}"`, 'Remove this reading list', true) : mi(`data-rt="topicdel" data-id="${esc(n.id)}"`, 'Delete the topic (articles stay)', true)].join('')
    const empty = !n.kids.length && !n.arts.length && !n.pending.length
    const kids = open ? `<div class="rt-kids">${n.kids.map((k) => topicNode(k, depth + 1)).join('')}${n.arts.filter(matchArt).map(artRow).join('')}${n.digest ? n.pending.filter(matchItem).map((it) => itemRow(n.digest, it)).join('') : ''}${empty ? '<div class="set-sub" style="padding:6px 8px">Empty. Move articles here from their ⋯ menu.</div>' : ''}</div>` : ''
    return `<div>${head(open, n.id, IC.folder, n.name, `${done} of ${all}`, menuBtn('t:' + n.id, items))}${kids}</div>`
  }
  const libRows = () => {
    const m = treeModel(), un = m.unsorted.filter(matchArt).sort((a, b) => (BUSY.includes(b.status) ? 1 : 0) - (BUSY.includes(a.status) ? 1 : 0) || String(b.created).localeCompare(String(a.created)))
    const tree = m.roots.map((n) => topicNode(n, 0)).join('')
    const unOpen = S.topen.__un !== false
    const unHtml = un.length ? `<div>${head(unOpen, '__un', IC.folder, 'Not in a topic', String(un.length), '')}${unOpen ? `<div class="rt-kids">${un.map(artRow).join('')}</div>` : ''}</div>` : ''
    return tree + unHtml || '<div class="set-sub" style="padding:16px 4px">Nothing matches. Clear the search or choose another filter.</div>'
  }

  // ── reading lists: Claude names pages, Echo opens and checks them, Claude picks; refined in words, kept in Library ──
  const LF0 = () => ({ topic: '', topic_id: '', purpose: '', size: 'normal', videos: false, fresh: false })
  const learnRefresh = async () => {
    try { S.lt = await ctx.call('ltopics', {}) } catch (e) { /* none yet */ }
    try { S.lpacks = await ctx.call('lpacks', {}) } catch (e) { /* none yet */ }
    if (S.learn) {
      try { S.learn.sug = await ctx.call('ltopics_suggest_state', {}) } catch (e) { /* none */ }
      if (S.learn.draft) { try { S.learn.draft = await ctx.call('lpack_get', { id: S.learn.draft.id }) } catch (e) { S.learn.draft = null } }
    }
  }
  const learnBusy = () => S.lpacks.some((g) => g.status === 'making') || (S.learn && ((S.learn.sug && S.learn.sug.status === 'making') || (S.learn.draft && S.learn.draft.status === 'making')))
  const learnPoll = () => {
    if (S.lpoll || !learnBusy()) return
    S.lpoll = setInterval(async () => {
      await learnRefresh()
      const f = document.activeElement
      if (S.view === 'library' && !(f && /^rt-l/.test(f.id || ''))) ctx.render()
      if (!learnBusy()) { clearInterval(S.lpoll); S.lpoll = null; if (S.view === 'library') { await refreshAll(); ctx.render() } }
    }, 4000)
  }
  const ago = (iso) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : Math.round(m / 60) + ' h ago' }
  const learnBar = () => {
    const prop = S.lt.filter((x) => x.status === 'proposed').length, making = S.lpacks.filter((g) => g.status === 'making').length, ready = S.lpacks.filter((g) => g.status === 'ready').length
    return `<div class="rt-card rt-lbar"><div style="flex:1;min-width:220px"><b>📚 Reading lists</b><div class="set-sub">${making ? `${making} being made (Claude names pages, Echo opens and checks them; a few minutes)… ` : ''}${ready ? `${ready} draft${ready === 1 ? '' : 's'} to look at. ` : ''}New lists are made here and kept in Library.</div></div>
      <button class="btn primary" data-rt="lopen" data-lt="new">New reading list</button><button class="btn" data-rt="lopen" data-lt="topics">Topics to learn${prop ? ` · ${prop} to decide` : ''}</button></div>`
  }
  const LST = { proposed: ['acc', 'to decide'], approved: ['ok', 'approved'], done: ['', 'done'], rejected: ['bad', 'rejected'] }
  const learnTopicsHtml = () => {
    const L_ = S.learn, sug = L_.sug || {}, row = (x) => {
      const st = LST[x.status] || ['', x.status]
      const acts = x.status === 'proposed' ? `<button class="btn primary" data-rt="ltset" data-id="${esc(x.id)}" data-s="approved">Approve</button><button class="btn" data-rt="ltset" data-id="${esc(x.id)}" data-s="rejected">No</button>`
        : x.status === 'approved' ? `<button class="btn primary" data-rt="ltmake" data-id="${esc(x.id)}">Make a list</button>`
        : x.status === 'rejected' ? `<button class="btn" data-rt="ltset" data-id="${esc(x.id)}" data-s="proposed">Undo</button>` : `<button class="btn" data-rt="ltmake" data-id="${esc(x.id)}">Another list</button>`
      return `<div class="rt-prow"><span class="rt-pt"><b style="white-space:normal">${esc(x.topic)}</b><span class="rt-pm"><span class="rt-chip ${st[0]}">${st[1]}</span><span>${esc(x.source || '')}</span>${x.why ? `<span style="white-space:normal">${esc(x.why)}</span>` : ''}${x.note ? `<span style="white-space:normal">${esc(x.note)}</span>` : ''}</span></span>${acts}<button class="icon-btn" data-rt="ltdel" data-id="${esc(x.id)}" title="Remove from the queue" aria-label="Remove" style="opacity:1">×</button></div>`
    }
    const grp = (st, title) => { const xs = S.lt.filter((x) => x.status === st); return xs.length ? `<div><div class="rt-h">${title} · ${xs.length}</div><div class="rt-tree">${xs.map(row).join('')}</div></div>` : '' }
    return `<div class="rt-card" style="display:flex;flex-direction:column;gap:8px"><div class="rt-h">Add a topic</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="rt-ltnew" type="text" placeholder="A topic you want to learn, e.g. evaluating AI agents in production" value="${esc(L_.newTopic || '')}" style="flex:1;min-width:220px"><button class="btn primary" data-rt="ltadd">Add</button></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn" data-rt="lsuggest" ${sug.status === 'making' ? 'disabled' : ''}>${sug.status === 'making' ? 'Thinking of topics…' : '💡 Suggest topics'}</button><span class="set-sub">${sug.status === 'error' ? esc(sug.error) : sug.status === 'done' ? `${sug.added} new suggestion${sug.added === 1 ? '' : 's'} below, under “To decide”.` : 'From your questions while listening, what you finished or dropped, and your talks.'}</span></div></div>
      ${grp('proposed', 'To decide')}${grp('approved', 'Approved')}${grp('done', 'Done')}${grp('rejected', 'Rejected')}
      ${S.lt.length ? '' : '<div class="set-sub">No topics yet: add one, or ask for suggestions.</div>'}`
  }
  const opt2 = (v, label, on) => `<option value="${esc(v)}" ${on ? 'selected' : ''}>${esc(label)}</option>`
  const learnNewHtml = () => {
    const F = S.learn.form, appr = S.lt.filter((x) => x.status === 'approved')
    const drafts = S.lpacks.length ? `<div><div class="rt-h">Drafts</div><div class="rt-tree">${S.lpacks.map((g) => `<div class="rt-prow"><span class="rt-pt"><b style="white-space:normal">${esc(g.title || g.topic)}</b><span class="rt-pm">${g.status === 'making' ? `<span class="rt-chip acc">${g.asks ? 'Changing it…' : 'Searching and checking links…'}</span><span>started ${ago(g.created)} · takes a few minutes</span>` : g.status === 'error' ? `<span class="rt-chip bad">Failed</span><span style="white-space:normal">${esc(g.error)}</span>` : `<span class="rt-chip ok">Ready</span><span>${g.n} items${g.asks ? ` · changed ${g.asks}×` : ''}</span>${g.error ? `<span style="white-space:normal">${esc(g.error)}</span>` : ''}`}</span></span>${g.status === 'ready' ? `<button class="btn primary" data-rt="lpopen" data-id="${esc(g.id)}">Look</button>` : ''}${g.status !== 'making' ? `<button class="icon-btn" data-rt="lpdel" data-id="${esc(g.id)}" title="Discard" aria-label="Discard" style="opacity:1">×</button>` : ''}</div>`).join('')}</div></div>` : ''
    return `<div class="rt-card" style="display:flex;flex-direction:column;gap:10px"><div class="rt-h">New reading list</div>
      <div><label class="set-sub" for="rt-ltopic">Topic</label><input id="rt-ltopic" type="text" value="${esc(F.topic)}" placeholder="What do you want to learn?" style="width:100%"></div>
      ${appr.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="set-sub">Approved topics:</span>${appr.map((x) => `<button class="rt-chip acc" data-rt="ltpick" data-id="${esc(x.id)}" style="cursor:default;border:0">${esc(x.topic)}</button>`).join('')}</div>` : ''}
      <div><label class="set-sub" for="rt-lpurpose">What for (optional)</label><input id="rt-lpurpose" type="text" value="${esc(F.purpose)}" placeholder="e.g. for the Gartner slides; a practical task; to explain it to the team" style="width:100%"></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:150px"><label class="set-sub" for="rt-lsize">Size</label><select id="rt-lsize" style="width:100%">${opt2('normal', '5–7 items', F.size === 'normal')}${opt2('short', '3–5 items', F.size === 'short')}</select></div>
        <div style="flex:1;min-width:150px"><label class="set-sub" for="rt-lvid">Videos</label><select id="rt-lvid" style="width:100%">${opt2('0', 'Text only (to listen in Retell)', !F.videos)}${opt2('1', 'Text + 1–2 videos', F.videos)}</select></div>
        <div style="flex:1;min-width:150px"><label class="set-sub" for="rt-lfresh">How recent</label><select id="rt-lfresh" style="width:100%">${opt2('0', 'Recent preferred, classics too', !F.fresh)}${opt2('1', 'Only the last 12–18 months', F.fresh)}</select></div></div>
      <div class="set-sub">Claude searches the web, opens every link to check it, avoids what you already read, and says what to skip. Takes a few minutes; you can leave this page.</div>
      <div><button class="btn primary" data-rt="lmake">Make the list</button></div></div>${drafts}`
  }
  const learnDraftHtml = () => {
    const g = S.learn.draft, p = g.pack
    const head = `<div class="rt-phead"><button class="btn" data-rt="lback">${IC.back}Reading lists</button><span class="rt-ttl">${esc(p ? p.title : g.request.topic)}</span></div>`
    if (!p) return head + `<div class="rt-card"><span class="rt-chip ${g.status === 'error' ? 'bad' : 'acc'}">${g.status === 'error' ? 'Failed' : 'Searching and checking links…'}</span> <span class="set-sub">${esc(g.error || g.stage || 'a few minutes')}</span></div>`
    const items = p.items.map((x, i) => `<div class="rt-litem"><div><b>${i + 1}. ${esc(x.title)}</b> <span class="set-sub">${esc(x.source)} · ${esc(x.type)}${x.minutes ? ` · ~${x.minutes} min` : ''} · ${x.verified ? '✅ checked' : '🔎 not opened'}</span></div><div class="set-sub" style="word-break:break-all">${esc(x.url)}</div><div>${esc(x.why)}</div>${x.skip ? `<div class="set-sub">Skip: ${esc(x.skip)}</div>` : ''}${x.note ? `<div class="set-sub">Note: ${esc(x.note)}</div>` : ''}</div>`).join('')
    const busy = g.status === 'making'
    const quick = ['More practical, less theory', 'Simpler: a gentler start', 'Shorter: the 3 best', 'No vendor marketing', 'Add one video talk']
    return head + `${busy ? `<div class="rt-card"><span class="rt-chip acc">${p ? 'Changing it as you asked…' : 'Making the list…'}</span> <span class="set-sub">${esc(g.stage || 'a few minutes')}${p ? '; the current version stays below' : ''}</span></div>` : ''}${g.error && !busy ? `<p class="error" style="margin:0">${esc(g.error)}</p>` : ''}
      <div class="rt-card" style="display:flex;flex-direction:column;gap:8px"><div class="rt-h">What you will know after</div>${p.summary.map((x, i) => `<div>${i + 1}. ${esc(x)}</div>`).join('')}</div>
      <div class="rt-card" style="display:flex;flex-direction:column;gap:12px"><div class="rt-h">In reading order · ${p.items.length}</div>${items}</div>
      ${p.questions.length || p.work ? `<div class="rt-card" style="display:flex;flex-direction:column;gap:6px">${p.questions.length ? `<div class="rt-h">Check yourself</div>${p.questions.map((x) => `<div>• ${esc(x)}</div>`).join('')}` : ''}${p.work ? `<div class="rt-h" style="margin-top:6px">Your work</div><div>${esc(p.work)}</div>` : ''}</div>` : ''}
      <div class="rt-card" style="display:flex;flex-direction:column;gap:8px"><div class="rt-h">Change it</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="rt-lask" type="text" value="${esc(S.learn.ask || '')}" placeholder="Say what to change, e.g. replace item 3 with something on test data" style="flex:1;min-width:220px" ${busy ? 'disabled' : ''}><button class="btn" data-rt="lrefine" ${busy ? 'disabled' : ''}>Change it</button></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${quick.map((q) => `<button class="rt-chip" data-rt="lquick" data-q="${esc(q)}" style="cursor:default;border:0" ${busy ? 'disabled' : ''}>${esc(q)}</button>`).join('')}</div>
        ${g.asks.length ? `<div class="set-sub">Asked so far: ${g.asks.map((x) => '“' + esc(x) + '”').join(', ')}</div>` : ''}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-rt="lkeep" ${busy ? 'disabled' : ''}>Keep it: add to Library</button><button class="btn" data-rt="lpdel" data-id="${esc(g.id)}" ${busy ? 'disabled' : ''}>Discard</button></div>`
  }
  const learnHtml = () => {
    const L_ = S.learn
    const body = L_.draft ? learnDraftHtml() : `<div class="rt-phead"><button class="btn" data-rt="lclose">${IC.back}Library</button><div class="rt-seg"><button data-rt="ltab" data-lt="new" aria-pressed="${L_.tab === 'new'}">New reading list</button><button data-rt="ltab" data-lt="topics" aria-pressed="${L_.tab === 'topics'}">Topics to learn</button></div></div>
      ${L_.note ? `<div class="rt-card"><span class="rt-chip ok">Kept</span> ${esc(L_.note)}</div>` : ''}${L_.tab === 'topics' ? learnTopicsHtml() : learnNewHtml()}`
    return `<div class="rt-sc" id="rt-sc"><div class="rt-wrap">${S.error ? `<p class="error" style="margin:0">${esc(S.error)}</p>` : ''}${body}</div></div>`
  }
  const libraryHtml = () => {
    if (S.learn) return learnHtml()
    const L = S.list || { articles: [], total: 0 }
    const cap = L.max_mb ? L.max_mb * 1024 * 1024 : 0
    const flt = [['all', 'All'], ['progress', 'In progress'], ['new', 'Not heard'], ['pin', 'Pinned']]
    return `<div class="rt-sc" id="rt-sc"><div class="rt-wrap">
      ${S.error ? `<p class="error" style="margin:0">${esc(S.error)}</p>` : ''}${learnBar()}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="rt-q2" class="search" placeholder="Search titles, sites and what the articles say" value="${esc(S.q)}" style="flex:1;min-width:160px"><div class="rt-seg">${flt.map(([k, l]) => `<button data-rt="flt" data-f="${k}" aria-pressed="${S.filter === k}">${l}</button>`).join('')}</div><button class="btn" data-rt="topicdlg" data-new="1" data-parent="" style="display:inline-flex;gap:6px;align-items:center">${IC.folder}New topic</button></div>
      <div class="rt-tree" id="rt-lib">${libRows()}</div>
      <div class="set-sub" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span>${L.articles.length} article${L.articles.length === 1 ? '' : 's'} · ${mb(L.total || 0)}${cap ? ' of ' + L.max_mb + ' MB' : ''}</span><button class="btn" data-rt="cleanup">Free space now</button><button class="btn" data-rt="clear" style="color:var(--danger)">Delete all</button></div></div></div>`
  }

  const playerHtml = () => {
    const { entry, source, script, outline } = S.open
    const mk = termMarker()
    const left = (source ? source.elements : []).map((e) => {
      if (e.tag === 'img') return `<figure data-src="${esc(e.id)}" style="margin:12px 0;position:relative;overflow:hidden;border-radius:6px"><img src="/plugin/${ID}/store/articles/${esc(entry.id)}/images/${esc(e.file)}" alt="${esc(e.alt)}" style="max-width:100%;display:block"></figure>`
      const tag = /^h[1-4]$/.test(e.tag) ? e.tag : 'p'
      return `<${tag} class="rt-orig" data-src="${esc(e.id)}" data-rt="osrc" style="cursor:pointer">${mk.orig(e.text)}</${tag}>`
    }).join('')
    const right = (script ? script.blocks : []).map((b, i) => {
      const ws = b.text.split(/\s+/).filter(Boolean), marks = mk.tell(ws)
      return `<div class="rt-pb" data-rt="blk" data-i="${i}">${ws.map((w, j) => `<span class="rt-w${marks[j] >= 0 ? ' rt-term' : ''}"${marks[j] >= 0 ? ` data-t="${marks[j]}"` : ''}>${esc(w)}</span>`).join(' ')}</div>`
    }).join('')
    const speeds = [0.8, 1, 1.25, 1.5, 2].map((v) => `<option value="${v}" ${v === P.rate ? 'selected' : ''}>${v}×</option>`).join('')
    const vm = [['both', 'Side by side'], ['r', 'Retelling'], ['o', 'Original']]
    const dts = [['memo', 'Memo'], ['terms', 'Terms'], ['facts', 'Facts'], ['ask', 'Ask']]
    return `<div class="rt-player">
      <div class="rt-phead"><button class="btn" data-rt="nav" data-v="library" style="display:inline-flex;gap:4px;align-items:center">${IC.back}Library</button><span class="rt-ttl">${esc(entry.title)}</span>
        <span id="rt-vstat" class="set-sub"></span><button class="btn" id="rt-vbtn" data-rt="voice" style="display:none">Make the voice</button>
        <div class="rt-seg">${vm.map(([k, l]) => `<button data-rt="vm" data-m="${k}" aria-pressed="${S.vmode === k}">${l}</button>`).join('')}</div>
        <div class="rt-seg">${dts.map(([k, l]) => `<button data-rt="dt" data-d="${k}" aria-pressed="${S.dtab === k}">${l}</button>`).join('')}</div></div>
      <div class="rt-pbody"><div class="rt-cols ${S.vmode === 'r' ? 'only-r' : S.vmode === 'o' ? 'only-o' : ''}">
        <div class="rt-pane" id="rt-left"><div class="rt-h">Original</div>${left}</div>
        <div class="rt-pane" id="rt-right"><div class="rt-h">Retelling · click a block to play from it</div>${right}</div></div>
        ${S.dtab ? drawerHtml() : ''}</div>
      ${S.error ? `<p class="error" style="margin:0;padding:6px 16px">${esc(S.error)}</p>` : ''}
      <div class="rt-bottom"><div id="rt-track" data-rt="seek"><div class="rl"></div><div id="rt-fill"></div>${chapters().slice(1).map((c) => { const t = total(); return t ? `<i class="ch" style="left:${(before(c.b) / t * 100).toFixed(2)}%"></i>` : '' }).join('')}<div id="rt-knob"></div></div>
        <div class="rt-ctl"><button class="btn" data-rt="prev" title="Previous block" aria-label="Previous block">${IC.prev}</button><button class="btn" data-rt="back15" title="Back 15 s (←)">−15</button><button class="rt-pp" id="rt-play" data-rt="play" aria-label="Play or pause"></button><button class="btn" data-rt="fwd15" title="Forward 15 s (→)">+15</button><button class="btn" data-rt="next" title="Next block" aria-label="Next block">${IC.next}</button>
          <span class="tm" id="rt-time"></span><span class="chn" id="rt-chn"></span>
          <select id="rt-speed" title="Speed">${speeds}</select><button class="btn" id="rt-sleep" data-rt="sleep" title="Sleep timer">Sleep: ${SLEEPS[S.sleepI] ? SLEEPS[S.sleepI] + ' min' : 'off'}</button>
          <button class="btn primary" data-rt="ask" style="display:inline-flex;gap:6px;align-items:center">${IC.ask}Ask</button></div></div></div>`
  }
  const miniHtml = () => `<div class="rt-mini"><button class="rt-pp" id="rt-mplay" data-rt="mplay" aria-label="Play or pause"></button><div class="inf" data-rt="gotoplayer"><b>${esc(S.open.entry.title)}</b><div class="set-sub" id="rt-mtime"></div><div class="rt-bar" style="margin-top:4px"><i id="rt-mbar" style="width:0"></i></div></div><button class="btn" data-rt="gotoplayer">Open</button></div>`

  const linesOf = (v) => v.split(/\n+/).map((x) => x.trim()).filter(Boolean)
  const isUrl = (x) => /^https?:\/\/\S+$/.test(x)
  // A file's path as a system writes it (Windows C:\… or \\server\…, a Mac's or Linux's /Users/… or ~/…, a file:// link) —
  // short, one or a few lines: Echo reads only a file chosen with the button, never one by its path.
  const looksLikePath = (v) => linesOf(v).length <= 3 && linesOf(v).some((x) => /^["']?([A-Za-z]:[\\/]|\\\\|~\/|file:\/\/|\/(Users|home|Volumes|tmp|private|var|mnt|media|opt)\/)\S/i.test(x))
  // Every line a link: they go in one after another; anything else is a text to retell as it is. Files: chosen with the button.
  const itemsOf = (v) => { const l = linesOf(v); return l.length && l.every(isUrl) ? l.map((x) => ({ url: x })) : [] }
  const addFiles = () => S.addFiles || []
  const addHint = () => {
    const v = S.draft.trim(), it = itemsOf(v), f = addFiles().length
    const files = f ? `${f} file${f > 1 ? 's' : ''}` : ''
    if (!v) return files ? `${files}: Echo takes the text out of each, then Claude retells them one at a time.` : 'Paste links to pages or PDFs (one per line), or the text of an article; or choose files (PDF, Word, PowerPoint, text).'
    if (!it.length && looksLikePath(v)) return 'This looks like the path of a file: press “Choose a file…” instead (Echo reads only a file you choose).'
    if (!it.length) return `A text of ${v.split(/\s+/).length} words: it is retold as it is.${files ? ` And ${files}.` : ''}`
    const pdf = it.filter((x) => /\.pdf([?#]|$)/i.test(x.url)).length
    return `${it.length} link${it.length > 1 ? 's' : ''}${pdf ? ` (${pdf} PDF)` : ''}${files ? ` and ${files}` : ''}: Echo reads each one, Claude retells them one at a time.`
  }
  const optsHtml = () => `<div style="display:flex;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:150px"><label class="set-sub" for="rt-alen">Retelling length</label><select id="rt-alen">${[['short', 'Shorter'], ['normal', 'As the article'], ['long', 'More detailed']].map(([v, l]) => `<option value="${v}" ${S.addLen === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div style="flex:1;min-width:150px"><label class="set-sub" for="rt-alang">Language</label><select id="rt-alang">${[['', 'As in the settings'], ['ru', 'Русский'], ['en', 'English'], ['uk', 'Українська']].map(([v, l]) => `<option value="${v}" ${S.addLang === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>`
  const dialogHtml = () => {
    if (S.dlg === 'add') return `<div class="rt-dlg"><div class="rt-box"><b style="font-size:17px">Add to Retell</b>
      <textarea id="rt-add" rows="5" placeholder="Links, or the text of an article">${esc(S.draft)}</textarea>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn" data-rt="addpick" ${S.starting ? 'disabled' : ''}>Choose a file…</button>${addFiles().map((f, n) => `<span class="rt-chip" style="display:inline-flex;gap:4px;align-items:center;border:1px solid var(--border,#ccc);border-radius:12px;padding:2px 8px;font-size:13px">${esc(f.name)}<button class="btn" style="padding:0 4px;min-height:0" data-rt="addunpick" data-n="${n}" aria-label="Remove ${esc(f.name)}">×</button></span>`).join('')}</div>
      <div class="set-sub" id="rt-addhint">${addHint()}</div>
      ${optsHtml()}
      <div style="display:flex;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:150px"><label class="set-sub" for="rt-apages">Pages of a PDF (optional)</label><input id="rt-apages" type="text" placeholder="for example 5-12; empty: all of it" value="${esc(S.addPages)}"></div>
        <div style="flex:1;min-width:150px"><label class="set-sub" for="rt-asplit">A long PDF</label><select id="rt-asplit">${[['all', 'Split into parts (a topic)'], ['first', 'Only the first part']].map(([v, l]) => `<option value="${v}" ${S.addSplit === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
      ${S.error ? `<p class="error" style="margin:0">${esc(S.error)}</p>` : ''}
      <div class="rt-foot"><button class="btn" data-rt="dlgclose">Cancel</button><button class="btn primary" data-rt="addgo" ${S.starting ? 'disabled' : ''}>Add to the queue</button></div></div></div>`
    if (S.dlg === 'item') {
      const dg = S.digests.find((x) => x.id === S.itemDlg.d), it = dg && dg.items[S.itemDlg.n]
      if (!it) return ''
      return `<div class="rt-dlg"><div class="rt-box"><b style="font-size:17px">Retell this article</b>
        <div><div style="font-weight:600">${esc(it.title)}</div><div class="set-sub">${esc([it.source, it.minutes ? it.minutes + ' min' : ''].filter(Boolean).join(' · '))}</div></div>
        ${optsHtml()}
        ${S.error ? `<p class="error" style="margin:0">${esc(S.error)}</p>` : ''}
        <div class="rt-foot"><button class="btn" data-rt="dlgclose">Cancel</button><button class="btn primary" data-rt="itemgo" ${S.starting ? 'disabled' : ''}>Add to the queue</button></div></div></div>`
    }
    if (S.dlg === 'topic') {
      const t = S.tdlg, all = S.topics || []
      const kids = new Set(); const mark = (id) => { kids.add(id); all.filter((x) => x.parent === id).forEach((x) => mark(x.id)) }; if (t.id) mark(t.id)
      const depthOf = (x) => { let n = 0, p = x.parent, g = 0; while (p && g++ < 20) { n++; const q = all.find((y) => y.id === p); p = q ? q.parent : '' } return n }
      const opts = [['', '— top level —'], ...[...all].sort((a, b) => String(a.name).localeCompare(String(b.name))).filter((x) => !kids.has(x.id)).map((x) => [x.id, '  '.repeat(depthOf(x)) + x.name])]
      const isD = String(t.id).startsWith('d:')
      return `<div class="rt-dlg"><div class="rt-box"><b style="font-size:17px">${t.id ? 'Topic' : 'New topic'}</b>
        <div><label class="set-sub" for="rt-tname">Name</label><input id="rt-tname" type="text" value="${esc(t.name)}" ${isD ? 'disabled' : ''} placeholder="For example: Process to plugins"></div>
        <div><label class="set-sub" for="rt-tparent">Inside</label><select id="rt-tparent">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === t.parent ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
        ${S.error ? `<p class="error" style="margin:0">${esc(S.error)}</p>` : ''}
        <div class="rt-foot"><button class="btn" data-rt="dlgclose">Cancel</button><button class="btn primary" data-rt="topicgo">Save</button></div></div></div>`
    }
    if (S.dlg === 'move') {
      const all = S.topics || [], depthOf = (x) => { let n = 0, p = x.parent, g = 0; while (p && g++ < 20) { n++; const q = all.find((y) => y.id === p); p = q ? q.parent : '' } return n }
      const opts = [['', '— not in a topic —'], ...[...all].sort((a, b) => String(a.name).localeCompare(String(b.name))).map((x) => [x.id, '  '.repeat(depthOf(x)) + x.name])]
      return `<div class="rt-dlg"><div class="rt-box"><b style="font-size:17px">Move to a topic</b><select id="rt-mtopic">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === S.mdlg.topic ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
        ${S.error ? `<p class="error" style="margin:0">${esc(S.error)}</p>` : ''}<div class="rt-foot"><button class="btn" data-rt="dlgclose">Cancel</button><button class="btn primary" data-rt="movego">Move</button></div></div></div>`
    }
    return ''
  }

  // ── practice: quizzes on what was listened to, a coach for the answers, a phrasebook, a microphone check ──
  const PA = new Audio()
  const QTYPE = { choice: 'Multiple choice', tf: 'True or false', short: 'Short answer', explain: 'Explain in your own words' }
  const readyIn = (n) => { let r = n.arts.filter((a) => a.status === 'ready'); n.kids.forEach((k) => { r = r.concat(readyIn(k)) }); return r }
  const scopeList = () => {
    const m = treeModel(), out = [], all = artsOf().filter((a) => a.status === 'ready')
    const walk = (n, d) => { const r = readyIn(n); if (r.length) out.push({ v: 't:' + n.id, label: '\u00a0\u00a0'.repeat(d) + n.name + ` (${r.length})`, ids: r.map((a) => a.id), name: n.name }); n.kids.forEach((k) => walk(k, d + 1)) }
    m.roots.forEach((n) => walk(n, 0))
    const res = all.length ? [{ v: 'all', label: `All my articles (${all.length})`, ids: all.map((a) => a.id), name: 'All articles' }] : []
    return [...res, ...out, ...all.map((a) => ({ v: 'a:' + a.id, label: 'Article: ' + String(a.title).slice(0, 60), ids: [a.id], name: a.title }))]
  }
  const prRefresh = async () => {
    try { S.pr.quizzes = await ctx.call('quiz_list', {}) } catch (e) { /* none yet */ }
    try { S.pr.phrases = await ctx.call('phrase_list', {}) } catch (e) { /* none yet */ }
    try { S.pr.talks = await ctx.call('talks', {}) } catch (e) { /* none yet */ }
    try { S.pr.rstate = await ctx.call('review_state', {}) } catch (e) { /* none yet */ }
  }
  // a talk still going (in the browser) or its review being written: keep asking
  const talkBusy = (t) => t && (t.status === 'starting' || t.status === 'open' || t.review_status === 'making')
  const quizBusy = () => S.pr.quiz && (S.pr.quiz.status === 'making' || Object.values(S.pr.quiz.answers || {}).some((a) => a.status === 'checking'))
  const prPoll = () => {
    const rvWaits = () => S.pr.rv && S.pr.rv.items[S.pr.rv.i] && !S.pr.rv.items[S.pr.rv.i].card   // its card is being made
    const busy = () => quizBusy() || S.pr.quizzes.some((q) => q.status === 'making') || (S.pr.talk ? talkBusy(S.pr.talk) : S.pr.talks.some(talkBusy)) || rvWaits()
    if (S.pr.timer || !busy()) return
    S.pr.timer = setInterval(async () => {
      try {
        if (S.pr.quiz) S.pr.quiz = await ctx.call('quiz_get', { id: S.pr.quiz.id })
        else if (rvWaits()) { const it = S.pr.rv.items[S.pr.rv.i], r = await ctx.call('review_card', { id: it.id }); if (r && r.card) it.card = r.card; S.pr.rv.cards = r ? r.cards : '' }
        else if (S.pr.talk) S.pr.talk = await ctx.call('talk_get', { id: S.pr.talk.id })
        else { S.pr.quizzes = await ctx.call('quiz_list', {}); S.pr.talks = await ctx.call('talks', {}) }
      } catch (e) { /* the next tick tries again */ }
      const f = document.activeElement
      if (S.view === 'practice' && !(f && (f.id === 'rt-pans'))) ctx.render()
      if (!busy()) { clearInterval(S.pr.timer); S.pr.timer = null }
    }, 2000)
  }
  const sayPlay = async (text) => {
    S.pr.note = 'Making the voice…'; ctx.render()
    try {
      for (let i = 0; i < 40; i++) {
        const r = await ctx.call('say', { text })
        if (r.status === 'ready') { PA.src = `/plugin/${ID}/store/${r.file}`; S.pr.note = ''; ctx.render(); await PA.play(); return }
        if (r.status === 'error') throw new Error(r.error)
        await new Promise((res) => setTimeout(res, 1500))
      }
      throw new Error('The voice server did not answer in time')
    } catch (e) { S.pr.note = ''; S.error = e.message || String(e); ctx.render() }
  }
  const sayBtn = (text, label) => `<button class="btn" data-rt="psay" data-text="${esc(text)}" title="Listen">${IC.play.replace('width="20" height="20"', 'width="14" height="14"')}${label || 'Listen'}</button>`

  const micTest = async () => {
    const lines = []; let ok = false
    try {
      // Echo gives the microphone only right after a click in this view: open it first, before anything waits
      if (!(ctx.microphone && ctx.microphone.open)) throw new Error('This Echo can\'t give the microphone to plugins: update Echo')
      const stream = await ctx.microphone.open({ echoCancellation: true, noiseSuppression: true, autoGainControl: true })
      lines.push(`Microphone opened: ${(stream.getAudioTracks()[0] && stream.getAudioTracks()[0].label) || '(no name)'}`)
      const AC = window.AudioContext || window.webkitAudioContext, ac = new AC(), src = ac.createMediaStreamSource(stream), an = ac.createAnalyser()
      an.fftSize = 1024; src.connect(an)
      const buf = new Uint8Array(an.fftSize); let peak = 0; const t0 = Date.now()
      S.pr.mic = { lines: [...lines, 'Listening for 2.5 seconds… say a sentence.'], ok: null }; ctx.render()
      await new Promise((res) => { const tick = () => { an.getByteTimeDomainData(buf); for (const v of buf) peak = Math.max(peak, Math.abs(v - 128)); if (Date.now() - t0 < 2500) requestAnimationFrame(tick); else res() }; tick() })
      lines.push(`Loudest level heard: ${Math.round(peak / 128 * 100)}%${peak < 6 ? ' (very quiet: nothing was said, or the microphone is muted)' : ''}`)
      stream.getTracks().forEach((t) => t.stop()); ac.close()
      ok = peak >= 6
    } catch (e) { lines.push(`Failed: ${e.name || ''} ${e.message || e}`) } finally { try { ctx.microphone.close() } catch (e) { /* closed */ } }
    // what you say is written down by the speech server: can its listening session open from here?
    try { const ws = await openStt('', () => {}); lines.push('Listening through the speech server: works'); ws.close() } catch (e) { lines.push(`Listening through the speech server: ${e.message || e}`); ok = false }
    S.pr.mic = { lines, ok }; ctx.render()
  }

  const scoreOf = (q) => { const n = q.questions.length; return n ? Math.round(q.questions.reduce((t, k) => t + ((q.answers[k.id] || {}).score || 0), 0) / n) : 0 }
  const prHome = () => {
    const P_ = S.pr, scopes = scopeList(), cur = scopes.find((x) => x.v === P_.scope) || scopes[0]
    // One card: what to practise on (shared), then the two ways to practise it, side by side (stacked when narrow)
    const opt = (v, label, on) => `<option value="${esc(v)}" ${on ? 'selected' : ''}>${esc(label)}</option>`
    const setup = scopes.length ? `<div class="rt-card rt-practise"><div class="rt-h">Practise on</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap"><div style="flex:3;min-width:220px"><label class="set-sub" for="rt-pscope">About</label><select id="rt-pscope" style="width:100%">${scopes.map((x) => opt(x.v, x.label, cur && cur.v === x.v)).join('')}</select></div>
        <div style="flex:1;min-width:110px"><label class="set-sub" for="rt-plevel">English level</label><select id="rt-plevel" style="width:100%">${['B1', 'B2', 'C1'].map((l) => opt(l, l, P_.level === l)).join('')}</select></div></div>
      <div class="rt-modes">
        <div class="rt-mode"><div class="rt-mt">📝 Quiz</div>
          <div class="set-sub">Questions from the original text. Choices are checked at once; for what you write or say, a coach shows how to say it better.</div>
          <div><label class="set-sub" for="rt-pn">Questions</label><select id="rt-pn" style="width:100%">${[5, 8, 10, 12].map((n) => opt(n, n, P_.n === n)).join('')}</select></div>
          <button class="btn primary" data-rt="pmake" ${P_.busy ? 'disabled' : ''}>${P_.busy ? 'Making…' : 'Make a quiz'}</button></div>
        <div class="rt-mode"><div class="rt-mt">🎙 Live talk</div>
          <div class="set-sub">A spoken conversation with a coach, right here. Headphones help. When you finish, a review of your English comes back.</div>
          <div><label class="set-sub" for="rt-tcorrect">Mistakes</label><select id="rt-tcorrect" style="width:100%">${opt('gentle', 'Gently, as we talk (and the review after)', P_.tcorrect === 'gentle')}${opt('end', 'Only in the review after', P_.tcorrect === 'end')}</select></div>
          <div><label class="set-sub" for="rt-tbrain">Coach</label><select id="rt-tbrain" style="width:100%">${opt('claude', 'Claude, careful (Sonnet)', P_.tbrain === 'claude')}${opt('claude-quick', 'Claude, quick (Haiku)', P_.tbrain === 'claude-quick')}</select></div>
          <button class="btn primary" data-rt="tstart" ${P_.tbusy ? 'disabled' : ''}>${P_.tbusy ? 'Opening…' : 'Start a talk'}</button></div>
      </div></div>`
      : '<div class="rt-card"><div style="font-weight:600">Nothing to practise on yet</div><div class="set-sub">Retell an article first; quizzes and talks are made from what you listened to.</div></div>'
    const recent = P_.quizzes.length ? `<div><div class="rt-h">Recent quizzes</div><div class="rt-tree">${P_.quizzes.map((q) => `<div class="rt-prow"><span class="rt-ic dir">${IC.ask}</span><span class="rt-pt"><b>${esc(q.title || q.scopeName || 'Quiz')}</b><span class="rt-pm"><span>${esc(q.level)} · ${esc(String(q.created).slice(0, 10))}</span>${q.status === 'making' ? '<span class="rt-chip acc">Making…</span>' : q.status === 'error' ? `<span class="rt-chip bad">Failed</span><span>${esc(q.error)}</span>` : `<span>${q.answered} of ${q.n} answered</span>${q.score !== null ? `<span class="rt-chip ${q.score >= 70 ? 'ok' : ''}">${q.score}%</span>` : ''}`}</span></span>${q.status === 'ready' ? `<button class="btn" data-rt="popen" data-id="${esc(q.id)}">${q.answered >= q.n ? 'Review' : q.answered ? 'Continue' : 'Start'}</button>` : ''}<span class="rt-menu"><button class="icon-btn" data-rt="pdel" data-id="${esc(q.id)}" title="Delete" aria-label="Delete">${DOTS.replace('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>', '<path d="M6 7l12 12M18 7L6 19"/>')}</button></span></div>`).join('')}</div></div>` : ''
    const rs = P_.rstate, when = (iso) => { const ms = Date.parse(iso) - Date.now(); return ms < 3600000 ? 'in ' + Math.max(1, Math.round(ms / 60000)) + ' min' : ms < 72000000 ? 'in ' + Math.round(ms / 3600000) + ' h' : 'in ' + Math.max(1, Math.round(ms / 86400000)) + ' d' }
    const rvBar = P_.phrases.length && rs ? `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:2px 0 8px">${rs.due ? `<button class="btn primary" data-rt="rvstart">🔁 Review · ${rs.due} due</button><span class="set-sub">${rs.fresh ? rs.fresh + ' new · ' : ''}say each phrase aloud from its meaning</span>` : `<span class="rt-chip ok">All reviewed</span><span class="set-sub">${rs.next ? 'next ' + when(rs.next) + (rs.tomorrow ? ` · ${rs.tomorrow} by tomorrow` : '') : ''}</span>`}</div>` : ''
    const phrases = `<div><div class="rt-h">My phrases · ${P_.phrases.length}</div>${rvBar}${P_.phrases.length ? `<div class="rt-tree">${P_.phrases.map((f) => `<div class="rt-prow"><span class="rt-pt"><b style="white-space:normal">${esc(f.text)}</b>${f.note ? `<span class="rt-pm">${esc(f.note)}</span>` : ''}</span>${sayBtn(f.text)}<button class="icon-btn" data-rt="pdelphrase" data-id="${esc(f.id)}" title="Remove" aria-label="Remove" style="opacity:1">${DOTS.replace('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>', '<path d="M6 7l12 12M18 7L6 19"/>')}</button></div>`).join('')}</div>` : '<div class="set-sub">Phrases you save from the coach\'s feedback appear here, with a voice to repeat after.</div>'}</div>`
    const mic = `<div class="rt-card"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:200px"><b>Microphone check</b><div class="set-sub">For speaking practice later: does this window have a microphone?</div></div><button class="btn" data-rt="mictest">Test microphone</button></div>
      ${P_.mic ? `<div class="set-sub" style="margin-top:8px;display:flex;flex-direction:column;gap:2px">${P_.mic.lines.map((l) => `<span>${esc(l)}</span>`).join('')}${P_.mic.ok === true ? '<b style="color:var(--me)">The microphone works.</b>' : P_.mic.ok === false ? '<b style="color:var(--danger)">The microphone did not work here.</b>' : ''}</div>` : ''}</div>`
    const talk = ''
    const TST = { starting: ['acc', 'Opening…'], open: ['acc', 'Going on'], done: ['ok', 'Finished'], ended: ['ok', 'Finished'], error: ['bad', 'Failed'] }
    const talks = P_.talks.length ? `<div><div class="rt-h">My talks</div><div class="rt-tree">${P_.talks.map((t) => { const st = TST[t.status] || ['', t.status]; return `<div class="rt-prow"><span class="rt-ic dir">🎙</span><span class="rt-pt"><b>${esc(t.title)}</b><span class="rt-pm"><span>${esc(t.level)} · ${esc(String(t.created).slice(0, 10))}</span><span class="rt-chip ${st[0]}">${st[1]}</span>${t.yours ? `<span>${t.yours} turns · ${t.words} words</span>` : ''}${t.review_status === 'making' ? '<span class="rt-chip acc">Reviewing…</span>' : t.review ? '<span class="rt-chip ok">Review ready</span>' : ''}${t.error && t.status !== 'done' && t.status !== 'ended' ? `<span>${esc(t.error)}</span>` : ''}</span></span>${t.turns ? `<button class="btn" data-rt="topen" data-id="${esc(t.id)}">${t.review ? 'Review' : 'Open'}</button>` : ''}<span class="rt-menu"><button class="icon-btn" data-rt="tdel" data-id="${esc(t.id)}" title="Delete" aria-label="Delete">${DOTS.replace('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>', '<path d="M6 7l12 12M18 7L6 19"/>')}</button></span></div>` }).join('')}</div></div>` : ''
    return `<div class="rt-sc" id="rt-sc"><div class="rt-wrap">${S.error ? `<p class="error" style="margin:0">${esc(S.error)}</p>` : ''}${P_.note ? `<div class="set-sub">${esc(P_.note)}</div>` : ''}${setup}${talk}${talks}${recent}${phrases}${mic}</div></div>`
  }

  // ── a spoken answer: the microphone goes straight to the speech server's Realtime transcription session ──
  // Standard OpenAI events only: each stretch of speech comes back as text, with where it starts and ends in the recording
  // (no time per word). The host half gives a short-lived key for it (`stt_session`); the API key stays there.
  const mmss2 = (ms) => { const t = Math.floor(ms / 1000); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0') }
  const toB64 = (i16) => { const b = new Uint8Array(i16.buffer); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s) }
  const openStt = async (prompt, onEvent) => {
    const ss = await ctx.call('stt_session', { prompt })
    const ws = new WebSocket(ss.url, ss.key ? ['realtime', 'openai-insecure-api-key.' + ss.key] : undefined)
    await new Promise((res, rej) => {
      const tm = setTimeout(() => rej(new Error('the speech server did not open a listening session')), 10000)
      ws.onopen = () => { clearTimeout(tm); res() }
      ws.onerror = () => { clearTimeout(tm); rej(new Error('could not reach the speech server to listen (is its address listed in Settings → Plugins → Retell?)')) }
    })
    ws.onmessage = (m) => { let ev; try { ev = JSON.parse(m.data) } catch (e) { return } onEvent(ev) }
    ws.send(JSON.stringify({ type: 'session.update', session: { type: 'transcription', audio: { input: ss.input } } }))
    return ws
  }
  // One recording's stretches of speech, by the server's item ids, in the order they started.
  const sttEvent = (R, ev) => {
    const seg = (id) => R.segs[id] || (R.segs[id] = { start_ms: R.lastEnd || 0, end_ms: null, text: null, done: false, n: R.n++ })
    switch (ev.type) {
      case 'input_audio_buffer.speech_started': seg(ev.item_id).start_ms = +ev.audio_start_ms || 0; break
      case 'input_audio_buffer.speech_stopped': seg(ev.item_id).end_ms = +ev.audio_end_ms || 0; R.lastEnd = +ev.audio_end_ms || R.lastEnd; break
      case 'input_audio_buffer.committed': seg(ev.item_id); break
      case 'conversation.item.input_audio_transcription.completed': { const s = seg(ev.item_id); s.text = String(ev.transcript || ''); s.done = true; break }
      case 'conversation.item.input_audio_transcription.failed': { const s = seg(ev.item_id); s.text = ''; s.done = true; break }
      case 'error': R.lastError = (ev.error && ev.error.message) || 'error'; break
    }
    if (R.finishing) R.finishing()
  }
  const paintRec = () => {
    const R = S.pr.rec; if (!R) return
    const t = $('rt-rtime'); if (t && R.state === 'recording') t.textContent = mmss2(Date.now() - R.t0)
    const l = $('rt-lev'); if (l) l.style.width = Math.round((R.level || 0) * 100) + '%'
  }
  const recRelease = () => {
    const R = S.pr.rec; if (!R) return
    if (R.tick) clearInterval(R.tick); R.tick = null
    try { if (R.node) R.node.onaudioprocess = null } catch (e) { /* gone */ }
    try { if (R.stream) R.stream.getTracks().forEach((x) => x.stop()) } catch (e) { /* closed */ }
    try { ctx.microphone.close() } catch (e) { /* closed */ }
    try { if (R.ac) R.ac.close() } catch (e) { /* closed */ }
    R.stream = null; R.ac = null; R.node = null
  }
  const recClose = (R) => { try { if (R.ws) R.ws.close() } catch (e) { /* closed */ } R.ws = null }
  const recStart = async () => {
    if (S.pr.rec && S.pr.rec.state === 'recording') return
    const R = S.pr.rec = { state: 'starting', t0: 0, level: 0, text: '', metrics: null, error: '', segs: {}, n: 0, lastEnd: 0, samples: 0, queue: [] }; S.pr.spoken = null
    try {
      // the microphone first, while the click is fresh (Echo opens it only then), then the listening session
      if (!(ctx.microphone && ctx.microphone.open)) throw new Error('This Echo can\'t give the microphone to plugins: update Echo')
      const stream = await ctx.microphone.open({ echoCancellation: true, noiseSuppression: true, autoGainControl: true })
      R.stream = stream; ctx.render()
      const ac = new AudioContext({ sampleRate: 24000 }), node = ac.createScriptProcessor(2048, 1, 1); R.ac = ac; R.node = node   // PCM16 mono 24 kHz, as the API takes it
      node.onaudioprocess = (e) => {
        const f = e.inputBuffer.getChannelData(0); let pk = 0; for (let i = 0; i < f.length; i++) pk = Math.max(pk, Math.abs(f[i])); R.level = Math.min(1, pk * 1.8)
        if (R.state !== 'recording') return
        const pcm = Int16Array.from(f, (x) => Math.max(-1, Math.min(1, x)) * 32767); R.samples += pcm.length
        const m = JSON.stringify({ type: 'input_audio_buffer.append', audio: toB64(pcm) })
        if (R.ws && R.ws.readyState === 1) R.ws.send(m); else if (R.queue) R.queue.push(m)
      }
      ac.createMediaStreamSource(stream).connect(node); node.connect(ac.destination)   // (it writes silence: nothing is heard)
      R.state = 'recording'; R.t0 = Date.now()
      R.tick = setInterval(() => { paintRec(); if (Date.now() - R.t0 > 180000) recStop() }, 100)
      ctx.render()
      const qu = S.pr.quiz && S.pr.quiz.questions[S.pr.qi]
      const prompt = S.pr.rv ? 'Um, well, uh…' : 'Um, well, uh, you know, I mean… ' + (qu && qu.terms ? qu.terms.join(', ') : '')
      const ws = await openStt(prompt, (ev) => sttEvent(R, ev))
      if (S.pr.rec !== R || R.cancelled) { try { ws.close() } catch (e) { /* closed */ } return }
      R.ws = ws; for (const m of R.queue) ws.send(m); R.queue = null
      ws.onclose = () => { if (R.state === 'recording') { R.state = 'error'; R.error = 'The speech server closed the listening session' + (R.lastError ? ': ' + R.lastError : ''); recRelease(); ctx.render() } }
    } catch (e) {
      if (S.pr.rec !== R) return
      R.state = 'error'; R.error = (e.name === 'NotAllowedError' ? 'The microphone is blocked: allow it for Echo in Windows settings. ' : '') + (e.message || String(e)); recRelease(); recClose(R); ctx.render()
    }
  }
  // Stop: the rest of the speech is committed, and once every stretch is written down the answer is put together.
  const recStop = async () => {
    const R = S.pr.rec; if (!R || R.state !== 'recording') return
    R.state = 'transcribing'; const ms = Math.round(R.samples / 24); recRelease(); ctx.render()
    try {
      if (!R.ws) throw new Error('The speech server did not open a listening session')
      const open = Object.values(R.segs).some((s) => s.end_ms == null)
      if (open || !Object.keys(R.segs).length) R.ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
      await new Promise((res) => {
        const all = () => { const v = Object.values(R.segs); return v.length && v.every((s) => s.done) }
        const tm = setTimeout(() => { R.finishing = null; res() }, 12000)
        R.finishing = () => { if (all()) { clearTimeout(tm); R.finishing = null; setTimeout(res, 150) } }
        R.finishing()
      })
      recClose(R)
      const segments = Object.values(R.segs).filter((s) => s.text && s.text.trim()).sort((x, y) => x.n - y.n)
        .map((s) => ({ text: s.text.trim(), start_ms: s.start_ms, end_ms: s.end_ms == null ? Math.max(s.start_ms, ms) : s.end_ms }))
      const text = segments.map((s) => s.text).join(' ').trim()
      if (!text) throw new Error(R.lastError ? 'The speech server: ' + R.lastError : 'Nothing was heard in the recording (is the microphone muted?)')
      if (S.pr.rv) { if (S.pr.rec === R) { rvHeard(text); S.pr.rec = null } return ctx.render() }
      const metrics = await ctx.call('speech_metrics', { segments })
      if (S.pr.rec !== R) return
      R.state = 'done'; R.text = text; R.metrics = metrics; S.pr.draft = text; S.pr.spoken = metrics; S.pr.focus = false; ctx.render()
    } catch (e) { recClose(R); if (S.pr.rec === R) { R.state = 'error'; R.error = e.message || String(e); ctx.render() } }
  }
  const recCancel = () => { const R = S.pr.rec; if (R) { R.cancelled = true; recRelease(); recClose(R) } S.pr.rec = null; ctx.render() }
  const spokenChips = (m) => `<span class="rt-chip">${m.wpm} words/min</span><span class="rt-chip">${m.words} words · ${m.seconds} s</span><span class="rt-chip ${m.fillerTotal > 3 ? 'bad' : ''}">fillers: ${m.fillerTotal}${Object.keys(m.fillers || {}).length ? ' (' + Object.entries(m.fillers).map(([k, v]) => `${esc(k)}×${v}`).join(', ') + ')' : ''}</span><span class="rt-chip ${m.pauses.count > 4 ? 'bad' : ''}">pauses ≥0.8 s: ${m.pauses.count}${m.pauses.count ? ` (longest ${m.pauses.longest} s)` : ''}</span>${(m.repeats || []).length ? `<span class="rt-chip">repeats: ${m.repeats.map(esc).join(', ')}</span>` : ''}`
  const recHtml = () => {
    const R = S.pr.rec
    const micBtn = `<button class="btn" data-rt="recstart" style="display:inline-flex;gap:6px;align-items:center"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>Answer by voice</button>`
    if (!R) return `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${micBtn}<span class="set-sub">Speak your answer: you get the text, how it sounded (pace, fillers, pauses) and the coach's advice.</span></div>`
    if (R.state === 'starting') return '<div class="set-sub">Opening the microphone…</div>'
    if (R.state === 'recording') return `<div class="rt-card" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span style="width:10px;height:10px;border-radius:50%;background:var(--danger)"></span><b>Recording</b><span id="rt-rtime" class="set-sub" style="min-width:40px">0:00</span><div class="rt-bar" style="width:160px"><i id="rt-lev" style="width:0;transition:width .1s"></i></div><span class="rt-sp"></span><button class="btn primary" data-rt="recstop">Stop</button><button class="btn" data-rt="reccancel">Cancel</button></div>`
    if (R.state === 'transcribing') return '<div class="rt-card"><span class="rt-chip acc">Writing down what you said…</span></div>'
    if (R.state === 'error') return `<div class="rt-card"><p class="error" style="margin:0 0 8px">${esc(R.error)}</p><div style="display:flex;gap:8px;flex-wrap:wrap">${micBtn}</div></div>`
    const m = R.metrics, toks = (m.tokens || []).map((t) => `${t.gap ? `<span class="set-sub" title="a pause">[${t.gap} s] </span>` : ''}${t.filler ? `<mark style="background:color-mix(in srgb,var(--warn) 50%,transparent);border-radius:3px;padding:0 2px">${esc(t.w)}</mark>` : esc(t.w)}`).join(' ')
    return `<div class="rt-card" style="display:flex;flex-direction:column;gap:8px"><div class="rt-h" style="margin:0">What you said</div><div style="line-height:1.7">${toks}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${spokenChips(m)}</div><div class="set-sub">Fix any word the computer misheard in the box below, then check. ${micBtn}</div></div>`
  }
  const fluencyHtml = (a, r) => (a.spoken ? `<div><div class="rt-h">How it sounded</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${spokenChips(a.spoken)}</div>${r.fluency && r.fluency.note ? `<div>${esc(r.fluency.note)}</div>` : ''}${r.fluency && (r.fluency.tips || []).length ? r.fluency.tips.map((x) => `<div style="display:flex;gap:6px"><b style="color:var(--accent-ink)">›</b><span>${esc(x)}</span></div>`).join('') : ''}</div>` : '')

  const feedbackHtml = (qu, a) => {
    if (a.status === 'checking') return '<div class="rt-card"><span class="rt-chip acc">Checking your answer…</span> <span class="set-sub">the coach is reading it</span></div>'
    if (a.status === 'error') return `<div class="rt-card"><p class="error" style="margin:0">${esc(a.error)}</p><button class="btn" data-rt="pretry">Try again</button></div>`
    if (qu.type === 'choice' || qu.type === 'tf') {
      return `<div class="rt-card"><span class="rt-chip ${a.ok ? 'ok' : 'bad'}">${a.ok ? 'Correct' : 'Not quite'}</span>${qu.type === 'tf' ? ` <span class="set-sub">The statement is ${qu.answer ? 'true' : 'false'}.</span>` : ''}<div style="margin-top:6px">${esc(qu.why)}</div></div>`
    }
    if (a.skipped) return `<div class="rt-card"><div class="rt-h">Model answer</div><div>${esc(qu.model)}</div><div style="margin-top:8px">${sayBtn(qu.model)} <button class="btn" data-rt="psave" data-text="${esc(qu.model)}" data-note="model answer">Save</button></div></div>`
    const r = a.result || {}, ul = (xs, ico, col) => xs.map((x) => `<div style="display:flex;gap:6px"><b style="color:${col}">${ico}</b><span>${esc(x)}</span></div>`).join('')
    return `<div class="rt-card" style="display:flex;flex-direction:column;gap:10px">
      <div><span class="rt-chip ${r.verdict === 'good' ? 'ok' : r.verdict === 'missed' ? 'bad' : 'acc'}">${r.verdict === 'good' ? 'Good answer' : r.verdict === 'missed' ? 'Off the mark' : 'Partly there'} · ${r.score}%</span>${r.praise ? ` <span>${esc(r.praise)}</span>` : ''}</div>
      <div><div class="rt-h">Content</div>${ul(r.covered || [], '✓', 'var(--me)')}${ul(r.missed || [], '✗', 'var(--danger)')}${r.content_note ? `<div class="set-sub" style="margin-top:4px">${esc(r.content_note)}</div>` : ''}</div>
      ${(r.language || []).length ? `<div><div class="rt-h">Language</div>${r.language.map((x) => `<div style="margin-bottom:6px"><span style="text-decoration:line-through;color:var(--text-3)">${esc(x.said)}</span> → <b>${esc(x.better)}</b>${x.why ? `<div class="set-sub">${esc(x.why)}</div>` : ''}</div>`).join('')}</div>` : ''}
      ${fluencyHtml(a, r)}
      ${r.smoother ? `<div><div class="rt-h">Say it smoother</div><div>${esc(r.smoother)}</div><div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">${sayBtn(r.smoother)}<button class="btn" data-rt="psave" data-text="${esc(r.smoother)}" data-note="smoother version">Save</button></div></div>` : ''}
      ${(r.phrases || []).length ? `<div><div class="rt-h">Phrases to reuse</div><div style="display:flex;gap:6px;flex-wrap:wrap">${r.phrases.map((x) => `<span class="rt-chip acc" style="cursor:default">${esc(x)} <span data-rt="psave" data-text="${esc(x)}" data-note="phrase" title="Save" style="cursor:default;margin-left:4px">＋</span></span>`).join('')}</div></div>` : ''}
      ${r.structure ? `<div><div class="rt-h">How to build it</div><div>${esc(r.structure)}</div></div>` : ''}
      <details><summary class="set-sub" style="cursor:default">Model answer</summary><div style="margin:6px 0">${esc(qu.model)}</div>${sayBtn(qu.model)}</details></div>`
  }

  const quizHtml = () => {
    const q = S.pr.quiz
    const head = (extra) => `<div class="rt-phead"><button class="btn" data-rt="pexit">${IC.back}Practice</button><span class="rt-ttl">${esc(q.title || q.scopeName || 'Quiz')}</span>${extra || ''}</div>`
    if (q.status === 'making') return `<div class="rt-player">${head()}<div class="rt-sc"><div class="rt-wrap"><div class="rt-card"><span class="rt-chip acc">Making the quiz…</span> <span class="set-sub">Claude is reading the articles and writing questions (about half a minute).</span></div></div></div></div>`
    if (q.status === 'error') return `<div class="rt-player">${head()}<div class="rt-sc"><div class="rt-wrap"><p class="error">${esc(q.error)}</p></div></div></div>`
    const n = q.questions.length, i = S.pr.qi
    if (i >= n) {
      const sc = scoreOf(q), rows = q.questions.map((k, j) => { const a = q.answers[k.id] || {}, s = a.score || 0; return `<div class="rt-prow" data-rt="pgo" data-i="${j}"><span class="rt-ic">${j + 1}</span><span class="rt-pt"><b style="white-space:normal">${esc(k.q)}</b><span class="rt-pm">${esc(QTYPE[k.type])}</span></span><span class="rt-chip ${a.status ? (s >= 70 ? 'ok' : s < 40 ? 'bad' : 'acc') : ''}">${a.status ? (a.skipped ? 'skipped' : s + '%') : 'not answered'}</span></div>` }).join('')
      const ph = [...new Set(q.questions.flatMap((k) => ((q.answers[k.id] || {}).result || {}).phrases || []))]
      return `<div class="rt-player">${head()}<div class="rt-sc" id="rt-sc"><div class="rt-wrap">
        <div class="rt-card" style="text-align:center"><div style="font-size:34px;font-weight:700">${sc}%</div><div class="set-sub">${q.level} · ${n} questions · ${q.questions.filter((k) => q.answers[k.id]).length} answered</div></div>
        <div><div class="rt-h">Questions (click to review)</div><div class="rt-tree">${rows}</div></div>
        ${ph.length ? `<div><div class="rt-h">Phrases from this quiz</div><div style="display:flex;gap:6px;flex-wrap:wrap">${ph.map((x) => `<span class="rt-chip acc" style="cursor:default">${esc(x)} <span data-rt="psave" data-text="${esc(x)}" data-note="phrase" title="Save" style="cursor:default;margin-left:4px">＋</span></span>`).join('')}</div></div>` : ''}
        <div style="display:flex;gap:8px"><button class="btn primary" data-rt="pagain">New quiz on the same topic</button><button class="btn" data-rt="pexit">Done</button></div></div></div></div>`
    }
    const qu = q.questions[i], a = q.answers[qu.id], done = a && a.status === 'done'
    let input = ''
    if (!a || a.status === 'error') {
      if (qu.type === 'choice') input = `<div style="display:flex;flex-direction:column;gap:6px">${qu.options.map((o, k) => `<button class="btn" data-rt="pchoice" data-i="${k}" style="justify-content:flex-start;white-space:normal;text-align:left"><b style="width:18px">${'ABCD'[k]}</b>${esc(o)}</button>`).join('')}</div>`
      else if (qu.type === 'tf') input = '<div style="display:flex;gap:8px"><button class="btn" data-rt="ptf" data-v="true">True</button><button class="btn" data-rt="ptf" data-v="false">False</button></div>'
      else input = `${recHtml()}<textarea id="rt-pans" rows="${qu.type === 'explain' ? 6 : 3}" placeholder="Answer in English, as you would say it aloud… (or press “Answer by voice”)" style="width:100%;padding:8px 10px;border-radius:var(--r-control);border:1px solid var(--line-strong);font:inherit;background:var(--surface);color:var(--text);box-sizing:border-box">${esc(S.pr.draft)}</textarea>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-rt="pcheck">Check my answer</button><button class="btn" data-rt="pskip">Show the model answer</button></div>${qu.terms && qu.terms.length ? `<div class="set-sub">Useful words: ${qu.terms.map(esc).join(' · ')}</div>` : ''}`
    } else if (qu.type === 'choice') {
      input = `<div style="display:flex;flex-direction:column;gap:6px">${qu.options.map((o, k) => `<div class="btn" style="justify-content:flex-start;white-space:normal;text-align:left;cursor:default;${k === qu.answer ? 'border-color:var(--me);background:color-mix(in srgb,var(--me) 12%,transparent)' : k === a.choice ? 'border-color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,transparent)' : ''}"><b style="width:18px">${'ABCD'[k]}</b>${esc(o)}</div>`).join('')}</div>`
    } else if (qu.type !== 'tf' && a.text) input = `<div class="rt-card"><div class="rt-h">Your answer</div>${esc(a.text)}</div>`
    const last = i === n - 1
    return `<div class="rt-player">${head(`<span class="set-sub">Question ${i + 1} of ${n}</span>`)}<div class="rt-sc" id="rt-sc"><div class="rt-wrap" style="max-width:760px">
      <div class="rt-bar"><i style="width:${Math.round((i + (done ? 1 : 0)) / n * 100)}%"></i></div>
      <div><span class="rt-chip acc">${QTYPE[qu.type]}</span></div>
      <div style="font-size:19px;font-weight:600;line-height:1.35">${esc(qu.q)}</div>
      <div>${sayBtn(qu.q, 'Listen to the question')}</div>
      ${input}${S.pr.note ? `<div class="set-sub">${esc(S.pr.note)}</div>` : ''}${S.error ? `<p class="error" style="margin:0">${esc(S.error)}</p>` : ''}
      ${a ? feedbackHtml(qu, a) : ''}
      ${done ? `<div style="display:flex;gap:8px"><button class="btn primary" data-rt="pnext">${last ? 'Finish' : 'Next question'}</button></div>` : ''}</div></div></div>`
  }
  const talkHtml = () => {
    const t = S.pr.talk, r = t.review, sv = (x, note) => `${sayBtn(x)}<button class="btn" data-rt="psave" data-text="${esc(x)}" data-note="${esc(note)}">Save</button>`
    const head = `<div class="rt-phead"><button class="btn" data-rt="texit">${IC.back}Practice</button><span class="rt-ttl">🎙 ${esc(t.title)}</span></div>`
    let rev
    if (t.status === 'open' || t.status === 'starting') rev = `<div class="rt-card"><span class="rt-chip acc">The talk is going on</span></div>`
    else if (t.review_status === 'making') rev = '<div class="rt-card"><span class="rt-chip acc">Reviewing the talk…</span> <span class="set-sub">the coach is reading it (about a minute)</span></div>'
    else if (t.review_status === 'error') rev = `<div class="rt-card"><p class="error" style="margin:0">${esc(t.review_error)}</p><button class="btn" data-rt="treview" data-id="${esc(t.id)}" style="margin-top:8px">Try again</button></div>`
    else if (!r) rev = `<div class="rt-card"><div class="set-sub" style="margin-bottom:8px">No review yet.</div><button class="btn primary" data-rt="treview" data-id="${esc(t.id)}">Review this talk</button></div>`
    else {
      const m = r.metrics || {}, fl = m.words ? `${m.words} words in ${m.turns} turns · ${m.wpm} words/min · fillers ${m.fillerTotal}${Object.keys(m.fillers || {}).length ? ' (' + Object.entries(m.fillers).map(([k, v]) => k + ' ×' + v).join(', ') + ')' : ''} · pauses ≥0.8 s: ${m.pauses}${m.pauses ? ', longest ' + m.longest + ' s' : ''} · longest turn ${m.longest_turn} words` : ''
      rev = `<div class="rt-card" style="display:flex;flex-direction:column;gap:12px">
        ${r.summary ? `<div>${esc(r.summary)}</div>` : ''}
        ${r.praise ? `<div><span class="rt-chip ok">Good</span> ${esc(r.praise)}</div>` : ''}
        ${r.content ? `<div><div class="rt-h">Content</div><div>${esc(r.content)}</div></div>` : ''}
        ${(r.language || []).length ? `<div><div class="rt-h">Language</div>${r.language.map((x) => `<div style="margin-bottom:8px"><span style="text-decoration:line-through;color:var(--text-3)">${esc(x.said)}</span> → <b>${esc(x.better)}</b>${x.why ? `<div class="set-sub">${esc(x.why)}</div>` : ''}<div style="margin-top:4px;display:flex;gap:6px">${sv(x.better, 'from a talk')}</div></div>`).join('')}</div>` : ''}
        ${(r.rewrites || []).length ? `<div><div class="rt-h">Say it smoother</div>${r.rewrites.map((x) => `<div style="margin-bottom:10px"><div class="set-sub">You said: ${esc(x.said)}</div><div style="margin:3px 0 5px">${esc(x.better)}</div><div style="display:flex;gap:6px">${sv(x.better, 'smoother, from a talk')}</div></div>`).join('')}</div>` : ''}
        ${(r.phrases || []).length ? `<div><div class="rt-h">Phrases to reuse</div><div style="display:flex;gap:6px;flex-wrap:wrap">${r.phrases.map((x) => `<span class="rt-chip acc" style="cursor:default">${esc(x)} <span data-rt="psave" data-text="${esc(x)}" data-note="phrase, from a talk" title="Save" style="cursor:default;margin-left:4px">＋</span></span>`).join('')}</div></div>` : ''}
        ${r.fluency || fl ? `<div><div class="rt-h">How it sounded</div>${fl ? `<div class="set-sub" style="margin-bottom:4px">${esc(fl)}</div>` : ''}${r.fluency && r.fluency.note ? `<div>${esc(r.fluency.note)}</div>` : ''}${r.fluency && r.fluency.tips.length ? r.fluency.tips.map((x) => `<div style="display:flex;gap:6px"><b style="color:var(--accent)">→</b><span>${esc(x)}</span></div>`).join('') : ''}</div>` : ''}
        ${r.next ? `<div><div class="rt-h">Next time</div><div>${esc(r.next)}</div></div>` : ''}
        <div><button class="btn" data-rt="treview" data-id="${esc(t.id)}">Review again</button></div></div>`
    }
    const lines = (t.record || []).map((x) => `<div style="display:flex;gap:8px;margin-bottom:6px;${x.aside ? 'opacity:.5' : ''}"><b style="min-width:52px;color:${x.who === 'you' ? 'var(--accent)' : 'var(--text-2)'}">${x.who === 'you' ? 'You' : 'Coach'}</b><span>${esc(x.text)}${x.interrupted ? ' …' : ''}</span></div>`).join('')
    return `<div class="rt-sc" id="rt-sc"><div class="rt-wrap">${head}${S.error ? `<p class="error" style="margin:0">${esc(S.error)}</p>` : ''}${S.pr.note ? `<div class="set-sub">${esc(S.pr.note)}</div>` : ''}${rev}
      ${lines ? `<details class="rt-card" ${r ? '' : 'open'}><summary class="rt-h" style="cursor:default">The talk · ${t.turns} lines${t.brain ? ' · coach: ' + esc({ claude: 'Claude (Sonnet)', 'claude-quick': 'Claude (Haiku)', voicecho: 'speech server (before Retell 0.21)' }[t.brain] || t.brain) : ''}</summary><div style="margin-top:8px">${lines}</div></details>` : ''}</div></div>`
  }
  // ── phrase review: one card at a time ──
  // the words of a phrase, with contractions spelt out (Whisper writes "that is" for "that's" and the other way round)
  const CONTR = [[/\bwon't\b/g, 'will not'], [/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/n't\b/g, ' not'], [/'re\b/g, ' are'], [/'ll\b/g, ' will'], [/'ve\b/g, ' have'], [/'m\b/g, ' am'], [/'d\b/g, ' would'], [/\b(it|that|what|there|here|he|she|who|where|how|let)'s\b/g, '$1 is']]
  const words = (t) => { let x = String(t).toLowerCase().replace(/[’‘]/g, "'"); for (const [re, to] of CONTR) x = x.replace(re, to); return x.replace(/\blet is\b/g, 'let us').replace(/[^a-z0-9'\s-]/g, ' ').split(/[\s-]+/).filter(Boolean) }
  // which words of the phrase she said, in order (the longest common run of words): {marks, score}
  const sayDiff = (phrase, said) => {
    const a = words(phrase), b = words(said), L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
    const hit = new Set(); for (let i = 0, j = 0; i < a.length && j < b.length;) { if (a[i] === b[j]) { hit.add(i); i++; j++ } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++ }
    return { score: a.length ? hit.size / a.length : 0, hit }
  }
  const firstLetters = (t) => String(t).split(/\s+/).map((w) => w.replace(/^([^A-Za-z]*[A-Za-z])([A-Za-z']*)/, (m, f, r) => f + r.replace(/[A-Za-z']/g, '·'))).join(' ')
  const rvHeard = (text) => {
    const rv = S.pr.rv, it = rv && rv.items[rv.i]; if (!it) return
    const d = sayDiff(it.text, text); rv.said = { text, score: d.score, hit: [...d.hit] }; rv.phase = 'back'
  }
  const reviewHtml = () => {
    const rv = S.pr.rv, it = rv.items[rv.i]
    const head = `<div class="rt-phead"><button class="btn" data-rt="rvexit">${IC.back}Practice</button><span class="rt-ttl">🔁 My phrases${it ? ` · ${rv.i + 1} of ${rv.items.length}` : ''}</span></div>`
    const wrap = (x) => `<div class="rt-sc" id="rt-sc"><div class="rt-wrap">${head}${S.error ? `<p class="error" style="margin:0">${esc(S.error)}</p>` : ''}${x}</div></div>`
    if (!it) {
      const n = rv.done.length, ag = rv.done.filter((g) => g === 'again').length
      return wrap(`<div class="rt-card" style="display:flex;flex-direction:column;gap:8px"><b style="font-size:15px">Done: ${n} phrase${n === 1 ? '' : 's'}</b><div class="set-sub">${ag ? `${ag} came back once more. ` : ''}Each one will come back when it is due; a reminder comes once a day.</div><div><button class="btn primary" data-rt="rvexit">Back to Practice</button></div></div>`)
    }
    if (!it.card) return wrap(`<div class="rt-card"><span class="rt-chip ${rv.cards === 'error' ? 'bad' : 'acc'}">${rv.cards === 'error' ? 'Could not make the card' : 'Making the card…'}</span> <span class="set-sub">${rv.cards === 'error' ? '' : 'Claude writes what the phrase means and when it is said (once per phrase)'}</span>${rv.cards === 'error' ? ' <button class="btn" data-rt="rvcards">Try again</button>' : ''} <button class="btn" data-rt="rvshow" style="margin-left:6px">Show the phrase</button></div>`)
    const c = it.card, R = S.pr.rec
    const front = `<div class="set-sub">Say it in English</div><div class="rt-rv-ru">${esc(c.ru)}</div>${c.hint ? `<div class="set-sub">${esc(c.hint)}</div>` : ''}${rv.hint ? `<div class="rt-rv-fl">${esc(firstLetters(it.text))}</div>` : ''}`
    if (rv.phase === 'front') {
      const rec = R && R.state !== 'done' ? recHtml() : `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-rt="recstart">🎙 Say it</button><button class="btn" data-rt="rvshow">Show the answer</button>${rv.hint ? '' : '<button class="btn" data-rt="rvhint">Hint: first letters</button>'}</div>`
      return wrap(`<div class="rt-card rt-rv">${front}<div style="margin-top:6px">${rec}</div></div>`)
    }
    const said = rv.said, ws = String(it.text).split(/\s+/), hit = said ? new Set(said.hit) : null
    let wi = 0
    const phrase = ws.map((w) => { const n = words(w).length; const on = !hit || !n || [...Array(n).keys()].some((k) => hit.has(wi + k)); wi += n; return hit && n && !on ? `<span class="rt-rv-miss">${esc(w)}</span>` : esc(w) }).join(' ')
    const sug = !said ? '' : said.score >= 0.95 ? 'good' : said.score >= 0.7 ? 'hard' : 'again'
    const G = [['again', 'Again'], ['hard', 'Hard'], ['good', 'Good'], ['easy', 'Easy']]
    return wrap(`<div class="rt-card rt-rv">${front}
      <div class="rt-rv-en">${phrase}</div>
      ${said ? `<div class="set-sub">You said: “${esc(said.text)}” · <b style="color:${said.score >= 0.95 ? 'var(--me)' : said.score >= 0.7 ? 'var(--text-2)' : 'var(--danger)'}">${Math.round(said.score * 100)}% of the words</b>${said.score < 1 ? ' (the struck-through ones were missing)' : ''}</div>` : ''}
      <div style="display:flex;gap:6px;flex-wrap:wrap">${sayBtn(it.text)}${said ? '' : '<button class="btn" data-rt="recstart">🎙 Say it now</button>'}</div>
      ${c.example ? `<div style="margin-top:4px"><div class="set-sub">Example</div><div>${esc(c.example)}</div><div style="margin-top:4px">${sayBtn(c.example)}</div></div>` : ''}
      ${R && R.state !== 'done' ? `<div>${recHtml()}</div>` : ''}
      <div><div class="set-sub" style="margin:6px 0 4px">How well did you know it?</div><div class="rt-rv-grades">${G.map(([g, l]) => `<button class="btn ${sug === g || (!sug && g === 'good') ? 'primary' : ''}" data-rt="rvgrade" data-g="${g}"><b>${l}</b><span>${esc(it.next[g])}</span></button>`).join('')}</div></div></div>`)
  }
  // ── a live talk, here in Echo's window ──
  // The microphone goes to the speech server's Realtime transcription (standard events: speech started / stopped, the
  // text of each stretch). After she stops (and a moment to go on), her words go to the coach (`talk_reply`); its text
  // is read as it is written (`talk_poll`) and voiced sentence by sentence (`talk_say`), played here in order.
  // Speech over the coach's voice: quieter at once; then a quick judge says whether it was meant for the coach (stop and
  // answer) or not (go on, and the coach hears it as a side note). What she says that is the coach's own voice coming
  // back through the speakers is dropped (headphones avoid it altogether).
  const TA = new Audio()
  const TK_WAIT = { short: 600, normal: 1400, long: 2800 }
  const nap = (ms) => new Promise((res) => setTimeout(res, ms))
  const tkWords = (t) => String(t).toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean)
  const tkBusy = (T) => !!(T && ((T.reply && !T.reply.done) || T.q.length || T.playing))
  const tkState = (T) => (T.playing ? 'speaking' : T.reply && !T.reply.done ? 'thinking' : T.waitT ? 'waiting' : 'listening')
  const tkDuck = (T, on) => { T.duck = on; TA.volume = on ? 0.25 : 1 }
  const tkPaintSoon = () => { if (S.view !== 'practice' || !S.tk) return; clearTimeout(S.tk.paintT); S.tk.paintT = setTimeout(() => { if (S.tk) { ctx.render(); const l = $('rt-tklog'); if (l) l.scrollTop = l.scrollHeight } }, 60) }
  const tkLog = (T, what) => { T.ev.push(`${T.t0 ? ((Date.now() - T.t0) / 1000).toFixed(1) : '-'} ${what}`); if (T.ev.length > 200) T.ev.shift() }
  const tkLine = (T, who, text, extra) => { T.lines.push(Object.assign({ who, text }, extra || {})); tkPaintSoon() }
  // One after another, in the order said: the review is written from the record.
  const tkTurn = (T, turn) => { T.turnChain = (T.turnChain || Promise.resolve()).then(() => ctx.call('talk_turn', { id: T.id, turn })).catch(() => {}); return T.turnChain }
  // the coach's own voice heard back through the speakers: most of its words are in what it said just now
  const tkEcho = (T, text) => {
    const w = tkWords(text); if (w.length < 2) return false
    const said = new Set(tkWords(T.recent.filter((x) => Date.now() - x.at < 15000).map((x) => x.text).join(' ')))
    return w.filter((x) => said.has(x)).length / w.length >= 0.7
  }

  // the speaker: sentences voiced one after another (the server does one at a time), played in order
  const tkSpeak = (T, text) => {
    const job = { text }
    job.p = T.sayChain = T.sayChain.catch(() => {}).then(() => ctx.call('talk_say', { id: T.id, text })).then((r) => `/plugin/${ID}/store/${r.file}`)
    job.p.catch(() => {})
    T.q.push(job); tkPlay(T)
  }
  const tkPlay = async (T) => {
    if (T.playing || !T.q.length || S.tk !== T) return
    const job = T.q[0]; T.playing = true; tkPaintSoon()
    let src = null
    try { src = await job.p } catch (e) { T.note = 'The voice failed: ' + (e.message || e); tkLog(T, 'voice failed: ' + (e.message || e)) }
    tkLog(T, (src ? 'play: ' : 'no voice: ') + job.text.slice(0, 40))
    if (src && S.tk === T && T.q[0] === job) {
      TA.src = src; TA.volume = T.duck ? 0.25 : 1
      T.recent.push({ text: job.text, at: Date.now() })
      await new Promise((res) => { T.stopAudio = res; TA.onended = res; TA.onerror = res; TA.play().catch(res) })
      T.stopAudio = null
      if (T.q[0] === job) T.spoken.push(job.text)
    }
    if (T.q[0] === job) T.q.shift()
    T.playing = false; tkPaintSoon(); tkPlay(T)
  }
  const tkSilence = (T) => { T.q = []; try { TA.pause() } catch (e) { /* stopped */ } if (T.stopAudio) T.stopAudio() }

  // her turn is over: the coach answers, its words spoken from the first sentence on
  const tkAnswer = async (T) => {
    T.waitT = null
    if (S.tk !== T || !T.pending.length || T.phase !== 'live') return
    const heard = T.pending.join(' '), segs = T.segs; T.pending = []; T.segs = []
    tkLog(T, 'answer: ' + heard.slice(0, 60))
    const notes = []
    if (T.overheard.length) notes.push(`(Heard in the room while you talked, not for you: ${T.overheard.map((x) => `"${x}"`).join(' / ')})`)
    if (T.interrupted) notes.push(`(They cut in after you had said: "${T.interrupted.slice(-500)}". Answer them; if it was a quick question, then go on from where you stopped.)`)
    T.overheard = []; T.interrupted = ''
    const rep = T.reply = { done: false, cancelled: false, started: false, skip: false, sent: 0, t0: Date.now() }
    T.spoken = []; tkPaintSoon()
    let buf = ''
    try {
      const r = await ctx.call('talk_reply', { id: T.id, text: [...notes, heard].join('\n') })
      let from = 0
      while (S.tk === T && !rep.cancelled) {
        await nap(150)
        const p = await ctx.call('talk_poll', { rid: r.rid, from })
        if (p.gone) break
        from += p.text.length; buf += p.text
        if (!rep.started && !rep.skip) {
          const t = buf.trimStart().toLowerCase()
          if (t.startsWith('[skip]')) rep.skip = true
          else if (t.length >= 6 || (p.done && t)) { rep.started = true; rep.first = Date.now() - rep.t0 }
        }
        if (rep.started && !rep.cancelled) {   // each finished sentence goes to the voice at once
          for (let m; (m = buf.slice(rep.sent).match(/^([\s\S]*?[.!?…]["”')]*)\s+/));) { rep.sent += m[0].length; if (m[1].trim()) tkSpeak(T, m[1].trim()) }
          if (p.done) { const rest = buf.slice(rep.sent).trim(); rep.sent = buf.length; if (rest) tkSpeak(T, rest) }
        }
        if (p.error) T.note = 'The coach could not answer: ' + p.error
        if (p.done) break
      }
    } catch (e) { T.note = 'The coach could not answer: ' + (e.message || e) }
    rep.done = true
    const text = buf.trim()
    if (rep.skip) { T.note = '(heard, not answered)'; tkTurn(T, { who: 'you', text: heard, segments: segs }) }
    else if (rep.cancelled) {
      const said = T.spoken.join(' ').trim()
      if (said) { tkLine(T, 'coach', said, { interrupted: true }); tkTurn(T, { who: 'coach', text: said, interrupted: true }) }
      if (!rep.started) {   // she went on before it spoke: answer it all together, once she is done
        T.pending.unshift(heard); T.segs = segs.concat(T.segs)
        if (!tkHearing(T) && !T.judging) tkWaitThenAnswer(T, 300)
      } else tkTurn(T, { who: 'you', text: heard, segments: segs })
    } else { tkTurn(T, { who: 'you', text: heard, segments: segs }); if (text) { tkLine(T, 'coach', text, { latency: rep.first }); tkTurn(T, { who: 'coach', text, latency_ms: rep.first }) } }
    tkLog(T, `reply ${rep.skip ? 'skip' : rep.cancelled ? 'cancelled' : 'done'} first=${rep.first || '-'}ms len=${text.length}`)
    tkPaintSoon()
  }
  // She may go on after a pause: never answer while she speaks or while a stretch of hers is still being written down
  // (the last one written down arms the wait again).
  const tkHearing = (T) => Object.keys(T.seg).length > 0 || T.judging > 0
  const tkWaitThenAnswer = (T, ms) => { clearTimeout(T.waitT); T.waitT = tkHearing(T) ? null : setTimeout(() => (tkHearing(T) ? (T.waitT = null) : tkAnswer(T)), ms); tkPaintSoon() }
  const tkHeard = (T, text, seg, ms) => {
    tkLine(T, 'you', text); T.pending.push(text); T.segs.push(seg); tkDuck(T, false)
    tkWaitThenAnswer(T, ms != null ? ms : TK_WAIT[S.pr.twait] || TK_WAIT.normal)
  }
  const tkStop = (T) => {   // the coach stops talking (and writing) for her
    tkLog(T, 'coach stops')
    T.interrupted = [...T.spoken, ...(T.q[0] ? [T.q[0].text] : [])].join(' ')
    tkSilence(T)
    if (T.reply && !T.reply.done) { T.reply.cancelled = true; ctx.call('talk_cancel', {}).catch(() => {}) }
  }
  const tkStt = (T, ev) => {
    if (S.tk !== T || T.phase !== 'live') return
    switch (ev.type) {
      case 'input_audio_buffer.speech_started':
        tkLog(T, 'speech started' + (tkBusy(T) ? ' (coach busy)' : ''))
        T.seg[ev.item_id] = { start_ms: +ev.audio_start_ms || 0 }
        if (tkBusy(T)) tkDuck(T, true)
        clearTimeout(T.waitT); T.waitT = null                        // she goes on: wait for the whole thought
        if (T.reply && !T.reply.done && !T.reply.started) { T.reply.cancelled = true; ctx.call('talk_cancel', {}).catch(() => {}) }
        tkPaintSoon(); break
      case 'input_audio_buffer.speech_stopped': (T.seg[ev.item_id] = T.seg[ev.item_id] || {}).end_ms = +ev.audio_end_ms || 0; break
      case 'conversation.item.input_audio_transcription.failed': delete T.seg[ev.item_id]; tkDuck(T, false); if (T.pending.length && !tkBusy(T)) tkWaitThenAnswer(T, TK_WAIT[S.pr.twait] || TK_WAIT.normal); break
      case 'conversation.item.input_audio_transcription.completed': {
        const text = String(ev.transcript || '').trim(), sg = T.seg[ev.item_id] || {}; delete T.seg[ev.item_id]
        tkLog(T, 'heard: ' + text.slice(0, 60))
        if (!/[a-z0-9]/i.test(text) || tkEcho(T, text)) { tkDuck(T, false); if (T.pending.length && !tkBusy(T)) tkWaitThenAnswer(T, 300); break }
        const seg = { text, start_ms: sg.start_ms || 0, end_ms: sg.end_ms || sg.start_ms || 0 }
        if (!tkBusy(T)) { tkHeard(T, text, seg); break }
        // over the coach's voice: meant for it?
        const saying = [...T.spoken, ...T.q.map((x) => x.text)].join(' ')
        const before = T.lines.filter((x) => x.who === 'you' && !x.aside).map((x) => x.text).slice(-1)[0] || ''
        T.judging++; tkLog(T, 'judge: ' + text.slice(0, 50))
        ctx.call('talk_judge', { heard: text, saying, before }).then((r) => r.stop, () => true).then((stop) => {
          T.judging--; tkLog(T, 'judge → ' + (stop ? 'stop' : 'go on'))
          if (S.tk !== T) return
          if (stop) { tkStop(T); tkHeard(T, text, seg, 300) } else {
            tkLine(T, 'you', text, { aside: true }); T.overheard.push(text); tkTurn(T, { who: 'you', text, aside: true }); tkDuck(T, false)
            if (T.pending.length && !tkBusy(T)) tkWaitThenAnswer(T, TK_WAIT[S.pr.twait] || TK_WAIT.normal)
          }
        })
        break
      }
      case 'error': T.note = 'Speech server: ' + ((ev.error && ev.error.message) || 'error'); tkPaintSoon(); break
    }
  }
  const tkRelease = (T) => {
    clearTimeout(T.waitT); clearInterval(T.clock)
    try { if (T.node) T.node.onaudioprocess = null } catch (e) { /* gone */ }
    try { if (T.stream) T.stream.getTracks().forEach((x) => x.stop()) } catch (e) { /* closed */ }
    try { ctx.microphone.close() } catch (e) { /* closed */ }
    try { if (T.ac) T.ac.close() } catch (e) { /* closed */ }
    try { if (T.ws) { T.ws.onclose = null; T.ws.close() } } catch (e) { /* closed */ }
    tkSilence(T)
  }
  const tkStart = async (cur) => {
    if (S.tk) return
    const T = S.tk = { id: '', title: cur.name, phase: 'starting', lines: [], q: [], spoken: [], recent: [], pending: [], segs: [], seg: {}, overheard: [], interrupted: '', sayChain: Promise.resolve(), note: '', queue: [], t0: 0, ev: [], judging: 0 }
    try { if (localStorage.getItem('retell.debug')) window.__retellTalk = T } catch (e) { /* none */ }   // its event log, for tests
    S.pr.talk = null; S.error = ''; ctx.render()
    try {
      // the microphone first, while the click is fresh (Echo opens it only then)
      if (!(ctx.microphone && ctx.microphone.open)) throw new Error('This Echo can\'t give the microphone to plugins: update Echo')
      T.stream = await ctx.microphone.open({ echoCancellation: true, noiseSuppression: true, autoGainControl: true })
      const ac = T.ac = new AudioContext({ sampleRate: 24000 }), node = T.node = ac.createScriptProcessor(2048, 1, 1)
      node.onaudioprocess = (e) => {
        if (T.phase !== 'live') return
        const f = e.inputBuffer.getChannelData(0), pcm = Int16Array.from(f, (x) => Math.max(-1, Math.min(1, x)) * 32767)
        const m = JSON.stringify({ type: 'input_audio_buffer.append', audio: toB64(pcm) })
        if (T.ws && T.ws.readyState === 1) T.ws.send(m); else if (T.queue && T.queue.length < 400) T.queue.push(m)
      }
      ac.createMediaStreamSource(T.stream).connect(node); node.connect(ac.destination)   // (it writes silence: nothing is heard)
      const r = await ctx.call('talk_start', { ids: cur.ids, level: S.pr.level, scopeName: cur.name, correct: S.pr.tcorrect, brain: S.pr.tbrain })
      T.id = r.id; T.title = r.title
      T.ws = await openStt('Um, well, uh, you know… ' + (r.terms || []).join(', '), (ev) => tkStt(T, ev))
      if (S.tk !== T) { tkRelease(T); return }
      T.ws.onclose = () => { if (S.tk === T && T.phase === 'live') { T.note = 'The speech server closed the listening session: press Finish and start again.'; tkPaintSoon() } }
      T.queue.forEach((m) => T.ws.send(m)); T.queue = null
      T.phase = 'live'; T.t0 = Date.now()
      T.clock = setInterval(() => { const c = $('rt-tkclock'); if (c) c.textContent = mmss2(Date.now() - T.t0); const st = $('rt-tkst'); if (st) st.textContent = TKS[tkState(T)] }, 500)
      tkLine(T, 'coach', r.greeting)
      for (const x of String(r.greeting).match(/[^.!?]+[.!?]+["”')]*\s*|[^.!?]+$/g) || [r.greeting]) if (x.trim()) tkSpeak(T, x.trim())   // the first sentence sounds sooner
    } catch (e) {
      tkRelease(T); if (S.tk === T) S.tk = null
      S.error = (e.name === 'NotAllowedError' ? 'The microphone is blocked: allow it for Echo in Windows settings. ' : '') + (e.message || String(e))
      if (T.id) ctx.call('talk_finish', { id: T.id, why: S.error }).catch(() => {})
      await prRefresh(); ctx.render()
    }
  }
  const tkFinish = async (why) => {
    const T = S.tk; if (!T || T.phase === 'ending') return
    T.phase = 'ending'; tkStop(T); tkRelease(T); ctx.render()
    // what she said last, not answered yet, is still part of the talk
    if (T.pending.length && T.id) await tkTurn(T, { who: 'you', text: T.pending.join(' '), segments: T.segs })
    let v = null
    try { if (T.id) v = await ctx.call('talk_finish', { id: T.id, why: why || '' }) } catch (e) { S.error = e.message || String(e) }
    S.tk = null
    if (v) { try { S.pr.talk = await ctx.call('talk_get', { id: T.id }) } catch (e) { /* gone */ } }
    await prRefresh(); prPoll(); ctx.render()
  }
  const TKS = { listening: '🎙 Listening', waiting: '… your turn: go on, or wait for the coach', thinking: '💭 The coach is thinking…', speaking: '🔊 The coach is speaking' }
  const tkHtml = () => {
    const T = S.tk
    const head = `<div class="rt-phead"><span class="rt-ttl">🎙 ${esc(T.title)}</span><span class="set-sub" id="rt-tkclock">${T.t0 ? mmss2(Date.now() - T.t0) : ''}</span><button class="btn primary" data-rt="tkfin" ${T.phase === 'ending' ? 'disabled' : ''}>${T.phase === 'ending' ? 'Finishing…' : 'Finish'}</button></div>`
    const st = T.phase === 'starting' ? 'Opening the microphone and the coach…' : T.phase === 'ending' ? 'Finishing…' : TKS[tkState(T)]
    const lines = T.lines.map((x) => `<div style="display:flex;gap:8px;margin-bottom:6px;${x.aside ? 'opacity:.5' : ''}"><b style="min-width:52px;color:${x.who === 'you' ? 'var(--accent)' : 'var(--text-2)'}">${x.who === 'you' ? 'You' : 'Coach'}</b><span>${esc(x.text)}${x.interrupted ? ' …' : ''}${x.aside ? ' <i>(not for the coach)</i>' : ''}</span></div>`).join('')
    const wait = `<label class="set-sub" for="rt-twait">After you stop, the coach waits</label> <select id="rt-twait">${[['short', 'a little'], ['normal', 'a moment'], ['long', 'longer']].map(([v, l]) => `<option value="${v}" ${S.pr.twait === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`
    return `<div class="rt-sc" id="rt-sc"><div class="rt-wrap">${head}${S.error ? `<p class="error" style="margin:0">${esc(S.error)}</p>` : ''}
      <div class="rt-card" style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><b id="rt-tkst">${esc(st)}</b><span style="flex:1"></span>${wait}</div>
        ${T.note ? `<div class="set-sub">${esc(T.note)}</div>` : ''}
        <div id="rt-tklog" style="max-height:52vh;overflow:auto">${lines}</div>
        <div class="set-sub">Talk as in a call: the coach answers when you stop. Headphones help (then it never hears itself). Press Finish for the review.</div>
      </div></div></div>`
  }
  try { const w = localStorage.getItem('retell.twait'); if (TK_WAIT[w]) S.pr.twait = w } catch (e) { /* none */ }
  if (ctx.onUnload) ctx.onUnload(() => { const T = S.tk; if (!T) return; S.tk = null; tkRelease(T); if (T.id) ctx.call('talk_finish', { id: T.id, why: 'The window was closed' }).catch(() => {}) })
  const practiceHtml = () => (S.tk ? tkHtml() : S.pr.quiz ? quizHtml() : S.pr.talk ? talkHtml() : S.pr.rv ? reviewHtml() : prHome())

  const appHtml = () => {
    if (S.view === 'player' && !S.open) S.view = 'listen'
    const player = S.view === 'player' && S.open
    const body = player ? playerHtml() : S.view === 'library' ? libraryHtml() : S.view === 'practice' ? practiceHtml() : listenHtml()
    const mini = !player && S.open && P.i >= 0 ? miniHtml() : ''
    return `<div id="rt-app">${topBar()}<div id="rt-main">${body}${dialogHtml()}</div>${mini}</div>`
  }

  // ── events ──
  ctx.listen('scroll', (ev) => {
    if (ev.target.id === 'rt-sc') S.sc[S.view] = ev.target.scrollTop
    if (ev.target.id === 'rt-left') S.scroll.left = ev.target.scrollTop
    if (ev.target.id === 'rt-right') S.scroll.right = ev.target.scrollTop
  }, true)
  // The selection is taken when the button is pressed (before the click can change it): only text of the two panes.
  ctx.listen('mousedown', (ev) => {
    if (!(ev.target.closest && ev.target.closest('[data-rt="ask"]'))) return
    const sel = window.getSelection ? window.getSelection() : null, n = sel && sel.anchorNode, el = n && (n.nodeType === 1 ? n : n.parentElement)
    S.selText = el && el.closest && el.closest('#rt-left,#rt-right') ? sel.toString().trim().slice(0, 600) : ''
  })
  ctx.listen('keydown', (ev) => {
    const tag = (ev.target && ev.target.tagName) || ''
    if (ev.target.id === 'rt-q' && ev.key === 'Enter') { ev.preventDefault(); sendQ(); return }
    if (ev.key === 'Enter' && S.learn && ['rt-ltnew', 'rt-lask'].includes(ev.target.id)) { ev.preventDefault(); const b = document.querySelector(ev.target.id === 'rt-ltnew' ? '[data-rt="ltadd"]' : '[data-rt="lrefine"]'); if (b) b.click(); return }
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList && ev.target.classList.contains('rt-ghead')) { ev.preventDefault(); S.topen[ev.target.dataset.id] = S.topen[ev.target.dataset.id] === false; ctx.render(); return }
    if (S.view !== 'player' || !S.open || /INPUT|TEXTAREA|SELECT/.test(tag) || S.dlg) return
    if (ev.key === ' ') { ev.preventDefault(); togglePlay() }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); seekSecs(curSecs() + 15) }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); seekSecs(curSecs() - 15) }
    else if (ev.key === 'm' || ev.key === 'M') { S.dtab = S.dtab === 'memo' ? null : 'memo'; ctx.render() }
    else if (ev.key === 't' || ev.key === 'T') { S.dtab = S.dtab === 'terms' ? null : 'terms'; ctx.render() }
  })
  ctx.listen('input', (ev) => {
    if (ev.target.id === 'rt-q' && S.qa) S.qa.draft = ev.target.value
    if (ev.target.id === 'rt-add') { S.draft = ev.target.value; const h = $('rt-addhint'); if (h) h.textContent = addHint() }
    if (ev.target.id === 'rt-tname') S.tdlg.name = ev.target.value
    if (ev.target.id === 'rt-apages') S.addPages = ev.target.value
    if (ev.target.id === 'rt-pans') S.pr.draft = ev.target.value
    if (S.learn && ev.target.id === 'rt-ltopic') { S.learn.form.topic = ev.target.value; S.learn.form.topic_id = '' }
    if (S.learn && ev.target.id === 'rt-lpurpose') S.learn.form.purpose = ev.target.value
    if (S.learn && ev.target.id === 'rt-ltnew') S.learn.newTopic = ev.target.value
    if (S.learn && ev.target.id === 'rt-lask') S.learn.ask = ev.target.value
    if (ev.target.id === 'rt-q2') {
      S.q = ev.target.value; const el = $('rt-lib'); if (el) el.innerHTML = libRows()
      clearTimeout(S.searchT)
      const q = S.q.trim()
      if (q.length >= 2) S.searchT = setTimeout(async () => {
        try { const r = await ctx.call('search', { q }); if (S.q.trim() === q) { S.hits = r; S.hitsQ = q; const e2 = $('rt-lib'); if (e2) e2.innerHTML = libRows() } } catch (e) { /* the titles still match */ }
      }, 250)
    }
  })
  ctx.listen('change', (ev) => {
    if (ev.target.id === 'rt-web' && S.qa) S.qa.web = ev.target.checked
    if (ev.target.id === 'rt-ctx' && S.qa) S.qa.useCtx = ev.target.checked
    if (ev.target.id === 'rt-speed') { P.rate = +ev.target.value; P.audio.playbackRate = P.rate }
    if (ev.target.id === 'rt-tparent') S.tdlg.parent = ev.target.value
    if (ev.target.id === 'rt-alen') S.addLen = ev.target.value
    if (ev.target.id === 'rt-asplit') S.addSplit = ev.target.value
    if (ev.target.id === 'rt-pscope') S.pr.scope = ev.target.value
    if (ev.target.id === 'rt-plevel') S.pr.level = ev.target.value
    if (ev.target.id === 'rt-pn') S.pr.n = +ev.target.value
    if (ev.target.id === 'rt-tcorrect') S.pr.tcorrect = ev.target.value
    if (ev.target.id === 'rt-tbrain') S.pr.tbrain = ev.target.value
    if (ev.target.id === 'rt-twait') { S.pr.twait = ev.target.value; try { localStorage.setItem('retell.twait', S.pr.twait) } catch (e) { /* none */ } }
    if (ev.target.id === 'rt-alang') S.addLang = ev.target.value
    if (ev.target.id === 'rt-mtopic') S.mdlg.topic = ev.target.value
    if (S.learn && ev.target.id === 'rt-lsize') S.learn.form.size = ev.target.value
    if (S.learn && ev.target.id === 'rt-lvid') S.learn.form.videos = ev.target.value === '1'
    if (S.learn && ev.target.id === 'rt-lfresh') S.learn.form.fresh = ev.target.value === '1'
  })

  const goView = async (v) => {
    if (S.tk && v !== 'practice') await tkFinish('You left Practice')
    S.view = v; S.menu = null; S.error = ''
    if (v === 'library' || v === 'listen') await refreshAll()
    if (v === 'library') { await learnRefresh(); learnPoll() }
    if (v === 'practice') { await refreshAll(); await prRefresh(); prPoll() }
    ctx.render()
  }
  ctx.listen('click', async (ev) => {
    const t = ev.target && ev.target.closest && ev.target.closest('[data-rt]')
    if (!t) { if (S.menu) { S.menu = null; ctx.render() } return }
    const d = t.dataset
    if (S.menu && d.rt !== 'menu' && !t.closest('.menu')) S.menu = null
    // terms: a click on a term in either column opens the list and lights the term everywhere
    const termEl = ev.target.closest && ev.target.closest('.rt-term[data-t]')
    if (termEl && S.view === 'player') { ev.stopPropagation(); if (S.dtab !== 'terms') { S.dtab = 'terms'; ctx.render() } flashTerm(+termEl.dataset.t); return }
    switch (d.rt) {
      case 'nav': return goView(d.v)
      case 'add': S.dlg = 'add'; S.error = ''; S.addFiles = []; S.addFocus = true; return ctx.render()
      case 'addpick': {
        try { const r = await ctx.call('pick_file', {}); S.addFiles = addFiles().concat((r && r.files) || []); S.error = '' } catch (e) { S.error = e.message || String(e) }
        return ctx.render()
      }
      case 'addunpick': S.addFiles = addFiles().filter((_, n) => n !== +d.n); return ctx.render()
      case 'dlgclose': S.dlg = null; S.error = ''; return ctx.render()
      case 'addgo': {
        const v = S.draft.trim(), files = addFiles()
        if (!v && !files.length) { S.error = 'Paste a link or some text, or choose a file first'; return ctx.render() }
        if (v && !itemsOf(v).length && looksLikePath(v)) { S.error = 'Echo reads only a file you choose: press “Choose a file…” and pick it.'; return ctx.render() }
        const items = itemsOf(v), base = { length: S.addLen, lang: S.addLang, pages: S.addPages, split: S.addSplit }
        S.starting = true; S.error = ''; ctx.render()
        try {
          if (v) for (const it of items.length ? items : [null]) await ctx.call('start', Object.assign({}, base, it || { text: v }))
          for (const f of files) await ctx.call('start', Object.assign({}, base), { files: [f] })
          S.draft = ''; S.addFiles = []; S.dlg = null; S.view = 'library'
        } catch (e) { S.error = e.message || String(e) }
        S.starting = false; return load()
      }
      case 'pmake': {
        const sc = scopeList(), cur = sc.find((x) => x.v === S.pr.scope) || sc[0]; if (!cur) return
        S.pr.busy = true; S.error = ''; ctx.render()
        try { const r = await ctx.call('quiz_make', { ids: cur.ids, n: S.pr.n, level: S.pr.level, scopeName: cur.name }); S.pr.quiz = await ctx.call('quiz_get', { id: r.id }); S.pr.qi = 0; S.pr.draft = ''; prPoll() } catch (e) { S.error = e.message || String(e) }
        S.pr.busy = false; return ctx.render()
      }
      case 'popen': { try { S.pr.quiz = await ctx.call('quiz_get', { id: d.id }); const k = S.pr.quiz.questions.findIndex((x) => !S.pr.quiz.answers[x.id]); S.pr.qi = k < 0 ? S.pr.quiz.questions.length : k; S.pr.draft = ''; S.error = ''; prPoll() } catch (e) { S.error = e.message || String(e) } return ctx.render() }
      case 'pdel': try { await ctx.call('quiz_delete', { id: d.id }) } catch (e) { /* gone */ } await prRefresh(); return ctx.render()
      case 'lopen': S.learn = { tab: d.lt || 'new', form: LF0(), draft: null, sug: null, note: '' }; S.error = ''; await learnRefresh(); learnPoll(); return ctx.render()
      case 'lclose': S.learn = null; S.error = ''; await refreshAll(); return ctx.render()
      case 'ltab': if (S.learn) { S.learn.tab = d.lt; S.learn.note = '' } return ctx.render()
      case 'lback': if (S.learn) { S.learn.draft = null; S.learn.tab = 'new' } await learnRefresh(); return ctx.render()
      case 'ltadd': {
        const t = (S.learn.newTopic || '').trim(); if (!t) return
        try { S.lt = await ctx.call('ltopic_save', { topic: t, status: 'approved' }); S.learn.newTopic = ''; S.error = '' } catch (e) { S.error = e.message || String(e) }
        return ctx.render()
      }
      case 'ltset': try { S.lt = await ctx.call('ltopic_save', { id: d.id, status: d.s }) } catch (e) { S.error = e.message || String(e) } return ctx.render()
      case 'ltdel': try { S.lt = await ctx.call('ltopic_delete', { id: d.id }) } catch (e) { S.error = e.message || String(e) } return ctx.render()
      case 'ltmake': case 'ltpick': { const x = S.lt.find((y) => y.id === d.id); if (x) { S.learn.form.topic = x.topic; S.learn.form.topic_id = x.id; S.learn.form.purpose = S.learn.form.purpose || x.why || '' } S.learn.tab = 'new'; return ctx.render() }
      case 'lsuggest': try { S.learn.sug = await ctx.call('ltopics_suggest', {}); learnPoll() } catch (e) { S.error = e.message || String(e) } return ctx.render()
      case 'lmake': {
        const F = S.learn.form; if (!F.topic.trim()) { S.error = 'Name the topic first'; return ctx.render() }
        try { await ctx.call('lpack_make', F); S.learn.form = LF0(); S.error = ''; S.learn.note = ''; await learnRefresh(); learnPoll() } catch (e) { S.error = e.message || String(e) }
        return ctx.render()
      }
      case 'lpopen': try { S.learn.draft = await ctx.call('lpack_get', { id: d.id }); S.learn.ask = ''; S.error = '' } catch (e) { S.error = e.message || String(e) } return ctx.render()
      case 'lpdel': try { await ctx.call('lpack_discard', { id: d.id }); if (S.learn && S.learn.draft && S.learn.draft.id === d.id) S.learn.draft = null; await learnRefresh() } catch (e) { S.error = e.message || String(e) } return ctx.render()
      case 'lquick': case 'lrefine': {
        const g = S.learn && S.learn.draft; if (!g) return
        const w = t.dataset.rt === 'lquick' ? d.q : (S.learn.ask || '').trim(); if (!w) return
        try { await ctx.call('lpack_refine', { id: g.id, ask: w }); S.learn.ask = ''; S.learn.draft = await ctx.call('lpack_get', { id: g.id }); S.error = ''; await learnRefresh(); learnPoll() } catch (e) { S.error = e.message || String(e) }
        return ctx.render()
      }
      case 'lkeep': {
        const g = S.learn && S.learn.draft; if (!g) return
        try { await ctx.call('lpack_keep', { id: g.id }); S.learn.draft = null; S.learn.tab = 'new'; S.learn.note = `“${g.pack.title}” is in Library now (a topic with ${g.pack.items.length} items: press 🎧 Retell on one to listen).`; S.error = ''; await learnRefresh(); await refreshAll() } catch (e) { S.error = e.message || String(e) }
        return ctx.render()
      }
      case 'rvstart': {
        try { const r = await ctx.call('review_start', { max: 20 }); S.pr.rv = { items: r.items, i: 0, phase: 'front', said: null, hint: false, done: [], cards: r.cards }; S.error = ''; prPoll() } catch (e) { S.error = e.message || String(e) }
        return ctx.render()
      }
      case 'rvshow': if (S.pr.rv) { recCancel(); S.pr.rv.phase = 'back'; S.pr.rv.said = null } return ctx.render()
      case 'rvhint': if (S.pr.rv) S.pr.rv.hint = true; return ctx.render()
      case 'rvcards': try { await ctx.call('review_cards_retry', {}); S.pr.rv.cards = 'making'; prPoll() } catch (e) { S.error = e.message || String(e) } return ctx.render()
      case 'rvgrade': {
        const rv = S.pr.rv, it = rv && rv.items[rv.i]; if (!it) return
        try {
          await ctx.call('review_grade', { id: it.id, grade: d.g, score: rv.said ? rv.said.score : null })
          rv.done.push(d.g)
          if (d.g === 'again' && !it.again) rv.items.push({ ...it, again: true, next: { again: '10 min', hard: '12 h', good: '1 d', easy: '4 d' } })   // once more at the end
          rv.i += 1; rv.phase = 'front'; rv.said = null; rv.hint = false; S.error = ''; recCancel()
          if (rv.items[rv.i] && !rv.items[rv.i].card) prPoll()
        } catch (e) { S.error = e.message || String(e) }
        return ctx.render()
      }
      case 'rvexit': recCancel(); S.pr.rv = null; S.error = ''; await prRefresh(); return ctx.render()
      case 'tstart': {
        const sc = scopeList(), cur = sc.find((x) => x.v === S.pr.scope) || sc[0]; if (!cur) return
        return tkStart(cur)
      }
      case 'tkfin': return tkFinish()
      case 'topen': try { S.pr.talk = await ctx.call('talk_get', { id: d.id }); S.error = ''; prPoll() } catch (e) { S.error = e.message || String(e) } return ctx.render()
      case 'texit': S.pr.talk = null; S.error = ''; await prRefresh(); prPoll(); return ctx.render()
      case 'treview': try { await ctx.call('talk_review', { id: d.id }); if (S.pr.talk) S.pr.talk = await ctx.call('talk_get', { id: d.id }); else await prRefresh(); prPoll() } catch (e) { S.error = e.message || String(e) } return ctx.render()
      case 'tdel': try { await ctx.call('talk_delete', { id: d.id }) } catch (e) { S.error = e.message || String(e) } await prRefresh(); return ctx.render()
      case 'pexit': recCancel(); S.pr.spoken = null; S.pr.quiz = null; S.error = ''; await prRefresh(); return ctx.render()
      case 'pagain': { const q = S.pr.quiz, ids = q.articles; S.pr.quiz = null; try { const r = await ctx.call('quiz_make', { ids, n: q.n, level: q.level, scopeName: q.scopeName }); S.pr.quiz = await ctx.call('quiz_get', { id: r.id }); S.pr.qi = 0; S.pr.draft = ''; prPoll() } catch (e) { S.error = e.message || String(e) } return ctx.render() }
      case 'pgo': recCancel(); S.pr.qi = +d.i; S.pr.draft = ''; S.pr.spoken = null; return ctx.render()
      case 'pnext': recCancel(); S.pr.qi += 1; S.pr.draft = ''; S.pr.spoken = null; S.error = ''; S.pr.focus = true; return ctx.render()
      case 'recstart': return recStart()
      case 'recstop': return recStop()
      case 'reccancel': return recCancel()
      case 'pchoice': case 'ptf': case 'pskip': case 'pcheck': case 'pretry': {
        const q = S.pr.quiz, qu = q.questions[S.pr.qi]; S.error = ''
        const body = { id: q.id, qid: qu.id }
        if (d.rt === 'pchoice') body.choice = +d.i; else if (d.rt === 'ptf') body.value = d.v === 'true'; else if (d.rt === 'pskip') body.skip = true; else { body.text = S.pr.draft; if (S.pr.spoken) body.spoken = S.pr.spoken }
        if (d.rt === 'pretry') { const old = q.answers[qu.id] || {}; body.text = old.text || S.pr.draft; if (old.spoken) body.spoken = old.spoken }
        try { await ctx.call('quiz_check', body); S.pr.quiz = await ctx.call('quiz_get', { id: q.id }); S.pr.draft = ''; prPoll() } catch (e) { S.error = e.message || String(e) }
        return ctx.render()
      }
      case 'psay': return sayPlay(d.text)
      case 'psave': try { S.pr.phrases = await ctx.call('phrase_add', { text: d.text, note: d.note }); S.pr.note = 'Saved to My phrases.' } catch (e) { S.error = e.message || String(e) } ctx.render(); setTimeout(() => { S.pr.note = ''; if (S.view === 'practice') ctx.render() }, 1800); return
      case 'pdelphrase': try { S.pr.phrases = await ctx.call('phrase_delete', { id: d.id }) } catch (e) { /* gone */ } return ctx.render()
      case 'mictest': return micTest()
      case 'cont': return openArticle(d.id, true)
      case 'restart': {
        try { await ctx.call('progress', { id: d.id, frac: 0, b: 0, t: 0 }) } catch (e) { /* ignore */ }
        if (S.open && S.open.entry.id === d.id) { stopPlayer(); S.open = null }
        await refreshAll(); return openArticle(d.id, true)
      }
      case 'open': return openArticle(d.id, false)
      case 'gotoplayer': S.view = 'player'; S.scrollCur = true; return ctx.render()
      case 'mplay': return togglePlay()
      case 'menu': S.menu = S.menu === d.id ? null : d.id; return ctx.render()
      case 'flt': S.filter = d.f; return ctx.render()
      case 'ttoggle': S.topen[d.id] = S.topen[d.id] === false; return ctx.render()
      case 'pin': return act('pin', { id: d.id, on: d.on === '1' })
      case 'del': if (S.open && S.open.entry.id === d.id) { stopPlayer(); S.open = null } return act('delete', { id: d.id })
      case 'cleanup': return act('cleanup')
      case 'clear': if (confirm('Delete all articles, including the pinned ones?')) { stopPlayer(); S.open = null; return act('clear') } return
      case 'vhome': return act('voice', { id: d.id })
      case 'vstop': if (d.id) return act('stop', { id: d.id }); try { await ctx.call('stop', { id: S.open.entry.id }) } catch (e) { /* nothing running */ } return
      case 'recheck2': try { await ctx.call('recheck', { id: d.id }); S.menu = null; if (S.open && S.open.entry.id === d.id) { stopPlayer(); S.open = null } } catch (e) { S.error = e.message || String(e) } return load()
      case 'dmore': S.dall[d.d] = true; return ctx.render()
      case 'dstart': S.itemDlg = { d: d.d, n: +d.n }; S.dlg = 'item'; S.error = ''; return ctx.render()
      case 'itemgo': {
        const dg = S.digests.find((x) => x.id === S.itemDlg.d), it = dg && dg.items[S.itemDlg.n]; if (!it) { S.dlg = null; return ctx.render() }
        S.starting = true; S.error = ''; ctx.render()
        try { await ctx.call('start', { url: it.url, title: it.title, topic: 'd:' + dg.id, length: S.addLen, lang: S.addLang }); S.dlg = null } catch (e) { S.error = e.message || String(e) }
        S.starting = false; return load()
      }
      case 'dskip': return act('digest_skip', { digest: d.d, n: +d.n, on: d.on === '1' })
      case 'ddel': if (confirm('Remove this reading list? The articles made from it stay.')) { S.menu = null; return act('digest_delete', { digest: d.d }) } return
      case 'topicdlg': {
        const cur = d.id && S.topics.find((x) => x.id === d.id)
        S.tdlg = cur ? { id: cur.id, name: cur.name, parent: cur.parent || '' } : { id: '', name: '', parent: d.parent || '' }
        S.dlg = 'topic'; S.menu = null; S.error = ''; return ctx.render()
      }
      case 'topicgo': {
        try { await ctx.call('topic_save', { id: S.tdlg.id, name: S.tdlg.name, parent: S.tdlg.parent }); S.dlg = null; S.error = '' } catch (e) { S.error = e.message || String(e); return ctx.render() }
        return load()
      }
      case 'topicdel': if (confirm('Delete this topic? Its articles stay in the library; its sub-topics move up.')) { S.menu = null; return act('topic_delete', { id: d.id }) } return
      case 'mvdlg': { const a = S.list.articles.find((x) => x.id === d.id); S.mdlg = { id: d.id, topic: (a && a.topic) || '' }; S.dlg = 'move'; S.menu = null; S.error = ''; return ctx.render() }
      case 'movego':
        try { await ctx.call('article_move', { id: S.mdlg.id, topic: S.mdlg.topic }); S.dlg = null; S.error = '' } catch (e) { S.error = e.message || String(e); return ctx.render() }
        return load()
    }
    if (!S.open) return
    switch (d.rt) {
      case 'ask': return openAsk()
      case 'dt': if (d.d === 'ask') return openAsk(); S.dtab = S.dtab === d.d ? null : d.d; ctx.render(); if (S.dtab === 'terms' && !S.open.terms) { try { S.open.terms = await ctx.call('terms', { id: S.open.entry.id }); ctx.render() } catch (e) { /* later */ } } return
      case 'vm': S.vmode = d.m; return ctx.render()
      case 'send': return sendQ()
      case 'qresume': return resumeStory()
      case 'qvoice': try { await ctx.call('speak_answer', { id: S.open.entry.id, qid: d.q }); S.qa.items = await ctx.call('qa', { id: S.open.entry.id }); paintQa(); watchQa() } catch (e) { S.error = e.message || String(e); ctx.render() } return
      case 'qplay': return playAnswer(d.q)
      case 'qdel': try { await ctx.call('qa_delete', { id: S.open.entry.id, qid: d.q }); S.qa.items = await ctx.call('qa', { id: S.open.entry.id }); paintQa() } catch (e) { /* gone already */ } return
      case 'qsrc': return showSrc(d.anchor, true)
      case 'voice': try { await ctx.call('voice', { id: S.open.entry.id }); const l = await ctx.call('list', {}); S.open.entry = l.articles.find((a) => a.id === S.open.entry.id) || S.open.entry; S.error = ''; paintVoice(); watchVoice() } catch (e) { S.error = e.message || String(e); ctx.render() } return
      case 'play': return togglePlay()
      case 'prev': return playBlock(P.audio.currentTime > 3 ? P.i : Math.max(0, P.i - 1))
      case 'next': return playBlock(Math.min(blocks().length - 1, P.i + 1))
      case 'back15': return seekSecs(curSecs() - 15)
      case 'fwd15': return seekSecs(curSecs() + 15)
      case 'sleep': S.sleepI = (S.sleepI + 1) % SLEEPS.length; S.sleepAt = SLEEPS[S.sleepI] ? Date.now() + SLEEPS[S.sleepI] * 60000 : 0; { const sl = $('rt-sleep'); if (sl) sl.textContent = 'Sleep: ' + (SLEEPS[S.sleepI] ? SLEEPS[S.sleepI] + ' min' : 'off') } return
      case 'fjump': { const el = blockEl(+d.i), b = blocks()[+d.i]; if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (b) showSrc(b.anchor, true); return }
      case 'recheck': {
        if (!confirm('Check the facts again? Anything found is corrected, and the changed blocks are voiced again.')) return
        const id = S.open.entry.id
        try { await ctx.call('recheck', { id }); stopPlayer(); S.open = null; S.view = 'library'; S.error = '' } catch (e) { S.error = e.message || String(e) }
        return load()
      }
      case 'termsbuild': try { S.open.terms = await ctx.call('terms', { id: S.open.entry.id, build: true }); ctx.render(); watchTerms() } catch (e) { S.error = e.message || String(e); ctx.render() } return
      case 'tcard': return flashTerm(+d.k)
      case 'mi': { if (d.b !== undefined && d.b !== '') playBlock(+d.b); showSrc(d.anchor, true); return }
      case 'osrc': {   // a paragraph of the original: go to the first block that tells it
        const k = blocks().findIndex((b) => b.anchor === d.src)
        if (k >= 0) playBlock(k); else showSrc(d.src, false)
        return
      }
      case 'blk': P.want = avail() > +d.i; return playBlock(+d.i)
      case 'seek': { const r = t.getBoundingClientRect(); return seekSecs((ev.clientX - r.left) / r.width * total()) }
    }
  })
  // A place in the original the user asked for (a memo item, an answer's chip): kept while Echo draws the page again.
  const showSrc = (anchor, scroll) => {
    S.hlSrc = anchor || null
    document.querySelectorAll('#rt-left .rt-on').forEach((e) => e.classList.remove('rt-on'))
    const el = anchor && document.querySelector(`#rt-left [data-src="${anchor}"]`)
    if (el) { el.classList.add('rt-on'); if (scroll) el.scrollIntoView({ block: 'center', behavior: 'smooth' }) }
  }

  // ── Settings → From plugins → Retell voice ──
  // The address and the API key are Echo's own card (Settings → Plugins → Retell: only the user enters them, and the key
  // never comes to the window); here the model, the voice and how it speaks, with what the server lists.
  const STD_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse', 'marin', 'cedar']
  const NOT_TTS = /whisper|transcri|realtime|embed|moderation|dall-e|image|search|^gpt-(?!.*tts)|^o\d|^text-|^davinci|^babbage|^chatgpt|^codex|^computer|sora|^ft:/i
  const V = { cfg: null, busy: '', other: { tts_model: false, stt_model: false }, note: '', err: '', audio: null }
  const vLoad = async (check) => {
    V.busy = check ? 'check' : V.busy; V.err = ''
    try { V.cfg = await ctx.call(check ? 'voice_check' : 'voice_config', {}) } catch (e) { V.err = e.message || String(e) }
    if (check) V.busy = ''
    ctx.render()
  }
  const vModels = (kind) => {
    const c = V.cfg, listed = (c.models || []).filter((m) => kind === 'tts_model' ? !NOT_TTS.test(m) : /whisper|transcri/i.test(m))
    const mine = (c.custom || []).filter((m) => !listed.includes(m)), cur = c[kind]
    return { listed, mine, cur, known: listed.includes(cur) || mine.includes(cur) }
  }
  const vSelect = (kind, label, hint) => {
    const { listed, mine, cur, known } = vModels(kind), other = V.other[kind] || !known
    const opt = (v, l, on) => `<option value="${esc(v)}" ${on ? 'selected' : ''}>${esc(l)}</option>`
    return `<div class="rt-vrow"><label class="set-sub" for="rt-v-${kind}">${esc(label)}</label>
      <select id="rt-v-${kind}" data-rtv-sel="${kind}">${listed.map((m) => opt(m, m, !other && m === cur)).join('')}${mine.map((m) => opt(m, m + ' · typed by you', !other && m === cur)).join('')}${opt('__other', 'Other… (type a name)', other)}</select>
      ${other ? `<div class="rt-vline"><input id="rt-v-${kind}-txt" value="${esc(cur)}" placeholder="the model's name" spellcheck="false"><button class="btn" data-rtv="save" data-k="${kind}">Use it</button></div>` : ''}
      ${!other && mine.includes(cur) ? `<div class="rt-vline"><span class="set-sub">Not in the server's list: it was typed in.</span><button class="btn" data-rtv="forget" data-m="${esc(cur)}">Forget it</button></div>` : ''}
      <div class="set-sub">${hint}</div></div>`
  }
  const voicePage = () => {
    if (!V.cfg) { if (!V.busy) { V.busy = 'load'; vLoad(false).then(() => { V.busy = ''; if (V.cfg && V.cfg.address && V.cfg.ok == null) vLoad(true) }) } return '<h2>Retell voice</h2><div class="skeleton"><i></i><i></i></div>' }
    const c = V.cfg
    let privNote = ''
    const st = !c.address ? '<span class="rt-chip">not set</span>' : V.busy === 'check' ? '<span class="rt-chip acc">checking…</span>'
      : c.ok ? `<span class="rt-chip ok">online · ${(c.models || []).length} models</span>` : c.ok === false ? `<span class="rt-chip bad">${esc(c.error || 'not answering')}</span>` : '<span class="rt-chip">not checked</span>'
    return `<h2>Retell voice</h2>
      <p class="set-lead">Retell reads your articles aloud and hears your spoken answers through a speech server that speaks the OpenAI API: OpenAI itself, or one in your network.</p>
      <div class="rt-vcard"><div class="rt-vline"><b style="min-width:110px">Speech server</b><span>${c.address ? esc(c.address) : 'not set'}</span>${st}<span class="rt-sp"></span><button class="btn" data-rtv="check" ${c.address ? '' : 'disabled'}>Check</button></div>
        <div class="rt-vline"><b style="min-width:110px">API key</b><span>${c.key ? 'set' : 'none'}</span></div>
        <div class="set-sub">The address and the key are set in Settings → Plugins → Retell (Echo keeps the key apart; it never comes to this window).</div></div>
      ${c.address && c.ok ? `<div class="rt-vcard">
        ${vSelect('tts_model', 'Voice model', 'The model that reads aloud. A model your server has but doesn\'t list (for example one for personal use only): choose “Other…” and type its name.')}
        <div class="rt-vrow"><label class="set-sub" for="rt-v-voice">Voice</label><div class="rt-vline"><input id="rt-v-voice" list="rt-v-voices" value="${esc(c.voice)}" spellcheck="false"><datalist id="rt-v-voices">${STD_VOICES.map((v) => `<option value="${v}">`).join('')}</datalist><button class="btn" data-rtv="save" data-k="voice">Use it</button></div>
          <div class="set-sub">One of OpenAI's voices (${STD_VOICES.join(', ')}) or a voice your server has.</div></div>
        <div class="rt-vrow"><label class="set-sub" for="rt-v-style">How it speaks</label><div class="rt-vline"><input id="rt-v-style" value="${esc(c.style)}" placeholder="warm, natural storytelling" spellcheck="false"><button class="btn" data-rtv="save" data-k="style">Use it</button></div>
          <div class="set-sub">Calm, warm, lively… (English works best; tts-1 and tts-1-hd don't take it).</div></div>
        <div class="rt-vline"><button class="btn primary" data-rtv="try" ${V.busy === 'try' ? 'disabled' : ''}>${V.busy === 'try' ? 'Making a sample…' : '▶ Listen'}</button><span class="set-sub">A short sample with these settings.</span></div>
      </div>
      <div class="rt-vcard">${vSelect('stt_model', 'Speech recognition model', 'The model that writes down what you say in Practice.')}</div>` : c.address ? '<div class="set-sub">Check the server first: its models are listed here once it answers.</div>' : ''}
      ${V.note ? `<div class="set-sub" style="color:var(--me)">${esc(V.note)}</div>` : ''}${V.err ? `<p class="error">${esc(V.err)}</p>` : ''}${privNote}`
  }
  ctx.ui.style(`.rt-vcard{border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:12px 0;display:flex;flex-direction:column;gap:10px;max-width:720px}
    .rt-vrow{display:flex;flex-direction:column;gap:4px}.rt-vline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.rt-vline input{flex:1;min-width:180px}.rt-vrow select{max-width:360px}.rt-sp{flex:1}`)
  const vSet = async (key, value) => {
    V.err = ''; V.note = ''
    try { V.cfg = await ctx.call('voice_set', { key, value }); V.other[key] = false; V.note = 'Saved. The next voice is made with it (articles voiced before keep theirs).' } catch (e) { V.err = e.message || String(e) }
    ctx.render(); setTimeout(() => { V.note = ''; ctx.render() }, 3000)
  }
  ctx.listen('change', (ev) => {
    const k = ev.target && ev.target.dataset && ev.target.dataset.rtvSel; if (!k) return
    if (ev.target.value === '__other') { V.other[k] = true; ctx.render() } else vSet(k, ev.target.value)
  })
  ctx.listen('click', async (ev) => {
    const t = ev.target && ev.target.closest && ev.target.closest('[data-rtv]'); if (!t) return
    const d = t.dataset
    if (d.rtv === 'check') return vLoad(true)
    if (d.rtv === 'save') { const el = $(d.k === 'voice' ? 'rt-v-voice' : d.k === 'style' ? 'rt-v-style' : `rt-v-${d.k}-txt`); return vSet(d.k, el ? el.value : '') }
    if (d.rtv === 'forget') { try { V.cfg = await ctx.call('voice_forget', { model: d.m }) } catch (e) { V.err = e.message || String(e) } return ctx.render() }
    if (d.rtv === 'try') {
      V.busy = 'try'; V.err = ''; ctx.render()
      try { const r = await ctx.call('voice_try', {}); if (V.audio) V.audio.pause(); V.audio = new Audio(`/plugin/${ID}/store/${r.file}`); await V.audio.play() } catch (e) { V.err = e.message || String(e) }
      V.busy = ''; ctx.render()
    }
  })
  ctx.settings.section({
    id: 'main',
    label: 'Retell voice',
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 8v4M6.5 5v10M10 3v14M13.5 6v8M17 8.5v3"/></svg>',
    render: voicePage,
  })

  ctx.activities.add({
    id: 'retell',
    label: 'Retell',
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="3.5" width="15" height="13" rx="2"/><path d="M10 4v12M5 8h2.5M5 11h2.5M12.5 8H15M12.5 11H15"/></svg>',
    render() {
      if (!S.list) { load(); return '<div class="skeleton" style="padding:20px"><i></i><i></i></div>' }
      poll()
      return appHtml()
    },
    // After each draw (Echo draws again whenever its own state changes, building the page anew): bring back the scroll,
    // the current block and word, the controls.
    after() {
      paintHealth(); paintCtl()
      if (S.view !== 'player' || !S.open) { const sc = $('rt-sc'); if (sc) sc.scrollTop = S.sc[S.view] || 0 }
      paintRec()
      if (S.view === 'practice' && S.pr.quiz) { const ta = $('rt-pans'); if (ta && S.pr.focus) { ta.focus(); S.pr.focus = false } }
      if (S.dlg === 'add' && S.addFocus) { const a = $('rt-add'); if (a) { a.focus(); S.addFocus = false } }
      if (S.view === 'player' && S.open) {
        const l = $('rt-left'), r = $('rt-right')
        if (l) l.scrollTop = S.scroll.left
        if (r) r.scrollTop = S.scroll.right
        paintVoice(); paintCur(S.scrollCur); S.scrollCur = false; paintWord(); measureVoices()
        if (P.i < 0 && S.hlSrc) showSrc(S.hlSrc, false)
        paintFlash()
        if (S.open.entry.voice_status === 'making') watchVoice()
        if (S.open.terms && S.open.terms.status === 'working') watchTerms()
        if (S.dtab === 'ask') { paintQa(); if (S.qa.focus) { const i = $('rt-q'); if (i) { i.focus(); S.qa.focus = false } } if (S.qa.items.some((x) => x.status === 'working' || x.audio === 'making')) watchQa() }
      }
    },
  })
}
