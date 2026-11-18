// Knowledge (the plugin `obsidian`) — a thread's and a client's "Knowledge vault" row, on their Profile (the slots
// `thread.profile` and `client.profile`): where the minutes of their calls go — the vault set here, what it inherits
// ("from Acme's vault", "the default vault") or none — and that vault's minutes mode, Auto / Ask / Off. Kept by the
// host half: `ctx.threads` / `ctx.clients` key `vault` (commands `vault_row`, `thread_vault`, `client_vault`, `set`).
// Its look is #17's Knowledge (`kn-` classes, from knowledge.css, which the activity loads) and Echo's own pieces
// (`set-sub`, `set-in`, `seg`); every text through `ctx.ui.esc`. Imported by client.js: `applyRows(ctx)`.

const MODES = [['auto', 'Auto', 'Saved into the vault as soon as the minutes are written'], ['ask', 'Ask', 'Saved only when you say, from the call'], ['off', 'Off', 'Never saved into the vault']]
const GEM = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M12 2.5 19 8l-2 10-5 3.5L7 18 5 8z"/><path d="M12 2.5 10 12l2 9.5M5 8l5 4 7 6M19 8l-9 4"/></svg>'

/** The row's HTML for one thread or client, from the host half's `vault_row` answer (pure: tested). `kind`: thread |
 *  client; `id`: its id; `row`: {own, inherited: {vault, name, from, client_name}, effective, vaults: [{id, name, mode}]};
 *  `error`: what went wrong last. */
export function rowHtml(esc, kind, id, row, error = '') {
  if (!row) return error ? `<span class="set-sub error">${esc(error)}</span>` : '<span class="set-sub">Reading…</span>'
  const inh = row.inherited || {}
  const fromWhat = inh.from === 'client'
    ? (inh.vault ? `from ${inh.client_name || 'its client'}'s vault, ${inh.name}` : `none, as ${inh.client_name || 'its client'} says`)
    : (inh.vault ? `the default vault, ${inh.name}` : 'no default vault')
  const opt = (value, label, on) => `<option value="${esc(value)}"${on ? ' selected' : ''}>${esc(label)}</option>`
  const select = `<select class="set-in" data-kn-row-vault data-kn-row-kind="${esc(kind)}" data-kn-row-id="${esc(id)}" aria-label="Knowledge vault">${[
    opt('', `Inherited — ${fromWhat}`, !row.own),
    ...(row.vaults || []).map((v) => opt(v.id, v.name, row.own === v.id)),
    opt('none', 'None — not into a vault', row.own === 'none'),
  ].join('')}</select>`
  const v = (row.vaults || []).find((x) => x.id === row.effective)
  const seg = v
    ? `<div class="seg" role="group" aria-label="Minutes into ${esc(v.name)}">${MODES.map(([m, l, t]) => `<button type="button" title="${esc(t)}" aria-pressed="${v.mode === m}" data-kn-row-mode="${m}" data-kn-row-vault-id="${esc(v.id)}" data-kn-row-kind="${esc(kind)}" data-kn-row-id="${esc(id)}">${l}</button>`).join('')}</div>`
    : ''
  const what = kind === 'thread' ? 'this thread\'s' : 'this client\'s'
  const said = v
    ? `Minutes of ${what} calls go to <b>${esc(v.name)}</b>${row.own ? '' : ` <span class="kn-meta">(${esc(inh.from === 'client' ? `${inh.client_name || 'its client'}'s vault` : 'the default vault')})</span>`}.`
    : (row.vaults || []).length ? `The minutes of ${what} calls go into no vault.` : 'No vault connected yet: connect one in Knowledge.'
  const err = error ? `<div class="set-sub error">${esc(error)}</div>` : ''
  return `<div class="kn-row" style="display:flex;flex-direction:column;gap:6px"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span class="kn-gem">${GEM}</span>${select}${seg}</div><div class="set-sub">${said}</div>${err}</div>`
}

export function applyRows(ctx) {
  if (!ctx.slots) return
  const esc = ctx.ui.esc
  const rows = {}, errors = {}
  const key = (kind, id) => `${kind}:${id}`
  const read = (kind, id) => ctx.call('vault_row', { [kind]: id }).then((r) => {
    const k = key(kind, id)
    const had = !!errors[k]
    delete errors[k]
    if (had || JSON.stringify(r) !== JSON.stringify(rows[k])) { rows[k] = r; ctx.render() }
  }, (e) => { errors[key(kind, id)] = e.message; ctx.render() })
  for (const kind of ['thread', 'client']) {
    ctx.slots.add(`${kind}.profile`, {
      id: 'vault',
      label: 'Knowledge vault',
      render: (t) => rowHtml(esc, kind, t.id, rows[key(kind, t.id)], errors[key(kind, t.id)]),
      // Each time the row is drawn afresh: what the host half keeps now (set here, in another window or a terminal).
      after: (box, t) => { read(kind, t.id) },
    })
  }
  const act = async (kind, id, fn) => {
    try { await fn(); delete errors[key(kind, id)] } catch (e) { errors[key(kind, id)] = e.message }
    await read(kind, id)
    ctx.render()
  }
  const listen = ctx.listen || ((t, f) => document.addEventListener(t, f))
  listen('change', (ev) => {
    const el = ev.target && ev.target.closest && ev.target.closest('[data-kn-row-vault]')
    if (!el) return
    const { knRowKind: kind, knRowId: id } = el.dataset
    act(kind, id, () => ctx.call(`${kind}_vault`, { [kind]: id, vault: el.value || null }))
  })
  listen('click', (ev) => {
    const el = ev.target && ev.target.closest && ev.target.closest('[data-kn-row-mode]')
    if (!el) return
    const { knRowKind: kind, knRowId: id, knRowMode: mode, knRowVaultId: vault } = el.dataset
    act(kind, id, () => ctx.call('set', { id: vault, key: 'minutes', value: mode }))
  })
}
