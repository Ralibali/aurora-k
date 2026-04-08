import { useEffect } from 'react';

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  noindex?: boolean;
}

export function usePageMeta({ title, description, canonical, ogImage, noindex = false }: PageMeta) {
  useEffect(() => {
    document.title = title;

    const desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (desc) desc.setAttribute('content', description);

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = canonical;

    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);
    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonical);

    const twTitle = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', title);
    const twDesc = document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', description);

    if (ogImage) {
      const ogImg = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
      if (ogImg) ogImg.setAttribute('content', ogImage);
    }

    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noindex) {
      if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
      robots.setAttribute('content', 'noindex, nofollow');
    } else {
      if (robots) robots.remove();
    }

    return () => {
      const el = document.querySelector('link[rel="canonical"]');
      if (el) el.remove();
      const r = document.querySelector('meta[name="robots"]');
      if (r) r.remove();
    };
  }, [title, description, canonical, ogImage, noindex]);
}
