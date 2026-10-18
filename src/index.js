/**
 * dsh-mobile-glass-bridge, node half.
 *
 * The plugin is client-only: everything it does is one stylesheet in the
 * browser. This half exists so the bundle patch's row is visible to the host
 * Loader, which is how DSH discovers the `dsh.client` declaration and serves
 * `exports["./client"]`.
 */

/** No host services, no host effects. */
export function apply() {}
