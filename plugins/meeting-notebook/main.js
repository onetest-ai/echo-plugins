// Meeting Notebook — the host half (runs inside Echo, also with its window closed).
//
// The notebook is a folder of pages in this plugin's store, one JSON file each, in the same shape as the
// Meeting Notebook artifact's `notes` documents (so either can be copied into the other):
//
//   notes/<id>.json   {type, group, title, date, start, end, attendees[], summary (HTML), decisions[],
//                      actions[{text, owner, due, done, mode: claude|manual, prompt, how, echoId, t, run}],
//                      myNotes (HTML), source: echo|manual|auto|import, hasTranscript, call, link, eventId,
//                      createdAt, updatedAt, editedByMe, touched[], reviewed, review{at, changes[], proposed{}}}
//   meta.json         folder order, colours, subfolder order and sorting (the artifact's meta/structure)
//   filed.json        Echo call folder → {id, state: filing|done|failed|removed, at, error}
//   runs/<stamp>/     each Claude run's prompt, answer and log (the last 30 kept)
//
// Filing: when Echo has written a call's minutes (`minutes_written`), one Claude run reads the minutes, the
// transcript and the call's folder and answers with the page as JSON. Its action items are Echo's own
// (`actions.json`, each kept with its `echoId`), so ticking one here ticks it in Echo. Filing again replaces
// the fields the user hasn't edited and records what it changed (`review.changes`, to undo); for fields the
// user edited it only proposes (`review.proposed`, to accept).

const FIELDS = ['type', 'group', 'title', 'date', 'start', 'end', 'attendees', 'summary', 'decisions', 'actions', 'myNotes']
const TYPES = ['Client', 'Partner', '1:1', 'Internal', 'Industry & Analyst', 'Other']
const KEEP_RUNS = 30
const MAX_TRANSCRIPT = 120000

const TRANSLIT = { а: 'a', б: 'b', в: 'v', г: 'g', ґ: 'g', д: 'd', е: 'e', ё: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'i', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'iu', я: 'ia' }
export function slug(text) {
  const s = [...String(text).toLowerCase()].map((c) => (c in TRANSLIT ? TRANSLIT[c] : /[a-z0-9]/.test(c) ? c : '-')).join('')
  return s.split('-').filter(Boolean).join('-').slice(0, 60).replace(/-+$/, '') || 'meeting'
}
const validId = (id) => /^[A-Za-z0-9][A-Za-z0-9_.-]{0,120}$/.test(String(id || '')) && !String(id).includes('..')
const validCall = (name) => /^[^\\/]{1,200}$/.test(String(name || '')) && !String(name).includes('..')
const callName = (id) => String(id || '').replace(/^(call|memo):/, '')
const str = (v) => (v == null ? '' : String(v))
const strs = (v) => (Array.isArray(v) ? v.map(str).map((x) => x.trim()).filter(Boolean) : [])
const ymd = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(str(v)) ? str(v) : '')
const hm = (v) => (/^\d{2}:\d{2}$/.test(str(v)) ? str(v) : '')
const secs = (v) => (typeof v === 'number' && isFinite(v) && v >= 0 ? Math.round(v) : null)
const textKey = (s) => str(s).toLowerCase().replace(/[^a-z0-9а-я]+/gi, ' ').trim()
const plainText = (html) => str(html).replace(/<\/(p|li|h4)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim()

/** The page fields from a filing run's answer, cleaned to the notebook's shape. */
export function cleanPage(p, fallback) {
  p = p && typeof p === 'object' ? p : {}
  const actions = (Array.isArray(p.actions) ? p.actions : []).map((a) => {
    a = a && typeof a === 'object' ? a : { text: a }
    const mode = a.mode === 'claude' || a.mode === 'manual' ? a.mode : ''
    const out = { text: str(a.text).trim(), owner: str(a.owner).trim(), due: ymd(a.due), done: false, mode }
    if (mode === 'claude') out.prompt = str(a.prompt).trim()
    if (mode === 'manual' && str(a.how).trim()) out.how = str(a.how).trim()
    if (str(a.echoId).trim()) out.echoId = str(a.echoId).trim()
    const t = secs(a.t)
    if (t != null) out.t = t
    return out
  }).filter((a) => a.text)
  return {
    type: str(p.type).trim() || 'Other',
    group: str(p.group).trim() || 'General',
    title: str(p.title).trim() || fallback.title || 'Untitled meeting',
    date: ymd(p.date) || fallback.date || '',
    start: hm(p.start),
    end: hm(p.end),
    attendees: strs(p.attendees),
    summary: str(p.summary),
    decisions: strs(p.decisions),
    actions,
    myNotes: str(p.myNotes),
    eventId: str(p.eventId).trim(),
  }
}

/** The JSON object in a model's answer (it may come inside a code fence or after a sentence). */
export function parseAnswer(text) {
  const t = str(text)
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a < 0 || b <= a) throw new Error('Claude answered without a page')
  return JSON.parse(t.slice(a, b + 1))
}

