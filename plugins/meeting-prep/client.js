// Meeting Prep — the client half (runs in the Echo window). Its own "Prep" activity: the day's meetings on the
// left, the selected one on the right — purpose, background, people, what's owed, what's likely, what to watch
// for, the deal in CRM, links and sources. A "Prep this meeting" button on events in Echo's calendar, and a
// Settings section with what each source gave the last prep.
//
// One root element for the plugin's life, moved into Echo's page after each render (Echo redraws often).
// Classes, ids and data attributes are prefixed (mp-): Echo's page handles names like data-cmd itself.

const ACT = 'meeting-prep:prep'
const ICON = (s) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8M9 4v2a3 3 0 0 0 6 0V4"/><rect x="4.5" y="6" width="15" height="14.5" rx="2.5"/><path d="M8.5 12h7M8.5 15.5h5"/></svg>`
const ROWS = [['purpose', 'Purpose'], ['background', 'Background'], ['people', 'People'], ['you_owe', 'You owe'], ['they_owe', 'They owe'], ['likely', 'Likely to come up'], ['risks', 'Watch out for'], ['crm', 'In CRM']]
const SRC_LBL = { calendar: 'Calendar', notebook: 'Meeting Notebook', echo: "Echo's calls", teams: 'Teams chats', mail: 'Mail', crm: 'CRM' }

