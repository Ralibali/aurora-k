import { createContext } from 'react';

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: string;
  noindex?: boolean;
}

// A fresh collector is supplied for each build-time render, never in the app.
export const PrerenderMetaContext = createContext<Partial<PageMeta> | null>(null);
