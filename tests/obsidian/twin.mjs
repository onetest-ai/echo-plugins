// A made-up vault shaped like the owner's twin (#677's `fixture::twin`) and the plugin over it, for step 5's tests:
// Health's fixes, the AI checks, Ingest runs. Temp folders only; git isolated from the user's settings.
import * as nfs from 'node:fs'
import * as npath from 'node:path'
import * as os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { apply, activityRecent } from '../../plugins/obsidian/main.js'
import { fakeCtx } from '../helpers/fake-ctx.mjs'

const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
export const PKG = fileURLToPath(new URL('../../plugins/obsidian', import.meta.url))
export const hasGit = (() => { try { execFileSync('git', ['--version'], { stdio: 'ignore' }); return true } catch { return false } })()
export const sh = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=Sam Rivera', '-c', 'user.email=sam@acme.example', '-c', 'commit.gpgsign=false', ...args], { cwd, env: GIT_ENV, stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8')
export const tmp = () => nfs.realpathSync(nfs.mkdtempSync(npath.join(os.tmpdir(), 'kn-s5-')))
export const write = (root, rel, text) => { const p = npath.join(root, rel); nfs.mkdirSync(npath.dirname(p), { recursive: true }); nfs.writeFileSync(p, text) }
export const read = (root, rel) => nfs.readFileSync(npath.join(root, rel), 'utf8')
export const exists = (root, rel) => nfs.existsSync(npath.join(root, rel))
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** The twin: pages in knowledge/ (an index CATALOG.md with Clients, Notes and Topics tables, a tag taxonomy), notes
 *  a, b listed and c not, a sources folder with a PDF. */
export function twin(root = tmp()) {
  write(root, 'knowledge/.obsidian/app.json', '{"useMarkdownLinks": true, "newLinkFormat": "relative"}')
  write(root, 'knowledge/CATALOG.md', '# Knowledge Catalog\n\n> Last update: 2026-01-01\n\n## Clients\n\n| File | Description | Date Added |\n|------|-------------|------------|\n| [acme.md](clients/acme.md) | Acme Corp | 2026-01-02 |\n\n## Notes\n\n| File | Description | Date Added |\n|------|-------------|------------|\n| [2026-01-01-a.md](notes/2026-01-01-a.md) | first | 2026-01-01 |\n| [2026-01-02-b.md](notes/2026-01-02-b.md) | second | 2026-01-02 |\n\n## Topics\n\n| File | Description |\n|------|-------------|\n')
  write(root, 'knowledge/TAG_TAXONOMY.md', '# Tags\n\n```\nmeeting, client, concept\n```\n')
  write(root, 'knowledge/clients/acme.md', '---\ntitle: Acme Corp\ntags: [client]\n---\n# Acme Corp\n\nSee [[2026-01-01-a]].\n')
  write(root, 'knowledge/notes/2026-01-01-a.md', '---\ntitle: First sync\ndate: 2026-01-01\ntags: [meeting]\n---\n# First sync\n\nWith [Acme](../clients/acme.md).\n')
  write(root, 'knowledge/notes/2026-01-02-b.md', '---\ntitle: Second sync\ntags: [meeting]\n---\n# Second sync\n')
  write(root, 'knowledge/notes/2026-01-03-c.md', '---\ntitle: Third sync\ntags: [meeting]\n---\n# Third\n')
  write(root, 'knowledge/notes/README.md', '# Notes\n')
  write(root, 'raw_inbox/deck.pdf', '%PDF-1.4 made up')
  write(root, 'AGENTS.md', '# Rules\n')
  return root
}
export const repo = (root) => { sh(root, 'init', '-q', '--initial-branch=main'); sh(root, 'add', '-A'); sh(root, 'commit', '-q', '-m', 'Start') }

/** The plugin over one vault at `root` (its record as Knowledge keeps it), detected as `add` does. `claude`: the fake
 *  Claude Code (fake-ctx.mjs); `rec`: more of the record. */
export async function vault(root, { commit = false, git = false, id = 'twin', claude, rec: more = {}, terminal = true, events, echo } = {}) {
  const rec = { schema: 1, id, name: 'Twin', root, state: 'ready', confirmed: true, added_at: '2026-11-01T09:00:00.000Z', commit, structure: 'confirmed', ...more }
  const ctx = fakeCtx({
    id: 'obsidian', terminal, folders: [root], disk: true, git, markdown: true, pkg: PKG, claude, inbox: true,
    events: events || ['minutes_written', 'sources_changed', 'recording_started', 'recording_stopped', 'transcribed'],
    store: { 'vaults.json': JSON.stringify([rec]) },
    echo: echo || { clients: [{ id: 'acme', name: 'Acme' }], threads: [], calls: [], sources: [] },
    profiles: { default: 'p1', profiles: [{ id: 'p1', name: 'Claude' }, { id: 'p2', name: 'Other' }] },
  })
  apply(ctx)
  await ctx.run('reread', { id })
  return ctx
}
export const acts = (ctx, id = 'twin') => activityRecent(ctx.files[`vaults/${id}/activity.jsonl`] || '').reverse()
/** A fix's diff lines: those added, those removed. */
export const added = (fx) => (fx.hunks || []).flat().filter(([k]) => k === '+').map(([, l]) => l)
export const removed = (fx) => (fx.hunks || []).flat().filter(([k]) => k === '-').map(([, l]) => l)