const CSS = `
.mprep-host{flex:1;min-height:0;display:flex}
.mprep{flex:1;min-width:0;min-height:0;display:flex;position:relative;
  --paper:#fbfafa;--sheet:#ffffff;--ink:#000000;--muted:#717171;--rule:rgba(0,0,0,.2);--hover:#f6f6f6;
  --accent:#0047ff;--accent-ink:#ffffff;--accent-soft:rgba(0,71,255,.07);--link:#0078c2;--ok:#03815b;--warn:#c50303;
  --band:#000000;--band-ink:#ffffff;--band-muted:#d8d3d3;--band-accent:#00f6ff;
  --f:"Museo Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  background:var(--paper);color:var(--ink);font-family:var(--f);font-size:14px;line-height:1.45;letter-spacing:.02em}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .mprep{
  --paper:#000000;--sheet:#060606;--ink:#ffffff;--muted:#d8d3d3;--rule:rgba(255,255,255,.22);--hover:#161616;
  --accent:#00f6ff;--accent-ink:#000000;--accent-soft:rgba(0,246,255,.12);--link:#7ba8ff;--ok:#00f4ab;--warn:#ff4d40;--band:#161616;color-scheme:dark}}
:root[data-theme="dark"] .mprep{
  --paper:#000000;--sheet:#060606;--ink:#ffffff;--muted:#d8d3d3;--rule:rgba(255,255,255,.22);--hover:#161616;
  --accent:#00f6ff;--accent-ink:#000000;--accent-soft:rgba(0,246,255,.12);--link:#7ba8ff;--ok:#00f4ab;--warn:#ff4d40;--band:#161616;color-scheme:dark}
.mprep *{box-sizing:border-box}
.mprep [hidden]{display:none!important}
.mprep button{font:inherit;color:inherit;cursor:pointer}
.mprep .mp-app{flex:1;min-width:0;display:grid;grid-template-columns:minmax(300px,380px) minmax(0,1fr);height:100%}
.mprep .mp-list{background:var(--sheet);border-right:1px solid var(--rule);overflow:auto;display:flex;flex-direction:column;min-height:0}
.mprep .mp-band{background:var(--band);color:var(--band-ink);padding:24px 20px 20px;display:flex;flex-direction:column;gap:10px}
.mprep .mp-lbl{margin:0;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--muted)}
.mprep .mp-band .mp-lbl{color:var(--band-muted)}
.mprep .mp-band h1{margin:0;font-size:34px;line-height:1.15;font-weight:250}
.mprep .mp-band p{margin:0;font-size:13px;line-height:1.45;color:var(--band-muted)}
.mprep .mp-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.mprep .mp-pill{font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;padding:8px 16px;border-radius:100px;border:1px solid var(--rule);background:var(--sheet);color:var(--ink)}
.mprep .mp-pill:hover{border-color:var(--ink)}
.mprep .mp-pill.pri{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.mprep .mp-pill:disabled{opacity:.4;cursor:default}
.mprep .mp-band .mp-pill{background:transparent;color:var(--band-ink);border-color:var(--band-ink);padding:6px 13px}
.mprep .mp-band .mp-pill.nav{color:var(--band-accent);border-color:var(--band-accent)}
.mprep .mp-state{font-size:12px;font-weight:700;color:var(--band-accent)}
.mprep .mp-row{display:grid;grid-template-columns:52px minmax(0,1fr);gap:3px 12px;padding:14px 20px;border:0;border-bottom:1px solid var(--rule);background:none;text-align:left;width:100%}
.mprep .mp-row:hover{background:var(--hover)}
.mprep .mp-row.on{background:var(--accent-soft);box-shadow:inset 3px 0 0 var(--accent)}
.mprep .mp-row .tm{font-size:13px;color:var(--muted);grid-row:span 3;padding-top:1px}
.mprep .mp-row .nm{font-size:15px;font-weight:500;line-height:1.3}
.mprep .mp-row .sub{font-size:12.5px;color:var(--muted)}
.mprep .mp-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.mprep .mp-chip{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 9px;border-radius:100px;border:1px solid var(--rule)}
.mprep .mp-chip.warn{border-color:var(--warn);color:var(--warn)}
.mprep .mp-foot{margin-top:auto;padding:14px 20px;font-size:12px;line-height:1.5;color:var(--muted)}
.mprep .mp-empty{padding:28px 20px;font-size:14px;line-height:1.55;color:var(--muted)}
.mprep .mp-empty b{color:var(--ink)}
.mprep .mp-detail{overflow:auto;min-width:0;background:var(--sheet)}
.mprep .mp-sheet{max-width:960px;padding:36px clamp(20px,4vw,48px) 64px;display:flex;flex-direction:column;gap:22px}
.mprep .mp-sheet h2{margin:0;font-size:34px;line-height:1.2;font-weight:300}
.mprep dl{display:grid;grid-template-columns:170px minmax(0,1fr);gap:18px 24px;margin:0}
.mprep dt{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);padding-top:3px}
.mprep dd{margin:0;font-size:15px;line-height:1.6;overflow-wrap:anywhere;font-weight:300}
.mprep dd p{margin:0 0 .45em}
.mprep dd ul{margin:0;padding-left:1.2em}
.mprep dd li{margin:.2em 0}
.mprep dd b,.mprep dd strong{font-weight:700}
.mprep dd a{color:var(--link)}
.mprep dd.purpose{font-size:16.5px;font-weight:400}
.mprep .mp-people{display:flex;flex-direction:column;gap:10px}
.mprep .mp-person b{font-weight:600}
.mprep .mp-person span{color:var(--muted)}
.mprep .mp-links{display:flex;flex-wrap:wrap;gap:6px}
.mprep .mp-links a{font-size:12px;padding:3px 12px;border-radius:100px;border:1px solid var(--rule);background:var(--sheet);color:var(--ink);text-decoration:none}
.mprep .mp-links a:hover{border-color:var(--ink)}
.mprep .mp-used{display:flex;flex-wrap:wrap;gap:6px}
.mprep .mp-used span{font-size:11.5px;color:var(--muted);padding:2px 10px;border-radius:100px;border:1px solid var(--rule)}
.mprep .mp-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:var(--ink);color:var(--paper);padding:8px 14px;border-radius:5px;font-size:13px;opacity:0;transition:opacity .2s;pointer-events:none;z-index:60}
.mprep .mp-toast.show{opacity:1}
@media (max-width:860px){.mprep .mp-app{grid-template-columns:minmax(0,1fr)}.mprep .mp-app.mp-showing .mp-list{display:none}.mprep .mp-app:not(.mp-showing) .mp-detail{display:none}.mprep dl{grid-template-columns:1fr;gap:4px}.mprep dt{margin-top:12px}}
.mp-set p{margin:0 0 8px}
.mp-set .mp-srow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 16px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}
.mp-set .mp-st{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px;border-radius:100px;border:1px solid var(--line)}
.mp-set .mp-st.ok{border-color:var(--me);color:var(--me)}
.mp-set .mp-st.need{border-color:var(--danger);color:var(--danger)}
.mp-set pre{white-space:pre-wrap;background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:10px 12px;font-size:12px}
`

