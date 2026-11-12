# AGENTS.md

Primary AI entrypoint for **Echo plugins**, the onetest marketplace of plugins for
[Echo](https://github.com/onetest-ai/echo). Load the relevant `.ai-run/guides/` file before changing a plugin.

Each plugin is a folder in `plugins/` with `echo-plugin.json`, a host half (`main.js`) and usually a client half
(`client.js`), listed in `echo-marketplace.json`. The plugin API is Echo's: its guide is
`onetest-ai/echo` → `.ai-run/guides/plugins/plugin-authoring.md`, and Echo's code wins where they differ.

| Area | Guide | What it covers |
|---|---|---|
| Development | .ai-run/guides/plugins/plugin-development.md | layout, manifest, the same look and words in every plugin, outside services, versions and commits |
| Testing | .ai-run/guides/testing/plugin-testing.md | gates, unit tests outside Echo, checking in a running Echo, acceptance |
