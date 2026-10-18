/**
 * dsh-mobile-glass-bridge, browser half.
 *
 * WHY THIS EXISTS
 * `deepseek-harness-background` makes the wallpaper visible by zeroing the two
 * "app frame" tokens on `body[data-dsh-bg]`:
 *
 *   --dsw-alias-bg-base: transparent;
 *   --dsw-specific-sidebar-fill: transparent;
 *
 * `dsh-web-mobile` reuses exactly those two tokens as *panel* fills:
 *
 *   - the drawer column (`[data-mobile-nav="frame"] > :first-child`, styles
 *     layout.css.ts:180) paints `var(--dsw-specific-sidebar-fill)`, so the
 *     drawer slides out with no ground at all: the conversation behind it and
 *     the 40% backdrop show straight through the sidebar content;
 *   - the dark-theme session header (layout.css.ts:1146) paints
 *     `var(--dsw-alias-bg-base) !important`, so the top bar loses the ground
 *     the host still gives it on desktop.
 *
 * Both plugins are unaware of each other (neither references the other's
 * marker), so nothing in either package covers this. The bridge paints a
 * readable glass ground on exactly those two surfaces, and only while a
 * wallpaper is active and the phone tier is armed.
 *
 * KNOBS
 * `--dsh-mobile-glass-fill` is the fill colour. Override it (per theme) with
 * another stylesheet if you want more or less wallpaper showing through. The
 * blur follows the wallpaper plugin's own `--bg-glass-blur` slider, so the
 * bridge does not invent a second blur setting (that variable drops to 0px
 * when panel opacity is 100%, which is the wallpaper plugin's "no glass" mode).
 *
 * PRE-EXISTING CONTRACT
 * A client half is a lazy CJS factory registered on the shell's frozen module
 * table; the module id is the package name. No `@deepseek-ai/*` import is
 * needed, so this file carries no build step.
 */

// eslint-disable-next-line no-undef -- the shell installs this global before any client bundle runs.
window.__ModuleLoader__.load({
  id: 'dsh-mobile-glass-bridge',
  factory: () => {
    /** Dedup key for the injected stylesheet (matches how DSH plugin sheets tag themselves). */
    const STYLE_KEY = 'dsh-mobile-glass-bridge'

    /** The bridge sheet. Ordering notes are load-bearing — read them before editing. */
    const CSS = `
/* Fill colour: light first, then both spellings of the dark-theme marker
   (the wallpaper plugin writes it on <body>, some hosts also mirror it on
   <html>). The value is deliberately opaque enough to read text over a photo;
   0.82 keeps a visible hint of the wallpaper without washing the UI out. */
body[data-dsh-bg] {
  --dsh-mobile-glass-fill: rgba(249, 250, 251, 0.82);
}

body[data-dsh-bg][data-ds-dark-theme],
html[data-ds-dark-theme] body[data-dsh-bg] {
  --dsh-mobile-glass-fill: rgba(21, 21, 23, 0.82);
}

@media (max-width: 1023px) and (pointer: coarse) {
  /* Drawer column. Same anchor dsh-web-mobile uses for its own drawer rule.
     Specificity (0,3,1) beats that rule's (0,2,0). Writing the variable as
     well as the background covers the host sidebar surface nested inside this
     column, which paints the same token itself and would otherwise punch a
     transparent hole through the fill. */
  body[data-dsh-bg] [data-mobile-nav="frame"] > :first-child {
    --dsw-specific-sidebar-fill: var(--dsh-mobile-glass-fill);
    background-color: var(--dsh-mobile-glass-fill) !important;
    -webkit-backdrop-filter: blur(var(--bg-glass-blur, 16px)) saturate(1.4);
    backdrop-filter: blur(var(--bg-glass-blur, 16px)) saturate(1.4);
  }

  /* Dark-theme session header. dsh-web-mobile's rule carries !important at
     (0,3,2); this one is (0,4,2) so it wins on specificity rather than on
     stylesheet order (two plugin sheets have no guaranteed order). Light theme
     is untouched: the mobile rule only exists for dark, and the host header
     keeps its own opaque layer colour there.
     No backdrop-filter here on purpose: the header has no transform, so a
     backdrop-filter would make it the containing block for any fixed-position
     descendant (a mode menu rendered in place would jump to the header). The
     drawer already owns a transform, so its filter adds no such risk. */
  body[data-dsh-bg][data-ds-dark-theme] [data-mobile-nav="frame"] [data-phase] header,
  html[data-ds-dark-theme] body[data-dsh-bg] [data-mobile-nav="frame"] [data-phase] header {
    background-color: var(--dsh-mobile-glass-fill) !important;
  }
}
`

    /**
     * Install the sheet once; return an idempotent disposer.
     * @returns disposer that removes the sheet if this call created it.
     */
    function installStyle() {
      const existing = document.querySelector(`style[data-plugin-css="${STYLE_KEY}"]`)
      if (existing !== null) return () => {}

      const style = document.createElement('style')
      style.setAttribute('data-plugin', '')
      style.setAttribute('data-plugin-css', STYLE_KEY)
      style.textContent = CSS
      document.head.append(style)

      return () => {
        style.remove()
      }
    }

    /**
     * Register the bridge with the client root context.
     * @param ctx - client root context (only `effect` is used; no service is injected).
     */
    function apply(ctx) {
      ctx.effect(() => installStyle(), 'dsh-mobile-glass-bridge: mobile glass ground')
    }

    return { apply }
  },
})
