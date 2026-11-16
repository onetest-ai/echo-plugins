# Knowledge

Your folders of Markdown in Echo: Home, Pages, Graph, Ask, Ingest, Health and Settings. Connect an existing vault without changing it, or start a twin vault; read and edit pages, save minutes, ask with your vault's AI profile, and review every ingest change before it lands.

Open Knowledge in the activity bar. Settings → From plugins → Knowledge vaults also opens it. Obsidian is optional. The existing Obsidian vaults plugin's managed notes remain separate and are not moved or deleted.

`client.js`, `view.js`, `model.js` and the styles supply the complete vault client. `main.js` offers read-only status and connected-vault views to Claude in Echo; source pickers and terminal commands remain human UI actions. Echo retains the Rust vault engine, safe file/Git operations, native dialogs and guarded AI runs; this package requires an Echo build implementing `uses.knowledge` (an older build with the same version number refuses this capability).

Existing Knowledge vaults, drafts, settings, receipts and conversations stay in their current locations. Disabling the plugin removes its client and stops its native AI jobs and future automatic exports/ingest. Explicit native CLI operations remain available. Removing the package never deletes the user-owned vault folders or the native registry.

Part of the [Echo plugins](../../README.md) marketplace.
