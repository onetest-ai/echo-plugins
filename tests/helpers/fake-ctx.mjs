// A fake of the `ctx` Echo gives a plugin's host half (Echo: crates/echoctl/src/jshost.rs, PRELUDE), for unit tests.
// It fakes only names and shapes Echo has, and records what the plugin did:
//   const ctx = fakeCtx({ settings: {token: 'x'}, fetch: (url, opts) => ({status: 200, body: '…'}) })
//   apply(ctx); await ctx.run('status')
// Add a service here when a plugin needs it — the same name and shape as in PRELUDE.

/** `signin`: what Echo's `ctx.signin.get(host)` gives ({token, from} or null; a function of host for more); leave it
 *  out for an Echo without `ctx.signin`. `sources`: what `ctx.signin.sources(host)` says. */
/** `threads`: Echo's values per thread for `ctx.threads` ({thread: {key: value}}; leave it out for an Echo without it);
 *  `work`: true for `ctx.work`; `hints`: true for `ctx.view.hints`. */
export function fakeCtx({ id = 'test', terminal = false, settings = {}, store = {}, fetch, signin, sources = { gh: true, git: true }, threads, work = false, hints = false } = {}) {
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
  return Object.assign(ctx, {
    // What the tests look at.
    commands, providers, timers, pushed, logs, requests, signins, files, settingsNow: settings, threadsNow: threads, workState, hintsNow,
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
