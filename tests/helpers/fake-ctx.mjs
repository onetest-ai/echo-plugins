import * as nfs from 'node:fs'
import * as npath from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

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
/** `profiles`: what `ctx.profiles()` gives ({default, profiles: [{id, name}]}); leave it out for an Echo without it. */
/** `agent`: true for `ctx.agent.set` (its part for Claude in Echo), checked as Echo checks it; the last set is `agentNow`.
 *  `sessions`: true for `ctx.sessions.skills` / `read` (the last of each: `sessionsNow`). `folders`: the folders the
 *  user gave it (`ctx.fs.folders()`). `echo`: Echo's data for `ctx.echo.read` ({clients, threads, …}). `inbox`: true
 *  for `ctx.inbox` (`inboxNow`). The store's files are at `/store/<path>` (`ctx.store.path`). */
/** `disk`: true for the whole of `ctx.fs` over the real `folders` (absolute, canonical: made by the test in a temp dir),
 *  in Echo's shapes and checks (jshost/folders.rs, grants.rs) — `fsLog` lists the writes; `git`: true for `ctx.git` by
 *  the real git in those folders, isolated from the user's settings (jshost/git.rs's shapes); `markdown`: true for
 *  `ctx.markdown(md, {breaks, links, images})` and `ctx.markdown.links` — a small stand-in for Echo's writer that keeps
 *  its rules for links and images (plugins/markdown.rs `allowed`), not its whole Markdown. `ctx.crypto.sha256` is there. */
