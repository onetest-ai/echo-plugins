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
  Links and tags are read by Obsidian's rules (none in comments, math or code; a heading's count), the same for
  Claude's commands, pages, the graph and the checks.
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
- **The Knowledge activity** (Knowledge in the activity bar, the folder of notes icon; #17's Knowledge 0.1.1 client):
  a vault's Home (what changed, its health, where to start reading), Pages (read, edit, conflicts, history), Graph,
  Ingest, Health and Settings — with "What Claude knows" (the description above and whom the vault is for). *Ask the
  vault* opens Claude Code in Echo's panel, in the vault as its own project: you ask there. A call's page shows where
  its minutes go (its chip, its ⋯ items, the line while they come). The activity's badge counts the changes waiting
  for your review and the findings only you can decide. Settings → From plugins → Knowledge lists the vaults and opens
  them.
- **Health** — the code checks' findings (pages the index doesn't list, broken links, pages without properties, tags
  the taxonomy doesn't allow, index rows to missing pages…), a score of 0–100 by five weighted categories with a point
  a day for 90 days, and fixes shown as a diff before anything is written: a broken link pointed to the closest page,
  a row added to the index, properties added, a tag replaced. A fix is written only over the text it was shown on;
  *Fix all* applies only the certain ones (never a guess), in one commit. *Run AI checks* — only when you click —
  runs Claude Code read-only in the vault on its AI profile: contradictions, possible duplicates, stale statements,
  links worth adding, missing summaries; a finding is kept only when every quote is on its page and its fix's text is
  there once, and is checked again each time Health looks. Ignore any finding; *Show ignored* lists them.
- **Ingest** — *Prepare changes* runs the vault's own ingest skill (Settings → Ingest, else `process-inbox`) on a copy
  of the vault (the other sources left out), over a batch of its sources (20 at most), never while Echo records or
  transcribes a call — Echo says whether it does ("whether Echo is recording or transcribing a call now" on the
  install sheet). *Stop* ends the run's Claude Code at once. Nothing is
  written until you review each change: its diff and the source words it came from (checked; a PDF's can't be);
  approve, reject, edit or take the run's. Index rows and log lines land on the files as they are then; any other file
  only if it hasn't changed since the run. Then one commit, the sources done. Instruction files, hidden files and the
  sources themselves are never written back. A vault whose new calls' or mail's rule is *Add and prepare* starts one
  run by itself once 5 sources are queued or the first has waited 24 hours (Settings → Ingest), never per call.
- **Your calls' minutes into your vaults** — each call goes to the vault set on its thread, else its client's, else
  the default vault (a call in two threads with two vaults goes into both); set it on a thread's or client's Profile
  ("Knowledge vault": inherited, a vault, or none) with that vault's Auto / Ask / Off. Auto saves the note as soon as
  Echo has written the minutes; Ask and Off only when you say (`save_minutes`). The note is Echo's minutes as they are
  — its properties (people, client, threads, summary), the vault's notes folder and naming, a row in its index and a
  line in its `log.md` — never over a note you changed (kept; replaced or a new one beside it only on your word), and
  never into a vault read by another AI profile than the call's unless you say "anyway". Echo commits its notes once
  after two quiet minutes, only its own files. `past_minutes` saves the calls since a day in one commit.
- **Sources for Ingest** — a vault's sources folder (`raw_inbox/`): files you hand over (copied as they are, never over
  a file), a call's minutes, a mail thread from Microsoft 365, a web page. A web page is read once, when you add it —
  its main text as Markdown, its pictures saved beside it — never again by itself: a page on a site you list in the
  plugin's settings (Settings → Plugins → Knowledge → Its settings: Sites Knowledge reads pages from) at once, any other after you type its address in Echo's own box.
  A page that builds itself with JavaScript isn't read yet (nothing is added, and Echo says so). New calls and
  mail of a vault's threads are queued by its rule (`ingest.calls`, `ingest.mail`: off, add, prepare) with nothing
  written into the vault; preparing a batch (`prepare_sources`, and each Ingest run first) writes them, reading a
  mail's own text only then.
- **A new vault from the twin preset** (`new_vault`): the structure of a personal knowledge twin — rules for agents, an
  index with a table per section, tags and terms, a profile to fill, templates, its `.gitignore` and its skills
  (`/twin` to find, answer and remember; `/process-inbox` for Ingest) — in a new or empty folder, in git when you like.
  Each skill is Markdown that runs nothing (Echo checks it); Obsidian's settings for `knowledge/` come too
  (`knowledge/.obsidian/app.json`, `templates.json`: relative Markdown links, the templates folder). The plugin's setting
  "Where the twin preset puts its twin skill": the vault (its own `.claude/skills`), or global — your own Claude Code
  (`~/.claude/skills`), for every session: Knowledge shows you the skill first and adds it only when you click
  Install; Update and Remove are in the vault's Settings → Skills, and Echo never touches a skill it didn't add.
  A vault without `process-inbox` gets the starter's on your word (Ingest → Add the starter's process-inbox).
- **Tags through Echo's dictionary** — a tag your Echo dictionary (Recall → Dictionary) knows by another name (`#akme` for Acme Corp) is
  written as that name in what Echo proposes: an Ingest run's pages (said on the change), an AI check's fix, and
  Health's fix of a tag the taxonomy doesn't allow (the dictionary's tag offered first). The vault's own tag taxonomy
  wins: a tag is only ever turned into one it allows. Knowledge only reads the dictionary; it never adds to it.
- **Calls are known by their stamp** — the day and time a call's folder starts with, which a retitle keeps: a call
  you rename is the same call for its note, its record and the sources queue (Echo 0.10.0 gives every call a stamp of
  its own). In data from before it, two calls may share a second: the second one's minutes aren't saved, and the Inbox
  says "Echo can't tell two calls of this second apart — open it and Save again".
- **From Obsidian vaults 0.8**: your vaults, their descriptions and Claude's entries stay; each vault takes a call's
  minutes only when you ask. Echo's own facts vault of 0.8 (the Knowledge switch, Knowledge → Notes) is gone.
- Removing a vault from Echo takes all of this back; the folder stays as it is.

Needs Echo 0.10.0 or later. `main.js` keeps the vaults, their descriptions, Echo's index of them and Claude's
entries; `client.js` wires the Knowledge activity (`view.js`, `model.js`, `knowledge.css`, through `seam.js` to the
host half's commands) into Echo's slots; `rows.js` the "Knowledge vault" row of a thread's and a client's Profile; `starter/twin/` is the twin preset. Part of the
[Echo plugins](../../README.md) marketplace.
