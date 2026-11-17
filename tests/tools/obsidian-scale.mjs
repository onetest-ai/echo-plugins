// Knowledge's index at scale under QuickJS with Echo's memory limit (Echo's host: 64 MB shared by every plugin):
//   <quickjs-ng>/qjs --memory-limit 65536 -m tests/tools/obsidian-scale.mjs [pages=5000] [kb=1] [command…]
// Prints each command's time and answer size, then "ok"; QuickJS throws "out of memory" when it doesn't fit. Run it
// with a lower --memory-limit to see the room left. Also runs under node (no limit) for its times.
import { scale, COMMANDS } from '../obsidian/scale.mjs'

const argv = typeof scriptArgs !== 'undefined' ? scriptArgs.slice(1) : process.argv.slice(2)
const say = typeof print !== 'undefined' ? print : console.log
const [n = '5000', kb = '1', ...cmds] = argv
try {
  const r = await scale(Number(n), Number(kb), cmds.length ? cmds : COMMANDS, say)
  say(`${n} pages of ${kb} KB: index.json ${(r.indexBytes / 1e6).toFixed(1)} MB — ok`)
} catch (e) {
  say(`FAILED: ${(e && e.message) || e}`)
}
