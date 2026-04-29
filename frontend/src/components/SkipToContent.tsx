/**
 * Accessibility: keyboard-only users can skip directly to the main
 * content area with Tab on focus. Invisible until focused.
 * Place once at the top of the app.
 *
 * Pair with `id="main-content"` on the <main> element of each layout.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      Hoppa till huvudinnehåll
    </a>
  );
}
