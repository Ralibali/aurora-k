import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scroll to top on every route change.
 * This fixes a common SPA UX issue where you navigate to a new page
 * but stay scrolled where you were on the previous page.
 *
 * Respects history.scrollRestoration for back/forward navigation:
 * only scrolls to top on PUSH navigation, not POP.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If there's a hash (anchor link) let the browser handle it.
    if (hash) {
      const el = document.getElementById(hash.replace('#', ''));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    // Respect users' reduced-motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReducedMotion ? 'auto' : 'instant' as ScrollBehavior,
    });
  }, [pathname, hash]);

  return null;
}
