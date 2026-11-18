// Echo's data as a plugin reads it (`ctx.echo.read` and the `minutes_written` event), made up, in the shapes of Echo's
// share.rs (`source`, `calls`, `sources`, `minutes_payload`): calls with minutes, threads and clients, people — for the
// Knowledge plugin's tests. Nothing here is a real person or company.
import { createHash } from 'node:crypto'

export const MINUTES = '# Weekly delivery sync\n\n2026-11-05, 46 min. Participants: Alex Doe (Me), Dana Reyes, Sam Rivera\n\n## Summary\n\nThe team agreed to move the pilot | rollout to 18 November and to keep the pricing page as it is.\n\n## Decisions\n\n- Pilot moves to 18 November.\n\n## Action items\n\n- [ ] Me — send the revised plan to Dana by Friday.\n\n## Open questions\n\n- Who owns the data migration?\n'

export const CALL = '2026-11-05_090012-weekly-delivery-sync'

const SUMMARY = ['summary', 'підсум', 'резюм', 'итог', 'сводк']
const DECISION = ['decision', 'рішен', 'решени', 'решено']
const QUESTION = ['question', 'питан', 'вопрос']

/** share.rs `minutes_parts`: the minutes by section, `body` from their first `## ` heading. */
export function minutesParts(md, body = true) {
  const summary = [], decisions = [], questions = []
  let section = ''
  for (const line of md.split('\n')) {
    const l = line.trimStart()
    if (l.startsWith('## ')) { section = l.slice(3).toLowerCase(); continue }
    const b = /^[-*] (\[[ x]\] )?(.*)$/.exec(l)
    const under = (ws) => ws.some((w) => section.includes(w))
    if (under(SUMMARY)) summary.push(line)
    else if (b && b[2].trim()) { if (under(DECISION)) decisions.push(b[2]); else if (under(QUESTION)) questions.push(b[2]) }
  }
  const s = summary.join('\n').trim()
  const out = { summary: s ? s : null, decisions, actions: [], questions, revision: createHash('sha256').update(md).digest('hex').slice(0, 16) }
  if (body) {
    const at = md.startsWith('## ') ? 0 : (md.indexOf('\n## ') < 0 ? md.length : md.indexOf('\n## ') + 1)
    out.body = md.slice(at).trimEnd()
  }
  return out
}

/** Echo's data: `calls` [{folder, title, notes, profile, threads: [ids], app, started_at, ended_at, memo, transcript,
 *  chat, attendees: [{name, email}]}], `threads` [{id, name, client}], `clients` [{id, name}], `people` [{key, name,
 *  email}], `mail` (Intake's items), `me`. Its `read` kinds for fakeCtx's `echo`, `payload(folder)` (minutes_written). */
