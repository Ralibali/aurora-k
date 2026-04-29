import { Link } from 'react-router-dom';
import { Truck, ArrowLeft, Menu, X } from 'lucide-react';
import { useMemo, ReactNode, useState } from 'react';
import { usePageMeta } from '@/lib/use-page-meta';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';

interface BlogLayoutProps {
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  publishDate: string;
  readTime: string;
  children: ReactNode;
  /** Optional modified time for article:modified_time. */
  modifiedDate?: string;
  /** Optional tags for article:tag. */
  tags?: string[];
}

export function BlogLayout({
  slug,
  title,
  seoTitle,
  metaDescription,
  publishDate,
  readTime,
  children,
  modifiedDate,
  tags,
}: BlogLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  usePageMeta({
    title: seoTitle,
    description: metaDescription,
    canonical: `https://auroratransport.se/blogg/${slug}`,
    ogImage: 'https://auroratransport.se/og-image.png',
    ogType: 'article',
    article: {
      publishedTime: publishDate,
      modifiedTime: modifiedDate,
      author: 'Aurora Transport',
      section: 'Transport & Logistik',
      tags,
    },
  });

  useBreadcrumbJsonLd(
    useMemo(
      () => [
        { name: 'Hem', url: 'https://auroratransport.se/' },
        { name: 'Blogg', url: 'https://auroratransport.se/blogg' },
        { name: title, url: `https://auroratransport.se/blogg/${slug}` },
      ],
      [title, slug]
    )
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">Aurora Transport</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/blogg" className="hover:text-foreground transition-colors">Blogg</Link>
            <Link to="/tjanster" className="hover:text-foreground transition-colors">Tjänster</Link>
            <Link to="/om-oss" className="hover:text-foreground transition-colors">Om oss</Link>
            <Link to="/kontakt" className="hover:text-foreground transition-colors">Kontakt</Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="blog-mobile-menu"
            aria-label={menuOpen ? 'Stäng meny' : 'Öppna meny'}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav drawer */}
        {menuOpen && (
          <div id="blog-mobile-menu" className="md:hidden border-t border-border bg-background">
            <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1 text-sm">
              <Link to="/blogg" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 hover:bg-muted">Blogg</Link>
              <Link to="/tjanster" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 hover:bg-muted">Tjänster</Link>
              <Link to="/om-oss" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 hover:bg-muted">Om oss</Link>
              <Link to="/kontakt" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 hover:bg-muted">Kontakt</Link>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 hover:bg-muted">Logga in</Link>
            </div>
          </div>
        )}
      </nav>

      <main id="main-content" className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link to="/blogg" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Tillbaka till bloggen
          </Link>

          <article className="prose prose-lg dark:prose-invert max-w-none">
            <div className="mb-8">
              <p className="text-sm text-muted-foreground mb-2">
                <time dateTime={publishDate}>{publishDate}</time> · {readTime} läsning
              </p>
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: seoTitle,
            description: metaDescription,
            datePublished: publishDate,
            dateModified: modifiedDate ?? publishDate,
            author: { '@type': 'Organization', name: 'Aurora Transport' },
            publisher: {
              '@type': 'Organization',
              name: 'Aurora Media AB',
              logo: {
                '@type': 'ImageObject',
                url: 'https://auroratransport.se/icon-512x512.png',
              },
            },
            image: 'https://auroratransport.se/og-image.png',
            mainEntityOfPage: `https://auroratransport.se/blogg/${slug}`,
            keywords: tags?.join(', '),
          }),
        }}
      />
    </div>
  );
}
