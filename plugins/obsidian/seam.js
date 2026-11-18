// Knowledge (the plugin `obsidian`) — the seam between #17's view (`view.js`) and this plugin's host half. #17 read
// Echo's `/api/kn…` routes and sent `kn_*` actions it polled as jobs; here each is one host command (`ctx.call`), its
// answer in the shape the view takes. No DOM, no Echo: `call(command, args)` is given (tests/obsidian/ui.test.mjs).

/** The route's query, decoded (`?path=a%2Fb.md&rev=…`). */
const query = (s) => {
  const out = {}
  for (const part of String(s || '').split('&')) {
    if (!part) continue
    const i = part.indexOf('=')
    const k = i < 0 ? part : part.slice(0, i)
    try { out[decodeURIComponent(k)] = i < 0 ? '' : decodeURIComponent(part.slice(i + 1)) } catch { out[k] = part.slice(i + 1) }
  }
  return out
}
const dec = (s) => { try { return decodeURIComponent(s) } catch { return s } }

/** A version's line diff as the view draws it: `@@` between hunks, each line `+`, `-` or ` ` and its text. */
export function knDiffText(hunks) {
  return (hunks || []).map((h) => ['@@', ...h.map(([o, l]) => `${o === '+' ? '+' : o === '-' ? '-' : ' '}${l}`)].join('\n')).join('\n')
}

/** A read #17 made (`api/kn`, `api/kn/<vault>/<what>[/<more>]?<query>`) → the host command and its arguments, or null
 *  for a read this plugin doesn't have. */
export function knReadOf(path) {
  const [route, qs] = String(path || '').split('?')
  const q = query(qs)
  if (route === 'api/kn') return { command: 'kn', args: q.id ? { id: q.id } : {} }
  const m = /^api\/kn\/([^/]+)\/([^/]+)(?:\/(.*))?$/.exec(route)
  if (!m) return null
  const id = dec(m[1]), what = m[2], more = m[3] === undefined ? null : m[3]
  switch (what) {
    case 'tree': case 'rev': case 'home': case 'sample': return { command: what === 'sample' ? 'sample' : what, args: { id } }
    case 'settings': return { command: 'vault_settings', args: { id } }
    case 'page': case 'history': return { command: what, args: { id, path: q.path || '' } }
    case 'version': return { command: 'version', args: { id, path: q.path || '', rev: q.rev || '' } }
    case 'find': return { command: 'find', args: { id, q: q.q || '' } }
    case 'graph': return { command: 'graph', args: { id, mode: q.mode || 'links' } }
    case 'rows': { let paths = []; try { paths = JSON.parse(q.paths || '[]') } catch { /* none */ } return { command: 'rows', args: { id, paths } } }
    case 'health':
      if (more !== null) return { command: 'health_finding', args: { id, key: dec(more), choice: q.choice || '' } }
      if (q.fixes !== undefined) return { command: 'fixes', args: { id, kind: q.fixes } }
      return { command: 'health', args: { id } }
    case 'lint': return { command: 'lint_run', args: { id, run: dec(more || ''), from: Number(q.from) || 0 } }
    case 'ingest': {
      if (more === null) return { command: 'ingest_queue', args: { id } }
      const [run, sub] = more.split('/')
      if (sub === 'changes') return { command: 'ingest_changes', args: { id, run: dec(run) } }
      if (sub === 'text') return { command: 'ingest_text', args: { id, run: dec(run), path: q.path || '' } }
      return { command: 'ingest_run', args: { id, run: dec(run), from: Number(q.from) || 0 } }
    }
    case 'calls': return { command: 'source_calls', args: { id, q: q.q || '' } }
    case 'm365': return { command: 'source_m365', args: { id, q: q.q || '' } }
    case 'twin-text': return { command: 'twin_text', args: { id, name: q.name || '', reserve: q.reserve === '1' } }
    case 'preview': return { command: 'minutes_preview', args: { id, call: q.call || '', stem: q.stem || '' } }
  }
  return null
}

/** What the Connect sheet sends to connect the folder it picked (the host's `pick` answers its `path`; `add` takes it
 *  as the root, so the folder picker isn't asked again). */
export function knConnectArgs(x, name) {
  return { pick: x.picked.path, name, minutes: x.minutes, commit: !!x.commit, profile: x.profile || '' }
}

