import { useLayoutEffect } from 'react';

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function useBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  useLayoutEffect(() => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: item.url,
      })),
    };

    let script = document.head.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"][data-jsonld-id="breadcrumb"]'
    );

    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-jsonld-id', 'breadcrumb');
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(jsonLd);

    return () => {
      script?.remove();
    };
  }, [JSON.stringify(items)]);
}