/** Fresh action items keep what the user did to the old ones: done, a Claude run, its prompt edits. */
export function carryActions(old, fresh) {
  const left = [...(old || [])]
  return fresh.map((a) => {
    const i = left.findIndex((o) => (a.echoId && o.echoId === a.echoId) || textKey(o.text) === textKey(a.text))
    if (i < 0) return a
    const o = left.splice(i, 1)[0]
    const out = { ...a, done: !!o.done }
    if (o.run) out.run = o.run
    return out
  })
}
const same = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '')
/** What a person did to an action list, ignoring what isn't an edit (ticks, Echo's ids, runs). */
const actionsCore = (list) => (list || []).map((a) => ({ text: a.text || '', owner: a.owner || '', due: a.due || '', mode: a.mode || '', prompt: a.prompt || '', how: a.how || '' }))

/** A filed page merged into the page already there. Untouched fields are replaced (each change kept, to
 *  undo); fields the user edited stay theirs and the new value is proposed. My notes are never replaced. */
export function merge(old, fresh) {
  if (!old) return { page: { ...fresh }, changes: [], proposed: {} }
  const touched = new Set(old.touched || [])
  const out = { ...old }, changes = [], proposed = {}
  for (const f of FIELDS) {
    if (f === 'myNotes' && str(old.myNotes).trim()) continue
    const next = f === 'actions' ? carryActions(old.actions, fresh.actions) : fresh[f]
    if (f === 'actions' ? same(actionsCore(old.actions), actionsCore(next)) : same(old[f], next)) continue
    if (touched.has(f)) { proposed[f] = next; continue }
    changes.push({ field: f, old: old[f] ?? '' })
    out[f] = next
  }
  return { page: out, changes, proposed }
}

