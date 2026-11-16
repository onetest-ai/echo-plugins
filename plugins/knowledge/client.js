
// The seven-tab Knowledge client. Drafts retain their existing local keys; vault state stays in the native engine.
// Uses the declared Knowledge context only, with no direct requests to outside hosts.
export async function apply(ctx) {
  const { createKnowledge } = await import(`./view.js${new URL(import.meta.url).search}`)
  if (!ctx.knowledge) throw new Error('Knowledge needs an Echo build with native Knowledge plugin support')
  await ctx.ui.stylesheet('knowledge.css')
  const view = await createKnowledge(ctx)
  ctx.knowledge.register(view)
  ctx.settings.section({ id: 'main', label: 'Knowledge vaults', icon: ctx.ui.ICON('<path d="M3 8l4-5h10l4 5-9 13z"/>'), render: () => view.settingsVaults() })
  ctx.settings.add({ render: () => ctx.ui.setCard('Knowledge vaults', [ctx.ui.setRow('Your vaults', 'Home, pages, graph, Ask, Ingest and Health. Kept in the folders you own.', '<button class="btn" data-go="kn">Open Knowledge</button>')]) })
  await view.load()
  ctx.render()
}
