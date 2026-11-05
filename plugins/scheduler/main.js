// Scheduler — the host half (runs inside Echo, also with its window closed).
//
// A routine is the user's own prompt, run by Claude Code on a schedule, its answer sent to them. Each one
// is a file in this plugin's store, `routines/<id>.md`: a little frontmatter, then the prompt.
//
//   ---
//   name: Monday asks
//   schedule: mon 09:00        # daily HH:MM · weekdays HH:MM · mon,thu HH:MM · every 2h · every 30m
//   profile:                   # an AI profile id (empty: the default)
//   model:                     # empty: the profile's minutes model
//   tools: read                # read · folder · skip — the user's pick, the prompt being theirs
//   deliver: telegram, mail    # teams · mail · telegram · today (the ways its manifest asks for)
//   mail_to:                   # mail only: other addresses (empty: the user)
//   skip_empty: true           # nothing worth sending → nothing sent
//   enabled: true
//   ---
//   What do I owe this week …
//
// The schedule is kept by slots (`state.json`): a routine runs when its next slot after the last one
// handled has come — once, also when Echo was off through several. A new or rescheduled routine counts
// from then. Runs leave their files in `runs/<id>/<stamp>/` (the last 20 kept).

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// The ways it may send: those its manifest asks for (\`uses.deliver.to\`) — Echo refuses any other.
const DELIVER_TO = ['teams', 'mail', 'telegram', 'today']
const validKind = (k) => DELIVER_TO.includes(k)
const NOTHING = 'NOTHING'
const KEEP_RUNS = 20

// ── schedule ──

export function parseSchedule(text) {
  const s = String(text || '').trim().toLowerCase()
  const bad = () => new Error(`schedule “${s}”: daily 09:00 · weekdays 09:00 · mon,thu 09:00 · every 2h · every 30m`)
  if (s.startsWith('every ')) {
    const m = /^every\s+(\d+)\s*([hm])$/.exec(s)
    if (!m) throw bad()
    const minutes = +m[1] * (m[2] === 'h' ? 60 : 1)
    if (minutes < 15 || minutes > 7 * 24 * 60) throw new Error('a routine runs at most every 15 minutes')
    return { every: minutes }
  }
  const m = /^(.*)\s+(\d{1,2}):(\d{2})$/.exec(s)
  if (!m || +m[2] > 23 || +m[3] > 59) throw bad()
  const days = [false, false, false, false, false, false, false]
  const list = m[1].trim()
  if (list === 'daily' || list === 'every day') days.fill(true)
  else if (list === 'weekdays') days.fill(true, 0, 5)
  else if (list === 'weekends') days.fill(true, 5)
  else for (const d of list.split(/[,\s]+/).filter(Boolean)) {
    const i = DAYS.findIndex((x) => d.startsWith(x))
    if (i < 0) throw bad()
    days[i] = true
  }
  if (!days.includes(true)) throw bad()
  return { days, h: +m[2], m: +m[3] }
}

/** The first slot strictly after `t` (ms), in the computer's local time. */
export function nextAfter(sch, t) {
  if (sch.every) {
    const d = new Date(t)
    d.setHours(0, 0, 0, 0)
    let s = d.getTime()
    while (s <= t) s += sch.every * 60000
    return s
  }
  for (let i = 0; i < 8; i++) {
    const d = new Date(t)
    d.setDate(d.getDate() + i)
    d.setHours(sch.h, sch.m, 0, 0)
    const wd = (d.getDay() + 6) % 7
    if (sch.days[wd] && d.getTime() > t) return d.getTime()
  }
  return t + 7 * 86400000
}

export function words(sch) {
  if (sch.every) return sch.every % 60 === 0 ? `Every ${sch.every / 60} h` : `Every ${sch.every} min`
  const t = `${String(sch.h).padStart(2, '0')}:${String(sch.m).padStart(2, '0')}`
  const n = sch.days.filter(Boolean).length
  if (n === 7) return `Every day at ${t}`
  if (n === 5 && sch.days.slice(0, 5).every(Boolean)) return `Weekdays at ${t}`
  return `${DAY_NAMES.filter((_, i) => sch.days[i]).join(', ')} at ${t}`
}