/** The folders to give back (`unpick`) when the Connect or New vault sheet `x` takes `next` in place of the folder it
 *  had (null: the sheet closes): the one it had and didn't connect, unless picked again; an empty one picked to
 *  connect (there is nothing to connect). A folder refused was given back by the host already. */
export function knUnpickOf(x, next) {
  if (!x || (x.kind !== 'connect' && x.kind !== 'new') || x.connected) return []
  const had = x.picked && !x.picked.refused && x.picked.path ? x.picked.path : null
  const out = []
  if (had && (!next || next.path !== had)) out.push(had)
  if (next && next.empty && !next.refused && x.kind === 'connect' && next.path) out.push(next.path)
  return out
}

/** Each `kn_*` action #17 sent → the host command and its arguments. */
const ACTIONS = {
  kn_preview: ['preview'], kn_save_page: ['save_page'], kn_restore: ['restore'], kn_index_add: ['index_add'],
  kn_remove: ['remove'], kn_reread: ['reread'], kn_confirm_structure: ['confirm_structure'], kn_set: ['set'], kn_ignore: ['ignore'], kn_call_choice: ['call_choice'],
  kn_new_page: ['new_page', (a) => ({ id: a.id, folder: a.folder || '', title: a.name, template: a.template || null, index_row: !!a.row })],
  kn_add: ['add', (a) => ({ root: a.pick, name: a.name, minutes: a.minutes, commit: !!a.commit, profile: a.profile || '', anyway: true })],
  kn_new: ['new_vault'], kn_save_minutes: ['save_minutes'], kn_past: ['past'], kn_twin: ['twin'],
  kn_fix: ['fix'], kn_fix_all: ['fix_all'], kn_lint: ['lint'], kn_lint_stop: ['lint_stop'],
  kn_ingest_run: ['ingest_go'], kn_ingest_stop: ['ingest_stop'], kn_change: ['change'], kn_ingest_apply: ['ingest_apply'],
  kn_ingest_discard: ['ingest_discard'], kn_ingest_requeue: ['ingest_requeue'], kn_source_skip: ['source_skip'],
  kn_baseline: ['baseline', (a) => ({ vault: a.id, done: !!a.done })], kn_give_again: ['give_again'], kn_ingest_skill: ['ingest_skill'], kn_pick_files: ['pick_files'], kn_source_add: ['source_add'],
}
export function knActionOf(cmd, args = {}) {
  const a = ACTIONS[cmd]
  if (!a) return null
  return { command: a[0], args: a[1] ? a[1](args) : { ...args } }
}

/** A read, answered as #17's route answered: the pages' paths are the host's (relative to the vault's pages folder,
 *  `root` ''), times in milliseconds (the host's are seconds), a page too large to show has no HTML, a version's diff
 *  is text. */
export async function knRead(call, path) {
  const r = knReadOf(path)
  if (!r) throw new Error(`Knowledge has no ${String(path).split('?')[0]}`)
  const v = await call(r.command, r.args)
  const ms = (t) => (typeof t === 'number' ? t * 1000 : t)
  if (r.command === 'tree') return { ...v, root: '', pages: (v.pages || []).map((p) => ({ ...p, mtime: ms(p.mtime) })) }
  if (r.command === 'page') return { ...v, mtime: ms(v.mtime), html: v.html == null ? '<p class="set-sub">This page is too large to show here.</p>' : v.html }
  if (r.command === 'version') return { ...v, diff: knDiffText(v.diff), html: v.html == null ? '' : v.html }
  return v
}

/** An action, answered as #17's job answered: a save over a change made meanwhile throws `changed_on_disk` (the view
 *  then shows the conflict); a connect or a setting answers with the vault as `kn` lists it. */
export async function knAct(call, cmd, args = {}) {
  const a = knActionOf(cmd, args)
  if (!a) throw new Error(`Knowledge can't ${cmd} here`)
  const r = await call(a.command, a.args)
  if (a.command === 'save_page' && r && r.conflict) throw new Error('changed_on_disk')
  if (a.command === 'add' || a.command === 'set' || a.command === 'confirm_structure') {
    const id = a.command === 'add' ? r && r.id : a.args.id
    const all = await call('kn', id ? { id } : {})
    const vault = ((all && all.vaults) || []).find((v) => v.id === id) || { id, name: a.args.name || id }
    return { ...(a.command === 'add' ? r : {}), vault }
  }
  if (a.command === 'index_add') return { ...r, added: r.added || 0 }
  return r
}
