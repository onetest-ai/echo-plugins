# Meeting Prep for Echo

A briefing for every meeting of your day, inside Echo. A **Prep** activity lists the day's meetings on
the left and shows the selected one on the right:

- **Purpose:** why the meeting exists, what has to come out of it today, and your part in it.
- **Background:** the facts that matter, each with where it came from (notebook, Teams, mail).
- **People:** who's in it, their role, and what they care about or last said.
- **You owe / They owe:** open promises in both directions, with due dates.
- **Likely to come up:** the agenda and what's likely to be raised.
- **Watch out for:** sensitivities, open disagreements, deadlines.
- **In CRM:** the opportunity's stage, value, close date and next step.
- **Links and sources:** the join link, invite, decks and chats, plus what the brief drew on.

## When it runs

- **Every weekday morning** at the prep time (07:30 by default). It also sends the brief to your Teams
  chat with yourself when Echo is signed in to Microsoft 365.
- **By hand:** *Refresh* in Prep, ⌘K → *Prepare my day now*, or Settings → Meeting Prep.
- **One meeting:** *Prep this meeting* on any event in Echo's calendar, for another day or a meeting added
  since the morning. That meeting's brief is added to its day.

Each run is one Claude run and is read-only. It never sends, replies, books or changes anything.

## Where it reads from

- **Calendar:** Echo's Microsoft 365 sign-in (`echoctl calendar events`).
- **Meeting Notebook:** its pages in the data folder, when that plugin is installed.
- **Echo's recorded calls:** minutes and action items.
- **Teams chats, mail and CRM:** your Claude Code's Microsoft 365 and EPAM CRM connectors. These need
  *Use Teams, mail and CRM* switched on, and Claude Code in your Echo folder allowed to use them. An
  unattended run can't ask you for permission, so add this once to `.claude/settings.json` in your Echo
  data folder, inside the outer braces:

  ```json
  "permissions": {
    "allow": ["mcp__claude_ai_Microsoft_365__*", "mcp__claude_ai_EPAM_CRM__*"]
  }
  ```

Settings → From plugins → Meeting Prep shows what each source gave the last prep.

## Where the briefs are

One file per day: `<data folder>/.echo/plugins/meeting-prep/prep/<YYYY-MM-DD>.json`.
