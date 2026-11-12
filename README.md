# Echo plugins

The built-in marketplace of [Echo](https://github.com/onetest-ai/echo): plugins you install from Echo's
Settings → Plugins (or `echoctl plugin install <id>`).

An Echo plugin is a package that brings **its own code** — the way dsh-desktop's plugins do:

- `main.js` — the **host half**, run inside Echo (also with its window closed): `export function apply(ctx)` with Echo's
  services — `ctx.command`, `ctx.every`, `ctx.store`, `ctx.claude.run` (your AI profiles, Echo's guard), `ctx.deliver.send`,
  `ctx.markdown`, `ctx.inbox`, `ctx.notify`, `ctx.package` (its own files).
- `client.js` — the **client half**, loaded into the Echo window: `export function apply(ctx)` — `ctx.call` (its host
  half), `ctx.settings.section` (its own Settings section), `ctx.panels.add`, `ctx.slots.add` (buttons in Echo's cards:
  `call.menu`, `task.actions`, `calendar.event`), `ctx.palette.add`, `ctx.ui` (Echo's own pieces, so it looks like Echo).
- `echo-plugin.json` — what it is and what it touches (`uses`); Echo writes the install sheet from it, and installing is
  trusting its code.
- Anything else it needs: skills, templates, prompts.

| Plugin | What it does |
|---|---|
| [Scheduler](plugins/scheduler) | Your own Claude prompts on a schedule, answers delivered to you in Telegram, Teams or mail |
| [Telegram](plugins/telegram) | Your Claude · Echo folder session from your phone, through your own bot |
| [Obsidian vault](plugins/obsidian) | Your vault as Echo's second brain; minutes and people written into it |
| [GitHub](plugins/github) | CI, open pull requests and reviews waiting on you, as widgets on Today |

Scheduler needs an Echo with plugins (0.7 or later); Telegram and Obsidian vault need capabilities that arrive after it — until then Echo lists them as "Needs a newer Echo". Your Telegram bot lives in the Telegram plugin (Settings → From plugins → Telegram); other plugins send to it through Echo.

## Make a marketplace of your own

Any git repository with `echo-marketplace.json` at its root — a team's or a company's — can be added in Echo's
Settings → Plugins → Marketplaces (`owner/repo`, a git URL, or a folder):

```json
{
  "name": "acme",
  "featured": ["acme-reports"],
  "plugins": [
    { "id": "acme-reports", "source": "./plugins/acme-reports", "categories": ["automation"] },
    { "id": "elsewhere", "source": { "github": "acme/echo-elsewhere", "ref": "v1.0.0", "path": "plugin" } }
  ]
}
```

Each plugin folder holds `echo-plugin.json`:

```json
{
  "id": "acme-reports",
  "name": "Acme reports",
  "version": "0.1.0",
  "summary": "One line on what it does",
  "uses": { "claude": {}, "deliver": { "to": ["mail"] } },
  "main": "main.js",
  "client": "client.js",
  "settings": [{ "key": "folder", "label": "Reports folder", "type": "folder" }]
}
```

`uses`: `claude`, `schedule`, `deliver` (`teams`, `mail`, or a way a plugin adds), `deliver_provider` (`kinds`: the
ways it adds — Telegram adds `telegram`), `network` (`hosts` it may reach over HTTPS), `channel` (a Claude Code channel
plugin of claude-plugins-official), `brain_source` (`vault`), `export` (`vault`: minutes, people), `sessions`.
Setting types: `string`, `bool`, `folder`, `secret`. Folders may not contain links; a plugin is at most 400 files / 20 MB.
[Scheduler](plugins/scheduler) is a complete example of both halves. The design: `docs/plugins-design.md` in Echo.
