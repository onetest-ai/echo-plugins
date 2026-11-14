# Obsidian vaults

Connect the Obsidian vaults you already have. Echo reads each one and Claude describes it: what it is, where things
are, how notes are written, what Claude may do with it and what to leave alone. You correct the description, and from
then on Claude in Echo knows where to look.

- **A part for Claude in Echo** — never installed in your Claude Code: how to work with a vault (finding it, asking
  Echo's index, adding notes in its own way), and one entry per vault — its "when Claude looks here" line and where its
  description is, read as notes, not instructions — plus Knowledge when it is on. Echo lists each in what its folder
  session starts with; Claude reads one only when it works with that vault. Routines (and Yolo) get the vaults through
  Echo's core the same way (Echo 0.9.9). Rebuilt whenever a vault is added, removed, read again or its
  description edited.
- **Claude in Echo may read the vaults** (the Claude · Echo folder session, Scheduler routines). Writing into a vault is
  the folder session's, under your own Claude Code permissions, guided by the description.
- **The window points Claude to a client's or thread's vault** when that client or thread is open.
- **Any folder of Markdown notes is a vault** — Obsidian need not know it. An empty folder is asked about before it is
  connected, and gets no
  made-up description — you write it, or Echo reads it again once it has notes.
- **Echo indexes each vault as Obsidian does** — links and where they lead, backlinks, tags, properties, aliases,
  headings, block ids, tasks — whether or not Obsidian is open, kept in the plugin's own folder (never in the vault).
  Claude asks it through the plugin's commands (`echoctl plugin call obsidian search | info | backlinks | links |
  resolve | tags | where | tasks | unresolved | rename_plan`); `rename_plan` gives every line to change so a renamed or
  moved note keeps its links. The install sheet's line "lets Claude in Echo run its commands “search”, “info”, … without
  asking" covers the nine that only read the index — so a Scheduler routine may use them too; `rename_plan` still asks.
- **Knowledge** (a switch in its Settings card, off by default): Echo keeps the lasting facts it learns from your calls
  and mail as an Obsidian vault of its own, in the plugin's folder. Each fact links back to Recall, Echo's index of
  everything said. Its notes are a tab of Echo's **Knowledge** section (Notes, beside Recall's Sources, Dictionary and
  People); Claude in Echo answers from it (the tools take `"vault": "echo"`), and you can open it in Obsidian. A note's
  aliases follow Echo's dictionary: change a name in Knowledge → Dictionary and the notes follow. Each new source (a call's minutes, a mail's facts) is read once
  by a small Claude run; the plugin keeps only observations whose exact words are in the source, links each to its
  moment (`echo://…`), moves what a newer one replaces to History, makes a note only once a second source names a
  thing, and never puts back an observation you deleted. Your own sections in a note stay yours.
  Once on, every call's minutes and every mail Recall reads go into Knowledge by themselves, one at a time, each on
  the AI profile its text may go to (none: it isn't sent). What was said before can be read in once, on your word,
  from Knowledge → Notes — counted and priced first.
- Your vault isn't changed by Echo itself. Removing a vault from Echo takes all of this back.

Needs Echo 0.9.9 or later. Part of the [Echo plugins](../../README.md) marketplace.
