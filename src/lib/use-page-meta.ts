import { useLayoutEffect } from 'react';

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  noindex?: boolean;
}

function ensureMeta(selector: string, attr: 'name' | 'property', key: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  return el;
}

function ensureCanonical(): HTMLLinkElement {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  return link;
}

export function usePageMeta({ title, description, canonical, ogImage, noindex = false }: PageMeta) {
  useLayoutEffect(() => {
    document.title = title;

    ensureMeta('meta[name="description"]', 'name', 'description').setAttribute('content', description);
    ensureCanonical().setAttribute('href', canonical);

    ensureMeta('meta[property="og:title"]', 'property', 'og:title').setAttribute('content', title);
    ensureMeta('meta[property="og:description"]', 'property', 'og:description').setAttribute('content', description);
    ensureMeta('meta[property="og:url"]', 'property', 'og:url').setAttribute('content', canonical);

    ensureMeta('meta[name="twitter:title"]', 'name', 'twitter:title').setAttribute('content', title);
    ensureMeta('meta[name="twitter:description"]', 'name', 'twitter:description').setAttribute('content', description);

    if (ogImage) {
      ensureMeta('meta[property="og:image"]', 'property', 'og:image').setAttribute('content', ogImage);
      ensureMeta('meta[name="twitter:image"]', 'name', 'twitter:image').setAttribute('content', ogImage);
    }

    const robots = ensureMeta('meta[name="robots"]', 'name', 'robots');
    robots.setAttribute(
      'content',
      noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
    );

    document.dispatchEvent(
      new CustomEvent('aurora-seo-ready', {
        detail: { title, canonical },
      })
    );
  }, [title, description, canonical, ogImage, noindex]);
}
