// A fake of the `ctx` Echo gives a plugin's host half (Echo: crates/echoctl/src/jshost.rs, PRELUDE), for unit tests.
// It fakes only names and shapes Echo has, and records what the plugin did:
//   const ctx = fakeCtx({ settings: {token: 'x'}, fetch: (url, opts) => ({status: 200, body: '…'}) })
//   apply(ctx); await ctx.run('status')
// Add a service here when a plugin needs it — the same name and shape as in PRELUDE.

/** `signin`: what Echo's `ctx.signin.get(host)` gives ({token, from} or null; a function of host for more); leave it
 *  out for an Echo without `ctx.signin`. `sources`: what `ctx.signin.sources(host)` says. */
/** `keep`: true for an Echo that keeps a sign-in the plugin made (`ctx.signin.keep/forget`, with `signin`): what it
 *  keeps is handed back first by `get` as {token, from: 'echo'}; it is in `keptNow` ({host: token}). */
/** `threads`: Echo's values per thread for `ctx.threads` ({thread: {key: value}}; leave it out for an Echo without it);
 *  `work`: true for `ctx.work`; `hints`: true for `ctx.view.hints`. */
/** `agent`: true for `ctx.agent.set` (its part for Claude in Echo), checked as Echo checks it; the last set is `agentNow`.
 *  `sessions`: true for `ctx.sessions.skills` / `read` (the last of each: `sessionsNow`). `folders`: the folders the
 *  user gave it (`ctx.fs.folders()`). `echo`: Echo's data for `ctx.echo.read` ({clients, threads, …}). `inbox`: true
 *  for `ctx.inbox` (`inboxNow`). The store's files are at `/store/<path>` (`ctx.store.path`). */
export function fakeCtx({ id = 'test', terminal = false, settings = {}, store = {}, fetch, signin, sources = { gh: true, git: true }, keep = false, threads, work = false, hints = false, agent = false, sessions = false, folders, echo, inbox = false } = {}) {
  const commands = {}, providers = {}, timers = [], pushed = {}, logs = [], requests = []
  const files = { ...store }
  const ctx = {
    id,
    terminal,
    log: (...a) => { logs.push(a.map(String).join(' ')) },
    command: (name, fn) => { commands[name] = fn },
    every: (seconds, fn) => { timers.push({ seconds: Math.max(10, seconds), fn }) },
    store: {
      read: (path) => (path in files ? files[path] : null),
      write: (path, text) => { files[path] = String(text) },
      list: (dir = '') => Object.keys(files).filter((p) => p.startsWith(dir)),
      remove: (path) => { delete files[path] },
      path: (path = '') => `/store/${path}`,
    },
    settings: {
      get: (key) => (key in settings ? settings[key] : null),
      // Echo keeps an empty secret as none.
      set: (key, value) => { if (value === '' || value == null) delete settings[key]; else settings[key] = value },
    },
    http: {
      fetch: async (url, opts = {}) => {
        requests.push({ url, opts })
        if (!fetch) throw new Error(`${url} can't be reached`)
        return fetch(url, opts)
      },
    },
    widgets: {
      provide: (wid, fn) => { providers[wid] = fn },
      set: (wid, data) => { pushed[wid] = data },
      clear: (wid) => { delete pushed[wid] },
    },
  }
  const signins = []
  if (signin !== undefined) {
    ctx.signin = {
      get: async (host, opts) => { signins.push(opts && opts.fresh ? `${host} (fresh)` : host); return typeof signin === 'function' ? signin(host, opts) : signin },
      sources: async () => sources,
    }
  }
  const keptNow = {}
  if (keep && ctx.signin) {
    const get = ctx.signin.get
    ctx.signin.get = async (host, opts) => (host in keptNow ? (signins.push(opts && opts.fresh ? `${host} (fresh)` : host), { token: keptNow[host], from: 'echo' }) : get(host, opts))
    ctx.signin.keep = (host, token) => { if (typeof token !== 'string' || !token || /[\x00-\x1f]/.test(token)) throw new Error('a sign-in is one line of text, 8 KB at most'); keptNow[host] = token; return true }
    ctx.signin.forget = (host) => { const was = host in keptNow; delete keptNow[host]; return was }
  }
  if (threads !== undefined) {
    ctx.threads = {
      get: (thread, key) => ((threads[thread] || {})[key] ?? null),
      set: (thread, key, value) => {
        if (value === null) { if (threads[thread]) delete threads[thread][key] } else { (threads[thread] = threads[thread] || {})[key] = JSON.parse(JSON.stringify(value)) }
      },
      list: (key) => Object.entries(threads).filter(([, v]) => v[key] != null).map(([thread, v]) => ({ thread, value: v[key] })),
    }
  }
  const workState = { provider: null, changed: 0 }
  if (work) ctx.work = { provide: (fn) => { workState.provider = fn }, changed: () => { workState.changed++ } }
  const hintsNow = []
  if (hints) ctx.view = { hints: (list) => { hintsNow.splice(0, hintsNow.length, ...JSON.parse(JSON.stringify(list || []))) } }
  const agentNow = { part: null, sets: 0 }
  if (agent) ctx.agent = { set: (part) => { agentNow.part = checkAgent(part || {}); agentNow.sets++ } }
  const sessionsNow = { skills: null, read: null }
  if (sessions) ctx.sessions = { skills: (list) => { sessionsNow.skills = JSON.parse(JSON.stringify(list || [])) }, read: (dirs) => { sessionsNow.read = [...(dirs || [])] } }
  if (folders !== undefined) ctx.fs = { folders: () => [...folders] }
  if (echo !== undefined) ctx.echo = { read: (kind) => JSON.parse(JSON.stringify(echo[kind] || [])) }
  const inboxNow = {}
  if (inbox) ctx.inbox = { set: (key, item) => { inboxNow[key] = item }, clear: (key) => { delete inboxNow[key] } }
  return Object.assign(ctx, {
    // What the tests look at.
    commands, providers, timers, pushed, logs, requests, signins, keptNow, files, settingsNow: settings, threadsNow: threads, workState, hintsNow, agentNow, sessionsNow, inboxNow,
    /** Ask its work rows as Echo does. */
    rows: async (ask) => JSON.parse(JSON.stringify(await workState.provider(ask))),
    /** Run a command as Echo does: JSON in, JSON out. */
    run: async (name, args = {}) => {
      if (!commands[name]) throw new Error(`no command “${name}”`)
      return JSON.parse(JSON.stringify((await commands[name](JSON.parse(JSON.stringify(args)))) ?? null))
    },
    /** Ask a widget's provider as Today does. */
    widget: async (wid, ask = {}) => {
      if (!providers[wid]) throw new Error(`no widget “${wid}”`)
      return JSON.parse(JSON.stringify(await providers[wid](ask)))
    },
    /** Run every timer once (Echo runs them at their first tick). */
    tick: async () => { for (const t of timers) await t.fn() },
  })
}

