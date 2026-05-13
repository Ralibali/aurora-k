import { Link } from 'react-router-dom';
import { Truck, ArrowLeft } from 'lucide-react';
import { useMemo, ReactNode } from 'react';
import { usePageMeta } from '@/lib/use-page-meta';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';
import { useJsonLd } from '@/lib/use-json-ld';

interface BlogLayoutProps {
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  publishDate: string;
  readTime: string;
  children: ReactNode;
}

export function BlogLayout({ slug, title, seoTitle, metaDescription, publishDate, readTime, children }: BlogLayoutProps) {
  const canonical = `https://auroratransport.se/blogg/${slug}`;

  usePageMeta({
    title: seoTitle,
    description: metaDescription,
    canonical,
    ogImage: 'https://auroratransport.se/og-image.png',
    ogType: 'article',
  });

  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Blogg', url: 'https://auroratransport.se/blogg' },
    { name: title, url: canonical },
  ], [title, canonical]));

  useJsonLd(`blogposting-${slug}`, {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    name: title,
    description: metaDescription,
    datePublished: publishDate,
    dateModified: publishDate,
    inLanguage: 'sv-SE',
    author: {
      '@type': 'Organization',
      name: 'Aurora Transport',
      url: 'https://auroratransport.se/',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Aurora Media AB',
      logo: {
        '@type': 'ImageObject',
        url: 'https://auroratransport.se/icon-512x512.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical,
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">Aurora Transport</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/blogg" className="hover:text-foreground transition-colors">Blogg</Link>
            <Link to="/tjanster" className="hover:text-foreground transition-colors">Tjänster</Link>
            <Link to="/om-oss" className="hover:text-foreground transition-colors">Om oss</Link>
            <Link to="/kontakt" className="hover:text-foreground transition-colors">Kontakt</Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link to="/blogg" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Tillbaka till bloggen
          </Link>

          <article className="prose prose-lg dark:prose-invert max-w-none">
            <div className="mb-8">
              <p className="text-sm text-muted-foreground mb-2">{publishDate} · {readTime} läsning</p>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-0">{title}</h1>
            </div>
            {children}
          </article>
        </div>
      </main>

      <footer className="bg-[hsl(222,47%,11%)] border-t border-slate-800 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2"><Truck className="h-4 w-4 text-slate-400" /><span className="font-semibold text-white">Aurora Transport</span></div>
            <p className="text-sm text-slate-500">En produkt av Aurora Media AB · Org.nr 559272-0220</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
            <Link to="/" className="hover:text-white transition-colors">Hem</Link>
            <Link to="/blogg" className="hover:text-white transition-colors">Blogg</Link>
            <Link to="/tjanster" className="hover:text-white transition-colors">Tjänster</Link>
            <Link to="/om-oss" className="hover:text-white transition-colors">Om oss</Link>
            <Link to="/kontakt" className="hover:text-white transition-colors">Kontakt</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Integritetspolicy</Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">© 2026 Aurora Media AB</p>
        </div>
      </footer>
    </div>
  );
}
