// Scheduler — the client half (runs in the Echo window). Its own Settings section ("From plugins →
// Scheduler"): a row per routine with its next and last run and what it cost; the selected routine in the
// right panel with its runs; one run (the answer as sent, tokens and cost, where it went, what it did); the
// editor (schedule by days, where to send, what Claude may do, Try it), started blank or from a template.
// Everything goes through the host half (`ctx.call`); the look is Echo's own tokens.

const LABEL = { telegram: 'Telegram', teams: 'Teams', mail: 'Mail', today: 'Today' }
const label = (k) => LABEL[k] || k.charAt(0).toUpperCase() + k.slice(1)
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const PERMS = [
  ['read', 'Read only', 'Your calls, threads, the Brain and Echo’s read-only commands. Changes nothing. Recommended.', ''],
  ['folder', 'As your Echo folder session', 'Whatever your Claude Code settings allow; anything that would ask is refused.', ''],
  ['skip', 'Everything, no questions', 'Any tool, unattended. Only for prompts you fully trust.', 'warn'],
]
const SECTION = 'scheduler:main'
const CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9 3h6"/></svg>'

const CSS = `
.sch { display: flex; flex-direction: column; gap: 14px; }
.sch-head { display: flex; align-items: flex-start; gap: 12px; }
.sch-head h2 { margin: 0; font-size: 18px; font-weight: 650; }
.sch-crumb { display: flex; gap: 8px; align-items: center; font-size: 12px; color: var(--text-3); }
.sch-crumb button { border: 0; background: none; padding: 0; color: var(--accent-ink); font: inherit; cursor: default; }
.sch-facts { display: flex; gap: 24px; flex-wrap: wrap; padding: 12px 16px; border: 1px solid var(--line); border-radius: var(--r-panel); background: var(--surface); }
.sch-fact { display: flex; flex-direction: column; gap: 1px; }
.sch-fact b { font-size: 15px; font-weight: 650; font-variant-numeric: tabular-nums; }
.sch-fact span { font-size: 11.5px; color: var(--text-3); }
.sch-tbl { border: 1px solid var(--line); border-radius: var(--r-panel); background: var(--surface); overflow: hidden; }
.sch-th, .sch-tr { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(0, 0.95fr) 40px; gap: 12px; align-items: center; padding: 0 14px; }
.sch-th { height: 32px; font-size: 10.5px; color: var(--text-3); text-transform: uppercase; letter-spacing: .06em; font-weight: 600; border-bottom: 1px solid var(--line); }
.sch-tr { min-height: 56px; border-bottom: 1px solid var(--line); cursor: default; }
.sch-tr:last-child { border-bottom: 0; }
.sch-tr:hover { background: color-mix(in srgb, var(--accent) 5%, transparent); }
.sch-tr.sel { background: color-mix(in srgb, var(--accent) 10%, transparent); box-shadow: inset 2px 0 0 var(--accent); }
.sch-nm { font-weight: 600; font-size: 13px; }
.sch-nm.off { color: var(--text-2); }
.sch-sub { font-size: 12px; color: var(--text-3); }
.sch-num { font-variant-numeric: tabular-nums; }
.sch-st { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; }
.sch-dot { width: 7px; height: 7px; border-radius: 4px; flex: none; display: inline-block; background: var(--text-3); }
.sch-dot.ok { background: var(--me); } .sch-dot.bad { background: var(--danger); } .sch-dot.run { background: var(--accent); }
.sch-ci { height: 20px; padding: 0 6px; border-radius: 5px; background: var(--line); color: var(--text-2); font-size: 11px; display: inline-flex; align-items: center; margin-right: 4px; }
.sch-spark { display: flex; align-items: flex-end; gap: 2px; height: 18px; }
.sch-spark i { width: 4px; border-radius: 1px; background: color-mix(in srgb, var(--accent) 60%, transparent); display: block; }
.sch-spark i.f { background: var(--danger); }
.sch-spark30 { gap: 1px; }
.sch-spark30 i { width: 3px; }
.sch-p { display: flex; flex-direction: column; gap: 14px; padding: 14px; }
.sch-kv { display: grid; grid-template-columns: 86px minmax(0, 1fr); gap: 6px 10px; font-size: 12px; }
.sch-kv span { color: var(--text-3); }
.sch-h4 { margin: 0; font-size: 10.5px; color: var(--text-3); text-transform: uppercase; letter-spacing: .06em; font-weight: 600; }
.sch-bars { display: flex; align-items: flex-end; gap: 3px; height: 44px; border-bottom: 1px solid var(--line); }
.sch-bars i { flex: 1 1 0; border-radius: 2px 2px 0 0; background: color-mix(in srgb, var(--accent) 60%, transparent); display: block; min-height: 2px; }
.sch-bars i.f { background: var(--danger); }
.sch-run { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 8px 0; border: 0; border-bottom: 1px solid var(--line); background: none; width: 100%; text-align: left; font: inherit; color: inherit; cursor: default; }
.sch-run:last-child { border-bottom: 0; }
.sch-run:hover .w2 { color: var(--accent-ink); }
.sch-run .w2 { font-size: 12px; }
.sch-run .meta { font-size: 11px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.sch-cost { font-size: 12px; font-variant-numeric: tabular-nums; }
.sch-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 14px; align-items: start; }
.sch-card { border: 1px solid var(--line); border-radius: var(--r-panel); background: var(--surface); padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
.sch-ans { font-size: 13px; line-height: 1.6; }
.sch-ans h1, .sch-ans h2, .sch-ans h3 { font-size: 13.5px; margin: 12px 0 4px; }
.sch-ans table { border-collapse: collapse; font-size: 12px; width: 100%; }
.sch-ans th, .sch-ans td { border-bottom: 1px solid var(--line); padding: 4px 8px 4px 0; text-align: left; vertical-align: top; }
.sch-tok { display: grid; grid-template-columns: 96px minmax(0, 1fr) 76px 52px; gap: 10px; align-items: center; font-size: 12px; padding: 4px 0; }
.sch-track { height: 8px; border-radius: 4px; background: var(--line); overflow: hidden; }
.sch-track i { display: block; height: 100%; border-radius: 4px; }
.sch-step { display: grid; grid-template-columns: 62px minmax(0, 1fr); gap: 10px; font: 11.5px/1.55 var(--mono); color: var(--text-2); }
.sch-step b { color: var(--text); font-weight: 500; }
.sch-del { display: grid; grid-template-columns: auto 72px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 12px; }
.sch-del:last-child { border-bottom: 0; }
.sch-edit { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 22px; }
.sch-col { display: flex; flex-direction: column; gap: 14px; }
.sch-f { display: flex; flex-direction: column; gap: 6px; }
.sch-lbl { font-size: 12px; color: var(--text-2); font-weight: 600; }
.sch-in { height: 30px; border-radius: var(--r-control); border: 1px solid var(--line-strong); background: var(--bg); color: var(--text); font: inherit; font-size: 13px; padding: 0 10px; box-sizing: border-box; }
.sch-in:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
textarea.sch-in { height: 260px; padding: 9px 10px; line-height: 1.55; resize: vertical; font-size: 12.5px; }
.sch-chips { display: flex; gap: 4px; flex-wrap: wrap; }
.sch-chip { height: 28px; padding: 0 11px; border-radius: 14px; border: 1px solid var(--line-strong); background: none; color: var(--text-2); font: inherit; font-size: 12px; cursor: default; }
.sch-chip.on { background: var(--accent-soft); border-color: color-mix(in srgb, var(--accent) 50%, transparent); color: var(--accent-ink); font-weight: 600; }
.sch-day { width: 34px; height: 28px; border-radius: var(--r-control); border: 1px solid var(--line-strong); background: none; color: var(--text-3); font: inherit; font-size: 12px; cursor: default; }
.sch-day.on { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
.sch-dest, .sch-perm { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 10px 12px; border: 1px solid var(--line-strong); border-radius: 8px; background: none; text-align: left; font: inherit; color: inherit; cursor: default; width: 100%; }
.sch-dest.on, .sch-perm.on { border-color: color-mix(in srgb, var(--accent) 55%, transparent); background: color-mix(in srgb, var(--accent) 7%, transparent); }
.sch-dest[disabled] { opacity: .7; }
.sch-perm { grid-template-columns: auto minmax(0, 1fr); align-items: start; }
.sch-cb { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid var(--line-strong); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; color: #fff; }
.sch-cb.on { background: var(--accent); border-color: var(--accent); }
.sch-cb.round { border-radius: 8px; }
.sch-warn { color: var(--warn); }
.sch-foot { display: flex; gap: 8px; align-items: center; border-top: 1px solid var(--line); padding-top: 12px; }
.sch-pick { position: relative; }
.sch-menu { position: absolute; right: 0; top: 32px; z-index: 5; width: 340px; background: var(--surface); border: 1px solid var(--line-strong); border-radius: var(--r-panel); box-shadow: var(--shadow); padding: 6px; display: flex; flex-direction: column; }
.sch-menu button { border: 0; background: none; text-align: left; padding: 8px 10px; border-radius: 6px; font: inherit; color: inherit; cursor: default; display: flex; flex-direction: column; gap: 1px; }
.sch-menu button:hover { background: var(--accent-soft); }
.sch-menu b { font-size: 13px; font-weight: 600; }
.sch-menu hr { border: 0; border-top: 1px solid var(--line); margin: 4px 0; }
.sch-tabs { border-bottom: 1px solid var(--line); }
.sch-night { display: flex; gap: 6px; align-items: center; flex: none; font-size: 12.5px; color: var(--text-2); white-space: nowrap; }
.sch-night .sch-in { width: 104px; height: 28px; }
.sch-night .btn { height: 28px; padding: 0 8px; font-variant-numeric: tabular-nums; }
.sch-chg { color: var(--text); }
.sch-chg::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 3px; background: var(--accent); margin-right: 5px; vertical-align: 1px; }
.sch-jerr { margin: 0; color: var(--danger); font-size: 12px; }
.sch-jnum { display: flex; gap: 8px; align-items: center; }
.sch-jnum input { width: 84px; }
`