export function echoData({ calls = [], threads = [], clients = [], people = [], mail = [], me = { name: null, email: null } } = {}) {
  const thread = (id) => { const t = threads.find((x) => x.id === id); if (!t) return null; const c = clients.find((x) => x.id === t.client); return { id: t.id, name: t.name, client: t.client || null, client_name: c ? c.name : null } }
  const clientOf = (refs) => { const ids = [...new Set(refs.map((t) => t.client).filter(Boolean))]; return ids.length === 1 ? { id: ids[0], name: (refs.find((t) => t.client === ids[0]) || {}).client_name } : null }
  // A call by its folder, or by its stamp (Echo #772: the call that has it now; two sharing it — neither).
  const stampOf = (folder) => { const m = /^(\d{4}-\d{2}-\d{2}_\d{6})/.exec(folder); return m ? m[1] : folder }
  const callOf = (name) => calls.find((c) => c.folder === name) || (() => { const by = calls.filter((c) => stampOf(c.folder) === name); return by.length === 1 ? by[0] : undefined })()
  const facts = (c) => {
    const start = c.started_at || '2026-11-05T09:00:12+02:00'
    const end = c.ended_at || '2026-11-05T09:46:40+02:00'
    const dur = Math.round((Date.parse(end) - Date.parse(start)) / 60000)
    return { title: c.title, started_at: start, ended_at: end, duration_min: dur, app: c.app || 'teams', memo: !!c.memo }
  }
  const attendees = (c) => c.attendees || [{ name: 'Dana Reyes', email: 'dana@acme.example' }, { name: 'Alex Doe', email: 'alex@acme.example' }, { name: 'Sam Rivera', email: 'sam@acme.example' }]
  const participants = (c) => attendees(c).map((a) => ({ ...a, person: (people.find((p) => p.email === a.email) || {}).key || null }))
  const refsOf = (c) => (c.threads || []).map(thread).filter(Boolean)
  const source = (id, opts = {}) => {
    const asked = String(id).replace(/^call:/, '')
    const c = callOf(asked)
    if (!c) throw new Error(`no call "${asked}"`)
    const name = c.folder
    if (c.notes == null) throw new Error(`${name}: no minutes yet`)
    const refs = refsOf(c)
    const out = {
      id: `call:${name}`, stamp: stampOf(name), kind: c.memo ? 'memo' : 'call', date: (c.started_at || '2026-11-05T09:00:12+02:00').slice(0, 10), text: c.notes, link: `echo://call/${name}`,
      client: clientOf(refs), threads: refs, profile: c.profile === undefined ? 'system' : c.profile, platform: null,
      attendees: attendees(c), participants: participants(c), minutes: minutesParts(c.notes, true), ...facts(c),
    }
    if (opts.transcript !== false) out.transcript = c.transcript ?? null
    if (opts.chat !== false) out.chat = c.chat || []
    return out
  }
  const day = (c) => (c.started_at || '2026-11-05T09:00:12+02:00').slice(0, 10)
  const callsRead = (o = {}) => calls.filter((c) => (!o.since || day(c) >= o.since) && (!o.until || day(c) <= o.until)).slice().reverse().slice(0, o.limit || 50).map((c) => {
    const refs = refsOf(c)
    return { id: `call:${c.folder}`, stamp: stampOf(c.folder), date: day(c), ...facts(c), minutes: c.notes != null, transcript: c.transcript != null, chat: !!(c.chat && c.chat.length), people: attendees(c).map((a) => a.name), participants: participants(c), threads: refs, client: clientOf(refs), profile: c.profile === undefined ? 'system' : c.profile }
  })
  const sources = (o = {}) => {
    const out = []
    if (!o.kind || o.kind === 'call') for (const c of calls) if (c.notes != null && (!o.since || day(c) >= o.since)) { const refs = refsOf(c); out.push({ id: `call:${c.folder}`, stamp: stampOf(c.folder), kind: 'call', title: c.title, date: day(c), threads: refs.map((t) => t.id), client: clientOf(refs) }) }
    if (!o.kind || o.kind === 'mail') for (const m of mail) if (!o.since || m.at >= o.since) out.push({ ...m, date: m.at, threads: (m.threads || []).map((t) => (typeof t === 'string' ? t : t.id)) })
    return out.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, o.limit || 200)
  }
  /** `minutes_written` as Echo tells a plugin that reads sources (share.rs `minutes_payload`). */
  const payload = (folder, rewritten = false) => {
    const c = callOf(folder)
    const refs = refsOf(c)
    const { body, ...minutes } = minutesParts(c.notes, true)
    return { id: `call:${folder}`, link: `echo://call/${folder}`, call: folder, stamp: stampOf(folder), revision: minutes.revision, rewritten, client: clientOf(refs), threads: refs, profile: c.profile === undefined ? 'system' : c.profile, participants: participants(c), minutes, ...facts(c) }
  }
  return {
    read: { clients, threads: threads.map((t) => ({ ...t, stage: 'active', group: 'delivery' })), people, me, source, calls: callsRead, sources },
    payload, calls, thread,
  }
}