export function filingPrompt({ call, source, me, folders }) {
  const transcript = str(source.transcript)
  const cut = transcript.length > MAX_TRANSCRIPT ? transcript.slice(0, MAX_TRANSCRIPT) + '\n[… the rest of the transcript is left out]' : transcript
  const known = folders.length ? folders.map((f) => `- ${f.type}: ${f.groups.length ? f.groups.join(' · ') : '(no subfolders yet)'}`).join('\n') : '(empty notebook)'
  return `You file one recorded call as a page of the user's Meeting Notebook. Answer with JSON only, no other text.

The call is Echo's folder \`calls/${call}/\` in the data folder. Read these if they are there (read-only; skip any that is missing):
- \`calls/${call}/meeting.json\`: the invite (id, subject, start, end, organizer, attendees with email addresses).
- \`calls/${call}/actions.json\`: Echo's action items for the call, each with id, task, owner, due and t (seconds into the call).
- \`calls/${call}/my-notes.md\`: notes the user typed during the call.
Do not change anything.

The user is ${me ? `“${me}”` : 'the speaker called “Me” in the transcript'}.

Answer in exactly this shape:
{"type":"","group":"","title":"","date":"YYYY-MM-DD","start":"HH:MM","end":"HH:MM","eventId":"","attendees":[],"summary":"HTML","decisions":[],"actions":[{"text":"","owner":"","due":"YYYY-MM-DD or empty","mode":"claude or manual","prompt":"","how":"","echoId":"","t":0}],"myNotes":"HTML"}

How to fill it:
- type: one of ${TYPES.map((t) => `“${t}”`).join(', ')}, or a folder the notebook already has. Client = a call with a client or prospect's people. Partner = a technology or alliance partner. 1:1 = just the user and one colleague. Internal = colleagues only, more than two. Industry & Analyst = analysts, industry bodies, conferences. A memo (only the user speaking) is Other.
- group: the client or partner organisation (Client, Partner), the other person's full name (1:1), or the meeting series or topic (Internal and the rest). Reuse a subfolder name below exactly when it is the same client, person or series.
- title: the invite's subject, else a short plain title. date, start and end: from the invite, else from the call. eventId: the invite's id, else empty.
- attendees: full names, the user included.
- summary: HTML using only <p>, <h4>, <ul>, <li>, <b>, <i>, <mark>. First <p>: one sentence on what the meeting was for. Then <h4>Highlights</h4> and a <ul> of 3 to 7 items, each starting with a bold topic, like <li><b>Pipeline:</b> what was said, with names and numbers. [12:34]</li>. Then <h4>Risks &amp; issues</h4> with its <ul> only when there are any. End each item with the moment it comes from as [mm:ss] (or [h:mm:ss]) when you know it; Echo's minutes carry these times. Wrap a key date or deadline in <mark> (at most three).
- decisions: what was clearly agreed, one plain sentence each, ending with its [mm:ss] when you know it. Empty when nothing was decided.
- actions: Echo's action items first, one per item in actions.json, keeping its wording as text, with echoId = its id and t = its t. Add an action Echo missed only when it is clearly a commitment (no echoId then). Each has its owner (a full name, or ${me ? `“${me}”` : 'the user\'s first name'} for the user) and a due date only when one was said. mode "claude" when Claude could do or draft it (a message, a document, research, a demo change): then "prompt" is a self-contained prompt the user can paste into Claude, naming this call (title and date) and everything Claude needs from it, ending with what Claude should hand back. mode "manual" when a person has to do it: then "how" is one short line on how it gets done.
- myNotes: the user's own notes from my-notes.md, kept word for word, as HTML (<p>, <ul>, <li>, <b>, <i>, <br>). Empty when there are none.
- Use only what the call says. Never invent names, numbers or dates; leave a field empty instead.

The notebook's folders and subfolders now:
${known}

Echo's title for the call: ${str(source.title) || '(none)'}
Echo's date for the call: ${str(source.date) || '(unknown)'}

ECHO'S MINUTES:
${str(source.text) || '(none yet)'}

TRANSCRIPT:
${cut || '(none)'}
`
}

