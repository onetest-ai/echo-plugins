// Read-only connected-vault views for Claude in Echo. Vault state stays in Echo's native registry and folders;
// this half keeps no private store and reaches no outside hosts. Source pickers stay in the native human UI.
export function apply(ctx) {
  ctx.command('status', () => ctx.knowledge.read('api/kn'))
  ctx.command('read', ({ route = '' } = {}) => ctx.knowledge.read(`api/kn/${route}`))
}
