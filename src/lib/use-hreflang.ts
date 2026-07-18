import { useLayoutEffect } from 'react';

/**
 * Manages <link rel="alternate" hreflang="..."> and the <html lang="..."> attribute.
 * Pass a record of language code -> absolute URL. Swedish is preferred as x-default.
 */
export function useHreflang(alternates: Record<string, string>, htmlLang: string) {
  const alternatesKey = JSON.stringify(alternates);
  useLayoutEffect(() => {
    const stableAlternates = JSON.parse(alternatesKey) as Record<string, string>;
    document.documentElement.lang = htmlLang;

    document.head
      .querySelectorAll('link[rel="alternate"][data-hreflang-managed="1"]')
      .forEach((el) => el.remove());

    const entries = Object.entries(stableAlternates);
    entries.forEach(([lang, href]) => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = lang;
      link.href = href;
      link.setAttribute('data-hreflang-managed', '1');
      document.head.appendChild(link);
    });

    if (entries.length > 0) {
      const xDefault = document.createElement('link');
      xDefault.rel = 'alternate';
      xDefault.hreflang = 'x-default';
      xDefault.href = stableAlternates.sv ?? entries[0][1];
      xDefault.setAttribute('data-hreflang-managed', '1');
      document.head.appendChild(xDefault);
    }

    return () => {
      document.head
        .querySelectorAll('link[rel="alternate"][data-hreflang-managed="1"]')
        .forEach((el) => el.remove());
    };
  }, [alternatesKey, htmlLang]);
}
