# Knowledge

Connect the folders of notes you already keep: an Obsidian vault, a git repository of notes, any folder of Markdown.
Echo reads each one and Claude describes it: what it is, where things are, how notes are written, what Claude may do
with it and what to leave alone. You correct the description, and from then on Claude in Echo knows where to look.

- **A part for Claude in Echo** — never installed in your Claude Code: how to work with a vault (finding it, asking
  Echo's index, adding notes in its own way), and one entry per vault — its "when Claude looks here" line and where its
  description is, read as notes, not instructions. Echo lists each in what its folder session starts with; Claude
  reads one only when it works with that vault. Rebuilt whenever a vault is added, removed, read again or its
  description edited.
- **Claude in Echo may read the vaults** (the Claude · Echo folder session, Scheduler routines). Writing into a vault is
  the folder session's, under your own Claude Code permissions, guided by the description.
- **The window points Claude to a client's or thread's vault** when that client or thread is open.
- **Any folder of Markdown notes is a vault** — Obsidian need not know it. An empty folder is asked about before it is
  connected, and gets no made-up description — you write it, or Echo reads it again once it has notes.
- **Echo indexes each vault as Obsidian does** — links and where they lead, backlinks, tags, properties, aliases,
  headings, block ids, tasks — whether or not Obsidian is open, kept in the plugin's own folder (never in the vault).
  Claude asks it through the plugin's commands (`echoctl plugin call obsidian search | info | backlinks | links |
  resolve | tags | where | tasks | unresolved | rename_plan`), all of which only read; `rename_plan` gives every line
  to change so a renamed or moved note keeps its links.
- **Echo finds each vault's shape** when it is connected (or read again: `reread`) — where its pages are (a
  `knowledge/` folder, the folder with Obsidian's settings), its index (`CATALOG.md`…), its notes folder and naming, its
  templates, sources, taxonomies and skills — and indexes its pages folder. Nothing is written in the vault for it.
  A vault from Obsidian vaults 0.8 keeps being indexed as before (its whole folder) until you confirm that shape
  (`confirm_structure`) or set one of its folders.
- **Pages, for Knowledge** (`echoctl plugin call obsidian page | tree | find | graph | checks | history | version |
  activity …`): a page as safe HTML with its links, backlinks and local graph; an edit saved only over the text it was
  opened with (a change made meanwhile comes back to compare, never overwritten; line endings kept); a new page from
  the vault's template with a row in its index; a page's git history and a version restored (never over changes not
  committed yet); a commit of just that file when the vault's `commit` is on; and a line in the vault's activity log
  for every change Echo makes.
- **Each vault's settings** (`echoctl plugin call obsidian set '{"id", "key", "value"}'`): the AI profile that reads it,
  whether it takes your calls' minutes (`minutes`: auto, ask or off), whether Echo commits what it writes, its folders
  if Echo found them wrong. `default` names the vault a call's minutes go to when its thread or client has none.
- **From Obsidian vaults 0.8**: your vaults, their descriptions and Claude's entries stay; each vault takes a call's
  minutes only when you ask. Echo's own facts vault of 0.8 (the Knowledge switch, Knowledge → Notes) is gone.
- Removing a vault from Echo takes all of this back; the folder stays as it is.

Needs Echo 0.9.15 or later. `main.js` keeps the vaults, their descriptions, Echo's index of them and Claude's
entries; `client.js` draws Settings → From plugins → Knowledge and the Knowledge activity. Part of the
[Echo plugins](../../README.md) marketplace.