/** The prompt for drafting one action item with Claude (no tools: everything it may use is in the prompt). */
export function runPrompt({ page, action, earlier, source, followup, me }) {
  const pageText = (n) => [
    `${n.title || 'Untitled'} · ${n.date || ''}${n.type ? ` · ${n.type} › ${n.group || 'General'}` : ''}`,
    (n.attendees || []).length ? `Attendees: ${n.attendees.join(', ')}` : '',
    plainText(n.summary) ? `Summary:\n${plainText(n.summary)}` : '',
    (n.decisions || []).length ? `Decisions:\n${n.decisions.map((d) => `- ${d}`).join('\n')}` : '',
    (n.actions || []).length ? `Action items:\n${n.actions.map((a) => `- [${a.done ? 'x' : ' '}] ${a.text}${a.owner ? ` (${a.owner}${a.due ? `, due ${a.due}` : ''})` : ''}`).join('\n')}` : '',
    plainText(n.myNotes) ? `The user's notes:\n${plainText(n.myNotes)}` : '',
  ].filter(Boolean).join('\n')
  const tr = source ? str(source.transcript) : ''
  return `You do one action item from the user's Meeting Notebook${me ? ` (the user is ${me})` : ''}. Write the deliverable itself, in Markdown: the email, message, document or plan, ready for the user to use. Start with one line saying what it is (for example "Email to Lena Varga"), then the deliverable. Nothing is sent: the user reads it first.
Use only what the context below says. Never invent names, numbers, dates or facts; where something is missing write a placeholder in [brackets].

THE ACTION ITEM: ${action.text}${action.owner ? `\nOwner: ${action.owner}` : ''}${action.due ? `\nDue: ${action.due}` : ''}
WHAT THE USER ASKED CLAUDE TO DO:
${str(action.prompt) || action.text}
${followup ? `\nYOUR LAST DRAFT:\n${followup.draft}\n\nTHE USER'S CHANGES TO IT (apply them and answer with the whole new draft):\n${followup.ask}\n` : ''}
THE MEETING PAGE:
${pageText(page)}
${earlier.length ? `\nEARLIER PAGES IN ${str(page.group).toUpperCase() || 'THIS SUBFOLDER'}:\n${earlier.map(pageText).join('\n\n')}` : ''}
${source ? `\nECHO'S MINUTES OF THE CALL:\n${str(source.text) || '(none)'}\n\nTRANSCRIPT:\n${tr.length > 60000 ? tr.slice(0, 60000) + '\n[… cut]' : tr || '(none)'}` : ''}
`
}

export function apply(ctx) {
  const filing = new Set(), running = new Set()

  const readJson = (path, d) => { try { const t = ctx.store.read(path); return t == null ? d : JSON.parse(t) } catch { return d } }
  const writeJson = (path, v) => ctx.store.write(path, JSON.stringify(v, null, 2))
  const setting = (key, d) => { try { const v = ctx.settings.get(key); return v == null || v === '' ? d : v } catch { return d } }

  const getNote = (id) => (validId(id) ? readJson(`notes/${id}.json`, null) : null)
  let indexDirty = true
  const putNote = (n) => { if (!validId(n.id)) throw new Error(`bad page id “${n.id}”`); writeJson(`notes/${n.id}.json`, n); indexDirty = true }
  const mustNote = (id) => { const n = getNote(id); if (!n) throw new Error('that page is gone'); return { ...n, id } }
  const allNotes = () => ctx.store.list('notes').filter((f) => f.endsWith('.json')).map((f) => {
    const n = readJson(`notes/${f}`, null)
    return n ? { ...n, id: f.slice(0, -5) } : null
  }).filter(Boolean)
  // index.md: one line a page, newest first, for readers that can open a file but not search a folder (a Claude
  // run with only Read, such as Meeting Prep's): `<id> | date | title | type › group | attendees | open actions`.
  const writeIndex = () => {
    const lines = allNotes().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((n) => {
      const open = (n.actions || []).filter((a) => !a.done).length
      const one = (s) => String(s || '').replace(/[|\n\r]+/g, ' ').trim()
      return `${n.id} | ${n.date || ''} | ${one(n.title).slice(0, 100)} | ${one(n.type)} › ${one(n.group)} | ${(n.attendees || []).slice(0, 10).map(one).join(', ')} | ${open} open`
    })
    ctx.store.write('index.md', `# Meeting Notebook index\n\nOne line a page, newest first. Each page is notes/<id>.json beside this file.\nid | date | title | type › group | attendees | open actions\n\n${lines.join('\n')}\n`)
    indexDirty = false
  }
  ctx.every(30, () => { if (indexDirty) writeIndex() })
  try { writeIndex() } catch (e) { ctx.log('index', (e && e.message) || e) }
  const filed = () => readJson('filed.json', {})
  const setFiled = (call, rec) => { const f = filed(); if (rec) f[call] = rec; else delete f[call]; writeJson('filed.json', f) }

  const folders = () => {
    const by = {}
    for (const n of allNotes()) { const t = n.type || 'Other'; (by[t] = by[t] || new Set()).add(n.group || 'General') }
    const meta = readJson('meta.json', {})
    for (const t of meta.typeOrder || []) by[t] = by[t] || new Set()
    return Object.keys(by).map((t) => ({ type: t, groups: [...by[t]].sort() }))
  }

  const newId = (date, title) => {
    const base = `${date || 'undated'}--${slug(title)}`
    let id = base, n = 2
    while (ctx.store.read(`notes/${id}.json`) != null) id = `${base}-${n++}`
    return id
  }
  const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
  const prune = () => {
    const runs = ctx.store.list('runs')
    while (runs.length > KEEP_RUNS) ctx.store.remove(`runs/${runs.shift()}`)
  }

  /** A call folder as Echo has it now. Echo renames a call's folder when its minutes give it a title
   *  (`2026-11-05_130106` → `2026-11-05_130106-sdr-campaigns`), so a name from an event or an old record
   *  is found again by its timestamp. {call, source}, or null. */
  const findCall = (call) => {
    try { const s = ctx.echo.read('source', `call:${call}`); if (s) return { call, source: s } } catch { /* renamed, or gone */ }
    const stampOf = /^\d{4}-\d{2}-\d{2}_\d{6}/.exec(call)
    if (!stampOf) return null
    let list = []
    try { list = ctx.echo.read('sources', { limit: 200 }) || [] } catch { list = [] }
    const hit = list.map((s) => callName(s && s.id)).find((name) => name && name !== call && name.slice(0, stampOf[0].length) === stampOf[0])
    if (!hit) return null
    try { const s = ctx.echo.read('source', `call:${hit}`); return s ? { call: hit, source: s } : null } catch { return null }
  }

  /** File one Echo call as a page (a Claude run, a few minutes); the page's id. */
  const file = async (asked) => {
    if (!validCall(asked)) throw new Error(`no call “${asked}”`)
    const found = findCall(asked)
    if (!found) throw new Error(`Echo has no call “${asked}” any more`)
    const { call, source } = found
    if (filing.has(call)) throw new Error('this call is being filed already')
    filing.add(call)
    // A record kept under the folder's old name moves to its new one.
    if (call !== asked && filed()[asked]) { const f = filed(); if (!f[call] && f[asked].id) f[call] = f[asked]; delete f[asked]; writeJson('filed.json', f) }
    const before = filed()[call]
    setFiled(call, { ...(before || {}), state: 'filing', at: new Date().toISOString(), error: '' })
    try {
      const prompt = filingPrompt({ call, source, me: setting('me', ''), folders: folders() })
      const out = await ctx.claude.run({ title: `Notebook: ${str(source.title) || call}`, prompt, tools: 'read', dir: `runs/${stamp()}` })
      prune()
      const page = cleanPage(parseAnswer(out.answer), { title: str(source.title), date: str(source.date) })
      const old = before && before.id ? getNote(before.id) : null
      const now = new Date().toISOString()
      const { page: merged, changes, proposed } = merge(old, page)
      const toReview = old && (changes.length || Object.keys(proposed).length)
      const n = {
        ...merged,
        id: old ? old.id : newId(page.date, page.title),
        source: 'echo',
        hasTranscript: !!str(source.transcript).trim(),
        call,
        link: str(source.link) || `echo://call/${call}`,
        eventId: page.eventId || (old && old.eventId) || '',
        createdAt: old ? old.createdAt : now,
        updatedAt: now,
        filedAt: now,
        model: out.model || '',
        reviewed: old ? (toReview ? false : old.reviewed !== false) : false,
      }
      if (toReview) n.review = { at: now, changes, proposed }
      putNote(n)
      setFiled(call, { id: n.id, state: 'done', at: now, error: '' })
      return n.id
    } catch (e) {
      setFiled(call, { ...(before || {}), state: 'failed', at: new Date().toISOString(), error: String((e && e.message) || e) })
      throw e
    } finally {
      filing.delete(call)
    }
  }

  // Echo wrote (or rewrote) a call's minutes: file it, unless the user deleted its page or switched this off.
  // The event can name the folder just before Echo renames it: such a call waits (`waiting.json`) and is
  // looked for again every 30 s for 15 minutes, with no error shown meanwhile.
  const WAIT_MS = 15 * 60000
  const fileAuto = (call) => {
    const found = findCall(call)
    if (!found) {
      const w = readJson('waiting.json', {})
      if (!w[call]) { w[call] = new Date().toISOString(); writeJson('waiting.json', w) }
      return
    }
    const rec = filed()[found.call]
    if (rec && rec.state === 'removed') return
    file(found.call).catch((e) => ctx.log('file', found.call, (e && e.message) || e))
  }
  ctx.on('minutes_written', ({ id }) => {
    const call = callName(id)
    if (!validCall(call) || setting('auto', true) === false) return
    fileAuto(call)
  })
  ctx.every(30, () => {
    const w = readJson('waiting.json', {})
    const names = Object.keys(w)
    if (!names.length) return
    for (const call of names) {
      const late = Date.now() - new Date(w[call]).getTime() > WAIT_MS
      if (findCall(call) || late) {
        delete w[call]
        if (!late) fileAuto(call)
      }
    }
    writeJson('waiting.json', w)
  })
  // Records of a folder's old name, left from before renamed calls were followed: the call is filed under its
  // new name, so the old record (and its error) goes.
  {
    const f = filed()
    let tidy = false
    for (const [name, rec] of Object.entries(f)) {
      if (rec.state !== 'failed') continue
      const stampOf = /^\d{4}-\d{2}-\d{2}_\d{6}/.exec(name)
      if (stampOf && Object.keys(f).some((other) => other !== name && other.startsWith(stampOf[0]) && f[other].state === 'done')) { delete f[name]; tidy = true }
    }
    if (tidy) writeJson('filed.json', f)
  }

  /** Echo's recent calls and memos, each with what the notebook has of it. */
  const recentCalls = () => {
    let list = []
    try { list = ctx.echo.read('sources', { limit: 80 }) || [] } catch { list = [] }
    const f = filed()
    return list.filter((s) => s && (s.kind === 'call' || s.kind === 'memo')).map((s) => {
      const call = callName(s.id)
      const rec = f[call] || null
      return { call, kind: s.kind, title: s.title || call, date: s.date || '', filed: rec ? rec.state : '', page: rec && rec.state === 'done' ? rec.id : '', error: rec ? rec.error || '' : '' }
    })
  }

  const deliverKinds = () => {
    try {
      const st = ctx.deliver.status() || {}
      return ['teams', 'mail'].filter((k) => st[k] === true)
    } catch { return [] }
  }

  ctx.command('view', () => ({
    notes: allNotes(),
    meta: readJson('meta.json', {}),
    filed: filed(),
    filing: [...filing],
    running: [...running],
    me: setting('me', ''),
    deliver: deliverKinds(),
  }))
  ctx.command('calls', () => recentCalls())

  ctx.command('save', ({ id, fields }) => {
    const n = mustNote(id)
    const f = {}
    for (const k of FIELDS) if (fields && k in fields) f[k] = fields[k]
    // The window's copy of a list may predate a Claude run on one of its actions: the stored run stays.
    if (Array.isArray(f.actions)) {
      const left = [...(n.actions || [])]
      f.actions = f.actions.map((a) => {
        const i = left.findIndex((o) => (a.echoId && o.echoId === a.echoId) || textKey(o.text) === textKey(a.text))
        const o = i < 0 ? null : left.splice(i, 1)[0]
        return o && o.run && (!a.run || (o.run.at || '') > (a.run.at || '')) ? { ...a, run: o.run } : a
      })
    }
    const touched = new Set(n.touched || [])
    for (const k of Object.keys(f)) {
      // Ticking an action, or Echo's own ids and times arriving, isn't an edit: filing again still updates the list.
      if (k === 'actions' && same(actionsCore(n.actions), actionsCore(f.actions))) continue
      touched.add(k)
    }
    const out = { ...n, ...f, id, touched: [...touched], editedByMe: true, updatedAt: new Date().toISOString() }
    putNote(out)
    return { updatedAt: out.updatedAt }
  })

  // Echo's own action items for the call (ids, ticks, ones the page lacked): not the user's edit, so
  // filing again still updates the list. A stored Claude run on an action stays.
  ctx.command('sync', ({ id, actions }) => {
    const n = mustNote(id)
    if (!Array.isArray(actions)) throw new Error('no actions')
    const left = [...(n.actions || [])]
    n.actions = actions.map((a) => {
      const i = left.findIndex((o) => (a.echoId && o.echoId === a.echoId) || textKey(o.text) === textKey(a.text))
      const o = i < 0 ? null : left.splice(i, 1)[0]
      return o && o.run ? { ...a, run: o.run } : a
    })
    n.updatedAt = new Date().toISOString()
    putNote(n)
    return { updatedAt: n.updatedAt }
  })

  // Opened: no longer "filed by Claude · not opened yet".
  ctx.command('seen', ({ id }) => {
    const n = mustNote(id)
    if (n.reviewed === false && !n.review) { n.reviewed = true; putNote(n) }
    return true
  })

  /** Review of a re-filing: `accept` a proposal, `keep` mine, `undo` an applied change, `ok` keeps it;
   *  `all-accept` / `all-keep` for everything at once. */
  ctx.command('resolve', ({ id, field, choice }) => {
    const n = mustNote(id)
    const r = n.review || { changes: [], proposed: {} }
    const touched = new Set(n.touched || [])
    const acceptP = (f) => { n[f] = r.proposed[f]; delete r.proposed[f] }
    const undoC = (f) => { const c = r.changes.find((x) => x.field === f); if (c) { n[f] = c.old; touched.add(f) } r.changes = r.changes.filter((x) => x.field !== f) }
    if (choice === 'all-accept') { for (const f of Object.keys(r.proposed)) acceptP(f); r.changes = [] }
    else if (choice === 'all-keep') { r.proposed = {}; for (const c of [...r.changes]) undoC(c.field) }
    else if (!FIELDS.includes(field)) throw new Error(`no field “${field}”`)
    else if (choice === 'accept') acceptP(field)
    else if (choice === 'keep') delete r.proposed[field]
    else if (choice === 'undo') undoC(field)
    else if (choice === 'ok') r.changes = r.changes.filter((x) => x.field !== field)
    else throw new Error(`no choice “${choice}”`)
    n.touched = [...touched]
    if (!r.changes.length && !Object.keys(r.proposed).length) { delete n.review; n.reviewed = true } else n.review = r
    n.updatedAt = new Date().toISOString()
    putNote(n)
    return n
  })

  ctx.command('create', ({ doc }) => {
    const now = new Date().toISOString()
    const d = doc || {}
    const id = `m-${Date.now().toString(36)}`
    const n = {
      type: str(d.type) || 'Internal', group: str(d.group) || 'General', title: str(d.title), date: ymd(d.date), start: '', end: '',
      source: 'manual', attendees: [], summary: '', decisions: [], actions: [], myNotes: '', createdAt: now, updatedAt: now, id,
      touched: [...FIELDS], editedByMe: true, reviewed: true,
    }
    putNote(n)
    return n
  })

  ctx.command('remove', ({ id }) => {
    const n = getNote(id)
    if (!n) return true
    ctx.store.remove(`notes/${id}.json`)
    indexDirty = true
    // A deleted page of a call stays deleted: the next minutes don't bring it back.
    if (n.call) setFiled(n.call, { id: '', state: 'removed', at: new Date().toISOString(), error: '' })
    return true
  })

  ctx.command('meta', ({ fields }) => {
    const m = { ...readJson('meta.json', {}), ...(fields || {}) }
    writeJson('meta.json', m)
    return m
  })

  // Started, not waited for (a run takes a minute or more); the page shows up on the next `view`.
  ctx.command('file', ({ call }) => {
    if (!validCall(call)) throw new Error(`no call “${call}”`)
    const rec = filed()[call]
    if (rec && rec.state === 'removed') setFiled(call, null)
    file(call).catch((e) => ctx.log('file', call, (e && e.message) || e))
    return { started: true }
  })
  ctx.command('file_wait', ({ call }) => file(call))

  // ── Run an action item with Claude: a draft for the user, kept on the action (`run`) ──
  const setRun = (id, index, run) => {
    const n = mustNote(id)
    const acts = (n.actions || []).map((a) => ({ ...a }))
    if (!acts[index]) throw new Error('that action item is gone')
    acts[index].run = run
    n.actions = acts
    putNote(n)
  }
  const draft = async ({ id, index, earlierPages, followup }) => {
    const key = `${id}#${index}`
    if (running.has(key)) throw new Error('Claude is on this action already')
    const n = mustNote(id)
    const action = (n.actions || [])[index]
    if (!action) throw new Error('that action item is gone')
    running.add(key)
    const at = new Date().toISOString()
    const prev = action.run || null
    setRun(id, index, { state: 'running', at, answer: prev && prev.answer, html: prev && prev.html })
    try {
      const earlier = earlierPages === false ? [] : allNotes().filter((x) => x.id !== id && x.type === n.type && (x.group || 'General') === (n.group || 'General') && (x.date || '') <= (n.date || '9999'))
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 3)
      let source = null
      if (n.call) { try { source = ctx.echo.read('source', `call:${n.call}`) } catch { source = null } }
      const fu = followup && prev && prev.answer ? { draft: prev.answer, ask: str(followup) } : null
      const out = await ctx.claude.run({ title: `Notebook: ${action.text}`.slice(0, 80), prompt: runPrompt({ page: n, action, earlier, source, followup: fu, me: setting('me', '') }), tools: 'none', dir: `runs/${stamp()}` })
      prune()
      const answer = str(out.answer).trim()
      if (!answer) throw new Error('Claude answered with nothing')
      setRun(id, index, { state: 'done', at: new Date().toISOString(), answer, html: ctx.markdown(answer), model: out.model || '', asked: fu ? fu.ask : '' })
    } catch (e) {
      setRun(id, index, { state: 'failed', at: new Date().toISOString(), error: String((e && e.message) || e), answer: prev && prev.answer, html: prev && prev.html })
    } finally {
      running.delete(key)
    }
  }
  ctx.command('run', (a) => { draft(a).catch((e) => ctx.log('run', (e && e.message) || e)); return { started: true } })
  ctx.command('run_wait', (a) => draft(a))

  /** A draft sent to the user themself (Teams' chat with yourself, or mail to their own address). */
  ctx.command('send_me', async ({ id, index, kind }) => {
    if (kind !== 'teams' && kind !== 'mail') throw new Error(`can't send by “${kind}”`)
    const n = mustNote(id)
    const a = (n.actions || [])[index]
    if (!a || !a.run || !a.run.answer) throw new Error('there is no draft to send')
    await ctx.deliver.send(kind, { title: a.text, markdown: a.run.answer, about: `Meeting Notebook · ${n.title || ''} · ${n.date || ''}`, ai: a.run.model || 'Claude' })
    return { sent: kind }
  })
}