export function apply(ctx) {
  ctx.ui.style(CSS)
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const pad2 = (n) => String(n).padStart(2, '0')
  const day = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  const shift = (ymd, n) => { const d = new Date(ymd + 'T12:00:00'); d.setDate(d.getDate() + n); return day(d) }
  const longDay = (ymd) => new Date(ymd + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const clock = (hm) => { if (!hm) return ''; const [h, m] = hm.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, (x) => x.toLowerCase().trim()) }
  /** Echo's Markdown writer made it; cleaned again here: only these tags, web links open in the browser (data-ext). */
  const OK = /^(p|br|b|strong|i|em|ul|ol|li|a|code|h[1-6])$/i
  const clean = (html) => {
    const t = document.createElement('template'); t.innerHTML = String(html || '')
    const walk = (node) => {
      for (const ch of [...node.childNodes]) {
        if (ch.nodeType === 8) { ch.remove(); continue }
        if (ch.nodeType !== 1) continue
        if (!OK.test(ch.tagName)) { walk(ch); ch.replaceWith(...ch.childNodes); continue }
        const href = ch.tagName === 'A' ? ch.getAttribute('href') || '' : ''
        for (const a of [...ch.attributes]) ch.removeAttribute(a.name)
        if (ch.tagName === 'A') { if (/^https:\/\//i.test(href)) { ch.setAttribute('href', href); ch.setAttribute('data-ext', '1'); ch.setAttribute('target', '_blank'); ch.setAttribute('rel', 'noopener') } else ch.replaceWith(...ch.childNodes) }
        if (/^H[1-6]$/.test(ch.tagName)) { const b = document.createElement('p'); b.innerHTML = `<b>${ch.innerHTML}</b>`; ch.replaceWith(b); continue }
        walk(ch)
      }
    }
    walk(t.content)
    const box = document.createElement('div'); box.appendChild(t.content); return box.innerHTML
  }

  const root = document.createElement('div')
  root.className = 'mprep'
  root.innerHTML = '<div class="mp-app"><section class="mp-list" aria-label="The day\'s meetings"></section><main class="mp-detail" aria-label="Meeting"></main></div><div class="mp-toast" role="status" aria-live="polite"></div>'
  const $ = (s) => root.querySelector(s)
  const toast = (msg) => { const t = $('.mp-toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600) }

  let date = day(), rec = null, lastLoad = 0, loading = null, selected = 0, wantEvent = null
  function load() {
    if (loading) return loading
    loading = ctx.call('view', { date }).then((v) => {
      rec = v; lastLoad = Date.now()
      if (wantEvent) { const i = (rec.meetings || []).findIndex((m) => (wantEvent.id && m.event === wantEvent.id) || m.title === wantEvent.subject); if (i >= 0) { selected = i; wantEvent = null } }
      if (selected >= (rec.meetings || []).length) selected = 0
      draw()
      // The Settings section draws from the same data.
      const w = ctx.where && ctx.where()
      if (w && w.view === 'settings') ctx.render()
    }).catch((e) => { lastLoad = Date.now(); $('.mp-list').innerHTML = `<div class="mp-empty">Couldn't read the prep: ${esc(e.message || e)}</div>` }).finally(() => { loading = null })
    return loading
  }
  const busy = () => !!(rec && (rec.running || rec.state === 'running'))
  const firstMeeting = (m) => /first meeting/i.test(m.purpose || '')

  function draw() {
    const r = rec || { meetings: [] }, ms = r.meetings || []
    const isToday = date === day()
    const status = busy() ? '<span class="mp-state">Claude is preparing…</span>' : `<button class="mp-pill" data-mp-run>${r.state === 'done' ? 'Refresh' : 'Prepare'}</button>`
    const sub = r.summary || (r.state === 'done' ? `${ms.length} meeting${ms.length === 1 ? '' : 's'}.` : '')
    const prepared = r.state === 'done' && r.at ? ` Prepared ${new Date(r.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.` : ''
    const list = `<header class="mp-band"><p class="mp-lbl">${esc(longDay(date))}${isToday ? ' · today' : ''}</p><h1>Meeting prep</h1>${sub || prepared ? `<p>${esc(sub)}${esc(prepared)}</p>` : ''}
        <div class="mp-bar">${status}<button class="mp-pill nav" data-mp-day="-1" aria-label="Previous day">‹</button><button class="mp-pill nav" data-mp-day="1" aria-label="Next day">›</button>${isToday ? '' : '<button class="mp-pill nav" data-mp-day="0">Today</button>'}</div></header>` +
      (ms.length ? ms.map((m, i) => {
        const chips = [m.you_owe && '<span class="mp-chip warn">You owe</span>', m.they_owe && '<span class="mp-chip">They owe</span>', m.crm && !/^no opportunity/i.test(m.crm) && '<span class="mp-chip">In CRM</span>', firstMeeting(m) && '<span class="mp-chip">First meeting</span>'].filter(Boolean).join('')
        return `<button class="mp-row${i === selected ? ' on' : ''}" data-mp-sel="${i}"><span class="tm">${esc(clock(m.start))}</span><span class="nm">${esc(m.title)}</span><span class="sub">${esc([m.organizer && (m.organizer === 'you' ? 'You organize' : m.organizer), m.role && m.role !== 'organizer' ? m.role : '', m.external ? 'external' : 'internal'].filter(Boolean).join(' · '))}</span>${chips ? `<span class="mp-chips">${chips}</span>` : ''}</button>`
      }).join('') : `<div class="mp-empty">${r.state === 'failed' ? `<b>Couldn't prepare this day.</b><br>${esc(r.error || '')}` : busy() ? '<b>Claude is preparing your day.</b><br>It reads your calendar, notes, Echo calls, Teams, mail and CRM. This takes a few minutes; you can keep working.' : r.state === 'done' ? '<b>No meetings to prepare.</b><br>Holds, declined and cancelled meetings are left out.' : `<b>No prep for this day yet.</b><br>${isToday ? `Your day is prepared each weekday at ${esc(r.time || '07:30')}.` : ''} Prepare it now, or use Prep this meeting in Echo's calendar.`}</div>`) +
      `<p class="mp-foot">${esc(sourcesLine(r))}Read-only: nothing is sent or changed.</p>`
    const L = $('.mp-list'); if (L._html !== list) { L.innerHTML = list; L._html = list }
    const D = $('.mp-detail'), html = detail(ms[selected], r)
    if (D._html !== html) { D.innerHTML = html; D._html = html; D.scrollTop = 0 }
  }
  function sourcesLine(r) {
    const s = r.sources || {}
    const parts = Object.keys(SRC_LBL).filter((k) => s[k]).map((k) => `${SRC_LBL[k]}: ${s[k]}`)
    return parts.length ? parts.join(' · ') + '. ' : ''
  }
  function detail(m, r) {
    if (!m) return `<div class="mp-sheet"><p class="mp-empty" style="padding:0">${r.state === 'done' && !(r.meetings || []).length ? '' : 'Pick a meeting on the left.'}</p></div>`
    const join = m.links.find((l) => /^join/i.test(l.label))
    const rows = ROWS.map(([f, label]) => {
      if (f === 'people') return m.people.length ? `<dt>${label}</dt><dd><div class="mp-people">${m.people.map((p) => `<div class="mp-person"><b>${esc(p.name)}</b>${p.who ? ` <span>· ${esc(p.who)}</span>` : ''}${p.noteHtml ? clean(p.noteHtml) : ''}</div>`).join('')}</div></dd>` : ''
      return m[f] ? `<dt>${label}</dt><dd${f === 'purpose' ? ' class="purpose"' : ''}>${clean(m.html && m.html[f]) || esc(m[f])}</dd>` : ''
    }).join('')
    return `<div class="mp-sheet">
      <div style="display:flex;flex-direction:column;gap:8px"><p class="mp-lbl">${esc([clock(m.start) + (m.end ? ' to ' + clock(m.end) : ''), m.role, m.external ? 'External' : 'Internal'].filter(Boolean).join(' · '))}</p><h2>${esc(m.title)}</h2></div>
      <div class="mp-bar">${join ? `<a class="mp-pill pri" href="${esc(join.url)}" data-ext="1" style="text-decoration:none">Join</a>` : ''}<button class="mp-pill" data-mp-copy>Copy brief</button><button class="mp-pill" data-mp-again>Prepare again</button></div>
      <dl>${rows}
        ${m.links.length ? `<dt>Links</dt><dd class="mp-links">${m.links.map((l) => `<a href="${esc(l.url)}" data-ext="1" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}</dd>` : ''}
        ${m.used.length ? `<dt>Sources</dt><dd class="mp-used">${m.used.map((u) => `<span>${esc(u)}</span>`).join('')}</dd>` : ''}
      </dl></div>`
  }
  const plain = (s) => String(s || '').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1').replace(/[*_`]/g, '')
  function briefText(m) {
    return [`${clock(m.start)} ${m.title}`, ...ROWS.map(([f, label]) => f === 'people' ? (m.people.length ? `${label}:\n${m.people.map((p) => `- ${p.name}${p.who ? ` (${p.who})` : ''}${p.note ? `: ${plain(p.note)}` : ''}`).join('\n')}` : '') : m[f] ? `${label}:\n${plain(m[f])}` : '').filter(Boolean), m.links.length ? `Links:\n${m.links.map((l) => `- ${l.label}: ${l.url}`).join('\n')}` : ''].filter(Boolean).join('\n\n')
  }
  async function start(event) {
    try {
      if (event) { const r = await ctx.call('run_one', { event }); date = r.date || date; wantEvent = event } else await ctx.call('run', { date })
      rec = { ...(rec || {}), running: true }; draw(); setTimeout(load, 3000)
    } catch (e) { toast("Couldn't start: " + (e.message || e)) }
  }
  root.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return
    if (t.dataset.mpSel !== undefined) { selected = +t.dataset.mpSel; root.querySelector('.mp-app').classList.add('mp-showing'); draw(); return }
    if (t.dataset.mpDay !== undefined) { const n = +t.dataset.mpDay; date = n === 0 ? day() : shift(date, n); selected = 0; rec = null; draw(); load(); return }
    if (t.dataset.mpRun !== undefined) { start(); return }
    const m = rec && (rec.meetings || [])[selected]
    if (t.dataset.mpAgain !== undefined && m) { start({ id: m.event, subject: m.title, start: `${date}T${m.start || '09:00'}:00` }); return }
    if (t.dataset.mpCopy !== undefined && m) { try { await navigator.clipboard.writeText(briefText(m)); toast('Brief copied') } catch { toast("Couldn't copy") } }
  })

  ctx.activities.add({
    id: 'prep',
    label: 'Prep',
    icon: ICON(20),
    render: () => '<div class="mprep-host"></div>',
    after(box) {
      const host = box.querySelector('.mprep-host')
      if (host && root.parentNode !== host) host.appendChild(root)
      if (!rec || Date.now() - lastLoad > (busy() ? 4000 : 30000)) load()
    },
  })
  // A meeting in Echo's calendar: prepare just that one.
  if (ctx.slots) ctx.slots.add('calendar.event', {
    label: 'Prep this meeting',
    icon: ICON(16),
    when: (t) => !!(t && t.event && t.event.subject && !t.event.all_day && !t.event.cancelled),
    run: (t) => { const ev = t.event; start({ id: ev.id, subject: ev.subject, start: ev.start, end: ev.end }); ctx.ui.notice(`Preparing “${ev.subject}”. It shows in Prep in a minute or two.`); ctx.go(ACT) },
  })
  if (ctx.palette) ctx.palette.add({ label: 'Open Meeting Prep', group: 'Meeting Prep', keywords: 'prep brief meetings today', run: () => ctx.go(ACT) })
  if (ctx.palette) ctx.palette.add({ label: 'Prepare my day now', group: 'Meeting Prep', keywords: 'prep brief refresh', run: () => { date = day(); start(); ctx.go(ACT) } })

  // Settings → From plugins → Meeting Prep: what each source gave the last prep, and how to add Teams, mail and CRM.
  // A rule that names only the connector isn't honoured; one with `__*` (all its tools) is — measured with Claude Code in dontAsk.
  const RULE = `"permissions": {\n  "allow": ["mcp__claude_ai_Microsoft_365__*", "mcp__claude_ai_EPAM_CRM__*"]\n}`
  ctx.settings.section({
    id: 'main',
    label: 'Meeting Prep',
    icon: ICON(18),
    render() {
      if (!rec) load()
      const s = (rec && rec.sources) || {}
      const st = (k) => { const v = s[k] || ''; const bad = /not available|unavailable|not checked/i.test(v); return `<span class="mp-st ${!v ? '' : bad ? 'need' : 'ok'}">${esc(v || 'Not used yet')}</span>` }
      return `<div class="mp-set">${ctx.ui.setCard('Meeting Prep', [
        `<p class="set-sub">Each weekday at ${esc((rec && rec.time) || '07:30')} Claude prepares every meeting of the day, read-only. The schedule, Teams delivery and sources switch are in Settings → Plugins → Meeting Prep.</p>`,
        ...Object.keys(SRC_LBL).map((k) => `<div class="mp-srow"><span>${SRC_LBL[k]}</span>${st(k)}</div>`),
        `<p class="set-sub" style="margin-top:14px">Teams chats, mail and CRM come from Claude Code's Microsoft 365 and EPAM CRM connectors. Claude Code asks before using a connector, and an unattended run can't ask, so allow them once for your Echo folder: add this inside the outer braces of <code>.claude/settings.json</code> in your Echo data folder.</p><pre>${esc(RULE)}</pre>`,
        `<div style="display:flex;gap:8px;margin-top:12px"><button class="btn primary" data-mp-setrun>Prepare today now</button><button class="btn" data-mp-open>Open Prep</button></div>`,
      ])}</div>`
    },
  })
  ctx.listen('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-mp-setrun],[data-mp-open]')
    if (!t) return
    if (t.dataset.mpSetrun !== undefined) { date = day(); start(); ctx.ui.notice('Preparing your day. It shows in Prep in a few minutes.') }
    ctx.go(ACT)
  })
}
