// Telegram — the client half: its own Settings section. Connect your bot, pair it (press Start), see what
// the channel needs, open the session it reaches.

const PLANE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 4 3 11l6 2 2 6 3-4 5 4z"/></svg>'

export function apply(ctx) {
  // Taken out by Echo when the plugin unloads (Echo 0.7.2+); older Echo keeps them on the document.
  const listen = ctx.listen || ((type, fn, opts) => document.addEventListener(type, fn, opts))
  const { esc, setCard, setRow } = ctx.ui
  let st = null, error = '', busy = '', pairing = false

  const load = async () => {
    try { st = await ctx.call('status'); error = '' } catch (e) { error = e.message }
    ctx.render()
  }
  const ok = '<span class="set-ok">Ready ✓</span>'
  // Pairing: ask again and again (each call waits up to 20 s) until the Start comes, or 5 minutes.
  const pair = async () => {
    pairing = true
    ctx.render()
    const until = Date.now() + 5 * 60000
    while (pairing && Date.now() < until) {
      try { const r = await ctx.call('pair'); if (r.paired) break } catch (e) { error = e.message; break }
    }
    pairing = false
    await load()
  }

  ctx.settings.section({
    id: 'main',
    label: 'Telegram',
    icon: PLANE,
    badge: () => (st && st.bot && st.bot.paired ? '' : st ? '!' : ''),
    // The token is taken here (checked with Telegram, then paired; Forget clears it): Echo draws no field for it, and
    // its Plugins page points here.
    settings: [{ key: 'bot_token', draw: false }],
    render() {
      if (!st) { if (!error && !busy) { busy = 'loading'; load().then(() => { busy = '' }) } return error ? `<p class="error">${esc(error)}</p>` : '<div class="skeleton" style="padding:20px"><i></i><i></i></div>' }
      const b = st.bot
      const botRow = !b
        ? setRow('Your bot', 'Your own bot: in Telegram, message <b>@BotFather</b>, send <code>/newbot</code>, and paste the token it gives you. It stays on this computer.',
            `<input class="set-in" type="password" id="tg-token" placeholder="123456:ABC-…" aria-label="Bot token" spellcheck="false"><button class="btn primary" data-tg-connect${busy === 'connect' ? ' disabled' : ''}>${busy === 'connect' ? 'Checking…' : 'Connect'}</button>`)
        : !b.paired
          ? setRow(`@${esc(b.bot)}`, pairing ? `Open <a data-ext href="https://t.me/${esc(b.bot)}">@${esc(b.bot)}</a> in Telegram and press <b>Start</b> — Echo is waiting for it.` : `Open <a data-ext href="https://t.me/${esc(b.bot)}">@${esc(b.bot)}</a> in Telegram and press <b>Start</b>; only the first one to do it — you — is let through.`,
              pairing ? '<span class="set-sub">Waiting…</span>' : '<button class="btn primary" data-tg-pair>I pressed Start</button><button class="btn ghost" data-tg-forget>Forget</button>')
          : setRow(`@${esc(b.bot)}`, `Talks to ${esc(b.user || 'you')} — and only you: nobody else gets through. Echo sends you things here too (routines, tests).`,
              `${ok}<button class="btn ghost" data-tg-test>Send a test</button><button class="btn ghost" data-tg-forget>Forget</button>`)
      const steps = [
        botRow,
        setRow('Bun', st.bun ? `Found at <code>${esc(st.bun)}</code> — Claude Code’s Telegram channel runs on it.` : 'Claude Code’s Telegram channel runs on Bun. Install it (<code>brew install oven-sh/bun/bun</code>, or see bun.sh), then check again.',
          st.bun ? ok : '<button class="btn" data-tg-recheck>Check again</button>'),
        setRow('Claude Code’s Telegram channel', st.plugin ? `<code>${esc(st.spec)}</code> is on in your Claude Code.` : st.plugin_error ? `<span class="error">${esc(st.plugin_error)}</span>` : `Echo installs <code>${esc(st.spec)}</code> (Anthropic’s official channel) in your Claude Code.`,
          st.plugin ? ok : `<button class="btn primary" data-tg-install${busy === 'install' ? ' disabled' : ''}>${busy === 'install' ? 'Installing…' : 'Install'}</button>`),
      ]
      const ready = b && b.paired && st.bun && st.plugin
      const session = setRow('Your Claude · Echo folder session', ready
        ? 'Messages to your bot go to this session while it is open in Echo, and Claude answers there. Open it — or close and open it again if it was open before you set this up. What it would ask you in the window comes to Telegram as buttons.'
        : 'Once the steps above are done, it listens to your bot while it is open.',
        ready ? '<button class="btn primary" data-tg-open>Open the session</button>' : '')
      return `<div class="sch"><div class="sch-head"><div style="flex:1"><h2 style="margin:0;font-size:18px;font-weight:650">Telegram</h2><div class="set-sub">Your own bot: Echo sends you things there, and you reach your Claude · Echo folder session from your phone.</div></div></div>
        ${setCard('', steps)}${setCard('', [session])}
        ${error ? `<p class="error">${esc(error)}</p>` : ''}
        <p class="set-sub">The channel is a research preview of Claude Code: it needs a claude.ai sign-in (or a Console key), not a gateway or Bedrock; on Team and Enterprise plans an admin switches channels on first. Messages sent while the session is closed aren’t read.</p></div>`
    },
  })

  listen('click', async (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-tg-connect],[data-tg-pair],[data-tg-forget],[data-tg-test],[data-tg-recheck],[data-tg-install],[data-tg-open]')
    if (!t) return
    const d = t.dataset
    if ('tgConnect' in d) {
      const token = (document.getElementById('tg-token') || {}).value || ''
      if (!token.trim()) return
      busy = 'connect'; ctx.render()
      try { await ctx.call('connect', { token: token.trim() }); error = '' } catch (e) { error = e.message }
      busy = ''
      await load()
      if (st && st.bot && !st.bot.paired) pair()
      return
    }
    if ('tgPair' in d) return pair()
    if ('tgForget' in d) { pairing = false; await ctx.call('forget').catch(() => {}); return load() }
    if ('tgRecheck' in d) return load()
    if ('tgOpen' in d) return ctx.openEchoPanel('claude-folder')
    if ('tgTest' in d) { try { await ctx.call('test'); ctx.ui.notice('Sent — look in Telegram.') } catch (e) { ctx.ui.notice(e.message) } return }
    if ('tgInstall' in d) {
      busy = 'install'; ctx.render()
      try { await ctx.call('install'); error = '' } catch (e) { error = e.message }
      busy = ''
      return load()
    }
  })
}
