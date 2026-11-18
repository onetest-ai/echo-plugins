# P2 — files for plugins (design)

Need (Knowledge port): Ingest adds files the user picks or drops (bytes ≤ 50 MB, copied into the vault's sources folder,
never over a file); Pages show a vault's images; a window half hands files to its host half (`ctx.call` attachments);
a session can hand a file to a plugin command.

## Shape: handles, not paths
A picked or dropped file becomes a **handle** `{file, name, size}` (`file` = an opaque id) owned by one plugin, kept in
the app's memory for the app's life (or an hour), never a path the plugin sees. What the host half can do with it:
- `ctx.files.read(file, {max})` → text (≤ 4 MB, as `fs.readMany`);
- `ctx.fs.copyIn(file, root, rel, {createNew: true})` → bytes into a granted folder (`folders.write`, `grants::writable`,
  never a link, never over a file unless asked; ≤ 50 MB).

## Where handles come from
1. Host half: `await ctx.system.pickFiles(prompt, {multiple, ext})` — the native picker (prompt "<plugin> — …", as
   `pickFolder`); debug builds: `ECHOCTL_PICK_FILES=<path>[:<path>…]`.
2. Window half: `ctx.onFileDrop(fn)` — files dropped on the window while one of the plugin's views is shown go to it
   (the page gets names and handles only; wry's drop handler makes the handles). No view of it shown: Echo's own drop.
3. Window half: `ctx.call(command, args, {files})` — handles it holds, passed to its host half's command as `ctx.files`
   of that call (checked as its own).
4. CLI: `echoctl plugin call <id> <cmd> '<json>' --file <path>` (repeatable) — refused inside a run Echo started
   (`notes::run_limited`); a session of the user's own hands its files.

## Images of a granted folder
`/plugin/<id>/folder/<root>/<path>` — image types only (png, jpg, gif, webp, svg as text/plain? → no svg), ≤ 10 MB,
resolved by `grants::resolve`, the plugin enabled and `uses.folders`.

## Sheet
No new capability: picking and dropping are the user's own acts; copying needs `folders.write` (already on the sheet).

## Tests
Rust: handle ownership (another plugin's handle refused), copyIn limits/createNew/link refusal, CLI `--file` refused in
a run, image route types/size/outside-root. Node: drop routing (a plugin view shown → its handler; else Echo's).
Case: a test plugin picks (env stand-in) and copies a file into its folder; a dropped file reaches its view (drop can't
be driven by Playwright on a native window → the case uses the page's drop event on served data, if wired; else person).
