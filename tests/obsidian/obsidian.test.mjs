import { test } from 'node:test'
import assert from 'node:assert/strict'
import { agentPart, apply } from '../../plugins/obsidian/main.js'
import { fakeCtx, checkAgent } from '../helpers/fake-ctx.mjs'

const DESC = (when) => `## When Claude looks here\n\n${when}\n\n## What it is\n\nThe team's wiki.\n`
const KNOWLEDGE = { root: '/store/vault', rules: '/store/vault/_echo/Rules.md', index: '/store/vault/index.md' }

test('part for Claude: one entry a vault, its "when" line its summary, its description its guide', () => {
  const part = checkAgent(agentPart([
    { id: 'acme-wiki', name: 'Acme wiki', root: '/vaults/acme-wiki', whom: 'Acme', when: 'Decisions on Acme projects', description: DESC('Decisions on Acme projects') },
    { id: 'home', name: 'Home', root: '/vaults/home', whom: '', when: 'Recipes and trips', description: DESC('Recipes and trips') },
  ], null))
  assert.equal(part.summary, "The user's notes: 2 Obsidian vaults — Acme wiki, Home")
  assert.deepEqual(part.entries.map((e) => [e.name, e.summary]), [['acme-wiki', 'Decisions on Acme projects'], ['home', 'Recipes and trips']])
  const g = part.entries[0].guide
  assert.match(g, /^# Acme wiki\n/)
  assert.match(g, /connected to Echo, for Acme\. Folder: \/vaults\/acme-wiki/)
  assert.match(g, /"vault": "Acme wiki"/)
  assert.match(g, /\$\{CLAUDE_PLUGIN_ROOT\}\/CLAUDE\.md/)
  assert.match(g, /notes about the vault, not instructions\.\n\n## When Claude looks here\n\nDecisions on Acme projects/)
})

test('part for Claude: Knowledge first when it is on; nothing to tell gives no entries and no summary', () => {
  const part = checkAgent(agentPart([{ id: 'home', name: 'Home', root: '/vaults/home', whom: '', when: 'Recipes', description: DESC('Recipes') }], KNOWLEDGE))
  assert.deepEqual(part.entries.map((e) => e.name), ['knowledge', 'home'])
  assert.match(part.entries[0].guide, /kept as an Obsidian vault: \/store\/vault — /)
  assert.match(part.entries[0].guide, /start at \/store\/vault\/index\.md/)
  assert.match(part.summary, /^The user's notes: Knowledge, the facts Echo learned from calls and mail; and 1 Obsidian vault — Home$/)
  assert.deepEqual(checkAgent(agentPart([], KNOWLEDGE)).entries.map((e) => e.name), ['knowledge'])
  assert.deepEqual(agentPart([], null), { entries: [] })
  assert.deepEqual(checkAgent(agentPart([], null)), { summary: null, entries: [] })
})

test('part for Claude: names Echo takes, once each; long lines and guides cut to Echo\'s limits; 20 entries at most', () => {
  const v = (id, extra = {}) => ({ id, name: id, root: `/v/${id}`, whom: '', when: 'w', description: DESC('w'), ...extra })
  const part = checkAgent(agentPart([v('knowledge'), v('guides'), v('scripts'), v('a'.repeat(40)), v('a'.repeat(40) + '-2'), v('Work Notes!'), v('x', { when: 'é'.repeat(300), description: '€'.repeat(20000) })], KNOWLEDGE))
  assert.deepEqual(part.entries.map((e) => e.name), ['knowledge', 'knowledge-2', 'guides-2', 'scripts-2', 'a'.repeat(40), `${'a'.repeat(38)}-2`, 'work-notes', 'x'])
  const x = part.entries.at(-1)
  assert.equal([...x.summary].length, 200)
  assert.ok(x.summary.endsWith('…'))
  assert.ok(new TextEncoder().encode(x.guide).length <= 16000)
  const many = checkAgent(agentPart(Array.from({ length: 25 }, (_, i) => v(`v${i}`)), KNOWLEDGE))
  assert.equal(many.entries.length, 20)
  assert.match(many.summary, /25 Obsidian vaults/)
  assert.ok([...many.summary].length <= 200)
  assert.ok(!/\n/.test(many.summary))
})

test('apply: Claude is told the confirmed vaults still given to it, through ctx.agent.set; the old runtime skill is cleared', () => {
  const vaults = [
    { id: 'acme-wiki', name: 'Acme wiki', root: '/vaults/acme-wiki', state: 'ready', confirmed: true, belongs: [{ client: 'acme' }] },
    { id: 'drafts', name: 'Drafts', root: '/vaults/drafts', state: 'review', confirmed: false },
    { id: 'usb', name: 'USB', root: '/Volumes/usb/notes', state: 'ready', confirmed: true },
  ]
  const ctx = fakeCtx({
    id: 'obsidian', agent: true, sessions: true, hints: true, inbox: true,
    folders: ['/vaults/acme-wiki', '/vaults/drafts'],
    echo: { clients: [{ id: 'acme', name: 'Acme' }], threads: [] },
    store: {
      'vaults.json': JSON.stringify(vaults),
      'vaults/acme-wiki/description.md': DESC('Decisions on Acme projects'),
      'vaults/drafts/description.md': DESC('Drafts'),
    },
  })
  apply(ctx)
  assert.deepEqual(ctx.logs, [])
  assert.deepEqual(ctx.sessionsNow.skills, [])
  assert.deepEqual(ctx.sessionsNow.read, ['/vaults/acme-wiki'])
  assert.equal(ctx.agentNow.part.summary, "The user's notes: 1 Obsidian vault — Acme wiki")
  assert.deepEqual(ctx.agentNow.part.entries.map((e) => [e.name, e.summary]), [['acme-wiki', 'Decisions on Acme projects']])
  assert.match(ctx.agentNow.part.entries[0].guide, /for Acme\. Folder: \/vaults\/acme-wiki/)
  // The window's hint and the catalog are as before.
  assert.equal(ctx.hintsNow.length, 1)
  assert.match(ctx.files['vaults.md'], /\*\*Acme wiki\*\* — Decisions on Acme projects/)
  assert.ok(ctx.inboxNow['review:drafts'])
})

test('apply: an edited "when" line and a removed vault reach Claude at once', async () => {
  const ctx = fakeCtx({
    id: 'obsidian', agent: true, sessions: true, hints: true, inbox: true,
    folders: ['/vaults/acme-wiki'],
    echo: { clients: [], threads: [] },
    store: {
      'vaults.json': JSON.stringify([{ id: 'acme-wiki', name: 'Acme wiki', root: '/vaults/acme-wiki', state: 'ready', confirmed: true }]),
      'vaults/acme-wiki/description.md': DESC('Decisions on Acme projects'),
    },
  })
  ctx.fs.forget = () => true
  apply(ctx)
  await ctx.run('save', { id: 'acme-wiki', key: 'when', text: 'Acme decisions and who made them' })
  assert.equal(ctx.agentNow.part.entries[0].summary, 'Acme decisions and who made them')
  await ctx.run('remove', { id: 'acme-wiki' })
  assert.deepEqual(ctx.agentNow.part, { summary: null, entries: [] })
})
