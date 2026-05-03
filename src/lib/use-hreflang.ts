import { useLayoutEffect } from 'react';

/**
 * Manages <link rel="alternate" hreflang="..."> and the <html lang="..."> attribute.
 * Pass a record of language code -> absolute URL. Swedish is preferred as x-default.
 */
export function useHreflang(alternates: Record<string, string>, htmlLang: string) {
  useLayoutEffect(() => {
    document.documentElement.lang = htmlLang;

    document.head
      .querySelectorAll('link[rel="alternate"][data-hreflang-managed="1"]')
      .forEach((el) => el.remove());

    const entries = Object.entries(alternates);
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
      xDefault.href = alternates.sv ?? entries[0][1];
      xDefault.setAttribute('data-hreflang-managed', '1');
      document.head.appendChild(xDefault);
    }

    return () => {
      document.head
        .querySelectorAll('link[rel="alternate"][data-hreflang-managed="1"]')
        .forEach((el) => el.remove());
    };
  }, [JSON.stringify(alternates), htmlLang]);
}
