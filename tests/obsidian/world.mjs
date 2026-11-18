// The Knowledge plugin's step-4 tests' world: the plugin over made-up Echo data (echo-data.mjs) in Echo's shapes, vaults
// made from the twin preset in temp folders, git isolated from the user's settings.
import * as nfs from 'node:fs'
import * as npath from 'node:path'
import * as os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { apply } from '../../plugins/obsidian/main.js'
import { fakeCtx } from '../helpers/fake-ctx.mjs'
import { echoData, MINUTES } from './echo-data.mjs'

export const PKG = fileURLToPath(new URL('../../plugins/obsidian', import.meta.url))
const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
export const hasGit = (() => { try { execFileSync('git', ['--version'], { stdio: 'ignore' }); return true } catch { return false } })()
export const gitOut = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=Sam Rivera', '-c', 'user.email=sam@acme.example', '-c', 'commit.gpgsign=false', ...args], { cwd, env: GIT_ENV, stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8')
export const tmp = () => nfs.realpathSync(nfs.mkdtempSync(npath.join(os.tmpdir(), 'kn-min-')))
export const write = (root, rel, text) => { const p = npath.join(root, rel); nfs.mkdirSync(npath.dirname(p), { recursive: true }); nfs.writeFileSync(p, text) }
export const read = (root, rel) => nfs.readFileSync(npath.join(root, rel), 'utf8')
export const exists = (root, rel) => nfs.existsSync(npath.join(root, rel))

export const PROFILES = { default: 'system', profiles: [{ id: 'system', name: 'Claude Code (as configured)' }, { id: 'client-x', name: 'Client X' }] }

/** The plugin over made-up Echo data; `vault(name, {git, minutes, commit})` makes one from the twin preset in a folder
 *  of its own (as the picker would give it). */
export function world({ calls = [], threads = [], clients = [], people = [], mail = [], threadValues = {}, clientValues = {}, git = false, terminal = true, m365, web, settings = {}, me, claude } = {}) {
  const base = tmp()
  const data = echoData({ calls, threads, clients, people, mail, me })
  const folders = []
  let next = null
  const ctx = fakeCtx({ id: 'obsidian', terminal, folders, disk: true, git, markdown: true, echo: data.read, threads: threadValues, clientValues, profiles: PROFILES, inbox: true, agent: true, sessions: true, hints: true, events: ['minutes_written', 'sources_changed'], pkg: PKG, pickFolder: () => next, m365, web, settings, claude })
  apply(ctx)
  const vault = async (name, { minutes = 'auto', git: g = false, commit } = {}) => {
    next = npath.join(base, name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    nfs.mkdirSync(next, { recursive: true })
    const r = await ctx.run('new_vault', { name, git: g, minutes })
    if (commit !== undefined) await ctx.run('set', { id: r.id, key: 'commit', value: String(commit) })
    return { ...r, root: nfs.realpathSync(next) }
  }
  return { ctx, data, base, vault, folders }
}
export const call = (folder, title, { profile = 'system', notes = MINUTES, threads = [], ...rest } = {}) => ({ folder, title, profile, notes, threads, ...rest })

