# Retell

Listen to articles instead of reading them, and keep your spoken English alive on what you heard. Give Retell a link,
a PDF, a Word or PowerPoint file, or pasted text: Echo reads it, Claude retells it for the ear in your language, and a
speech server voices it. Then practise on it — a quiz, answers you say aloud, a live talk with a coach — and keep the
phrases worth repeating.

- **Listen**: the retelling plays with its words lit as they are spoken, the original beside it, pictures lit as
  they are explained; a memo (a numbered cheat sheet), the original's terms, a fact check, and your questions answered
  — from the article, and beyond it on pages Echo opens to check.
- **Library**: Add (links, files, text) puts articles in a queue; a long article is cut into parts in one topic.
  Reading lists: Claude names pages on a topic, Echo opens each one, Claude picks the list from those that opened.
- **Practice**: quizzes from what you listened to, answered in writing or aloud (pace, fillers, pauses); **Start a
  talk** — a spoken conversation with a coach right in the window, then a review of your English; **My phrases**,
  with cards and spaced review.
- **Settings → From plugins → Retell**: any speech server that speaks the OpenAI API (OpenAI itself, or one in
  your network), its model, the voice and how it speaks. The plugin's settings: the retelling language, the language
  of explanations, the fact check, how many articles to keep.
- Echo reads the pages and files; Claude never browses here. An article is written and checked on files in a folder of
  Retell's own store, with Claude Code's file tools only (nothing outside that folder, no commands, no web), a run per
  task: the retelling (the narrator looks at the pictures) and the memo; a fact check that grounds every statement in
  the article's own words and names what the retelling misses; a fix that corrects and completes it; checked again;
  the terms. Every other run has no tools at all.
- Other plugins and Claude in Echo can read your library, articles, questions, quizzes and phrases, queue a link or a
  text, and save a phrase (Echo's offered commands).

Needs Echo 0.10.6 or later, Claude Code on an AI profile, and a speech server (an OpenAI API key, or a server in your
network). Headphones help in a live talk. `main.js` is its host half (reading, retelling, the queue, voice, quizzes,
talks), `client.js` its client half (the Retell activity and the Retell section).

Part of the [Echo plugins](../../README.md) marketplace.
