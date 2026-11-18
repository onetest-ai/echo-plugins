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
