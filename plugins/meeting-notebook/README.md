# Meeting Notebook for Echo

Your calls as a notebook, inside Echo. A **Notebook** activity in Echo's window:

- **Today:** today's calls and their filing state, pages Claude filed that you haven't opened, and what's
  due or overdue.
- **Three panes:** folders (Client, Partner, 1:1, Internal, Industry & Analyst, Other; rename, reorder,
  add), subfolders (a client, person or meeting series) with dated pages, and the open page. The page has
  title, type, client or person, date, attendees, a rich-text summary, decisions, action items and your
  own notes.
- **Views:** open action items (All, Claude can do, Manual), the last 14 days, and an overview of each
  subfolder (highlights from the last call, its open action items, a search).

## How pages are created

- **Automatically.** When Echo has written a call's minutes, one Claude run reads the minutes, the
  transcript, the invite (`meeting.json`), Echo's action items (`actions.json`) and your notes
  (`my-notes.md`). It files the call as a page: type and subfolder (reusing yours), a summary with
  Highlights and Risks & issues, decisions, and action items. Each action is tagged **Claude can do
  this**, with a prompt ready to use, or **Manual**, with how it gets done. Highlights, decisions and
  actions keep the moment they came from (`[mm:ss]`). Click one to see that part of the transcript. Turn
  this off in Settings → Plugins → Meeting Notebook → *File calls automatically*.
- **By hand.** *File an Echo call* in the notebook, *File in Notebook* in a call's menu, or ⌘K.
- **Your own pages.** *+ New page*.

## Filing again: review what changed

When Echo writes a call's minutes again, Claude files it again. The page then shows what changed:

- **Fields you haven't edited:** updated, with *Undo*.
- **Fields you edited:** Claude's version is offered with *Accept* or *Keep mine*.

Your notes are never replaced. A page you delete stays deleted until you file its call again.

## Action items are Echo's action items

A call page's action items are the call's own action items in Echo (`actions.json`), matched by id:

- Tick one here and it's ticked in Echo's call view, and the other way round.
- An item Echo has that the page doesn't gets added.
- An action you add on the page stays in the notebook only. Echo has no way for a plugin to add to a
  call's list, and the page marks such items *Notebook only*.

## Run an action with Claude

*Run with Claude* on a Claude action opens a side panel:

1. **Prompt:** edit what Claude should do, and choose whether it may use the subfolder's earlier pages.
2. **Draft:** Claude writes the deliverable (an email, message or plan) from this call's minutes,
   transcript and your notes. It runs with no tools.
3. **Your call:** *Copy*, *Save to page* (into My notes), *Send to me* (Teams chat with yourself or
   mail to your own address, when Echo is signed in to Microsoft 365), *Ask for changes*, or
   *Mark done*.

Nothing is sent to anyone else.

## Where the pages are

Each page is one file, `<data folder>/.echo/plugins/meeting-notebook/notes/<id>.json`, with the same
fields and ids as the Claude artifact the notebook started as. A scheduled job can copy pages in or out.

## Look

The notebook follows Echo's light and dark appearance. It uses Museo Sans when it is installed on your
computer, and the system font otherwise.

## Install or update

From a copy of this repository:

```sh
echoctl plugin marketplace add "<path to the folder with echo-marketplace.json>"
echoctl plugin install meeting-notebook --yes
```

After a change, raise `version` in `echo-plugin.json`, then run `echoctl plugin marketplace update <name>`
and `echoctl plugin update meeting-notebook`.
