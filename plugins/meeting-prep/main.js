// Meeting Prep — the host half (runs inside Echo, also with its window closed).
//
// Each weekday at the prep time, one Claude run prepares the day: every meeting on the calendar with its
// purpose, background, people, what's owed both ways, what's likely to come up, what to watch for and the
// deal in CRM, from the calendar, the Meeting Notebook's pages, Echo's calls, Teams chats, mail and CRM.
// Read-only: the run never sends, books or changes anything. A single meeting can be prepared from Echo's
// calendar (`prep_one`), for a later day or a meeting added since the morning.
//
//   prep/<YYYY-MM-DD>.json   {date, state: running|done|failed, at, error, summary, sources{}, meetings[], auto}
//   runs/<stamp>/            each run's prompt, answer and log (the last 30 kept)
//
// With "Use Teams, mail and CRM" on, the run is Claude Code in the Echo folder (`tools: 'folder'`): its own
// settings there decide which connectors it may use. Off, it runs under Echo's read-only guard.

const KEEP_RUNS = 30
const TEXT = ['purpose', 'background', 'you_owe', 'they_owe', 'likely', 'risks', 'crm']
const SOURCES = ['calendar', 'notebook', 'echo', 'teams', 'mail', 'crm']

const str = (v) => (v == null ? '' : String(v))
const ymd = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(str(v)) ? str(v) : '')
const hm = (v) => (/^\d{2}:\d{2}$/.test(str(v)) ? str(v) : '')
const pad2 = (n) => String(n).padStart(2, '0')
export const localDay = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const safeUrl = (u) => (/^https:\/\/[^\s"'<>]+$/i.test(str(u)) ? str(u) : '')

/** What a run must answer, and how to fill it. `only`: one calendar event instead of the whole day. */
export function prepPrompt({ date, me, connectors, skipInternal, only }) {
  const which = only
    ? `one meeting: “${str(only.subject)}” on ${date}${only.start ? ` starting ${str(only.start)}` : ''}${only.id ? ` (calendar event id ${str(only.id)})` : ''}`
    : `every meeting the user has on ${date}`
  return `You brief the user${me ? ` (${me})` : ''} for ${which}. The user reads this right before the meeting, so tell them what they need to know: substance first, links only as back-up. Answer with JSON only, no other text.

Gather, read-only (never send, reply, book, create or change anything):
1. The meetings: ${connectors ? "the Microsoft 365 connector's calendar search for the day (don't use Bash: this run can't)" : "run Echo's `echoctl calendar events --days 2` (times are UTC: convert to the user's local time)"}. Leave out declined and cancelled meetings, all-day events and holds with no other attendees.${skipInternal ? ' Also leave out internal meetings (colleagues only) when nothing below is found about them.' : ''}
2. The user's Meeting Notebook, their own record of every past meeting. First Read \`.echo/plugins/meeting-notebook/index.md\` in the working folder (it is a hidden folder: give the Read tool that exact path): one line a page, newest first — id | date | title | type › group | attendees | open actions. For each meeting, pick the pages about the same client, person or series, or with the same attendees (up to 4, newest first), and Read each one at \`.echo/plugins/meeting-notebook/notes/<id>.json\`: its summary, decisions, action items (owner, due, done) and the user's notes. Do this for every meeting.
3. Echo's own recorded calls, when the notebook has none for a meeting: ${connectors ? "Echo's search (the mcp__echo tools), if it is there" : '`calls/<folder>/` here (notes.md, actions.json) for calls of the same series or with the same people'}.
Use the Read tool for files${connectors ? ', never Bash: this run can\'t use it' : ''}.
${connectors ? `4. Teams chats and mail from the last 21 days (the Microsoft 365 connector): the meeting's own chat, chats and threads with its attendees, the invite's body, decks and documents shared for it. Read the messages, not just their subjects.
5. CRM (the EPAM CRM connector): the client's or partner's opportunities, with stage, value, close date and next step.
If a connector isn't available, say so in "sources" and carry on with the rest.` : `4. Teams chats, mail search and CRM aren't available in this run: say so in "sources".`}

Answer in exactly this shape:
{"date":"${date}","summary":"","sources":{"calendar":"","notebook":"","echo":"","teams":"","mail":"","crm":""},"meetings":[{"event":"","title":"","start":"HH:MM","end":"HH:MM","organizer":"","role":"","external":false,"purpose":"","background":"","people":[{"name":"","who":"","note":""}],"you_owe":"","they_owe":"","likely":"","risks":"","crm":"","links":[{"label":"","url":""}],"used":[""]}]}

How to fill it (Markdown in the text fields):
- summary: two sentences on the day: how many meetings, which matter most and why.
- sources: for each, one short phrase: what you used ("3 pages", "6 messages"), "nothing found", or "not available".
- event: the calendar event id. role: the user's part (organizer, presenter, attendee, client-hosted).
- purpose: 2 to 4 sentences. Why this meeting exists, what has to come out of it today (a decision, an agreement, a next step) and what the user's part is. Say plainly if it is a first meeting and how it came about.
- background: 4 to 8 bullets ("- ") with the facts that matter, most important first: where things stand, what was decided before, what changed since, numbers, dates and names. Each bullet ends with its source in brackets, like (notebook, Oct 27) or (Teams, Kevin, Nov 4) or (mail, Katelyn, Oct 22). Synthesize: never just point to a document.
- people: up to 6 who matter: name, who they are (organization and role), and a note on what they care about or last said about this.
- you_owe: what the user promised that is still open, with due dates and whether it is late. Empty if nothing.
- they_owe: what others promised the user that is still open: who, what, when. Empty if nothing.
- likely: the agenda from the invite and what is likely to come up, quoting a line from a chat or mail when it helps.
- risks: what to watch for: sensitivities, open disagreements, missing people, deadlines, anything that could go wrong. Empty if nothing.
- crm: the opportunity in one or two lines (name, stage, value, close date, next step), "No opportunity found", or empty for an internal meeting.
- links: Join, Invite, then the decks, documents, chats and mail that matter, each with a short label. Only links you actually found.
- used: what you drew on, like "notebook: Aurora Bank weekly, Oct 29" or "Teams: supplier week chat".
Use only what you found. Never invent names, numbers, dates or links; leave a field empty instead. Order meetings by start time.
`
}

/** The JSON object in a model's answer (it may come inside a code fence or after a sentence). */
export function parseAnswer(text) {
  const t = str(text)
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a < 0 || b <= a) throw new Error('Claude answered without a prep')
  return JSON.parse(t.slice(a, b + 1))
}

/** A run's answer cleaned to plain strings, https links only, each text field also as HTML (`md`). */
export function cleanPrep(p, date, md) {
  p = p && typeof p === 'object' ? p : {}
  const src = {}
  for (const k of SOURCES) src[k] = str(p.sources && p.sources[k]).trim().slice(0, 80)
  const meetings = (Array.isArray(p.meetings) ? p.meetings : []).map((m) => {
    m = m && typeof m === 'object' ? m : {}
    const out = {
      event: str(m.event).trim(), title: str(m.title).trim() || 'Meeting', start: hm(m.start), end: hm(m.end),
      organizer: str(m.organizer).trim(), role: str(m.role).trim(), external: !!m.external,
      people: (Array.isArray(m.people) ? m.people : []).map((x) => ({ name: str(x && x.name).trim(), who: str(x && x.who).trim(), note: str(x && x.note).trim() })).filter((x) => x.name).slice(0, 8),
      links: (Array.isArray(m.links) ? m.links : []).map((l) => ({ label: str(l && l.label).trim().slice(0, 60), url: safeUrl(l && l.url) })).filter((l) => l.label && l.url).slice(0, 12),
      used: (Array.isArray(m.used) ? m.used : []).map(str).map((s) => s.trim()).filter(Boolean).slice(0, 12),
      html: {},
    }
    for (const f of TEXT) { out[f] = str(m[f]).trim(); out.html[f] = out[f] ? md(out[f]) : '' }
    out.people = out.people.map((x) => ({ ...x, noteHtml: x.note ? md(x.note) : '' }))
    return out
  }).sort((a, b) => (a.start || '99').localeCompare(b.start || '99'))
  return { date, summary: str(p.summary).trim(), sources: src, meetings }
}

/** The brief as Markdown, for Teams. */
export function briefMarkdown(rec) {
  return [
    rec.summary,
    ...rec.meetings.map((m) => [
      `**${m.start ? `${m.start} · ` : ''}${m.title}**`,
      m.purpose && `*Purpose:* ${m.purpose}`,
      m.you_owe && `*You owe:* ${m.you_owe}`,
      m.they_owe && `*They owe:* ${m.they_owe}`,
      m.risks && `*Watch out for:* ${m.risks}`,
      m.links.length ? m.links.slice(0, 4).map((l) => `[${l.label}](${l.url})`).join(' · ') : '',
    ].filter(Boolean).join('\n\n')),
  ].filter(Boolean).join('\n\n---\n\n')
}

export function apply(ctx) {
  const running = new Set()
  const readJson = (path, d) => { try { const t = ctx.store.read(path); return t == null ? d : JSON.parse(t) } catch { return d } }
  const writeJson = (path, v) => ctx.store.write(path, JSON.stringify(v, null, 2))
  const setting = (key, d) => { try { const v = ctx.settings.get(key); return v == null || v === '' ? d : v } catch { return d } }
  const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
  const prune = () => { const runs = ctx.store.list('runs'); while (runs.length > KEEP_RUNS) ctx.store.remove(`runs/${runs.shift()}`) }
  const teamsReady = () => { try { return (ctx.deliver.status() || {}).teams === true } catch { return false } }
  const md = (s) => ctx.markdown(s)

  /** Prepare a day (or one meeting of it, merged into the day). */
  const run = async (date, why, only) => {
    const key = only ? `${date}#${str(only.id || only.subject)}` : date
    if (running.has(key)) throw new Error('this prep is being made already')
    running.add(key)
    const prev = readJson(`prep/${date}.json`, {})
    if (!only) writeJson(`prep/${date}.json`, { ...prev, date, state: 'running', at: new Date().toISOString(), error: '', auto: prev.auto || why === 'schedule' })
    try {
      const connectors = setting('connectors', true) !== false
      const prompt = prepPrompt({ date, me: setting('me', ''), connectors, skipInternal: setting('skip_internal', false) === true, only })
      const out = await ctx.claude.run({ title: only ? `Prep: ${str(only.subject)}`.slice(0, 80) : `Meeting prep ${date}`, prompt, tools: connectors ? 'folder' : 'read', dir: `runs/${stamp()}` })
      prune()
      const got = cleanPrep(parseAnswer(out.answer), date, md)
      let rec
      if (only) {
        // One meeting: replace its entry in the day (by event id, else title), or add it.
        const cur = readJson(`prep/${date}.json`, { date, meetings: [], sources: {}, state: 'done' })
        const meetings = [...(cur.meetings || [])]
        for (const m of got.meetings) {
          const i = meetings.findIndex((x) => (m.event && x.event === m.event) || x.title === m.title)
          if (i < 0) meetings.push(m); else meetings[i] = m
        }
        meetings.sort((a, b) => (a.start || '99').localeCompare(b.start || '99'))
        rec = { ...cur, date, meetings, state: cur.state === 'running' ? 'running' : 'done', at: cur.at || new Date().toISOString(), sources: { ...(cur.sources || {}), ...got.sources } }
      } else {
        rec = { ...got, state: 'done', at: new Date().toISOString(), model: out.model || '', auto: prev.auto || why === 'schedule' }
      }
      writeJson(`prep/${date}.json`, rec)
      if (!only && why === 'schedule' && setting('send', true) !== false && teamsReady() && rec.meetings.length) {
        try { await ctx.deliver.send('teams', { title: `Meeting prep · ${date}`, markdown: briefMarkdown(rec), about: 'Meeting Prep · your day', ai: rec.model || 'Claude' }) } catch (e) { ctx.log('send', (e && e.message) || e) }
      }
      return rec
    } catch (e) {
      if (!only) writeJson(`prep/${date}.json`, { ...prev, date, state: 'failed', at: new Date().toISOString(), error: String((e && e.message) || e), auto: prev.auto || why === 'schedule' })
      throw e
    } finally {
      running.delete(key)
    }
  }

  // Weekdays from the prep time until 5 PM, once a day: a failed morning run isn't retried by itself.
  ctx.every(60, () => {
    if (setting('auto', true) === false) return
    const now = new Date(), wd = now.getDay()
    if (wd === 0 || wd === 6) return
    const m = /^(\d{1,2}):(\d{2})$/.exec(str(setting('time', '07:30')).trim()) || [null, '7', '30']
    const mins = now.getHours() * 60 + now.getMinutes()
    if (mins < +m[1] * 60 + +m[2] || mins >= 17 * 60) return
    const date = localDay(now), rec = readJson(`prep/${date}.json`, null)
    if (rec && (rec.auto || rec.state === 'running' || rec.state === 'done')) return
    run(date, 'schedule').catch((e) => ctx.log('prep', (e && e.message) || e))
  })
  // A run cut off by Echo quitting leaves "running" behind: it isn't running any more.
  for (const f of ctx.store.list('prep')) {
    const rec = readJson(`prep/${f}`, null)
    if (rec && rec.state === 'running') writeJson(`prep/${f}`, { ...rec, state: 'failed', error: 'Echo stopped before the prep was finished' })
  }

  const dayOf = (date) => ymd(date) || localDay()
  ctx.command('view', ({ date } = {}) => {
    const d = dayOf(date)
    const days = ctx.store.list('prep').filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort()
    return { ...(readJson(`prep/${d}.json`, null) || { date: d, state: 'none', meetings: [] }), running: [...running].some((k) => k === d || k.startsWith(d + '#')), days, time: str(setting('time', '07:30')), connectors: setting('connectors', true) !== false, teams: teamsReady() }
  })
  ctx.command('run', ({ date } = {}) => { run(dayOf(date), 'hand').catch((e) => ctx.log('prep', (e && e.message) || e)); return { started: true } })
  ctx.command('run_wait', ({ date } = {}) => run(dayOf(date), 'hand'))
  /** One meeting from Echo's calendar: {id, subject, start, end}. Its day is the event's local date. */
  const eventDay = (ev) => { const d = new Date(str(ev && ev.start)); return isNaN(d) ? localDay() : localDay(d) }
  ctx.command('run_one', ({ event }) => {
    if (!event || !str(event.subject).trim()) throw new Error('no meeting given')
    const date = eventDay(event)
    run(date, 'one', event).catch((e) => ctx.log('prep one', (e && e.message) || e))
    return { started: true, date }
  })
  ctx.command('run_one_wait', ({ event }) => run(eventDay(event), 'one', event))
}