export function fakeCtx({ id = 'test', terminal = false, settings = {}, store = {}, fetch, signin, sources = { gh: true, git: true }, keep = false, threads, work = false, hints = false, agent = false, sessions = false, folders, echo, inbox = false, profiles, disk = false, git = false, gitStrict = true, markdown = false, storeUnreadable = [] } = {}) {
  const commands = {}, providers = {}, timers = [], pushed = {}, logs = [], requests = []
  const files = { ...store }
  const ctx = {
    id,
    terminal,
    log: (...a) => { logs.push(a.map(String).join(' ')) },
    command: (name, fn) => { commands[name] = fn },
    every: (seconds, fn) => { timers.push({ seconds: Math.max(10, seconds), fn }) },
    store: {
      // A file Echo can't read (not UTF-8, a folder where a file should be) throws, as Echo's `store.read` does.
      read: (path) => { if (storeUnreadable.includes(path)) throw new Error(`${path}: stream did not contain valid UTF-8`); return path in files ? files[path] : null },
      write: (path, text) => { files[path] = String(text) },
      // The names in a folder of the store, sorted (as Echo's `store.list`).
      list: (dir = '') => {
        const pre = dir ? `${dir.replace(/\/+$/, '')}/` : ''
        return [...new Set(Object.keys(files).filter((p) => p.startsWith(pre)).map((p) => p.slice(pre.length).split('/')[0]))].sort()
      },
      // A file, or a folder with all in it (as Echo's `store.remove`).
      remove: (path) => { for (const p of Object.keys(files)) if (p === path || p.startsWith(`${path}/`)) delete files[p] },
      // Read, change, write (as Echo's `store.update`): `fn(text | null)`; undefined, null or the same text writes nothing.
      update: (path, fn) => {
        if (storeUnreadable.includes(path)) throw new Error(`${path}: stream did not contain valid UTF-8`)
        const cur = path in files ? files[path] : null
        const next = fn(cur)
        if (next === undefined || next === null || String(next) === cur) return cur
        files[path] = String(next)
        return files[path]
      },
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
  ctx.crypto = { sha256: (text) => sha256(String(text)) }
  const fsLog = []
  if (folders !== undefined) ctx.fs = disk ? diskFs(folders, fsLog) : { folders: () => [...folders] }
  if (git) ctx.git = gitOf(folders || [], gitStrict)
  if (markdown) ctx.markdown = markdownOf(id)
  if (profiles !== undefined) ctx.profiles = () => JSON.parse(JSON.stringify(profiles))
  if (echo !== undefined) ctx.echo = { read: (kind) => JSON.parse(JSON.stringify(echo[kind] || [])) }
  const inboxNow = {}
  if (inbox) ctx.inbox = { set: (key, item) => { inboxNow[key] = item }, clear: (key) => { delete inboxNow[key] } }
  return Object.assign(ctx, {
    // What the tests look at.
    commands, providers, timers, pushed, logs, requests, signins, fsLog, keptNow, files, settingsNow: settings, threadsNow: threads, workState, hintsNow, agentNow, sessionsNow, inboxNow,
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

// ── ctx.fs over real folders (jshost/folders.rs, grants.rs) ──

const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const secs = (st) => Math.floor(st.mtimeMs / 1000)
const DEVICE_NAME = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

function diskFs(folders, fsLog) {
  const granted = () => folders.map((f) => nfs.realpathSync.native(f))
  const rootOf = (root) => {
    let r
    try { r = nfs.realpathSync.native(String(root)) } catch { throw new Error(`${root} isn't one of this plugin's folders`) }
    if (!granted().includes(r)) throw new Error(`${r} isn't one of the folders you gave this plugin`)
    return r
  }
  // `rel` by its names alone (grants::plain): relative, plain names, no device name.
  const plain = (root, rel) => {
    const r = String(rel).replace(/^(\.\/)+/, '')
    if (npath.isAbsolute(r) || r.split('/').some((c) => c === '..' || c.endsWith('.') && c !== '' && c !== '.' || c.endsWith(' '))) throw new Error(`“${r}” isn't a path inside ${root}`)
    if (r.split('/').some((c) => DEVICE_NAME.test(c.split('.')[0]))) throw new Error(`“${r}” is a device name, not a file`)
    return r.split('/').filter((c) => c !== '' && c !== '.').join('/')
  }
  // grants::inside: what it resolves to stays inside the root.
  const inside = (root, rel) => {
    const full = npath.join(root, plain(root, rel))
    let real
    try { real = nfs.realpathSync.native(full) } catch { return full }
    if (real !== root && !real.startsWith(root + npath.sep)) throw new Error(`“${rel}” leads outside ${root}`)
    return real
  }
  const resolve = (root, rel) => inside(rootOf(root), rel)
  // grants::writable: and never hidden, never a link, its nearest folder there inside the root.
  const writable = (root0, rel) => {
    const root = rootOf(root0)
    inside(root, rel)
    const r = plain(root, rel)
    if (!r) throw new Error('not the folder itself')
    if (r.split('/').some((c) => c.startsWith('.'))) throw new Error(`“${rel}” is hidden: a plugin changes notes, not other programs' files`)
    const full = npath.join(root, r)
    try { if (nfs.lstatSync(full).isSymbolicLink()) throw new Error(`“${rel}” is a link: a plugin changes files, not links`) } catch (e) { if (e.code !== 'ENOENT') throw e }
    let at = npath.dirname(full)
    while (!nfs.existsSync(at)) at = npath.dirname(at)
    const real = nfs.realpathSync.native(at)
    if (real !== root && !real.startsWith(root + npath.sep)) throw new Error(`“${rel}” leads outside ${root}`)
    return full
  }
  const readText = (f, max) => {
    const fd = nfs.openSync(f, 'r')
    try { const buf = Buffer.alloc(max); const n = nfs.readSync(fd, buf, 0, max, 0); return buf.subarray(0, n).toString('utf8') } finally { nfs.closeSync(fd) }
  }
  const capOf = (max) => Math.min(max > 0 ? max : 1 << 20, 4 << 20)
  const walkFiles = (root, base, hidden, f) => {
    const stack = [base]
    while (stack.length) {
      const dir = stack.pop()
      let items
      try { items = nfs.readdirSync(dir, { withFileTypes: true }) } catch { continue }
      for (const e of items) {
        if (e.isSymbolicLink() || (!hidden && e.name.startsWith('.'))) continue
        const p = npath.join(dir, e.name)
        if (e.isDirectory()) stack.push(p)
        else if (e.isFile() && !f(npath.relative(root, p).split(npath.sep).join('/'), p, nfs.statSync(p))) return
      }
    }
  }
  const exts = (o) => (o.ext || []).map((x) => String(x).replace(/^\./, '').toLowerCase())
  const hasExt = (p, xs) => !xs.length || xs.includes(npath.extname(p).slice(1).toLowerCase())
  const base = (root, o) => (o.path ? resolve(root, o.path) : rootOf(root))
  const put = (f, name, text, opts) => {
    const ifSha = opts.ifSha
    const createNew = opts.createNew === true || ifSha === null
    if (ifSha != null) {
      if (!/^[0-9a-fA-F]{64}$/.test(ifSha)) throw new Error('ifSha is a sha256 in hex (64 characters), or null for a file that isn\'t there yet')
      if (createNew) throw new Error('ifSha and createNew: one or the other')
      let now = null
      try { now = sha256(nfs.readFileSync(f)) } catch { /* gone */ }
      if (now !== ifSha.toLowerCase()) throw new Error(`“${name}” changed since you read it: read it again`)
    } else if (createNew) {
      try { nfs.writeFileSync(f, text, { flag: 'wx' }) } catch (e) { if (e.code === 'EEXIST') throw new Error(`“${name}” is there already`); throw e }
      return
    }
    nfs.writeFileSync(f, text)
  }
  return {
    folders: () => granted(),
    forget: (root) => { fsLog.push(['forget', root]); return true },
    list: (root, rel) => nfs.readdirSync(resolve(root, rel || ''), { withFileTypes: true }).filter((e) => !e.isSymbolicLink()).map((e) => ({ name: e.name, dir: e.isDirectory() })),
    read: (root, rel, max) => readText(resolve(root, rel), capOf(max)),
    readMany: async (root, rels, max) => rels.slice(0, 5000).map((rel) => { try { return readText(resolve(root, rel), capOf(max)) } catch { return null } }),
    walk: async (root0, o = {}) => {
      const root = rootOf(root0)
      const max = Math.min(o.max > 0 ? o.max : 20000, 100000)
      const xs = exts(o)
      const out = []
      walkFiles(root, base(root0, o), o.hidden === true, (rel, p, st) => {
        if (hasExt(p, xs)) { const row = { path: rel, size: st.size, mtime: secs(st) }; if (o.sha) row.sha = sha256(nfs.readFileSync(p)); out.push(row) }
        return out.length < max
      })
      return out
    },
    stat: (root0, rel, o = {}) => {
      const root = rootOf(root0)
      const r = plain(root, String(rel || '').replace(/\/+$/, ''))
      const up = npath.dirname(r) === '.' ? root : inside(root, npath.dirname(r))
      const full = r ? npath.join(up, npath.basename(r)) : root
      let st
      try { st = nfs.lstatSync(full) } catch { return null }
      let real = null
      try { const x = nfs.realpathSync.native(full); if (x === root || x.startsWith(root + npath.sep)) real = npath.relative(root, x).split(npath.sep).join('/') } catch { /* a dangling link */ }
      const kind = st.isSymbolicLink() ? 'link' : st.isDirectory() ? 'dir' : st.isFile() ? 'file' : 'other'
      const out = { kind, size: kind === 'file' ? st.size : 0, mtime: secs(st), real }
      if (o.sha && kind === 'file') out.sha = sha256(nfs.readFileSync(full))
      return out
    },
    search: async (root0, query, o = {}) => {
      const root = rootOf(root0)
      if (!query || [...query].length > 1000) throw new Error('ctx.fs.search looks for 1 to 1,000 characters')
      const q = o.caseSensitive ? query : query.toLowerCase()
      const max = Math.min(o.max > 0 ? o.max : 200, 1000)
      const xs = exts(o)
      const out = []
      walkFiles(root, base(root0, o), o.hidden === true, (rel, p) => {
        if (!hasExt(p, xs)) return true
        const lines = readText(p, 4 << 20).split('\n')
        if (lines[lines.length - 1] === '') lines.pop()
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i].replace(/\r$/, '')
          if ((o.caseSensitive ? l : l.toLowerCase()).includes(q)) { out.push({ path: rel, line: i + 1, text: [...l].slice(0, 300).join('') }); if (out.length >= max) return false }
        }
        return true
      })
      return out
    },
    write: (root, rel, text, opts = {}) => {
      const f = writable(root, rel)
      if (nfs.existsSync(f) && nfs.statSync(f).isDirectory()) throw new Error(`“${rel}” is a folder`)
      nfs.mkdirSync(npath.dirname(f), { recursive: true })
      put(f, rel, String(text), opts)
      fsLog.push(['write', rel])
    },
    append: (root, rel, text) => { const f = writable(root, rel); nfs.mkdirSync(npath.dirname(f), { recursive: true }); nfs.appendFileSync(f, text.endsWith('\n') ? text : `${text}\n`); fsLog.push(['append', rel]) },
    mkdir: (root, rel) => { nfs.mkdirSync(writable(root, rel), { recursive: true }); fsLog.push(['mkdir', rel]) },
  }
}

// ── ctx.git by the real git (jshost/git.rs's answers), never the user's settings ──

const ECHO_MAIL = '@plugins.echo.invalid'
function gitOf(folders, gitStrict = true) {
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0', GIT_LITERAL_PATHSPECS: '1', LC_ALL: 'C' }
  const rootOf = (root) => {
    const r = nfs.realpathSync.native(String(root))
    if (!folders.map((f) => nfs.realpathSync.native(f)).includes(r)) throw new Error(`${r} isn't one of the folders you gave this plugin`)
    return r
  }
  const run = (cwd, args, ok = true) => {
    try { return { ok: true, out: execFileSync('git', args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }) } } catch (e) {
      if (ok) throw new Error(String(e.stderr || e.message).trim() || 'git failed')
      return { ok: false, out: Buffer.alloc(0) }
    }
  }
  const text = (b) => b.toString('utf8').trim()
  const repo = (cwd) => { const t = run(cwd, ['rev-parse', '--show-toplevel', '--show-prefix'], false); if (!t.ok) return null; const [top, prefix = ''] = t.out.toString('utf8').split('\n'); return { top, prefix } }
  const need = (cwd) => { const r = repo(cwd); if (!r) throw new Error('this folder isn\'t in a git repository'); return r }
  // A path as git.rs `named` gives it to git: by its real name (another case, through a link inside the folder), the
  // part not there yet as typed; never outside the folder.
  const named = (cwd, rel) => {
    const parts = String(rel).split('/').filter((c) => c && c !== '.')
    for (let k = parts.length; k >= 0; k--) {
      let real
      try { real = nfs.realpathSync.native(npath.join(cwd, ...parts.slice(0, k))) } catch { continue }
      const full = npath.join(real, ...parts.slice(k))
      if (full !== cwd && !full.startsWith(cwd + npath.sep)) throw new Error(`“${rel}” leads outside the folder`)
      return npath.relative(cwd, full).split(npath.sep).join('/')
    }
    throw new Error(`“${rel}” isn't in the folder`)
  }
  const head = (cwd) => { const h = run(cwd, ['rev-parse', '-q', '--verify', 'HEAD'], false); return h.ok ? text(h.out) : null }
  const validRev = (rev) => rev === 'HEAD' || /^HEAD~[0-9]{1,6}$/.test(rev) || /^[0-9a-fA-F]{4,64}$/.test(rev)
  return {
    info: async (root) => {
      const cwd = rootOf(root)
      const r = repo(cwd)
      if (!r) return { repo: false }
      const b = run(cwd, ['symbolic-ref', '-q', '--short', 'HEAD'], false)
      const branch = b.ok && text(b.out) ? text(b.out) : null
      return { repo: true, branch, head: head(cwd), detached: branch === null, busy: null, subfolder: r.prefix !== '' }
    },
    status: async (root, o = {}) => {
      const cwd = rootOf(root)
      const r = need(cwd)
      const out = run(cwd, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...(o.paths ? o.paths.map((x) => named(cwd, x)) : ['.'])]).out.toString('utf8').split('\0').filter(Boolean)
      const list = []
      for (let i = 0; i < out.length; i++) {
        const e = out[i]
        const code = e.slice(0, 2)
        const from = /[RC]/.test(code) ? out[++i] : null
        const path = e.slice(3)
        if (!path.startsWith(r.prefix)) continue
        list.push({ path: path.slice(r.prefix.length), code, ...(from ? { from: from.slice(r.prefix.length) } : {}) })
      }
      return list
    },
    log: async (root, o = {}) => {
      const cwd = rootOf(root)
      const r = need(cwd)
      if (!head(cwd)) return []
      const args = ['log', '-z', '--no-show-signature', '--no-notes', '--format=%H%x00%an%x00%ae%x00%aI%x00%ce%x00%s', `--max-count=${Math.min(o.max > 0 ? o.max : 50, 1000)}`]
      if (o.path) args.push('--follow', '--name-only')
      args.push('--', o.path || '.')
      const fields = run(cwd, args).out.toString('utf8').split('\0')
      const list = []
      for (let i = 0; i < fields.length;) {
        const rev = fields[i++].replace(/^\n+/, '')
        if (!rev) continue
        const [author, email, date, committer, subject] = fields.slice(i, i + 5)
        i += 5
        const item = { rev, author, email, date, subject, echo: committer && committer.endsWith(ECHO_MAIL) ? committer.slice(0, -ECHO_MAIL.length) : null }
        if (o.path && i < fields.length && fields[i].startsWith('\n')) { const at = fields[i++].replace(/^\n+/, ''); item.path = at.startsWith(r.prefix) ? at.slice(r.prefix.length) : null }
        list.push(item)
      }
      return list
    },
    show: async (root, rev, path, o = {}) => {
      const cwd = rootOf(root)
      if (!validRev(rev)) throw new Error(`“${rev}” isn't a version: HEAD, HEAD~N or a commit's id`)
      need(cwd)
      const t = run(cwd, ['cat-file', '-t', rev], false)
      if (!t.ok) return null
      if (text(t.out) !== 'commit') throw new Error(`“${rev}” isn't a commit`)
      const spec = `${rev}:./${path}`
      const k = run(cwd, ['cat-file', '-t', spec], false)
      if (!k.ok) return null
      if (text(k.out) !== 'blob') throw new Error(`“${path}” is a folder at that version`)
      const size = Number(text(run(cwd, ['cat-file', '-s', spec]).out))
      if (size > 16 << 20) throw new Error(`“${path}” is over 16 MB at that version`)
      const blob = run(cwd, ['cat-file', 'blob', spec]).out
      // `strict` (Echo #763): a version that isn't UTF-8 is refused, never read lossily. `gitStrict: false` fakes an
      // Echo from before it, which ignores the option.
      if (o.strict && gitStrict) { try { new TextDecoder('utf-8', { fatal: true }).decode(blob) } catch { throw new Error(`“${path}” is not UTF-8 text at that version`) } }
      const max = Math.min(o.max > 0 ? o.max : 1 << 20, 4 << 20)
      return { text: blob.subarray(0, max).toString('utf8'), size: blob.length, truncated: blob.length > max }
    },
    init: async (root, o = {}) => { const cwd = rootOf(root); run(cwd, ['init', '-q', '--template=', `--initial-branch=${o.branch || 'main'}`]); return { repo: true } },
    commit: async (root, o = {}) => {
      const cwd = rootOf(root)
      need(cwd)
      const paths = (o.paths || []).map((x) => named(cwd, x))
      if (!paths.length) throw new Error('commit: 1 to 1,000 paths')
      if (!o.message || !String(o.message).trim()) throw new Error('a commit\'s message is plain text of 1 to 5000 characters')
      const who = ['-c', 'committer.name=Echo (obsidian)', '-c', `committer.email=obsidian${ECHO_MAIL}`, '-c', 'user.name=Sam Rivera', '-c', 'user.email=sam@acme.example', '-c', 'commit.gpgsign=false']
      run(cwd, ['add', '--', ...paths])
      if (head(cwd) && run(cwd, ['diff', '--cached', '--quiet', 'HEAD', '--', ...paths], false).ok) return { rev: null }
      run(cwd, [...who, 'commit', '-q', '--no-verify', '--only', '-m', String(o.message).trim(), '--', ...paths])
      return { rev: head(cwd) }
    },
  }
}

// ── ctx.markdown: a stand-in for Echo's writer (minutes::page_html) with its link and image rules (markdown.rs) ──

function markdownOf(pluginId) {
  const MAX = 1 << 20
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const fits = (md) => { if (Buffer.byteLength(md) > MAX) throw new Error('ctx.markdown renders 1 MB of text at most') }
  // `%XX` decoded, anything else kept (markdown.rs `decode`).
  const decode = (x) => Buffer.from(x.replace(/%([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8')
  // markdown.rs `allowed`: no whitespace, control character or backslash; an image only from the plugin's folder route
  // (no `.`/`..` segment once decoded, no `?`/`#`); a link `https://<host>`, an `echo://` link Echo knows (links.rs
  // `Link::parse`: its kinds, an id after them), or the plugin's own `#<id>:` / `#brain/<id>:` route.
  const ECHO_KINDS = ['call', 'thread', 'project', 'client', 'person', 'task', 'prep', 'needs', 'mail', 'post']
  const allowed = (h, image) => {
    if ([...h].some((c) => /\s/.test(c) || /[\x00-\x1f\x7f-\x9f]/.test(c) || c === '\\')) return false
    if (image) {
      const rest0 = h.startsWith('/') ? h.slice(1) : h
      if (!rest0.startsWith(`plugin/${pluginId}/folder/`)) return false
      const rest = rest0.slice(`plugin/${pluginId}/folder/`.length)
      return rest !== '' && !/[?#]/.test(rest) && !decode(rest).split(/[/\\]/).some((x) => x === '.' || x === '..')
    }
    if (h.startsWith('https://')) { const host = h.slice(8); return host !== '' && !host.startsWith('/') }
    if (h.startsWith('echo://')) { const [kind, ...id] = h.slice(7).split('?')[0].split('/'); return ECHO_KINDS.includes(kind) && id.join('/') !== '' }
    const route = h.startsWith('#brain/') ? h.slice(7) : h.startsWith('#') ? h.slice(1) : null
    return route !== null && route.startsWith(pluginId) && route.slice(pluginId.length).startsWith(':')
  }
  // Lines outside fenced code, each with its inline code spans blanked (for finding links).
  const prose = (md) => {
    const out = []
    let fence = false
    for (const l of md.split('\n')) {
      if (/^\s*(```|~~~)/.test(l)) { fence = !fence; out.push(null); continue }
      out.push(fence ? null : l)
    }
    return out
  }
  const TOKENS = /(`[^`]*`)|(!?)\[\[([^\]\n]+)\]\]|(!?)\[([^\]\n]*)\]\((<[^>\n]*>|[^)\s]*)\)/g
  const links = (md) => {
    fits(md)
    const ls = [], im = []
    for (const l of prose(md)) {
      if (l === null) continue
      for (const m of l.matchAll(TOKENS)) {
        if (m[1]) continue
        if (m[3] !== undefined) { const d = m[3].split('|')[0].replace(/\\$/, '').trim(); (m[2] ? im : ls).push(d) } else { const d = m[6]; (m[4] ? im : ls).push(d) }
      }
    }
    return { links: [...new Set(ls)], images: [...new Set(im)] }
  }
  const inline = (l, o) => {
    let out = ''
    let last = 0
    for (const m of l.matchAll(TOKENS)) {
      out += esc(l.slice(last, m.index))
      last = m.index + m[0].length
      if (m[1]) { out += `<code>${esc(m[1].slice(1, -1))}</code>`; continue }
      const wiki = m[3] !== undefined
      const image = wiki ? !!m[2] : !!m[4]
      const dest = wiki ? m[3].split('|')[0].replace(/\\$/, '').trim() : m[6]
      const label = wiki ? (m[3].includes('|') ? m[3].slice(m[3].indexOf('|') + 1) : dest) : m[5]
      const map = (image ? o.images : o.links) || {}
      const h = Object.prototype.hasOwnProperty.call(map, dest) ? map[dest] : undefined
      if (h === null) out += image ? `<span class="figref md-missing" data-md-missing="${esc(dest)}">[${esc(dest)}]</span>` : `<a class="md-missing" data-md-missing="${esc(dest)}" role="link" tabindex="0">${esc(label)}</a>`
      else if (typeof h === 'string' && allowed(h, image)) out += image ? `<img src="${esc(h)}" alt="${esc(label)}" loading="lazy">` : `<a href="${esc(h)}"${h.startsWith('https://') ? ' rel="noopener noreferrer"' : ''}>${esc(label)}</a>`
      else out += image ? `[${esc(label)}]` : esc(label)
    }
    return out + esc(l.slice(last))
  }
  const render = (md, o = {}) => {
    fits(md)
    const out = []
    let para = []
    let code = null
    const flush = () => { if (para.length) out.push(`<p>${para.join(o.breaks ? '<br>\n' : '\n')}</p>`); para = [] }
    for (const l of md.split('\n')) {
      if (code !== null) { if (/^\s*(```|~~~)/.test(l)) { out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); code = null } else code.push(l); continue }
      if (/^\s*(```|~~~)/.test(l)) { flush(); code = []; continue }
      const h = /^(#{1,6})\s+(.*)$/.exec(l)
      if (h) { flush(); out.push(`<h${h[1].length}>${inline(h[2], o)}</h${h[1].length}>`); continue }
      if (l.trim() === '') { flush(); continue }
      para.push(inline(l.replace(/^>\s?/, ''), o))
    }
    flush()
    if (code !== null) out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`)
    return out.join('\n')
  }
  return Object.assign((md, opts) => render(String(md), opts || {}), { links: (md) => links(String(md)) })
}
