import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toolsOf, parseRoutine, renderRoutine, setEnabled, askedOf, apply } from '../../plugins/scheduler/main.js'
import { fakeCtx } from '../helpers/fake-ctx.mjs'

const routine = (tools) => `---\nname: Acme digest\nschedule: weekdays 08:30\nprofile:\nmodel:\ntools: ${tools}\ndeliver:\nmail_to:\nskip_empty: true\nenabled: false\n---\nWhat changed in the Acme thread?\n`

test('a routine runs Auto or skipping every check; the values of before are Auto', () => {
  assert.equal(toolsOf('auto'), 'auto')
  assert.equal(toolsOf('skip'), 'skip')
  for (const old of ['read', 'folder', '', undefined, null]) assert.equal(toolsOf(old), 'auto')
})

test('an old read routine parses as Auto and is written back as auto', () => {
  const r = parseRoutine('acme-digest', routine('read'))
  assert.equal(r.tools, 'auto')
  assert.match(renderRoutine(r), /\ntools: auto\n/)
  assert.equal(parseRoutine('acme-digest', routine('skip')).tools, 'skip')
})

test('any other permission is refused', () => {
  assert.throws(() => parseRoutine('acme-digest', routine('ask')), /tools “ask”: auto or skip/)
  assert.throws(() => parseRoutine('acme-digest', routine('none')), /auto or skip/)
})

test('switching a routine on or off changes only its enabled line: an old read routine stays read until saved', async () => {
  const old = routine('read')
  const ctx = fakeCtx({ store: { 'routines/acme-digest.md': old } })
  apply(ctx)
  const r = await ctx.run('enable', { id: 'acme-digest', on: true })
  assert.equal(r.enabled, true)
  assert.equal(r.tools, 'auto')
  const now = ctx.store.read('routines/acme-digest.md')
  assert.equal(now, old.replace('enabled: false', 'enabled: true'))
  assert.match(now, /\ntools: read\n/)
  await ctx.run('enable', { id: 'acme-digest', on: false })
  assert.equal(ctx.store.read('routines/acme-digest.md'), old)
})

test('setEnabled adds the line when the frontmatter has none, and refuses a file without one', () => {
  const t = '---\nname: Acme digest\nschedule: daily 09:00\n---\nWhat changed?\n'
  assert.equal(setEnabled(t, false), '---\nname: Acme digest\nschedule: daily 09:00\nenabled: false\n---\nWhat changed?\n')
  assert.throws(() => setEnabled('What changed?', true), /frontmatter/)
})

test('a run shows what it asked, from Echo\'s permissions.json; nothing when there is none', () => {
  assert.equal(askedOf('{"asked":"skip","used":"the folder session\'s: acts on its own (every permission check skipped)"}'), 'skip')
  assert.equal(askedOf('{"asked":"read","used":"…"}'), 'read')
  assert.equal(askedOf(null), '')
  assert.equal(askedOf('not json'), '')
  assert.equal(askedOf('{"used":"x"}'), '')
})

test('two runs of a routine in one second keep a folder each: the second is <stamp>-2, never written over', async () => {
  // A run of this second (and of the next, should the clock tick) is there already.
  const st = (d) => d.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
  const now = new Date()
  const taken = [st(now), st(new Date(now.getTime() + 1000))]
  const store = { 'routines/acme-digest.md': routine('auto') }
  for (const t of taken) store[`runs/acme-digest/${t}/result.json`] = '{"made":"up"}'
  const ctx = fakeCtx({ store, claude: async () => ({ answer: 'Made-up answer.', model: 'sonnet' }) })
  apply(ctx)
  const r = await ctx.run('run_wait', { id: 'acme-digest', deliver: false })
  assert.ok(taken.map((t) => `${t}-2`).includes(r.run), r.run)
  for (const t of taken) assert.equal(ctx.store.read(`runs/acme-digest/${t}/result.json`), '{"made":"up"}')
})
