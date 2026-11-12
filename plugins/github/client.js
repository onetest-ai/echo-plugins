// GitHub — the client half: its own Settings section. Sign in with a token, pick the repos and organisations,
// see what Echo reads and when; the widgets themselves are Echo's (Today → Edit).

const MARK = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>'
const NEW_TOKEN = 'https://github.com/settings/personal-access-tokens/new'
const CI = { passing: '✓ CI passing', failing: '✗ CI failing', running: '● CI running', none: 'no CI' }

export function apply(ctx) {
  // Taken out by Echo when the plugin unloads; an older Echo keeps them on the document.
  const listen = ctx.listen || ((type, fn, opts) => document.addEventListener(type, fn, opts))
  const { esc, setCard, setRow } = ctx.ui
  let st = null, error = '', busy = '', polls = 0

  const load = async () => {
    try { st = await ctx.call('status'); error = '' } catch (e) { error = e.message }
    ctx.render()
    // A read in progress (after signing in): look again shortly, a few times.
    if (st && st.busy && polls < 10) { polls++; setTimeout(load, 3000) } else polls = 0
  }
  const ok = '<span class="set-ok">Ready ✓</span>'
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`

  const signInRow = () => !st.signedIn
    ? setRow('Your GitHub token', `Make a <a data-ext href="${NEW_TOKEN}">fine-grained token</a> for the repos you want here, with read access to <b>Contents</b>, <b>Pull requests</b>, <b>Issues</b> and <b>Actions</b>, and paste it. It stays on this computer; Echo only reads GitHub, never changes it.`,
        `<input class="set-in" type="password" id="gh-token" placeholder="github_pat_…" aria-label="GitHub token" spellcheck="false" autocomplete="off"><button class="btn primary" data-gh-connect${busy === 'connect' ? ' disabled' : ''}>${busy === 'connect' ? 'Checking…' : 'Connect'}</button>`)
    : setRow(st.login ? `@${esc(st.login)}` : 'Signed in', st.problem && st.problem.code === 'auth'
        ? `<span class="error">${esc(st.problem.text)}</span>`
        : 'Echo reads GitHub as you every 5 minutes. Read only: it never changes anything on GitHub.',
        `${st.problem && st.problem.code === 'auth' ? '' : ok}<button class="btn ghost" data-gh-forget>Forget</button>`)

  const reposRow = () => {
    const checks = (st.checks || []).map((c) => c.ok
      ? `<div class="set-sub">✓ ${esc(c.entry)}${c.repos > 1 ? ` — ${count(c.repos, 'repo', 'repos')}${c.repos > 10 ? ', the 10 pushed to last shown' : ''}` : ''}</div>`
      : `<div class="set-sub error">⚠ ${esc(c.entry)} — ${esc(c.why)}</div>`).join('')
    return setRow('Repos and organisations',
      `<code>owner/repo</code>, or an organisation's name for its repos — one per line. Empty: the repos you pushed to last.
       <textarea class="set-in" id="gh-repos" rows="4" spellcheck="false" style="display:block;width:100%;margin-top:8px;font-family:var(--mono, monospace)" placeholder="acme-test/api&#10;acme-test">${esc(st.repos || '')}</textarea>${checks}`,
      `<button class="btn${st.signedIn ? ' primary' : ''}" data-gh-repos${busy === 'repos' || !st.signedIn ? ' disabled' : ''}>${busy === 'repos' ? 'Reading…' : 'Save'}</button>`)
  }

  const readRow = () => {
    const rate = st.rate ? ` · ${st.rate.remaining.toLocaleString()} of ${st.rate.limit.toLocaleString()} requests left this hour` : ''
    const when = st.at ? `Last read ${new Date(st.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${rate}` : 'Not read yet'
    const problem = st.problem && st.problem.code !== 'auth' ? `<br><span class="error">${esc(st.problem.text)}</span>` : ''
    return setRow('GitHub, as Echo last read it', `${when}${problem}`,
      `<button class="btn ghost" data-gh-refresh${st.busy || busy === 'refresh' ? ' disabled' : ''}>${st.busy || busy === 'refresh' ? 'Reading…' : 'Refresh now'}</button>`)
  }

  const repoRows = () => (st.list || []).map((r) => {
    const bits = [r.ci === 'failing' && r.failing.length ? `${CI.failing}: ${esc(r.failing.join(', '))}` : CI[r.ci], count(r.prs, 'open PR', 'open PRs'), count(r.issues, 'open issue', 'open issues')]
    if (r.reviews) bits.push(`<b>${count(r.reviews, 'review for you', 'reviews for you')}</b>`)
    return setRow(`<a data-ext href="${esc(r.url)}">${esc(r.repo)}</a>`, bits.join(' · '), '')
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
      const seen = st.signedIn && st.at ? setCard('', [readRow(), ...repoRows()]) : ''
      return `<div class="sch"><div class="sch-head"><div style="flex:1"><h2 style="margin:0;font-size:18px;font-weight:650">GitHub</h2><div class="set-sub">CI, open pull requests and the reviews waiting on you, on Today — for the repos and organisations you pick.</div></div></div>
        ${setCard('', [signInRow(), reposRow()])}
        ${seen}
        ${error ? `<p class="error">${esc(error)}</p>` : ''}
        <p class="set-sub">Put it on Today: <b>Today → Edit</b>, then add <b>GitHub repos</b>, <b>GitHub CI</b> or <b>GitHub at a glance</b>; each widget's ⚙ picks what it shows.</p></div>`
    },
  })

  listen('click', async (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-gh-connect],[data-gh-forget],[data-gh-repos],[data-gh-refresh]')
    if (!t || t.disabled) return
    const d = t.dataset
    const run = async (what, fn) => {
      busy = what; ctx.render()
      try { await fn(); error = '' } catch (e) { error = e.message }
      busy = ''
      await load()
    }
    if ('ghConnect' in d) {
      const token = ((document.getElementById('gh-token') || {}).value || '').trim()
      if (token) return run('connect', () => ctx.call('connect', { token }))
      return
    }
    if ('ghForget' in d) return run('forget', () => ctx.call('forget'))
    if ('ghRepos' in d) return run('repos', () => ctx.call('repos', { text: (document.getElementById('gh-repos') || {}).value || '' }))
    if ('ghRefresh' in d) return run('refresh', () => ctx.call('refresh'))
  })
}
