// GitHub — the client half: its own Settings section. Shows whose GitHub sign-in on this computer Echo reads with (or
// lets you sign in here: a code to confirm on github.com),
// lets you pick what to show from your organisations and the repos you worked on lately (as a thread's sources are
// picked: chips, + to add), and what Echo last read. The widgets themselves are Echo's (Today → Edit).

const MARK = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>'
const MARK_SMALL = MARK.replace('<svg ', '<svg width="11" height="11" style="vertical-align:-1px" ')
const CI = { passing: '✓ CI passing', failing: '✗ CI failing', running: '● CI running', none: 'no CI' }
const FROM = { gh: 'the GitHub CLI’s sign-in on this computer', git: 'git’s sign-in to github.com on this computer', echo: 'the sign-in you made in Echo' }
/** The only address the code is entered at (the host half's own, checked again here). */
const DEVICE_URL = /^https:\/\/github\.com\/login\/device$/
const SUGGESTED = 12
const REPO = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/

export function apply(ctx) {
  // Taken out by Echo when the plugin unloads; an older Echo keeps them on the document.
  const listen = ctx.listen || ((type, fn, opts) => document.addEventListener(type, fn, opts))
  const { esc, setCard, setRow } = ctx.ui
  let st = null, found = null, error = '', busy = '', polls = 0, more = false, adding = false
  // Signing in here: the code shown while it waits ({code, url}), and how the last one ended.
  let code = null, codeTimer = null, codeSaid = '', copied = false

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
      const refused = st.problem && st.problem.code === 'auth'
      const out = st.from === 'echo' && st.canKeep ? `<button class="btn" data-gh-signout${busy === 'signout' ? ' disabled' : ''}>Sign out</button>` : ''
      return setRow(st.login ? `@${esc(st.login)}` : 'Signed in', `With ${FROM[st.from] || 'the GitHub sign-in on this computer'}. Echo only reads GitHub; it never changes anything there.`,
        `${refused ? '<button class="btn" data-gh-check>Check again</button>' : ok} ${out}`)
    }
    if (code) {
      // One click copies the code (an Echo with ctx.ui.copy) and opens GitHub's page, as `gh auth login` does; the code
      // stays on screen. The address is the host half's own, checked again here — never one from GitHub's answer.
      const canCopy = !!(ctx.ui && ctx.ui.copy)
      const open = DEVICE_URL.test(code.url)
        ? `<a class="btn primary" style="text-decoration:none" data-ext data-gh-copy href="${esc(code.url)}" title="${canCopy ? 'Copies the code and opens github.com/login/device' : 'Opens github.com/login/device'}">${canCopy ? 'Copy code &amp; open GitHub' : 'Open GitHub'}</a>`
        : ''
      return setRow('Enter this code on GitHub', `<b class="gh-code" style="font-size:16px;letter-spacing:1px;user-select:all">${esc(code.code)}</b> at github.com/login/device — waiting for you to confirm it there (15 minutes at most).${copied ? ' <span class="set-ok">Copied</span>' : ''}`,
        `${open} <button class="btn" data-gh-signin-cancel>Cancel</button>`)
    }
    const noGh = st.sources && st.sources.gh === false
    const said = codeSaid ? `<div class="set-sub error">${esc(codeSaid)}</div>` : ''
    if (st.canKeep) {
      return setRow('Sign in to GitHub', `Echo uses the GitHub sign-in this computer already has (<code>gh auth login</code>), or sign in here: you confirm a code on github.com, and Echo keeps that sign-in for this plugin.${said}`,
        `<button class="btn primary" data-gh-signin${busy === 'signin' ? ' disabled' : ''}>${busy === 'signin' ? 'Asking GitHub…' : 'Sign in with GitHub'}</button> <button class="btn" data-gh-check${busy === 'check' ? ' disabled' : ''}>${busy === 'check' ? 'Checking…' : 'Check again'}</button>`)
    }
    return setRow('Sign in to GitHub on this computer', noGh
      ? 'Echo uses the sign-in you already have here. Install the GitHub CLI (<code>brew install gh</code>), run <code>gh auth login</code> in a terminal, then check again.'
      : 'Echo uses the sign-in you already have here. Run <code>gh auth login</code> in a terminal, then check again.',
      `<button class="btn primary" data-gh-check${busy === 'check' ? ' disabled' : ''}>${busy === 'check' ? 'Checking…' : 'Check again'}</button>`)
  }

  // While the code waits to be confirmed: ask the host half every 2 s (it asks GitHub no more often than GitHub said).
  const SAID = { denied: 'GitHub said no — not signed in.', expired: 'The code ran out before it was confirmed — sign in again.', none: 'The sign-in stopped (Echo restarted?) — sign in again.' }
  const watchCode = () => {
    clearTimeout(codeTimer)
    codeTimer = setTimeout(async () => {
      let v
      const asked = code
      try { v = await ctx.call('signinPoll') } catch (e) { if (code !== asked) return; code = null; codeSaid = e.message; return ctx.render() }
      // Cancelled (or a new code asked for) while this answer was on its way: it is about nothing on screen.
      if (code !== asked) return
      if (v.state === 'waiting') return watchCode()
      code = null
      codeSaid = v.state === 'done' ? '' : v.state === 'failed' ? `GitHub couldn’t sign you in: ${v.error || 'no reason given'}` : (SAID[v.state] || '')
      found = null
      await load()
      // GitHub is being read with the new sign-in: show what it finds.
      if (v.state === 'done') setTimeout(load, 3000)
    }, 2000)
  }
  const startSignIn = async () => {
    busy = 'signin'; error = ''; codeSaid = ''; ctx.render()
    try { code = await ctx.call('signinStart'); copied = false; watchCode() } catch (e) { codeSaid = e.message }
    busy = ''; ctx.render()
  }

  const chip = (name, title = '') => `<span class="tok"${title ? ` title="${esc(title)}"` : ''}>${esc(name)}<button data-gh-pick="${esc(name)}" data-on="0" aria-label="Stop showing ${esc(name)}">×</button></span>`
  const offer = (name, label, title = '') => `<button class="tok add" data-gh-pick="${esc(name)}" data-on="1"${title ? ` title="${esc(title)}"` : ''}>+ ${esc(label)}</button>`

  const pickRows = () => {
    const picks = st.picks || []
    const failed = new Map((st.checks || []).filter((c) => !c.ok).map((c) => [c.entry.toLowerCase(), c.why]))
    const mine = picks.length
      ? picks.map((p) => chip(p, failed.get(p.toLowerCase()) ? `${p} — ${failed.get(p.toLowerCase())}` : p.includes('/') ? '' : 'The organisation: its counts cover all its repos; its 10 pushed to last are listed')).join(' ')
      : '<span class="set-sub warn">Nothing picked yet — pick at least one repo or organisation below to start watching it.</span>'
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

  // ── A thread's repos: a row of its Profile (`thread.profile`), chips as its sources are, + for the repos you worked
  // on lately and any other. Kept by Echo per thread (`ctx.threads`, through the host half).
  const repos = {}          // thread id → its repos (undefined: not read yet)
  // A failed pick's error stays until the next pick; a failed read's until a good read.
  let tAdding = '', tError = {}, tReadError = {}, discovering = false
  // A thread's repos as Echo keeps them — set here, in another window, by Claude or from a terminal: drawn again only
  // when they changed.
  const readThread = (id) => ctx.call('threadRepos', { thread: id }).then((v) => {
    const next = v || []
    // A good read clears an error an earlier one left (the host half reloading during an update, say).
    const hadError = !!tReadError[id]
    delete tReadError[id]
    if (hadError || JSON.stringify(next) !== JSON.stringify(repos[id])) { repos[id] = next; ctx.render() }
  }, (e) => { tReadError[id] = e.message; ctx.render() })
  // While a thread's GitHub row is on screen, look again every 5 s (Echo's own store, not GitHub); stops when none is.
  // One check at a time for the window, whatever version set it (Echo can't stop an unloaded plugin's timers: an
  // update's new half takes the old one's place).
  const WATCH = '__echoGithubThreadWatch'
  if (globalThis[WATCH]) { clearInterval(globalThis[WATCH]); globalThis[WATCH] = null }
  const watchRows = () => {
    if (globalThis[WATCH]) return
    globalThis[WATCH] = setInterval(() => {
      const boxes = [...document.querySelectorAll('[data-thread-slot="github:repos"]')].filter((b) => b._afterFor)
      if (!boxes.length) { clearInterval(globalThis[WATCH]); globalThis[WATCH] = null; return }
      for (const b of boxes) readThread(b._afterFor)
    }, 5000)
  }
  // After an update the Profile may still be on screen with its rows kept (no `after` again): watch them now.
  if (typeof document !== 'undefined' && document.querySelector('[data-thread-slot="github:repos"]')) watchRows()
  const tPick = async (id, entry, on) => {
    tError[id] = ''
    try { repos[id] = await ctx.call('threadPick', { thread: id, entry, on }) } catch (e) { tError[id] = e.message }
    ctx.render()
  }
  if (ctx.slots) ctx.slots.add('thread.profile', {
    id: 'repos',
    label: 'GitHub',
    render(t) {
      const mine = repos[t.id]
      if (mine === undefined) return '<span class="set-sub">Reading…</span>'
      const has = (r) => mine.some((x) => x.toLowerCase() === r.toLowerCase())
      const chips = mine.map((r) => `<span class="tok">${MARK_SMALL} ${esc(r)}<button data-gh-tpick="${esc(r)}" data-thread="${esc(t.id)}" data-on="0" aria-label="Take ${esc(r)} off this thread">×</button></span>`).join(' ')
      // Only names GitHub could have are offered (a hostile name in GitHub's answer isn't).
      const offers = ((found && found.repos) || []).filter((r) => REPO.test(r.repo) && !has(r.repo)).slice(0, 6)
        .map((r) => `<button class="tok add" data-gh-tpick="${esc(r.repo)}" data-thread="${esc(t.id)}" data-on="1">+ ${esc(r.repo)}</button>`).join(' ')
      const add = tAdding === t.id
        ? `<span class="tok-in"><input id="gh-tadd" data-thread="${esc(t.id)}" placeholder="owner/repo" aria-label="A repo for this thread" spellcheck="false" autofocus><button class="btn" data-gh-tadd data-thread="${esc(t.id)}">Add</button></span>`
        : `<button class="tok add" data-gh-tadding data-thread="${esc(t.id)}">+ Another repo</button>`
      const said = tError[t.id] || tReadError[t.id]
      const why = said ? `<div class="set-sub error">${esc(said)}</div>` : ''
      const lead = mine.length ? '' : '<span class="set-sub">No repos yet: their pull requests and issues show in this thread’s Work, and Claude knows them here.</span> '
      return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${lead}${chips} ${offers} ${add}</div>${why}`
    },
    after(box, t) {
      // Each time the row is drawn afresh (the Profile opened again), and every few seconds while it is shown.
      readThread(t.id)
      watchRows()
      // Something to offer: the repos you worked on lately (read once).
      if (!found && !discovering) { discovering = true; ctx.call('discover').then((d) => { found = d; ctx.render() }, () => {}) }
    },
  })
  const tAddTyped = (id) => {
    const v = ((document.getElementById('gh-tadd') || {}).value || '').trim()
    tAdding = ''
    if (!v) return ctx.render()
    return tPick(id, v, true)
  }

  listen('click', async (ev) => {
    const tt = ev.target.closest && ev.target.closest('[data-gh-tpick],[data-gh-tadding],[data-gh-tadd]')
    if (tt) {
      const d = tt.dataset
      if ('ghTpick' in d) return tPick(d.thread, d.ghTpick, d.on === '1')
      if ('ghTadding' in d) { tAdding = d.thread; return ctx.render() }
      if ('ghTadd' in d) return tAddTyped(d.thread)
    }
    // The code copied on the click itself (Echo opens the link: it is an `a[data-ext]`).
    const c = ev.target.closest && ev.target.closest('[data-gh-copy]')
    if (c && code && ctx.ui && ctx.ui.copy) { try { ctx.ui.copy(code.code); copied = true } catch (e) { codeSaid = e.message } ctx.render(); return }
    const t = ev.target.closest && ev.target.closest('[data-gh-check],[data-gh-pick],[data-gh-more],[data-gh-adding],[data-gh-add],[data-gh-refresh],[data-gh-signin],[data-gh-signin-cancel],[data-gh-signout]')
    if (!t || t.disabled) return
    const d = t.dataset
    if ('ghCheck' in d) { found = null; return run('check', () => ctx.call('refresh')) }
    if ('ghSignin' in d) return startSignIn()
    if ('ghSigninCancel' in d) { clearTimeout(codeTimer); code = null; codeSaid = ''; try { await ctx.call('signinCancel') } catch (e) { error = e.message } return ctx.render() }
    if ('ghSignout' in d) { found = null; return run('signout', () => ctx.call('signOut')) }
    if ('ghPick' in d) return run('pick', () => ctx.call('pick', { entry: d.ghPick, on: d.on === '1' }))
    if ('ghMore' in d) { more = true; return ctx.render() }
    if ('ghAdding' in d) { adding = true; return ctx.render() }
    if ('ghAdd' in d) return addTyped()
    if ('ghRefresh' in d) { found = null; return run('refresh', () => ctx.call('refresh')) }
  })
  listen('keydown', (ev) => {
    if (ev.target && ev.target.id === 'gh-tadd') {
      if (ev.key === 'Enter') { ev.preventDefault(); tAddTyped(ev.target.dataset.thread) }
      if (ev.key === 'Escape') { tAdding = ''; ctx.render() }
      return
    }
    if (ev.target && ev.target.id === 'gh-add') {
      if (ev.key === 'Enter') { ev.preventDefault(); addTyped() }
      if (ev.key === 'Escape') { adding = false; ctx.render() }
    }
  })
}
