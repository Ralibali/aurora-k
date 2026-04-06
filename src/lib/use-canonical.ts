import { useEffect } from 'react';

export function useCanonical(url: string) {
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;

    return () => {
      const el = document.querySelector('link[rel="canonical"]');
      if (el) el.remove();
    };
  }, [url]);
}