// ── routine files ──

const validId = (id) => /^[a-z0-9][a-z0-9-]{0,47}$/.test(id)
const validAddress = (a) => /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(a) && a.length <= 254

const TRANSLIT = { а: 'a', б: 'b', в: 'v', г: 'g', ґ: 'g', д: 'd', е: 'e', ё: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'i', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'iu', я: 'ia' }
export function slug(name) {
  const s = [...String(name).toLowerCase()].map((c) => (c in TRANSLIT ? TRANSLIT[c] : /[a-z0-9]/.test(c) ? c : '-')).join('')
  return s.split('-').filter(Boolean).join('-').slice(0, 40).replace(/-+$/, '') || 'routine'
}

const list = (v) => String(v || '').replace(/^\[|\]$/g, '').split(/[,;]/).map((x) => x.trim()).filter(Boolean)

export function parseRoutine(id, text) {
  const t = String(text).replace(/\r\n/g, '\n')
  if (!t.startsWith('---\n')) throw new Error(`${id}.md doesn't start with its settings (---)`)
  const end = t.indexOf('\n---', 4)
  if (end < 0) throw new Error(`${id}.md's settings aren't closed (---)`)
  const f = {}
  for (const raw of t.slice(4, end).split('\n')) {
    const line = raw.split(' #')[0].trim()
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf(':')
    if (i < 0) throw new Error(`${id}.md: “${line}” isn't key: value`)
    f[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '')
  }
  const flag = (k, d) => {
    const v = f[k] || ''
    if (!v) return d
    if (v === 'true' || v === 'yes') return true
    if (v === 'false' || v === 'no') return false
    throw new Error(`${k}: “${v}” isn't true or false`)
  }
  const r = {
    id,
    name: f.name || id,
    schedule: f.schedule || '',
    profile: f.profile || '',
    model: f.model || '',
    tools: f.tools || 'read',
    deliver: list(f.deliver),
    mail_to: list(f.mail_to),
    skip_empty: flag('skip_empty', true),
    enabled: flag('enabled', true),
    prompt: t.slice(end + 4).replace(/^\n/, '').trim(),
  }
  check(r)
  return r
}

function check(r) {
  if (!String(r.name).trim()) throw new Error('a routine needs a name')
  parseSchedule(r.schedule)
  if (!['read', 'folder', 'skip'].includes(r.tools)) throw new Error(`tools “${r.tools}”: read, folder or skip`)
  const bad = r.deliver.find((d) => !validKind(d))
  if (bad) throw new Error(`deliver “${bad}” isn't a way it sends (${DELIVER_TO.join(', ')})`)
  const addr = r.mail_to.find((a) => !validAddress(a))
  if (addr) throw new Error(`“${addr}” isn't a mail address`)
  if (r.mail_to.length > 20) throw new Error('mail_to: at most 20 addresses')
  if (!r.prompt.trim()) throw new Error('a routine needs a prompt')
}

/** Claude's prices keep one ratio to a model's input price: cache write 1.25×, cache read 0.1×, output 5×.
 *  So a run's total cost (as Claude Code reports it) splits by kind of token without knowing the model. */
export function costSplit(u) {
  if (!u) return null
  const w = { input: u.input_tokens || 0, cache_write: 1.25 * (u.cache_write_tokens || 0), cache_read: 0.1 * (u.cache_read_tokens || 0), output: 5 * (u.output_tokens || 0) }
  const all = w.input + w.cache_write + w.cache_read + w.output
  const cost = u.cost_usd || 0
  const part = (k) => (all ? (cost * w[k]) / all : 0)
  return { input: part('input'), cache_write: part('cache_write'), cache_read: part('cache_read'), output: part('output') }
}

/** A run's log as steps: `HH:MM:SS  → tool …`, refusals and the end. */
export function steps(log) {
  return String(log || '').split('\n').map((l) => /^(\d\d:\d\d:\d\d)\s+(.*)$/.exec(l)).filter(Boolean)
    .map(([, t, text]) => ({ t, text: text.trim().replace(/\S*\/scripts\/echoctl\b/g, 'echoctl') }))
    .filter((x) => /^(→|✗|Finished|Not allowed|Echo runs)/.test(x.text) || x.text.startsWith('stderr'))
    .slice(0, 60)
}

