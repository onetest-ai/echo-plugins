// The 21 notes of PR #24's parity probe: how Obsidian vaults 0.8 read them (links, tags, aliases, properties,
// headings), which Knowledge 1.0 must give the same (tests/obsidian/parity.test.mjs). `answer(module, text)` asks a
// plugin's `info` and `links` for the note `n.md` in a made-up vault of it and a few others.
export const NOTES = {
  comment: 'a [[A]] %% [[B]] #c1 %% <!-- [[C]] #c2 --> $$ [[D]] #m $$ end\n',
  multiComment: '%%\n[[B]] #t1\n%%\nx\n',
  tagKey: '---\ntag: solo\n---\nbody\n',
  tagsKeyStr: '---\ntags: one, two #three\n---\nbody\n',
  tagsHash: '---\ntags: ["#x", y/]\n---\n',
  numTag: '#123 #a1 #2026/q1 #/x x#y (#p) [#q] "#r" #s.t #ü\n',
  headingTag: '# Title #notag\n## Sub [[H]]\n',
  inlineCode: 'see `[[E]] #e` and ``[[F]]``\n',
  fence: '```\n[[G]] #g\n```\n~~~js\n[[G2]]\n~~~\n',
  indentCode: '    [[I]] #i\n\ntext\n',
  mdLinks: '[x](a b.md) [y](<c d.md>) [z](e%20f.md "t") [w](#h) [u](http://x) ![i](p.png) [n]([x].md)\n',
  wikiForms: '[[A#h|al]] [[A\\|b]] ![[img.png]] [[#local]] [[ ]] [[a]]]\n',
  propLinks: '---\ncompany: "[[Acme]]"\nlist:\n  - "[[Beta]]"\nmd: "[t](x.md)"\n---\nbody\n',
  aliases: '---\naliases: [One, Two]\nalias: z\n---\n',
  aliasStr: '---\naliases: a, b\n---\n',
  title: '---\ntitle: "Q: x"\n---\n# H1\n',
  noTitle: '# Heading title\ntext\n',
  crlf: '---\r\ntags: [w]\r\n---\r\n[[A]] #t\r\n',
  bom: '﻿---\ntags: [b]\n---\n[[A]]\n',
  mathInline: 'x $[[M]]$ #inmath y\n',
  html: '<a href="x.md">[[Y]]</a> <span>#t</span>\n',
}

export async function answer(mod, text) {
  const files = { 'n.md': text, 'A.md': '', 'B.md': '', 'C.md': '', 'D.md': '' }
  const store = new Map([['vaults.json', JSON.stringify([{ schema: 1, id: 'v', name: 'V', root: '/v', state: 'ready', confirmed: true, added_at: '2026-01-01T00:00:00Z', overrides: {} }])]])
  const cmds = {}
  const none = () => {}
  const ctx = {
    id: 'obsidian', terminal: true, log: none, command: (n, f) => { cmds[n] = f },
    store: { read: (p) => store.get(p) ?? null, write: (p, t) => { store.set(p, t) }, update: (p, f) => { const r = f(store.get(p) ?? null); if (r != null) store.set(p, r) }, path: (p = '') => `/d/.echo/plugins/obsidian/${p}`, remove: (p) => { store.delete(p) }, list: () => [] },
    fs: { folders: () => ['/v'], walk: async () => Object.keys(files).map((p) => ({ path: p, size: files[p].length, mtime: 1 })), readMany: async (r, ps) => ps.map((p) => files[p] ?? null), read: (r, p) => files[p] ?? null, list: () => [], stat: () => null },
    crypto: { sha256: (t) => String(t.length).padStart(64, '0') }, echo: { read: () => [] },
    sessions: { skills: none, read: none }, agent: { set: none }, view: { hints: none }, inbox: { set: none, clear: none },
  }
  mod.apply(ctx)
  const i = await cmds.info({ vault: 'v', note: 'n.md' })
  return {
    title: i.title, tags: i.tags, aliases: i.aliases, props: i.props,
    links: (await cmds.links({ vault: 'v', note: 'n.md' })).map((l) => [l.target, l.line, l.subpath, l.text, l.embed ? 'E' : '', l.markdown ? 'M' : '', l.property ? 'P' : ''].filter((x) => x !== undefined && x !== '').join('|')),
    headings: i.headings.map((h) => `${h.level}:${h.text}`),
  }
}