export function apply(ctx) {
  // Taken out by Echo when the plugin unloads (Echo 0.7.2+); older Echo keeps them on the document.
  const listen = ctx.listen || ((type, fn, opts) => document.addEventListener(type, fn, opts))
  const { esc } = ctx.ui
  let data = null, error = '', sel = null, page = 'list', picker = false
  let runView = null // {id, run, detail, prompt}
  let edit = null // the editor's draft
  let trial = null // {run, detail}

  if (!document.getElementById('sch-css')) {
    const st = document.createElement('style')
    st.id = 'sch-css'
    st.textContent = CSS
    document.head.appendChild(st)
  }

  const here = () => { const w = ctx.where(); return w.view === 'settings' && w.section === SECTION }
  const money = (n) => (n == null ? '—' : n >= 10 ? `$${n.toFixed(1)}` : n > 0 && n < 0.01 ? '<$0.01' : `$${n.toFixed(2)}`)
  const big = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n || 0))
  const secs = (ms) => (ms == null ? '' : ms >= 60000 ? `${Math.floor(ms / 60000)} m ${Math.round((ms % 60000) / 1000)} s` : `${Math.round(ms / 1000)} s`)
  const when = (iso) => {
    if (!iso) return ''
    const d = new Date(iso), now = new Date(), tm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const tom = new Date(now); tom.setDate(now.getDate() + 1)
    if (d.toDateString() === now.toDateString()) return `Today ${tm}`
    if (d.toDateString() === tom.toDateString()) return `Tomorrow ${tm}`
    return `${d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} ${tm}`
  }
  const sends = (r) => (r.deliver || []).map((k) => `<span class="sch-ci">${k === 'mail' && r.mail_to && r.mail_to.length ? `Mail → ${r.mail_to.length === 1 ? esc(r.mail_to[0]) : `${r.mail_to.length} people`}` : esc(label(k))}</span>`).join('') || '<span class="sch-sub">Nowhere — kept in its runs</span>'
  const perm = (t) => (t === 'read' ? 'reads only' : t === 'folder' ? 'your folder session’s permissions' : 'asks nothing')
  const lastLine = (l) => !l ? ['', 'Not run yet']
    : l.state === 'failed' ? ['bad', l.message && l.message.startsWith('Not sent') ? 'Not sent' : 'Failed']
    : l.state === 'empty' ? ['', 'Nothing to send']
    : (l.sent || []).length ? ['ok', `Sent to ${l.sent.map((k) => label(k)).join(', ')}`] : ['ok', 'Answered']

  const load = async () => {
    try { data = await ctx.call('view'); error = '' } catch (e) { error = e.message }
    if (data && sel && !data.routines.some((r) => r.id === sel)) sel = null
    redraw()
    if (here() && data && (data.routines.some((r) => r.running) || (trial && !trial.detail?.record))) setTimeout(load, 2000)
  }
  const op = async (command, args) => {
    try { await ctx.call(command, args); error = '' } catch (e) { error = e.message; ctx.render(); return false }
    await load()
    return true
  }
  // ── Echo's own background jobs (`uses.echo.jobs`, Echo 0.9.14: the one routine contract): listed, and changed only on the user's click or key
  // (Echo refuses any other change). They run on their own settings with or without this plugin.
  let jobs = null, jobsErr = '', tab = 'routines', selJob = null, jobEdit = null, nightEdit = false, nightCancel = false
  let jobsAt = 0, seenAt = 0, jobsSeq = 0, held = false // when the list was last asked for; the newest request; a redraw held back
  try { if (localStorage.getItem('sch-tab') === 'system') tab = 'system' } catch { /* no storage: Routines */ }
  const setTab = (t) => { tab = t; try { localStorage.setItem('sch-tab', t) } catch { /* kept for now only */ } }
  const canJobs = () => !!(ctx.echo && ctx.echo.jobs && ctx.echo.routines)
  // A redraw replaces the section's fields: never while the user is typing in a job's field — held until they leave it.
  const typing = () => { const a = document.activeElement; return !!(a && a.matches && a.matches('[data-sch-jf],[data-sch-night]')) }
  const redraw = () => { if (typing()) held = true; else { held = false; ctx.render() } }
  // The list each time the section is entered (and at most every 30 s while it stays open, for last run and runs
  // today); an answer older than the newest request (a set, say) is dropped.
  const loadJobs = async () => {
    if (!canJobs()) return
    jobsAt = Date.now()
    const n = ++jobsSeq
    try { const l = await ctx.echo.routines.list(); if (n !== jobsSeq) return; jobs = l; jobsErr = ''; if (selJob) loadJobRuns(selJob) } catch (e) { if (n !== jobsSeq) return; jobsErr = String(e.message || e) }
    redraw()
  }
  const setJob = async (job, settings) => {
    const n = ++jobsSeq
    let err = ''
    try { await ctx.echo.jobs.set(job, settings) } catch (e) { err = String(e.message || e) }
    if (n === jobsSeq) await loadJobs() // the routine as Echo holds it now (or still, after a refusal)
    jobsErr = err
    ctx.render()
  }
  const openRun = async (id, run) => {
    page = 'run'
    runView = { id, run, detail: null, prompt: false }
    ctx.render()
    try { runView.detail = await ctx.call('run_detail', { id, run }) } catch (e) { error = e.message }
    ctx.render()
  }

  // ── schedule as the editor sets it ──
  const fromSchedule = (s) => {
    const t = String(s || '').trim().toLowerCase()
    const ev = /^every\s+(\d+)\s*([hm])$/.exec(t)
    if (ev) return { mode: 'every', hours: ev[2] === 'h' ? +ev[1] : Math.max(1, Math.round(+ev[1] / 60)), days: [true, true, true, true, true, false, false], time: '09:00' }
    const m = /^(.*)\s+(\d{1,2}:\d{2})$/.exec(t)
    if (!m) return { mode: 'weekdays', days: [true, true, true, true, true, false, false], time: '08:30', hours: 2 }
    const list = m[1].trim(), days = [false, false, false, false, false, false, false]
    if (list === 'daily' || list === 'every day') return { mode: 'daily', days: days.fill(true), time: m[2], hours: 2 }
    if (list === 'weekdays') return { mode: 'weekdays', days: days.fill(true, 0, 5), time: m[2], hours: 2 }
    for (const d of list.split(/[,\s]+/)) { const i = DAYS.findIndex((x) => d.startsWith(x)); if (i >= 0) days[i] = true }
    return { mode: 'days', days, time: m[2], hours: 2 }
  }
  const toSchedule = (e) => e.mode === 'every' ? `every ${e.hours}h` : e.mode === 'daily' ? `daily ${e.time}` : e.mode === 'weekdays' ? `weekdays ${e.time}` : `${DAYS.filter((_, i) => e.days[i]).join(',') || 'mon'} ${e.time}`
  const nextThree = (e) => {
    const out = []
    let t = Date.now()
    for (let n = 0; n < 3; n++) {
      let s = null
      if (e.mode === 'every') { const d = new Date(t); d.setHours(0, 0, 0, 0); s = d.getTime(); while (s <= t) s += e.hours * 3600000 }
      else {
        const [h, m] = e.time.split(':').map(Number)
        const days = e.mode === 'daily' ? [1, 1, 1, 1, 1, 1, 1] : e.mode === 'weekdays' ? [1, 1, 1, 1, 1, 0, 0] : e.days
        for (let i = 0; i < 8 && s == null; i++) { const d = new Date(t); d.setDate(d.getDate() + i); d.setHours(h || 0, m || 0, 0, 0); if (days[(d.getDay() + 6) % 7] && d.getTime() > t) s = d.getTime() }
      }
      if (s == null) break
      out.push(when(new Date(s).toISOString()))
      t = s
    }
    return out
  }
  // The model: the profile's own, one of Claude's three by its alias, or any name (Other…). Stored as one string.
  const MODELS = [['haiku', 'Haiku'], ['sonnet', 'Sonnet'], ['opus', 'Opus']]
  const pickOf = (m) => (!m ? '' : MODELS.some(([v]) => v === m) ? m : 'other')
  const modelName = (m) => (MODELS.find(([v]) => v === m) || [m, m])[1]
  const draftOf = (r) => ({ ...r, ...fromSchedule(r.schedule), modelPick: pickOf(r.model || ''), otherModel: pickOf(r.model || '') === 'other' ? r.model : '', deliver: [...(r.deliver || [])], mail_to: [...(r.mail_to || [])], mailOthers: !!(r.mail_to && r.mail_to.length) })
  const readForm = () => {
    const v = (id) => (document.getElementById(id) || {}).value
    if (!edit) return
    for (const [k, id] of [['name', 'sch-name'], ['prompt', 'sch-prompt'], ['profile', 'sch-profile'], ['time', 'sch-time']]) if (v(id) != null) edit[k] = v(id)
    const other = v('sch-model')
    if (other != null && edit.modelPick === 'other') edit.model = other.trim()
    const pick = v('sch-model-pick')
    if (pick != null) {
      // Leaving Other… keeps its name for a way back; coming to it brings that name, never a listed alias.
      if (edit.modelPick === 'other' && pick !== 'other') edit.otherModel = edit.model
      if (pick === 'other' && edit.modelPick !== 'other') edit.model = edit.otherModel || ''
      edit.modelPick = pick
      if (pick !== 'other') edit.model = pick
    }
    const to = v('sch-mailto')
    if (to != null) edit.mail_to = to.split(/[,;\s]+/).map((a) => a.trim()).filter(Boolean)
    const hrs = v('sch-hours')
    if (hrs != null) edit.hours = Math.max(1, Math.min(24, +hrs || 1))
  }
  const routineOf = (e) => ({ id: e.id || '', name: e.name, schedule: toSchedule(e), prompt: e.prompt, profile: e.profile || '', model: e.model || '', tools: e.tools || 'read', deliver: e.deliver, mail_to: e.mailOthers ? e.mail_to : [], skip_empty: e.skip_empty !== false, enabled: e.enabled !== false })

  // ── views ──
  const MODEL_NAMES = { haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus' }
  const UNDO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h11a5 5 0 0 1 0 10h-4"/><path d="M8 5L4 9l4 4"/></svg>'
  // Echo's own night when the list doesn't say (its `jobs::NIGHT`): to know whether the user changed it.
  const NIGHT_DEFAULT = { from: '22:30', to: '07:00' }
  // A label as Echo gives it, "Every (minutes)", split into what it is and its unit.
  const unitOf = (label) => { const m = /^(.*?)\s*\((minutes|seconds)\)\s*$/.exec(label); return m ? [m[1], m[2] === 'minutes' ? 'min' : 's'] : [label, ''] }
  const fieldOf = (j, key) => (j.settings || []).find((f) => f.key === key)
  const part = (set, text) => `<span${set ? ' class="sch-chg"' : ''}>${esc(text)}</span>`
  const nightWords = (j) => { const f = fieldOf(j, 'night'); return f ? part(f.set, f.value ? 'pauses at night' : 'runs at night') : '' }
  const modelWords = (j) => { const f = fieldOf(j, 'model'); return f ? part(f.set, f.set ? MODEL_NAMES[f.value] || String(f.value) : 'Default model') : '<span class="sch-sub">No model</span>' }
  // ── The one routine contract (Echo's plugin API § Routines): every routine — the user's, Echo's own (system), a
  // plugin's — drawn by the same row and panel. The user's routines are mapped into it here.
  const jobById = (id) => jobs && jobs.routines.find((j) => j.id === id)
  const TO = { today: 'Today', thread_work: 'Threads’ work', thread_sources: 'Threads’ sources', minutes: 'Minutes', prep: 'Meeting prep', recall: 'Recall', live_notes: 'Live notes' }
  const userRun = (x) => x && ({
    started: x.at, ended: x.finished_at || null, duration_ms: x.usage ? x.usage.duration_ms : x.duration_ms,
    state: x.state || 'running', ok: x.state !== 'failed', summary: x.state !== 'failed' ? x.message : undefined, error: x.state === 'failed' ? x.message : undefined,
    model: x.model, cost_usd: x.usage ? x.usage.cost_usd : x.cost, sent: x.sent || [], trial: !!x.trial, run: x.run,
  })
  const dailyOf = (runs) => {
    const days = []
    for (let i = 29; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); days.push({ day: d.toDateString(), runs: 0, failed: 0, cost: 0 }) }
    for (const x of runs) { const e = days.find((d) => d.day === new Date(x.at).toDateString()); if (e) { e.runs++; if (x.state === 'failed') e.failed++; e.cost += x.cost || 0 } }
    return days
  }
  const userRoutine = (r) => ({
    id: r.id, source: 'user', name: r.name, what: r.prompt, enabled: r.enabled, to: r.deliver || [],
    schedule: { text: `${r.when} · ${perm(r.tools)}`, kind: 'time' }, next_run: r.next, next: null, paused_until: null,
    running: r.running, last: r.running ? { state: 'running' } : userRun(r.last), model: { value: r.model || '', default: '' },
    month: { runs: r.month.runs, cost: r.month.cost, daily: dailyOf(r.runs || []) }, runs: (r.runs || []).map(userRun), raw: r,
  })
  const runLine = (R, x) => !x ? ['', 'Not run yet']
    : x.state === 'running' ? ['run', 'Running…']
    : x.state === 'failed' ? ['bad', x.error && x.error.startsWith('Not sent') ? 'Not sent' : 'Failed']
    : x.state === 'empty' ? ['', 'Nothing to send']
    : (x.sent || []).length ? ['ok', `Sent to ${x.sent.map((k) => label(k)).join(', ')}`] : ['ok', R.source === 'user' ? 'Answered' : 'Done']
  const toChips = (R) => (R.source === 'user' ? sends(R.raw) : (R.to || []).map((k) => `<span class="sch-ci">${esc(TO[k] || label(k))}</span>`).join('') || '<span class="sch-sub">—</span>')
  const modelLabel = (R) => (R.model && R.model.value ? (R.source === 'user' ? modelName(R.model.value) : MODEL_NAMES[R.model.value] || R.model.value) : '')
  const nextCell = (R) => !R.enabled ? '<span class="sch-sub">Off</span>'
    : R.running ? '<span class="sch-sub">Running now</span>'
    : R.paused_until ? `${esc(when(R.paused_until))}<div class="sch-sub">paused at night</div>`
    : R.next_run ? esc(when(R.next_run))
    : R.next ? '<span class="sch-sub">On its events</span>' : '<span class="sch-sub">—</span>'
  const spark = (R) => {
    const d = (R.month && R.month.daily) || []
    const byCost = d.some((x) => x.cost > 0), max = Math.max(byCost ? 0.0001 : 1, ...d.map((x) => (byCost ? x.cost : x.runs)))
    return d.map((x) => `<i class="${x.failed ? 'f' : ''}" style="height:${x.runs ? Math.max(2, Math.round(((byCost ? x.cost : x.runs) / max) * 16)) : 0}px"></i>`).join('')
  }
  const monthLine = (R) => { const m = R.month || { runs: 0, cost: 0 }; return `${m.runs} run${m.runs === 1 ? '' : 's'} · ${R.model === null ? 'no model' : money(Math.abs(m.cost || 0))}` }
  // One routine's row in a routines table (the Routines and System tabs alike).
  const routineRow = (R, selected, attr) => {
    const [cls, txt] = runLine(R, R.last)
    const L = R.last && R.last.state !== 'running' ? R.last : null
    const lastMeta = L ? `${esc(when(L.started))}${L.duration_ms != null ? ` · ${secs(L.duration_ms)}` : ''}${L.cost_usd != null ? ` · ${money(L.cost_usd)}` : ''}` : ''
    const changed = R.source !== 'user' && (R.settings || []).some((f) => f.set && f.kind === 'number')
    const m = modelLabel(R)
    return `<div class="sch-tr${selected ? ' sel' : ''}" role="row" ${attr}="${esc(R.id)}">
      <div><div class="sch-nm${R.enabled ? '' : ' off'}"${R.source !== 'user' && R.what ? ` title="${esc(R.what)}"` : ''}>${esc(R.name)}</div><div class="sch-sub">${changed ? part(true, R.schedule.text) : esc(R.schedule.text)}${m ? ` · ${R.source !== 'user' ? part(true, m) : esc(m)}` : ''}</div></div>
      <div class="sch-num" style="font-size:12px">${nextCell(R)}</div>
      <div><div class="sch-st"><span class="sch-dot ${cls}"></span>${esc(txt)}</div><div class="sch-sub sch-num">${lastMeta}</div></div>
      <div>${toChips(R)}</div>
      <div><div class="sch-spark sch-spark30" aria-hidden="true">${spark(R)}</div><div class="sch-sub sch-num">${monthLine(R)}</div></div>
      ${R.source === 'user' ? `<button class="sw${R.enabled ? ' on' : ''}" role="switch" aria-checked="${!!R.enabled}" aria-label="${esc(R.name)} on" data-sch-on="${esc(R.id)}" data-on="${!R.enabled}"></button>` : '<span></span>'}</div>`
  }
  // The facts above a table, from its routines.
  const factsOf = (list, noun, T) => {
    const on = list.filter((R) => R.enabled)
    const next = on.filter((R) => R.next_run).sort((a, b) => a.next_run.localeCompare(b.next_run))[0]
    return `<div class="sch-facts" aria-label="Last 30 days">
      <div class="sch-fact"><b>${list.length}</b><span>${noun}, ${on.length} on</span></div>
      <div class="sch-fact"><b>${next ? esc(when(next.next_run)) : '—'}</b><span>${next ? `next: ${esc(next.name)}` : 'nothing scheduled'}</span></div>
      <div class="sch-fact"><b class="sch-num">${T.runs}</b><span>runs in 30 days${T.failed ? ` · ${T.failed} failed` : ''}</span></div>
      <div class="sch-fact"><b class="sch-num">${big(T.tokens)}</b><span>tokens${T.tokens ? ` · ${Math.round((100 * T.cached) / T.tokens)}% from cache` : ''}</span></div>
      <div class="sch-fact"><b class="sch-num">${money(Math.abs(T.cost || 0))}</b><span>in 30 days</span></div></div>`
  }
  const HEAD = '<div class="sch-th" role="row"><span>Routine</span><span>Next run</span><span>Last run</span><span>Sends to</span><span>30 days</span><span></span></div>'
  // The System tab: Echo's own jobs as system routines, the night in its head.
  const systemTab = () => {
    if (!jobs) return jobsErr ? `<p class="sch-jerr" role="alert">${esc(jobsErr)}</p>` : '<div class="skeleton" style="padding:20px"><i></i><i></i><i></i></div>'
    const n = jobs.night || {}, dn = n.default || NIGHT_DEFAULT
    const changed = n.from !== dn.from || n.to !== dn.to
    const night = nightEdit
      ? `<label for="sch-night-from">Night</label><input class="sch-in sch-num" id="sch-night-from" type="time" value="${esc(n.from || '')}" data-sch-night="from"><span>→</span><input class="sch-in sch-num" id="sch-night-to" type="time" value="${esc(n.to || '')}" data-sch-night="to" aria-label="Night ends"><button class="btn ghost" data-sch-nightdone>Done</button>`
      : `<span>Night</span><button class="btn ghost" data-sch-nightedit title="Change the night system routines pause in">${esc(n.from || '')} → ${esc(n.to || '')}</button>${changed ? `<button class="icon-btn" data-sch-nightdef title="Back to default (${esc(dn.from)} → ${esc(dn.to)})" aria-label="Back to default night">${UNDO}</button>` : ''}`
    const list = jobs.routines
    const T = list.reduce((a, R) => { const m = R.month || {}; a.runs += m.runs || 0; a.failed += m.failed || 0; a.tokens += (m.tokens || 0) + (m.cached || 0); a.cached += m.cached || 0; a.cost += m.cost || 0; return a }, { runs: 0, failed: 0, tokens: 0, cached: 0, cost: 0 })
    return `<div class="sch-head" style="align-items:center"><div style="flex:1;min-width:0" class="sch-sub">Echo’s own jobs, run by itself — on these settings with or without the Scheduler; a change applies at the job’s next run.</div><div class="sch-night">${night}</div></div>
      ${factsOf(list, 'system routines', T)}
      ${jobsErr ? `<p class="sch-jerr" role="alert">${esc(jobsErr)}</p>` : ''}
      <div class="sch-tbl" role="table" aria-label="System routines">${HEAD}${list.map((R) => routineRow(R, selJob === R.id, 'data-sch-jsel')).join('')}</div>
      <div class="sch-sub">Runs and costs as Echo records them; each kept 31 days. A pass that found nothing to do isn’t a run.</div>`
  }
  // One routine in the right panel (the user's or a system one): what it is, its settings, its runs.
  const routinePanel = (R, runs) => {
    const done = runs.filter((x) => x.cost_usd != null)
    const avg = done.length ? done.reduce((a, x) => a + x.cost_usd, 0) / done.length : null
    const timed = runs.filter((x) => x.duration_ms != null)
    const avgT = timed.length ? timed.reduce((a, x) => a + x.duration_ms, 0) / timed.length : null
    const max = Math.max(0.0001, ...runs.map((x) => x.cost_usd || 0))
    const bars = runs.slice(0, 20).reverse().map((x) => `<i class="${x.state === 'failed' ? 'f' : ''}" style="height:${Math.max(4, Math.round(((x.cost_usd || 0) / max) * 100))}%" title="${esc(when(x.started))}${x.cost_usd != null ? ` · ${money(x.cost_usd)}` : ''}"></i>`).join('')
    const list = runs.slice(0, 8).map((x) => {
      const [cls, txt] = runLine(R, x)
      const line = x.error || x.summary || ''
      const inner = `<span class="sch-dot ${cls}"></span><div><div class="w2">${esc(when(x.started))} · ${esc(txt.toLowerCase())}</div><div class="meta">${secs(x.duration_ms)}${x.model ? ` · ${esc(x.model)}` : ''}${line ? ` · ${esc(line.slice(0, 80))}` : ''}</div></div><span class="sch-cost">${x.cost_usd != null ? money(x.cost_usd) : ''}</span>`
      return R.source === 'user' && x.run ? `<button class="sch-run" data-sch-runopen="${esc(R.id)}" data-run="${esc(x.run)}">${inner}</button>` : `<div class="sch-run">${inner}</div>`
    }).join('')
    const u = R.raw
    const kv = R.source === 'user'
      ? `<span>Sends to</span><div>${(u.deliver || []).map((k) => (k === 'mail' && u.mail_to.length ? `Mail — ${esc(u.mail_to.join(', '))}` : k === 'mail' ? 'Mail — you' : esc(label(k)))).join(', ') || 'Nowhere'}</div>
        <span>Permissions</span><div>${esc(perm(u.tools).replace(/^./, (c) => c.toUpperCase()))}</div>
        <span>AI</span><div>${esc(profileName(u.profile))}${u.model ? ` · ${esc(modelName(u.model))}` : ''}</div>
        <span>Prompt</span><div class="sch-sub" style="color:var(--text-2)">${esc(u.prompt.replace(/\s+/g, ' ').slice(0, 140))}${u.prompt.length > 140 ? '…' : ''}</div>`
      : `<span>Sends to</span><div>${(R.to || []).map((k) => esc(TO[k] || label(k))).join(', ') || '—'}</div>
        <span>When</span><div>${esc(R.schedule.text)}</div>
        ${fieldOf(R, 'night') ? `<span>At night</span><div>${nightWords(R)} (${esc((jobs.night || {}).from || '')} → ${esc((jobs.night || {}).to || '')})</div>` : ''}
        <span>Model</span><div>${R.model ? `${modelWords(R)}${R.model.value ? '' : ` <span class="sch-sub">— ${esc(String(R.model.default))}</span>`}` : '<span class="sch-sub">None: it calls no model</span>'}</div>
        <span>What</span><div class="sch-sub" style="color:var(--text-2)">${esc(R.what || '')}</div>`
    const nextTxt = !R.enabled ? ' · off' : R.paused_until ? ` · paused until ${esc(when(R.paused_until).toLowerCase())}` : R.next_run ? ` · next ${esc(when(R.next_run).toLowerCase())}` : R.next ? ` · ${esc(R.next)}` : ''
    return `<div class="sch-p">
      <div><div style="font-size:15px;font-weight:650">${esc(R.name)}</div><div class="sch-sub">${esc(R.schedule.text)}${nextTxt}</div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${R.source === 'user' ? `${R.running ? '<button class="btn" disabled>Running…</button>' : `<button class="btn primary" data-sch-run="${esc(R.id)}">Run now</button>`}<button class="btn" data-sch-edit="${esc(R.id)}">Edit</button>` : `<button class="btn primary" data-sch-jedit="${esc(R.id)}">Edit</button>`}</div>
      <div class="sch-kv">${kv}</div>
      ${runs.length ? `<div style="display:flex;flex-direction:column;gap:6px"><div style="display:flex;align-items:baseline;gap:8px"><h4 class="sch-h4" style="flex:1">Last ${Math.min(runs.length, 20)} run${runs.length === 1 ? '' : 's'}</h4><span class="sch-sub sch-num">${[avg != null ? `avg ${money(avg)}` : '', avgT != null ? secs(avgT) : ''].filter(Boolean).join(' · ')}</span></div><div class="sch-bars" aria-label="Each run, oldest first">${bars}</div></div><div>${list}</div>` : '<span class="sch-sub">No runs yet.</span>'}
    </div>`
  }
  const jobPanel = () => {
    const R = jobById(selJob)
    return R ? routinePanel(R, jobRuns[R.id] || []) : '<div class="sch-p"><span class="sch-sub">Pick a system routine.</span></div>'
  }
  // A system routine's editor, as a routine's: its timer, the night and the model; saved at once with Save.
  const jobEditPage = () => {
    const j = jobById(jobEdit.id)
    if (!j) return '<div class="sch"><span class="sch-sub">No such system routine.</span></div>'
    const e = jobEdit.draft
    const crumbs = `<div class="sch-crumb"><button data-sch-list>Scheduler</button><span>›</span><button data-sch-list>System</button><span>›</span><span>${esc(j.name)}</span><span>›</span><span>Edit</span></div>`
    const back = (f, shown) => `<button class="sch-jdefb icon-btn" data-sch-jdef="${esc(f.key)}" title="Back to default (${esc(shown)})" aria-label="Back to default (${esc(shown)})">${UNDO}</button>`
    const isDefault = (f) => (e[f.key] === undefined ? !f.set : e[f.key] === null)
    const val = (f) => (e[f.key] === undefined ? f.value : e[f.key] === null ? f.default : e[f.key])
    const nums = (j.settings || []).filter((f) => f.kind === 'number').map((f) => {
      const [what, unit] = unitOf(f.label), r = f.range || {}
      return `<div class="sch-f"><label class="sch-lbl" for="sch-jf-${esc(f.key)}">${esc(what)}</label><div class="sch-jnum"><input class="sch-in sch-num" id="sch-jf-${esc(f.key)}" type="number"${r.min != null ? ` min="${r.min}" max="${r.max}"` : ''} value="${esc(String(val(f)))}" data-sch-jf="${esc(f.key)}">${unit ? `<span class="sch-sub">${unit}</span>` : ''}${isDefault(f) ? `<span class="sch-sub">default${r.min != null ? ` · ${r.min}–${r.max}` : ''}</span>` : back(f, String(f.default))}</div></div>`
    }).join('')
    const nf = fieldOf(j, 'night'), mf = fieldOf(j, 'model')
    const nightOn = nf ? !!val(nf) : false
    const N = jobs.night || {}
    const nightRow = nf ? `<div class="sch-f"><span class="sch-lbl">At night</span><div style="display:flex;gap:8px;align-items:center"><button class="sch-dest" data-sch-jnightd style="grid-template-columns:auto minmax(0,1fr);border:0;padding:4px 0;flex:1"><span class="sch-cb${nightOn ? ' on' : ''}" aria-hidden="true">${nightOn ? '✓' : ''}</span><span>Pause at night (${esc(N.from || '')} → ${esc(N.to || '')})</span></button>${isDefault(nf) ? '<span class="sch-sub">default</span>' : back(nf, nf.default ? 'on' : 'off')}</div></div>` : ''
    const mv = mf ? (e.model === undefined ? (mf.set ? String(mf.value) : '') : e.model === null ? '' : e.model) : ''
    const modelRow = mf ? `<div class="sch-f"><label class="sch-lbl" for="sch-jf-model">Model</label><select class="sch-in" id="sch-jf-model" data-sch-jf="model" style="max-width:340px"><option value=""${!mv ? ' selected' : ''}>Default — ${esc(String(mf.default))}</option>${Object.entries(MODEL_NAMES).map(([m, l]) => `<option value="${m}"${mv === m ? ' selected' : ''}>${l}</option>`).join('')}</select><span class="sch-sub">Each AI profile runs its own model for Haiku, Sonnet and Opus.</span></div>` : ''
    return `<div class="sch">${crumbs}
      <div class="sch-edit">
        <div class="sch-col">
          <div class="sch-f"><span class="sch-lbl">Name</span><div style="font-weight:600">${esc(j.name)}</div><span class="sch-sub">${esc(j.what)}</span></div>
          ${modelRow}
        </div>
        <div class="sch-col">
          <div class="sch-f"><span class="sch-lbl">When</span><span class="sch-sub">Echo’s timer for it; it runs by itself while Echo runs.</span></div>
          ${nums}
          ${nightRow}
        </div>
      </div>
      ${jobsErr ? `<p class="error">${esc(jobsErr)}</p>` : ''}
      <div class="sch-foot"><span style="flex:1"></span><span class="sch-sub">A change applies at its next run</span><button class="btn" data-sch-list>Cancel</button><button class="btn primary" data-sch-jsave>Save</button></div></div>`
  }
  // The editor's fields into its draft: a value typed (different from what Echo holds) or reset (null).
  // A draft value the same as Echo's own (and not a setting the user has set) is no change: dropped, so Save sends
  // only what changed and an untouched default stays a default.
  const keep = (f, v) => { if (f.set ? false : String(v) === String(f.value)) delete jobEdit.draft[f.key]; else jobEdit.draft[f.key] = v }
  const readJobForm = () => {
    if (!jobEdit) return
    const j = jobById(jobEdit.id)
    if (!j) return
    for (const el of document.querySelectorAll('[data-sch-jf]')) {
      const f = fieldOf(j, el.dataset.schJf)
      if (!f) continue
      const v = String(el.value).trim()
      if (f.kind === 'model') {
        const cur = f.set ? String(f.value) : ''
        if (v === cur) delete jobEdit.draft.model
        else jobEdit.draft.model = v === '' ? null : v
        continue
      }
      if (v === '') continue
      const shown = jobEdit.draft[f.key] === undefined ? f.value : jobEdit.draft[f.key] === null ? f.default : jobEdit.draft[f.key]
      if (String(shown) !== v) keep(f, +v)
      else if (jobEdit.draft[f.key] !== null && String(v) === String(f.value) && f.set) delete jobEdit.draft[f.key]
    }
  }
  const saveJob = async () => {
    readJobForm()
    const j = jobById(jobEdit.id)
    const sets = Object.entries(jobEdit.draft).filter(([, v]) => v !== undefined).map(([k, v]) => {
      const f = fieldOf(j, k)
      return v === null ? `${k}=` : f && f.kind === 'night' ? `${k}=${v ? 'on' : 'off'}` : `${k}=${v}`
    })
    if (!sets.length) { page = 'list'; jobEdit = null; return ctx.render() }
    await setJob(j.id, sets)
    if (!jobsErr) { page = 'list'; selJob = j.id; jobEdit = null }
    ctx.render()
  }
  // Each system routine's runs, as Echo records them (`ctx.echo.routines.runs`).
  const jobRuns = {}
  const loadJobRuns = async (id) => {
    if (!canJobs()) return
    try { const r = await ctx.echo.routines.runs(id, { limit: 20 }); jobRuns[id] = Array.isArray(r) ? r : (r && r.runs) || [] } catch { jobRuns[id] = [] }
    redraw()
  }
  const listPage = () => {
    const T = data.totals || { runs: 0, failed: 0, tokens: 0, cached: 0, cost: 0 }
    const mine = data.routines.filter((r) => !r.error).map(userRoutine)
    const facts = factsOf(mine, 'routines', T)
    const rows = data.routines.map((r) => r.error
      ? `<div class="sch-tr" role="row"><div><div class="sch-nm">${esc(r.id)}</div><div class="sch-sub" style="color:var(--danger)">${esc(r.error)}</div></div><div></div><div></div><div></div><div></div><div></div></div>`
      : routineRow(userRoutine(r), sel === r.id, 'data-sch-sel')).join('')
    const empty = !data.routines.length ? `<div class="sch-tr"><div style="grid-column:1/-1;padding:14px 0"><b>No routines yet.</b> <span class="sch-sub">Start from a template — a plan for your day, Monday asks, a Friday wrap-up, meeting prep — or write your own.</span></div></div>` : ''
    return `<div class="sch">
      <div class="sch-head"><div style="flex:1"><h2>Scheduler</h2><div class="sch-sub">${canJobs() ? 'Your prompts, run by Claude on a schedule; and Echo’s own, as system routines.' : 'Your prompts, run by Claude on a schedule; the answer sent to you.'}</div></div>${!canJobs() || tab === 'routines' ? newButton() : ''}</div>
      ${canJobs() ? `<div class="tabs sch-tabs" role="tablist"><button class="tab" role="tab" data-sch-tab="routines" aria-selected="${tab === 'routines'}">Routines<span class="n">${data.routines.filter((r) => !r.error).length}</span></button><button class="tab" role="tab" data-sch-tab="system" aria-selected="${tab === 'system'}">System${jobs ? `<span class="n">${jobs.routines.length}</span>` : ''}</button></div>` : ''}
      ${canJobs() && tab === 'system' ? `${systemTab()}</div>` : ''}${canJobs() && tab === 'system' ? '' : `
      ${facts}
      <div class="sch-tbl" role="table" aria-label="Routines">${HEAD}${rows}${empty}</div>
      ${error ? `<p class="error">${esc(error)}</p>` : ''}
      <div class="sch-sub">Costs as Claude Code reports them for each run, on the routine’s AI profile. Each routine keeps its last 20 runs: prompt, answer and log.</div></div>`}`
  }
  const newButton = () => `<div class="sch-pick"><button class="btn primary" data-sch-new aria-haspopup="menu" aria-expanded="${picker}">+ New routine</button>${picker ? `<div class="sch-menu" role="menu">
      ${(data.templates || []).map((t) => `<button role="menuitem" data-sch-tpl="${esc(t.template)}"><b>${esc(t.name)}</b><span class="sch-sub">${esc(t.description)}</span></button>`).join('')}
      <hr><button role="menuitem" data-sch-blank><b>Blank</b><span class="sch-sub">Write your own prompt.</span></button></div>` : ''}</div>`

  const panel = () => {
    const r = data && data.routines.find((x) => x.id === sel)
    if (!r || r.error) return '<div class="sch-p"><span class="sch-sub">Pick a routine.</span></div>'
    const R = userRoutine(r)
    return routinePanel(R, R.runs)
  }
  const profileName = (id) => {
    const P = data.profiles || { profiles: [] }
    const p = P.profiles.find((x) => x.id === (id || P.default))
    return id ? (p ? p.name : id) : `The default${p ? ` — ${p.name}` : ''}`
  }

  const runPage = () => {
    const v = runView, r = data.routines.find((x) => x.id === v.id), d = v.detail
    const crumbs = `<div class="sch-crumb"><button data-sch-list>Scheduler</button><span>›</span>${r ? `<button data-sch-back="${esc(r.id)}">${esc(r.name)}</button><span>›</span>` : ''}<span>Run of ${esc(when(d && d.record ? d.record.at : null) || v.run)}</span></div>`
    if (!d) return `<div class="sch">${crumbs}<div class="skeleton" style="padding:20px"><i></i><i></i><i></i></div></div>`
    const rec = d.record
    if (!rec) return `<div class="sch">${crumbs}<div class="sch-card"><b>Running…</b><span class="sch-sub">Claude is working on it; this page shows the answer when it is done.</span></div></div>`
    const [cls, txt] = lastLine(rec)
    const u = rec.usage, sp = d.split
    const tok = (label, n, cost, color, share) => `<div class="sch-tok"><span>${label}</span><div class="sch-track"><i style="width:${Math.max(1, share)}%;background:${color}"></i></div><span class="sch-num" style="text-align:right">${(n || 0).toLocaleString()}</span><span class="sch-num sch-sub" style="text-align:right">${money(cost)}</span></div>`
    const total = u ? u.input_tokens + u.cache_read_tokens + u.cache_write_tokens + u.output_tokens : 0
    const pct = (n) => (total ? (100 * n) / total : 0)
    const cost = u ? `<div class="sch-card"><div style="display:flex;align-items:baseline;gap:8px"><h3 class="sch-h4" style="flex:1">What it cost</h3><b class="sch-num" style="font-size:18px;font-weight:650">${money(u.cost_usd)}</b></div>
        ${tok('Cache read', u.cache_read_tokens, sp && sp.cache_read, 'color-mix(in srgb, var(--accent) 45%, transparent)', pct(u.cache_read_tokens))}
        ${tok('Cache write', u.cache_write_tokens, sp && sp.cache_write, 'var(--accent)', pct(u.cache_write_tokens))}
        ${tok('Input', u.input_tokens, sp && sp.input, 'var(--accent-ink)', pct(u.input_tokens))}
        ${tok('Output', u.output_tokens, sp && sp.output, 'var(--warn)', pct(u.output_tokens))}
        <div class="sch-sub">${u.turns || 0} turns · ${secs(u.duration_ms)}${r ? ` · this routine: ${money(r.month.cost)} in 30 days` : ''}. As Claude Code reports it; split by Claude’s price ratios.</div></div>` : ''
    const where = (rec.sent || []).length || rec.state === 'failed' ? `<div class="sch-card"><h3 class="sch-h4">Where it went</h3>
        ${(rec.sent || []).map((k) => `<div class="sch-del"><span class="sch-dot ok"></span><b>${esc(label(k))}</b><span class="sch-sub">${k === 'mail' && r && r.mail_to.length ? esc(r.mail_to.join(', ')) : 'to you'}</span><span style="color:var(--me)">Delivered</span></div>`).join('')}
        ${rec.state === 'failed' ? `<div class="sch-del"><span class="sch-dot bad"></span><b>—</b><span class="sch-sub" style="color:var(--danger)">${esc(rec.message || '')}</span><span></span></div>` : ''}</div>` : ''
    const steps = d.steps.length ? `<div class="sch-card"><h3 class="sch-h4">What it did</h3>${d.steps.map((s) => `<div class="sch-step"><span>${esc(s.t)}</span><span>${esc(s.text)}</span></div>`).join('')}</div>` : ''
    return `<div class="sch">${crumbs}
      <div class="sch-head"><div style="flex:1"><h2 style="display:flex;align-items:center;gap:8px"><span class="sch-dot ${cls}"></span>${esc(txt)} · ${esc(when(rec.at))}</h2>
        <div class="sch-sub sch-num">${rec.trial ? 'A try, not sent · ' : ''}${secs(u && u.duration_ms)}${rec.model ? ` · ${esc(rec.model)}` : ''}${r ? ` · ${esc(perm(r.tools))}` : ''}</div></div>
        <button class="btn" data-sch-prompt>${v.prompt ? 'Hide prompt' : 'Show prompt'}</button>${r ? `<button class="btn primary" data-sch-run="${esc(r.id)}">Run again</button>` : ''}</div>
      ${v.prompt ? `<div class="sch-card"><h3 class="sch-h4">The prompt Claude got</h3><pre style="white-space:pre-wrap;font:12px/1.5 var(--mono);margin:0;color:var(--text-2)">${esc(d.prompt)}</pre></div>` : ''}
      <div class="sch-grid">
        <div class="sch-card"><div style="display:flex;align-items:center;gap:8px"><h3 class="sch-h4" style="flex:1">${(rec.sent || []).length ? 'The answer, as sent' : 'The answer'}</h3><span class="sch-sub">${d.words.toLocaleString()} words</span></div>
          ${d.answer_html ? `<div class="sch-ans">${d.answer_html}</div>` : `<span class="sch-sub">${esc(rec.message || 'No answer')}</span>`}
          ${rec.model ? `<div class="sch-sub" style="border-top:1px solid var(--line);padding-top:8px">Written by AI (Claude, ${esc(rec.model)})${(rec.sent || []).length ? ' — the message says so too' : ''}.</div>` : ''}</div>
        <div style="display:flex;flex-direction:column;gap:14px">${cost}${where}${steps}</div>
      </div></div>`
  }

  const editPage = () => {
    const e = edit, d = (data && data.deliver) || {}
    const ready = { teams: !!d.teams, mail: !!d.mail, today: d.today === true }
    const provided = d.provided || []
    for (const p of provided) ready[p.kind] = !!p.ready
    const P = data.profiles || { profiles: [] }
    const crumbs = `<div class="sch-crumb"><button data-sch-list>Scheduler</button><span>›</span><span>${e.id ? esc(e.name) : 'New routine'}</span>${e.id ? '<span>›</span><span>Edit</span>' : ''}</div>`
    const modes = [['daily', 'Every day'], ['weekdays', 'Weekdays'], ['days', 'Some days'], ['every', 'Every few hours']]
    const dayBtns = DAY_SHORT.map((l, i) => {
      const on = e.mode === 'daily' || (e.mode === 'weekdays' && i < 5) || (e.mode === 'days' && e.days[i])
      return `<button class="sch-day${on ? ' on' : ''}" data-sch-day="${i}" aria-pressed="${on}"${e.mode === 'days' ? '' : ' disabled'}>${l}</button>`
    }).join('')
    const timeRow = e.mode === 'every'
      ? `<div style="display:flex;gap:8px;align-items:center"><label class="sch-sub" for="sch-hours">every</label><input class="sch-in" id="sch-hours" type="number" min="1" max="24" value="${esc(String(e.hours))}" style="width:70px"><span class="sch-sub">hours, from midnight</span></div>`
      : `<div style="display:flex;gap:4px;align-items:center">${dayBtns}<span style="width:10px"></span><label class="sch-sub" for="sch-time">at</label><input class="sch-in" id="sch-time" type="time" value="${esc(e.time)}" style="width:96px"></div>`
    const dest = (k, sub, right) => `<button class="sch-dest${e.deliver.includes(k) ? ' on' : ''}" data-sch-to="${k}"${ready[k] ? '' : ' disabled'}><span class="sch-cb${e.deliver.includes(k) ? ' on' : ''}" aria-hidden="true">${e.deliver.includes(k) ? '✓' : ''}</span><div><b style="font-weight:600;font-size:12.5px">${esc(label(k))}</b><div class="sch-sub">${sub}</div></div><span class="sch-sub">${right}</span></button>`
    const avg = (() => { const r = data.routines.find((x) => x.id === e.id); const c = r ? r.runs.filter((x) => x.cost != null) : []; return c.length ? c.reduce((a, x) => a + x.cost, 0) / c.length : null })()
    const tr = trial && trial.detail
    const trialCard = !trial ? '' : !tr || !tr.record
      ? '<div class="sch-card"><b>Trying it…</b><span class="sch-sub">Claude is running it as written now; nothing is sent. This takes about a minute.</span></div>'
      : `<div class="sch-card"><div style="display:flex;gap:8px;align-items:center"><h3 class="sch-h4" style="flex:1">Try — the answer you would get</h3><span class="sch-sub sch-num">${tr.record.usage ? `${secs(tr.record.usage.duration_ms)} · ${money(tr.record.usage.cost_usd)}` : ''}</span><button class="btn ghost" data-sch-trialclose>Close</button></div>
          ${tr.answer_html ? `<div class="sch-ans">${tr.answer_html}</div>` : `<span class="sch-sub" style="color:var(--danger)">${esc(tr.record.message || 'No answer')}</span>`}</div>`
    return `<div class="sch">${crumbs}
      <div class="sch-edit">
        <div class="sch-col">
          <div class="sch-f"><label class="sch-lbl" for="sch-name">Name</label><input class="sch-in" id="sch-name" value="${esc(e.name || '')}" placeholder="Plan for the day"></div>
          <div class="sch-f"><label class="sch-lbl" for="sch-prompt">What Claude should do</label><textarea class="sch-in" id="sch-prompt" placeholder="What do I owe this week, and what is waiting for others? Group by client.">${esc(e.prompt || '')}</textarea>
            <span class="sch-sub">Claude reads your calls, threads, tasks and the Brain. It writes the answer you get; it can’t send anything itself.</span></div>
          <div class="sch-f"><span class="sch-lbl">AI profile</span><div style="display:flex;gap:8px"><select class="sch-in" id="sch-profile" aria-label="AI profile" style="flex:1"><option value=""${!e.profile ? ' selected' : ''}>${esc(profileName(''))}</option>${P.profiles.map((p) => `<option value="${esc(p.id)}"${e.profile === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select><select class="sch-in" id="sch-model-pick" aria-label="Model" style="width:170px">${[['', 'Profile’s default'], ...MODELS, ['other', 'Other…']].map(([v, l]) => `<option value="${v}"${(e.modelPick || '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
            ${e.modelPick === 'other' ? `<input class="sch-in" id="sch-model" aria-label="Other model" value="${esc(e.model || '')}" placeholder="a model’s name, e.g. claude-sonnet-4-5">` : ''}
            ${e.modelPick === 'other' ? '<span class="sch-sub">Any name Claude Code takes with --model: a full model id, or one your company’s gateway names. Empty: the profile’s default.</span>' : !e.modelPick ? '<span class="sch-sub">Profile’s default: the model the profile writes minutes with.</span>' : ''}</div>
        </div>
        <div class="sch-col">
          <div class="sch-f"><span class="sch-lbl">When</span><div class="sch-chips" role="group" aria-label="Repeat">${modes.map(([m, l]) => `<button class="sch-chip${e.mode === m ? ' on' : ''}" data-sch-mode="${m}" aria-pressed="${e.mode === m}">${l}</button>`).join('')}</div>${timeRow}
            <span class="sch-sub sch-num">Next: ${nextThree(e).join(' · ') || '—'}. Missed while Echo is off → runs once when it’s back.</span></div>
          <div class="sch-f"><span class="sch-lbl">Send the answer to</span>
            ${dest('mail', e.mailOthers ? 'To the addresses below' : 'To you — or <u data-sch-others>other addresses</u>', ready.mail ? esc(d.account || '') : 'Sign in to Microsoft 365')}
            ${e.mailOthers ? `<div style="display:flex;gap:8px;align-items:center"><input class="sch-in" id="sch-mailto" style="flex:1" value="${esc(e.mail_to.join(', '))}" placeholder="name@company.example, …"><button class="btn ghost" data-sch-others>To me</button></div><span class="sch-sub">Mail to others goes from your account, as written — nobody reviews it first.</span>` : ''}
            ${ready.today ? dest('today', 'A card on Echo’s Today page', 'Ready') : ''}
            ${dest('teams', 'Your chat with yourself', ready.teams ? 'Ready' : 'Sign in to Microsoft 365')}
            ${provided.map((p) => dest(p.kind, p.ready ? `From the ${esc(p.plugin)} plugin` : `<span class="sch-warn">${esc(p.why || 'Not set up yet')}</span>`, p.ready ? 'Ready' : `<u data-sch-connect="${esc(p.plugin)}">Set up…</u>`)).join('')}
            <button class="sch-dest" data-sch-skip style="grid-template-columns:auto minmax(0,1fr);border:0;padding:4px 0"><span class="sch-cb${e.skip_empty !== false ? ' on' : ''}" aria-hidden="true">${e.skip_empty !== false ? '✓' : ''}</span><span class="sch-sub">Send nothing when there’s nothing worth sending</span></button></div>
          <div class="sch-f"><span class="sch-lbl">What Claude may do</span>${PERMS.map(([v, l, h, w]) => `<button class="sch-perm${(e.tools || 'read') === v ? ' on' : ''}" data-sch-perm="${v}" aria-pressed="${(e.tools || 'read') === v}"><span class="sch-cb round${(e.tools || 'read') === v ? ' on' : ''}" aria-hidden="true">${(e.tools || 'read') === v ? '●' : ''}</span><div><b style="font-weight:600;font-size:12.5px">${l}</b><div class="sch-sub${w ? ' sch-warn' : ''}">${h}</div></div></button>`).join('')}</div>
        </div>
      </div>
      ${error ? `<p class="error">${esc(error)}</p>` : ''}
      <div class="sch-foot">${e.id ? `<button class="btn ghost danger" data-sch-del="${esc(e.id)}">Delete</button>` : ''}<span style="flex:1"></span>
        <span class="sch-sub">Try it shows the answer here without sending${avg != null ? ` · about ${money(avg)}` : ''}</span>
        <button class="btn" data-sch-try${trial && !(tr && tr.record) ? ' disabled' : ''}>Try it</button><button class="btn" data-sch-list>Cancel</button><button class="btn primary" data-sch-save>Save</button></div>
      ${trialCard}</div>`
  }

  ctx.settings.section({
    id: 'main',
    label: 'Scheduler',
    icon: CLOCK,
    badge: () => (data ? data.routines.length : ''),
    render() {
      // Coming (back) to the section — not drawn for a few seconds — or 30 s on: Echo's jobs asked for again.
      const now = Date.now()
      if (canJobs() && (now - seenAt > 5000 || now - jobsAt > 30000)) loadJobs()
      seenAt = now
      if (!data) { if (!error) load(); return error ? `<p class="error">${esc(error)}</p>` : '<div class="skeleton" style="padding:20px"><i></i><i></i><i></i></div>' }
      return page === 'run' && runView ? runPage() : page === 'edit' && edit ? editPage() : page === 'jobedit' && jobEdit && jobs ? jobEditPage() : listPage()
    },
  })
  ctx.panels.add({ id: 'routine', label: 'Routine', icon: CLOCK, area: 'right', when: () => here() && page === 'list' && (tab === 'routines' || !canJobs()) && !!sel, render: panel })
  ctx.panels.add({ id: 'system', label: 'System routine', icon: CLOCK, area: 'right', when: () => here() && page === 'list' && tab === 'system' && canJobs() && !!selJob, render: jobPanel })
  // Its card in Settings → Plugins points to its section.
  ctx.settings.add({ render: () => ctx.ui.setCard('', [ctx.ui.setRow('Routines and Echo’s jobs', `${data ? data.routines.length : '…'} routine${data && data.routines.length === 1 ? '' : 's'}, and what Echo runs by itself — see and change them in its own section.`, `<button class="btn" data-sch-open>Open Scheduler</button>`)]) })
  ctx.palette.add({ label: 'Scheduler: system routines (Echo’s jobs)', keywords: 'system echo jobs background night pause model interval sync recall prep minutes', run: () => { page = 'list'; setTab('system'); jobsAt = 0; ctx.go(`settings/${SECTION}`) } })
  ctx.palette.add({ label: 'Scheduler: routines', keywords: 'routine schedule cron digest', run: () => { page = 'list'; setTab('routines'); ctx.go(`settings/${SECTION}`) } })
  ctx.palette.add({ label: 'Scheduler: new routine from a template', keywords: 'routine plan monday friday prep', run: () => { page = 'list'; setTab('routines'); picker = true; ctx.go(`settings/${SECTION}`) } })

  listen('click', async (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-sch-sel],[data-sch-on],[data-sch-new],[data-sch-tpl],[data-sch-blank],[data-sch-run],[data-sch-edit],[data-sch-runopen],[data-sch-list],[data-sch-back],[data-sch-prompt],[data-sch-mode],[data-sch-day],[data-sch-to],[data-sch-others],[data-sch-skip],[data-sch-perm],[data-sch-save],[data-sch-del],[data-sch-try],[data-sch-trialclose],[data-sch-open],[data-sch-connect],[data-sch-nightdef],[data-sch-tab],[data-sch-jedit],[data-sch-nightedit],[data-sch-nightdone],[data-sch-jsel],[data-sch-jsave],[data-sch-jdef],[data-sch-jnightd]')
    if (!t) { if (picker && !(ev.target.closest && ev.target.closest('.sch-pick'))) { picker = false; ctx.render() } return }
    const d = t.dataset
    if (page === 'edit') readForm()
    if (page === 'jobedit') readJobForm()
    if ('schNightdef' in d) return setJob('night', ['from=', 'to='])
    if (d.schTab) { setTab(d.schTab); picker = false; if (d.schTab === 'system') jobsAt = 0; ctx.render(); if (d.schTab === 'system') loadJobs(); return }
    if (d.schJsel) { selJob = d.schJsel; ctx.showPanel('system'); ctx.render(); return loadJobRuns(selJob) }
    if (d.schJedit) { jobEdit = { id: d.schJedit, draft: {} }; jobsErr = ''; page = 'jobedit'; return ctx.render() }
    if ('schJsave' in d) return saveJob()
    if (d.schJdef) { jobEdit.draft[d.schJdef] = null; return ctx.render() }
    if ('schJnightd' in d) { const j = jobById(jobEdit.id), f = j && fieldOf(j, 'night'); if (f) { const cur = jobEdit.draft.night === undefined ? f.value : jobEdit.draft.night === null ? f.default : jobEdit.draft.night; const v = !cur; if (!f.set && v === f.value) delete jobEdit.draft.night; else if (f.set && v === f.value) delete jobEdit.draft.night; else jobEdit.draft.night = v } return ctx.render() }
    if ('schNightedit' in d) { nightEdit = true; ctx.render(); const f = document.getElementById('sch-night-from'); if (f) f.focus(); return }
    if ('schNightdone' in d) { nightEdit = false; return ctx.render() }
    if ('schOn' in d) { ev.stopPropagation(); return op('enable', { id: d.schOn, on: d.on === 'true' }) }
    if (d.schSel) { sel = d.schSel; ctx.showPanel('routine'); return ctx.render() }
    if ('schNew' in d) { picker = !picker; return ctx.render() }
    if (d.schTpl) { const tp = (data.templates || []).find((x) => x.template === d.schTpl); picker = false; trial = null; edit = draftOf({ ...tp, id: '' }); page = 'edit'; return ctx.render() }
    if ('schBlank' in d) { picker = false; trial = null; edit = draftOf({ id: '', name: '', schedule: 'weekdays 08:30', prompt: '', tools: 'read', deliver: data.deliver && data.deliver.mail ? ['mail'] : [], mail_to: [], skip_empty: true, enabled: true }); page = 'edit'; return ctx.render() }
    if (d.schEdit) { const r = data.routines.find((x) => x.id === d.schEdit); trial = null; edit = draftOf(r); page = 'edit'; return ctx.render() }
    if (d.schRun) { await op('run', { id: d.schRun }); sel = d.schRun; page = 'list'; return ctx.render() }
    if (d.schRunopen) return openRun(d.schRunopen, t.dataset.run)
    if ('schList' in d) { page = 'list'; edit = null; jobEdit = null; error = ''; jobsErr = ''; return ctx.render() }
    if (d.schBack) { page = 'list'; sel = d.schBack; ctx.showPanel('routine'); return ctx.render() }
    if ('schPrompt' in d) { runView.prompt = !runView.prompt; return ctx.render() }
    if (d.schMode) { edit.mode = d.schMode; if (edit.mode === 'days' && !edit.days.some(Boolean)) edit.days = [true, false, false, false, false, false, false]; return ctx.render() }
    if (d.schDay) { const i = +d.schDay; edit.days[i] = !edit.days[i]; if (!edit.days.some(Boolean)) edit.days[i] = true; return ctx.render() }
    if (d.schTo) { const k = d.schTo; edit.deliver = edit.deliver.includes(k) ? edit.deliver.filter((x) => x !== k) : [...edit.deliver, k]; return ctx.render() }
    if ('schOthers' in d) { ev.stopPropagation(); edit.mailOthers = !edit.mailOthers; if (edit.mailOthers && !edit.deliver.includes('mail')) edit.deliver.push('mail'); return ctx.render() }
    if ('schSkip' in d) { edit.skip_empty = edit.skip_empty === false; return ctx.render() }
    if (d.schPerm) { edit.tools = d.schPerm; return ctx.render() }
    if ('schSave' in d) { const ok = await op('save', { routine: routineOf(edit) }); if (ok) { sel = edit.id || (data.routines.find((r) => r.name === edit.name) || {}).id || sel; page = 'list'; edit = null; trial = null; ctx.render() } return }
    if (d.schDel) { const ok = await op('remove', { id: d.schDel }); if (ok) { page = 'list'; edit = null; sel = null; ctx.render() } return }
    if ('schTry' in d) {
      try {
        const r = await ctx.call('try', { routine: routineOf(edit) })
        trial = { run: r.run, detail: null }
        error = ''
        ctx.render()
        const poll = async () => {
          if (!trial || trial.run !== r.run) return
          try { trial.detail = await ctx.call('run_detail', { id: '_draft', run: r.run }) } catch { /* not written yet */ }
          ctx.render()
          if (!(trial.detail && trial.detail.record)) setTimeout(poll, 2500)
        }
        setTimeout(poll, 2500)
      } catch (e) { error = e.message; ctx.render() }
      return
    }
    if ('schTrialclose' in d) { trial = null; return ctx.render() }
    if ('schOpen' in d) { page = 'list'; jobsAt = 0; return ctx.go(`settings/${SECTION}`) }
    if ('schConnect' in d) return ctx.go(d.schConnect ? `settings/${d.schConnect}:main` : 'settings/plugins')
  })
  // The night's times are saved when the field is left (Tab, a click elsewhere) or on Enter: a time field changes with
  // each part typed, and saving then would redraw it under the typing.
  listen('focusout', (ev) => {
    const t = ev.target
    if (!t || !t.dataset || !t.matches || !t.matches('[data-sch-jf],[data-sch-night]')) return
    // Only a field the user left in this window: not one a redraw took away, nor the window losing focus.
    if (!t.isConnected || !document.hasFocus() || nightCancel) return
    const k = t.dataset.schNight
    if (k && jobs && t.value && t.value !== (jobs.night || {})[k]) return setJob('night', [`${k}=${t.value}`])
    if (k && !t.value) { if (jobs && jobs.night) t.value = jobs.night[k] || ''; return } // emptied: back to Echo's time
    if (held) setTimeout(redraw, 0)
  })
  listen('keydown', (ev) => {
    const k = ev.target && ev.target.dataset && ev.target.dataset.schNight
    if (k && ev.key === 'Enter') { ev.target.blur(); setTimeout(() => { nightEdit = false; ctx.render() }, 0) }
    if (k && ev.key === 'Escape') { nightCancel = true; nightEdit = false; ctx.render(); nightCancel = false }
  })
  listen('input', (ev) => { if (page === 'edit' && ev.target && ev.target.id === 'sch-hours') readForm() })
  listen('change', (ev) => {
    const j = ev.target && ev.target.dataset
    if (page === 'edit' && ev.target && ['sch-time', 'sch-hours', 'sch-model-pick'].includes(ev.target.id)) {
      readForm(); ctx.render()
      if (ev.target.id === 'sch-model-pick' && edit.modelPick === 'other') { const o = document.getElementById('sch-model'); if (o) o.focus() }
    }
  })

  load()
}