/** `ctx.agent.set` as Echo checks it (`plugins::agent::set_runtime`): {summary?, entries: [{name, summary, guide}]} —
 *  a summary of 1–200 characters, at most 20 entries, each name a–z 0–9 - (up to 40; not guides or scripts) once, a
 *  summary of 1–200 characters, a guide of at most 16 KB. Gives back what Echo keeps. */
export function checkAgent(part) {
  const chars = (s) => [...String(s)].length
  if (typeof part !== 'object' || Array.isArray(part)) throw new Error('ctx.agent.set takes {summary?, entries: [{name, summary, guide}]}')
  const extra = Object.keys(part).find((k) => !['summary', 'entries'].includes(k))
  if (extra) throw new Error(`ctx.agent.set has no “${extra}” (summary, entries)`)
  const summary = part.summary == null ? null : part.summary
  if (summary !== null && (typeof summary !== 'string' || !summary.trim() || chars(summary) > 200)) throw new Error('its summary is text of 1–200 characters')
  const list = part.entries == null ? [] : part.entries
  if (!Array.isArray(list)) throw new Error('entries are a list of {name, summary, guide}')
  if (list.length > 20) throw new Error('at most 20 entries')
  const entries = []
  for (const e of list) {
    const name = typeof e.name === 'string' ? e.name : ''
    if (!/^[a-z0-9-]{1,40}$/.test(name) || ['guides', 'scripts'].includes(name)) throw new Error('an entry\'s name is a few lowercase words with dashes (a–z, 0–9, -; up to 40), not guides or scripts')
    if (entries.some((x) => x.name === name)) throw new Error(`entry ${name} is given twice`)
    const s = typeof e.summary === 'string' ? e.summary : ''
    if (!s.trim() || chars(s) > 200) throw new Error(`entry ${name}: a summary of 1–200 characters`)
    const g = typeof e.guide === 'string' ? e.guide : ''
    if (!g.trim() || new TextEncoder().encode(g).length > 16 * 1024) throw new Error(`entry ${name}: a guide of Markdown text, 16 KB at most`)
    entries.push({ name, summary: s, guide: g })
  }
  return { summary, entries }
}
