---
name: Meeting prep
order: 3
description: Early each workday: for today's meetings with outside people — last time, open items, what to ask.
schedule: weekdays 07:45
tools: auto
deliver: mail
skip_empty: true
---
Prepare me for today's meetings with people outside my company.

1. `echoctl calendar events` — today's meetings (UTC there: use my local time).
2. For each meeting with outside attendees: `echoctl prep '<subject>'` for last time's open actions and highlights, and `echoctl project tasks` for what is owed between us.

For each such meeting, in time order:
### <time> — <meeting>
- Last time: 2–3 points.
- Open between us: what I owe them, what they owe me.
- Ask: 1–3 questions worth asking.

No preamble; skip internal meetings. No meeting with outside people today → answer NOTHING.
