// Echo's rules for the hidden files a plugin may write in a folder it was given (onetest-ai/echo#776, Rules #768),
// ported from Echo's code so the fake ctx refuses what Echo refuses and a test can check the plugin's own skills:
// `grants::hidden_ok` and `plugins::claude_skills::skill_md_ok` (crates/echoctl/src). Echo's code wins where they differ.

/** `plugins::claude_skills::SKILL_KEYS`: the frontmatter keys a plugin's skill may set. */
export const SKILL_KEYS = ['name', 'description', 'when_to_use', 'argument-hint', 'disable-model-invocation', 'user-invocable']

/** `grants::skill_name`: 1–64 of a-z, 0-9 and -. */
export const skillName = (s) => /^[a-z0-9-]{1,64}$/.test(s)

/** `skill_md_ok`: null when Echo writes `md` as a skill's Markdown, else why not (Echo's words). */
export function skillMdProblem(md) {
  if (md.includes('!`')) return 'a skill can\'t run commands: “!`” in it runs one when the skill loads'
  if (md.includes('!$')) return 'a skill can\'t run commands: “!$” turns an argument into one'
  if (md.split('\r\n').join('').includes('\r')) return 'a skill\'s lines end with a line feed, never a carriage return alone'
  // A run of three or more backticks or tildes followed (past spaces and tabs) by `!`.
  for (let i = 0; i < md.length;) {
    const c = md[i]
    let run = 0
    while (md[i + run] === c) run++
    if ((c === '`' || c === '~') && run >= 3) {
      let j = i + run
      while (md[j] === ' ' || md[j] === '\t') j++
      if (md[j] === '!') return 'a skill can\'t run commands: a code block opened with “!” runs one when the skill loads'
    }
    i += Math.max(run, 1)
  }
  const rest = md.replace(/^[﻿\s]+/u, '')
  if (!rest.startsWith('---')) return null
  // Rust's `str::lines`: split at \n, a trailing \r of each line dropped.
  const lines = rest.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l))
  if (rest.endsWith('\n')) lines.pop()
  if ((lines.shift() || '').trimEnd() !== '---') return 'a skill\'s frontmatter starts with a line “---” alone'
  let block = null
  for (const line of lines) {
    const l = line.trimEnd()
    if (l === '---') return null
    if (l.trimStart() === '' || l.startsWith('#')) continue
    if (l.startsWith(' ') || l.startsWith('\t')) {
      const indent = l.length - l.replace(/^ +/, '').length
      const at = block === null ? null : block === 0 ? indent : block
      if (!(at !== null && at > 0 && indent >= at)) return `a skill's frontmatter holds only ${SKILL_KEYS.join(', ')}, each a plain value: “${l.trim()}” isn't`
      block = at
      continue
    }
    const i = l.indexOf(':')
    const [key, value] = i < 0 ? [l, ''] : [l.slice(0, i), l.slice(i + 1)]
    if (!SKILL_KEYS.includes(key)) {
      const runs = ['hooks', 'allowed-tools', 'shell'].includes(key.trim().toLowerCase())
      return `a skill can't ${runs ? 'run commands' : 'choose how it runs'}: “${key.trim()}” in its frontmatter (it holds only ${SKILL_KEYS.join(', ')})`
    }
    const v = value.trim()
    if (/^[{[!&*<\-?%@]/.test(v)) return `a skill's frontmatter holds only plain values: “${key}” has “${v}”`
    block = /^[|>]/.test(v) ? 0 : null
    if (block !== null && !(v.length <= 3 && [...v.slice(1)].every((c) => /[-+1-9]/.test(c)))) return `a skill's frontmatter holds only plain values: “${key}” has “${v}”`
  }
  return 'a skill\'s frontmatter has no closing “---”'
}

/** `grants::hidden_ok`: may a plugin write `rel` (a file, or with `folder` a folder) in a folder it was given? */
export function hiddenOk(rel, folder = false) {
  const p = String(rel).split('/').filter((c) => c !== '' && c !== '.')
  if (!p.some((c) => c.startsWith('.'))) return true
  const named = (n, ext) => n.length > ext.length && n.endsWith(ext) && !n.startsWith('.') && !n.includes(':')
  if (!folder) {
    if (p[p.length - 1] === '.gitignore') return !p.slice(0, -1).some((c) => c.startsWith('.'))
    if (p.length === 2 && p[0] === '.obsidian') return named(p[1], '.json') && !['community-plugins.json', 'core-plugins.json'].includes(p[1].toLowerCase())
    if (p.length === 4 && p[0] === '.claude' && p[1] === 'skills') return skillName(p[2]) && named(p[3], '.md')
    return false
  }
  if ((p.length === 1 && (p[0] === '.obsidian' || p[0] === '.claude')) || (p.length === 2 && p[0] === '.claude' && p[1] === 'skills')) return true
  return p.length === 3 && p[0] === '.claude' && p[1] === 'skills' && skillName(p[2])
}

/** `grants::in_skills`: under the folder's own `.claude/skills` (any case). */
export const inSkills = (rel) => { const p = String(rel).split('/').filter((c) => c !== '' && c !== '.').map((c) => c.toLowerCase()); return p[0] === '.claude' && p[1] === 'skills' }
