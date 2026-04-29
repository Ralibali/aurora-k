import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Truck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePageMeta } from '@/lib/use-page-meta';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';
import { blogPosts } from '@/lib/blog-data';
import { Badge } from '@/components/ui/badge';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.5, ease: 'easeOut' as const } }),
};

export default function BlogIndex() {
  usePageMeta({
    title: 'Blogg – Aurora Transport | Guider för transportföretag',
    description: 'Läs guider, jämförelser och tips om dispatchsystem, transportledning och digitalisering av budtjänst. Skrivet för svenska transportföretag.',
    canonical: 'https://auroratransport.se/blogg',
    ogImage: 'https://auroratransport.se/og-image.png',
  });

  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Blogg', url: 'https://auroratransport.se/blogg' },
  ], []));

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">Aurora Transport</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/blogg" className="text-foreground font-medium">Blogg</Link>
            <Link to="/tjanster" className="hover:text-foreground transition-colors">Tjänster</Link>
            <Link to="/om-oss" className="hover:text-foreground transition-colors">Om oss</Link>
            <Link to="/kontakt" className="hover:text-foreground transition-colors">Kontakt</Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp} className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Blogg & Kunskapsbank</h1>
            <p className="text-lg text-muted-foreground">Guider, jämförelser och tips för svenska transportföretag.</p>
          </motion.div>

          <div className="space-y-6">
            {blogPosts.map((post, i) => (
              <motion.div key={post.slug} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <Link
                  to={`/blogg/${post.slug}`}
                  className="block group p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">{post.publishDate} · {post.readTime} läsning</p>
                      <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{post.title}</h2>
                      <p className="text-muted-foreground text-sm mb-3">{post.excerpt}</p>
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
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
