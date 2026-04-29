import { useEffect } from 'react';

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  noindex?: boolean;
  /** Override the <html lang="..."> attribute for language-specific pages. */
  lang?: string;
  /** Optional keywords array (comma-joined). */
  keywords?: string[];
  /** Article metadata (used when ogType = 'article'). */
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
  /** Language alternates for hreflang. */
  alternates?: Array<{ hrefLang: string; href: string }>;
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

function clearManagedTags(attr: string) {
  document.head
    .querySelectorAll<HTMLElement>(`[data-managed="${attr}"]`)
    .forEach((el) => el.remove());
}

export function usePageMeta({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  noindex = false,
  lang,
  keywords,
  article,
  alternates,
}: PageMeta) {
  useEffect(() => {
    document.title = title;

    if (lang) {
      document.documentElement.setAttribute('lang', lang);
    }

    ensureMeta('meta[name="description"]', 'name', 'description').setAttribute(
      'content',
      description
    );
    ensureCanonical().href = canonical;

    ensureMeta('meta[property="og:title"]', 'property', 'og:title').setAttribute('content', title);
    ensureMeta('meta[property="og:description"]', 'property', 'og:description').setAttribute(
      'content',
      description
    );
    ensureMeta('meta[property="og:url"]', 'property', 'og:url').setAttribute('content', canonical);
    ensureMeta('meta[property="og:type"]', 'property', 'og:type').setAttribute('content', ogType);

    ensureMeta('meta[name="twitter:title"]', 'name', 'twitter:title').setAttribute(
      'content',
      title
    );
    ensureMeta('meta[name="twitter:description"]', 'name', 'twitter:description').setAttribute(
      'content',
      description
    );

    if (ogImage) {
      ensureMeta('meta[property="og:image"]', 'property', 'og:image').setAttribute(
        'content',
        ogImage
      );
      ensureMeta('meta[name="twitter:image"]', 'name', 'twitter:image').setAttribute(
        'content',
        ogImage
      );
    }

    const robots = ensureMeta('meta[name="robots"]', 'name', 'robots');
    robots.setAttribute(
      'content',
      noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
    );

    // Keywords (optional)
    if (keywords && keywords.length > 0) {
      ensureMeta('meta[name="keywords"]', 'name', 'keywords').setAttribute(
        'content',
        keywords.join(', ')
      );
    }

    // Article metadata (cleaned & re-added per page for safety)
    clearManagedTags('article');
    if (ogType === 'article' && article) {
      const add = (property: string, content?: string) => {
        if (!content) return;
        const el = document.createElement('meta');
        el.setAttribute('property', property);
        el.setAttribute('content', content);
        el.setAttribute('data-managed', 'article');
        document.head.appendChild(el);
      };
      add('article:published_time', article.publishedTime);
      add('article:modified_time', article.modifiedTime);
      add('article:author', article.author);
      add('article:section', article.section);
      article.tags?.forEach((t) => add('article:tag', t));
    }

    // hreflang alternates (cleaned & re-added per page)
    clearManagedTags('alternate');
    alternates?.forEach(({ hrefLang, href }) => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = hrefLang;
      link.href = href;
      link.setAttribute('data-managed', 'alternate');
      document.head.appendChild(link);
    });
  }, [title, description, canonical, ogImage, ogType, noindex, lang, keywords, article, alternates]);
}
