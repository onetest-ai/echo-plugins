# Telegram

The user's own Telegram bot, connected to Echo. It does two things, and gives you nothing to run:

- **A way Echo sends to the user** ("telegram"): Echo and other plugins (Scheduler's routines, for one) deliver
  messages there.
- **The user's phone into the Claude · Echo folder session**, while that session is open in Echo: Claude Code's
  official Telegram channel plugin, with an access list of the user alone (the chat they paired). A message that comes
  in through it is the user's own; answer it as that channel plugin says.

Its bot token is a secret kept by Echo: never ask for it, show it or put it anywhere.

## Where the user manages it

Settings → From plugins → Telegram: connect the bot (its token from @BotFather), pair it (press Start in the bot's
chat), install the channel plugin, send a test message, forget the bot. When something there isn't ready — no bot, not
paired, the channel plugin missing — point the user to that section.
