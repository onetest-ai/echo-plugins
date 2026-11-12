// GitHub — the client half: its own Settings section. Shows whose GitHub sign-in on this computer Echo reads with,
// lets you pick what to show from your organisations and the repos you worked on lately (as a thread's sources are
// picked: chips, + to add), and what Echo last read. The widgets themselves are Echo's (Today → Edit).

const MARK = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>'
const CI = { passing: '✓ CI passing', failing: '✗ CI failing', running: '● CI running', none: 'no CI' }
const FROM = { gh: 'the GitHub CLI’s sign-in', git: 'git’s sign-in to github.com' }
const SUGGESTED = 12
const REPO = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/

export function apply(ctx) {
  // Taken out by Echo when the plugin unloads; an older Echo keeps them on the document.
  const listen = ctx.listen || ((type, fn, opts) => document.addEventListener(type, fn, opts))
  const { esc, setCard, setRow } = ctx.ui
  let st = null, found = null, error = '', busy = '', polls = 0, more = false, adding = false

  // Reading the status never clears an action's error: it stays until the next action.
  const load = async () => {
    try { st = await ctx.call('status') } catch (e) { error = e.message }
    if (st && st.signedIn && !found) { try { found = await ctx.call('discover') } catch (e) { error = e.message } }
    ctx.render()
    // A read in progress: look again shortly, a few times.
    if (st && st.busy && polls < 10) { polls++; setTimeout(load, 3000) } else polls = 0
  }
  const ok = '<span class="set-ok">Ready ✓</span>'
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`
  const picked = (name) => (st.picks || []).some((p) => p.toLowerCase() === name.toLowerCase())

  const signInRow = () => {
    if (!st.echoCanSignIn) return setRow('Your GitHub sign-in', 'This Echo can’t use the GitHub sign-in on this computer yet. Update Echo, then open this again.', '')
    if (st.signedIn) {
      return setRow(st.login ? `@${esc(st.login)}` : 'Signed in', `With ${FROM[st.from] || 'the GitHub sign-in'} on this computer. Echo only reads GitHub; it never changes anything there.`,
        st.problem && st.problem.code === 'auth' ? `<button class="btn" data-gh-check>Check again</button>` : ok)
    }
    const noGh = st.sources && st.sources.gh === false
    return setRow('Sign in to GitHub on this computer', noGh
      ? 'Echo uses the sign-in you already have here. Install the GitHub CLI (<code>brew install gh</code>), run <code>gh auth login</code> in a terminal, then check again.'
      : 'Echo uses the sign-in you already have here. Run <code>gh auth login</code> in a terminal, then check again.',
      `<button class="btn primary" data-gh-check${busy === 'check' ? ' disabled' : ''}>${busy === 'check' ? 'Checking…' : 'Check again'}</button>`)
  }

  const chip = (name, title = '') => `<span class="tok"${title ? ` title="${esc(title)}"` : ''}>${esc(name)}<button data-gh-pick="${esc(name)}" data-on="0" aria-label="Stop showing ${esc(name)}">×</button></span>`
  const offer = (name, label, title = '') => `<button class="tok add" data-gh-pick="${esc(name)}" data-on="1"${title ? ` title="${esc(title)}"` : ''}>+ ${esc(label)}</button>`

  const pickRows = () => {
    const picks = st.picks || []
    const failed = new Map((st.checks || []).filter((c) => !c.ok).map((c) => [c.entry.toLowerCase(), c.why]))
    const mine = picks.length
      ? picks.map((p) => chip(p, failed.get(p.toLowerCase()) ? `${p} — ${failed.get(p.toLowerCase())}` : p.includes('/') ? '' : 'The organisation: its counts cover all its repos; its 10 pushed to last are listed')).join(' ')
      : '<span class="set-sub">Nothing picked: Today shows the 10 repos you pushed to last.</span>'
    const bad = [...failed].map(([e, why]) => `<div class="set-sub error">⚠ ${esc(e)} — ${esc(why)}</div>`).join('')
    const orgs = ((found && found.orgs) || []).filter((o) => !picked(o.login))
      .map((o) => offer(o.login, `${o.login} · ${count(o.repos, 'repo', 'repos')}`, o.name || o.login)).join(' ')
    const recent = ((found && found.repos) || []).filter((r) => !picked(r.repo))
    const shown = more ? recent : recent.slice(0, SUGGESTED)
    const repos = shown.map((r) => offer(r.repo, r.repo, `Pushed ${new Date(r.pushedAt).toLocaleDateString()}`)).join(' ')
      + (!more && recent.length > SUGGESTED ? ` <button class="tok link" data-gh-more>${recent.length - SUGGESTED} more…</button>` : '')
    const add = adding
      ? `<span class="tok-in"><input id="gh-add" placeholder="owner/repo or an organisation" aria-label="A repo or an organisation" spellcheck="false" autofocus><button class="btn" data-gh-add>Add</button></span>`
      : '<button class="tok add" data-gh-adding>+ Another repo or organisation</button>'
    const noOrgs = found && !found.orgs.length ? '<div class="set-sub">No organisations show: your sign-in may not be allowed to list them (GitHub’s <code>read:org</code>). Add one by its name.</div>' : ''
    return [
      setRow('Shown on Today', `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${mine}</div>${bad}`, ''),
      setRow('Your organisations', `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${orgs || '<span class="set-sub">All shown.</span>'}</div>${noOrgs}`, ''),
      setRow('Repos you worked on lately', `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${repos || '<span class="set-sub">None.</span>'} ${add}</div>`, ''),
    ]
  }

  const readRow = () => {
    const rate = st.rate ? ` · ${st.rate.remaining.toLocaleString()} of ${st.rate.limit.toLocaleString()} requests left this hour` : ''
    const when = st.at ? `Last read ${new Date(st.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${rate}` : 'Not read yet'
    const problem = st.problem ? `<br><span class="error">${esc(st.problem.text)}</span>` : ''
    return setRow('GitHub, as Echo last read it', `${when}${problem}`,
      `<button class="btn ghost" data-gh-refresh${st.busy || busy === 'refresh' ? ' disabled' : ''}>${st.busy || busy === 'refresh' ? 'Reading…' : 'Refresh now'}</button>`)
  }

  const repoRows = () => (st.list || []).map((r) => {
    const bits = [r.ci === 'failing' && r.failing.length ? `${CI.failing}: ${esc(r.failing.join(', '))}` : CI[r.ci], count(r.prs, 'open PR', 'open PRs'), count(r.issues, 'open issue', 'open issues')]
    if (r.reviews) bits.push(`<b>${count(r.reviews, 'review for you', 'reviews for you')}</b>`)
    // A link only for a name GitHub could have; anything else is shown as text.
    const title = REPO.test(r.repo) ? `<a class="wp-link" data-ext href="https://github.com/${esc(r.repo)}" title="Open on GitHub">${esc(r.repo)} ↗</a>` : esc(r.repo)
    return setRow(title, bits.join(' · '), '')
  })

  ctx.settings.section({
    id: 'main',
    label: 'GitHub',
    icon: MARK,
    badge: () => (st && (!st.signedIn || (st.problem && st.problem.code === 'auth')) ? '!' : ''),
    render() {
      if (!st) {
        if (!error && !busy) { busy = 'loading'; load().then(() => { busy = '' }) }
        return error ? `<p class="error">${esc(error)}</p>` : '<div class="skeleton" style="padding:20px"><i></i><i></i></div>'
      }
      const pick = st.signedIn ? setCard('What to show', pickRows()) : ''
      const seen = st.signedIn && st.at ? setCard('', [readRow(), ...repoRows()]) : ''
      return `<div class="sch"><div class="sch-head"><div style="flex:1"><h2 style="margin:0;font-size:18px;font-weight:650">GitHub</h2><div class="set-sub">CI, open pull requests and the reviews waiting on you, on Today — for the organisations and repos you pick.</div></div></div>
        ${setCard('', [signInRow()])}
        ${pick}
        ${seen}
        ${error ? `<p class="error">${esc(error)}</p>` : ''}
        <p class="set-sub">Put it on Today: <b>Today → Edit</b>, then add <b>GitHub repos</b>, <b>GitHub CI</b> or <b>GitHub at a glance</b>; each widget's ⚙ picks what it shows.</p></div>`
    },
  })

  const run = async (what, fn) => {
    busy = what; error = ''; ctx.render()
    try { await fn() } catch (e) { error = e.message }
    busy = ''
    await load()
  }
  const addTyped = () => {
    const v = ((document.getElementById('gh-add') || {}).value || '').trim()
    if (!v) { adding = false; return ctx.render() }
    adding = false
    return run('pick', () => ctx.call('pick', { entry: v, on: true }))
  }

  listen('click', async (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-gh-check],[data-gh-pick],[data-gh-more],[data-gh-adding],[data-gh-add],[data-gh-refresh]')
    if (!t || t.disabled) return
    const d = t.dataset
    if ('ghCheck' in d) { found = null; return run('check', () => ctx.call('refresh')) }
    if ('ghPick' in d) return run('pick', () => ctx.call('pick', { entry: d.ghPick, on: d.on === '1' }))
    if ('ghMore' in d) { more = true; return ctx.render() }
    if ('ghAdding' in d) { adding = true; return ctx.render() }
    if ('ghAdd' in d) return addTyped()
    if ('ghRefresh' in d) { found = null; return run('refresh', () => ctx.call('refresh')) }
  })
  listen('keydown', (ev) => {
    if (ev.target && ev.target.id === 'gh-add') {
      if (ev.key === 'Enter') { ev.preventDefault(); addTyped() }
      if (ev.key === 'Escape') { adding = false; ctx.render() }
    }
  })
}