export function renderRoutine(r) {
  const one = (s) => String(s || '').replace(/[\r\n]+/g, ' ')
  return `---\nname: ${one(r.name)}\nschedule: ${one(r.schedule)}\nprofile: ${one(r.profile)}\nmodel: ${one(r.model)}\ntools: ${r.tools}\ndeliver: ${r.deliver.join(', ')}\nmail_to: ${one(r.mail_to.join(', '))}\nskip_empty: ${!!r.skip_empty}\nenabled: ${!!r.enabled}\n---\n${String(r.prompt).trim()}\n`
}

export function apply(ctx) {
  const running = new Set()

  const readState = () => JSON.parse(ctx.store.read('state.json') || '{}')
  const writeState = (st) => ctx.store.write('state.json', JSON.stringify(st, null, 2))
  const withState = (f) => { const st = readState(); f(st); writeState(st) }

  const all = () => ctx.store.list('routines').filter((n) => n.endsWith('.md')).map((n) => {
    const id = n.slice(0, -3)
    try { return parseRoutine(id, ctx.store.read(`routines/${n}`)) } catch (e) { return { id, error: String(e.message || e) } }
  })
  const get = (id) => {
    if (!validId(id)) throw new Error(`no routine “${id}”`)
    const t = ctx.store.read(`routines/${id}.md`)
    if (t == null) throw new Error(`no routine “${id}”`)
    return parseRoutine(id, t)
  }

  const save = (input) => {
    const r = {
      id: String(input.id || ''), name: String(input.name || '').trim(), schedule: String(input.schedule || '').trim(),
      profile: String(input.profile || '').trim(), model: String(input.model || '').trim(), tools: String(input.tools || 'read'),
      deliver: (input.deliver || []).map(String), mail_to: (Array.isArray(input.mail_to) ? input.mail_to : list(input.mail_to)).map(String),
      skip_empty: input.skip_empty !== false, enabled: input.enabled !== false, prompt: String(input.prompt || ''),
    }
    check(r)
    if (!r.id) {
      const base = slug(r.name)
      let id = base, n = 2
      while (ctx.store.read(`routines/${id}.md`) != null) id = `${base}-${n++}`
      r.id = id
    } else if (!validId(r.id)) throw new Error(`no routine “${r.id}”`)
    ctx.store.write(`routines/${r.id}.md`, renderRoutine(r))
    // A new or rescheduled routine starts counting from now: no run for slots already gone.
    withState((st) => {
      const e = (st[r.id] = st[r.id] || {})
      if (e.schedule !== r.schedule) { e.schedule = r.schedule; e.slot = Date.now() }
    })
    return r
  }

  const prune = (id) => {
    const runs = ctx.store.list(`runs/${id}`)
    while (runs.length > KEEP_RUNS) ctx.store.remove(`runs/${id}/${runs.shift()}`)
  }

  /** Run a routine now: Claude Code, then its deliveries. The run's record (also kept as its last). */
  const run = async (id, deliver = true, draft = null, given = null) => {
    const r = draft || get(id)
    if (running.has(id)) throw new Error(`“${r.name}” is running already`)
    running.add(id)
    const started = new Date()
    const stamp = given || started.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
    const sch = words(parseSchedule(r.schedule))
    const rec = { at: started.toISOString(), run: stamp, trial: !deliver }
    try {
      const empty = r.skip_empty ? ` If there is nothing worth sending this time, answer with exactly ${NOTHING} and nothing else.` : ''
      const prompt = `This is “${r.name}”, a routine the user wrote, run on its schedule (${sch}). Your final answer is sent to the user as a message (Markdown, short, the useful part first).${empty}\n\n${r.prompt}`
      const out = await ctx.claude.run({ title: r.name, prompt, profile: r.profile, model: r.model, tools: r.tools, dir: `runs/${id}/${stamp}` })
      rec.model = out.model || ''
      rec.usage = out.usage || null
      const answer = String(out.answer || '').trim()
      if (!answer || (r.skip_empty && answer.replace(/[*`.]/g, '').toUpperCase() === NOTHING)) {
        rec.state = 'empty'
        rec.message = 'Nothing worth sending this time'
      } else if (!deliver || !r.deliver.length) {
        rec.state = 'done'
        rec.message = answer.slice(0, 300)
      } else {
        const sent = [], failed = []
        for (const k of r.deliver) {
          try {
            // Today keeps one card per `about`: the routine's own name, so two routines at the same hour don't replace each other.
            await ctx.deliver.send(k, { title: r.name, markdown: answer, about: k === 'today' ? `Routine · ${r.name}` : `Routine · ${sch}`, ai: out.model, mail_to: k === 'mail' ? r.mail_to : [] })
            sent.push(k)
          } catch (e) { failed.push(`${k}: ${e.message || e}`) }
        }
        rec.sent = sent
        rec.state = failed.length ? 'failed' : 'done'
        rec.message = failed.length ? `Not sent — ${failed.join('; ')}` : answer.slice(0, 300)
      }
    } catch (e) {
      rec.state = 'failed'
      rec.message = String(e.message || e)
    } finally {
      running.delete(id)
    }
    rec.finished_at = new Date().toISOString()
    ctx.store.write(`runs/${id}/${stamp}/result.json`, JSON.stringify(rec, null, 2))
    prune(id)
    if (draft || !deliver) return rec
    withState((st) => { (st[id] = st[id] || {}).last = rec })
    if (rec.state === 'failed') {
      ctx.inbox.set(`routine-${id}`, { title: `Routine failed: ${r.name}`, why: rec.message, go: 'settings/plugins', actions: [{ label: 'Run again', command: 'run', args: { id }, primary: true }] })
      ctx.notify('Routine failed', `${r.name}: ${rec.message}`)
    } else ctx.inbox.clear(`routine-${id}`)
    return rec
  }

  // The schedule: every 30 s, each routine whose slot has come runs; missed slots run once.
  ctx.every(30, () => {
    const now = Date.now()
    const st = readState()
    for (const r of all()) {
      if (r.error || !r.enabled || running.has(r.id)) continue
      const e = st[r.id]
      if (!e || e.slot == null || e.schedule !== r.schedule) {
        withState((s) => { s[r.id] = { ...(s[r.id] || {}), schedule: r.schedule, slot: now } })
        continue
      }
      const sch = parseSchedule(r.schedule)
      let slot = nextAfter(sch, e.slot)
      if (slot > now) continue
      for (let n = nextAfter(sch, slot); n <= now; n = nextAfter(sch, n)) slot = n
      withState((s) => { s[r.id].slot = slot })
      run(r.id).catch((err) => ctx.log('run', r.id, err.message || err))
    }
  })

  /** A routine's runs, newest first (each its result.json). */
  const runsOf = (id) => ctx.store.list(`runs/${id}`).reverse().map((stamp) => {
    try { return JSON.parse(ctx.store.read(`runs/${id}/${stamp}/result.json`) || 'null') } catch { return null }
  }).filter(Boolean)

  const DAY = 86400000
  const within = (rec, days) => Date.now() - new Date(rec.at).getTime() < days * DAY
  const sum = (recs, f) => recs.reduce((a, r) => a + (f(r) || 0), 0)

  ctx.command('view', () => {
    const st = readState()
    const month = []
    const routines = all().map((r) => {
      if (r.error) return r
      const runs = runsOf(r.id).filter((x) => !x.trial)
      const recent = runs.filter((x) => within(x, 30))
      month.push(...recent)
      return { ...r, runs: runs.slice(0, 20).map((x) => ({ at: x.at, run: x.run, state: x.state, sent: x.sent || [], cost: x.usage ? x.usage.cost_usd : null, duration_ms: x.usage ? x.usage.duration_ms : null, message: x.message })),
        month: { runs: recent.length, cost: sum(recent, (x) => x.usage && x.usage.cost_usd) } }
    })
    const tokens = (x) => x.usage ? x.usage.input_tokens + x.usage.cache_read_tokens + x.usage.cache_write_tokens + x.usage.output_tokens : 0
    const totals = { runs: month.length, failed: month.filter((x) => x.state === 'failed').length, tokens: sum(month, tokens),
      cached: sum(month, (x) => x.usage && x.usage.cache_read_tokens), cost: sum(month, (x) => x.usage && x.usage.cost_usd) }
    return {
      totals,
      routines: routines.map((r) => {
        if (r.error) return r
        let when = '', next = null
        try {
          const sch = parseSchedule(r.schedule)
          when = words(sch)
          if (r.enabled) next = new Date(Math.max(nextAfter(sch, (st[r.id] && st[r.id].slot) || Date.now()), Date.now())).toISOString()
        } catch { /* shown as it is */ }
        return { ...r, when, next, last: (st[r.id] && st[r.id].last) || null, running: running.has(r.id) }
      }),
      templates: templates(),
      profiles: ctx.profiles(),
      deliver: (() => { const d = ctx.deliver.status() || {}; return { ...d, provided: (d.provided || []).filter((p) => DELIVER_TO.includes(p.kind)) } })(),
    }
  })
  /** The routines the plugin ships as starting points (`templates/*.md` in its package). */
  const templates = () => ctx.package.list('templates').filter((n) => n.endsWith('.md')).map((n) => {
    const text = ctx.package.read(`templates/${n}`) || ''
    try {
      const r = parseRoutine(n.slice(0, -3), text)
      const d = /\ndescription:\s*(.*)/.exec(text)
      const o = /\norder:\s*(\d+)/.exec(text)
      return { ...r, id: '', template: n.slice(0, -3), description: d ? d[1].trim() : '', order: o ? +o[1] : 99 }
    } catch { return null }
  }).filter(Boolean).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  ctx.command('templates', () => templates())

  ctx.command('runs', ({ id }) => runsOf(id))
  ctx.command('run_detail', ({ id, run: stamp }) => {
    if (!(id === '_draft' || validId(id)) || !/^[0-9-]+$/.test(String(stamp))) throw new Error('no such run')
    const dir = `runs/${id}/${stamp}`
    const rec = JSON.parse(ctx.store.read(`${dir}/result.json`) || 'null')
    const answer = ctx.store.read(`${dir}/answer.md`) || ''
    return {
      record: rec, running: !rec,
      answer, answer_html: answer ? ctx.markdown(answer) : '', words: answer.split(/\s+/).filter(Boolean).length,
      prompt: ctx.store.read(`${dir}/prompt.md`) || '', steps: steps(ctx.store.read(`${dir}/log.txt`)),
      split: rec && rec.usage ? costSplit(rec.usage) : null,
    }
  })
  // Try it: run what the editor holds now (saved or not), never sending; the answer comes back by its run.
  ctx.command('try', ({ routine }) => {
    const r = { ...routine, deliver: [], mail_to: [] }
    if (!r.name) r.name = 'Draft'
    if (!r.schedule) r.schedule = 'daily 09:00'
    if (r.tools && !['read', 'folder', 'skip'].includes(r.tools)) throw new Error(`tools “${r.tools}”`)
    if (!String(r.prompt || '').trim()) throw new Error('write what Claude should do first')
    const draft = { ...r, id: '_draft', skip_empty: false, tools: r.tools || 'read' }
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
    running.delete('_draft')
    run('_draft', false, draft, stamp).catch((e) => ctx.log('try', e.message || e))
    return { id: '_draft', run: stamp }
  })

  ctx.command('save', (a) => save(a.routine || a))
  ctx.command('remove', ({ id }) => {
    get(id)
    ctx.store.remove(`routines/${id}.md`)
    ctx.store.remove(`runs/${id}`)
    withState((st) => { delete st[id] })
    ctx.inbox.clear(`routine-${id}`)
    return true
  })
  ctx.command('enable', ({ id, on }) => save({ ...get(id), enabled: on !== false }))
  // Started, not waited for (a run takes minutes); `run_wait` waits (the CLI).
  ctx.command('run', ({ id }) => { get(id); run(id).catch((e) => ctx.log('run', id, e.message || e)); return { started: true } })
  ctx.command('run_wait', ({ id, deliver }) => run(id, deliver !== false))
}
