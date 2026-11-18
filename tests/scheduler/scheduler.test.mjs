import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toolsOf, parseRoutine, renderRoutine } from '../../plugins/scheduler/main.js'

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
