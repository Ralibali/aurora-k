import { Link, useParams } from 'react-router-dom';
import { BlogLayout } from '@/components/BlogLayout';
import articles from '@/content/editorial/articles.json';
import NotFound from '@/pages/NotFound';


function InlineLinks({ text }: { text: string }) {
  const pattern = /\[([^\]]+)\]\(((?:https?:\/\/|\/(?!\/))[^\s)]+)\)/g;
  const parts = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index!;
    parts.push(text.slice(cursor, start));
    const [, label, href] = match;
    parts.push(href.startsWith('/')
      ? <Link className="underline underline-offset-2" key={start} to={href}>{label}</Link>
      : <a className="underline underline-offset-2" key={start} href={href}>{label}</a>);
    cursor = start + match[0].length;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export default function EditorialBlogPost() {
  const { slug } = useParams();
  const article = articles.find(post => post.slug === slug);
  if (!article) return <NotFound />;
  return <BlogLayout {...article}>
    <p className="text-lg leading-8 mb-8"><InlineLinks text={article.intro} /></p>
    {article.sections.map(section => <section className="mt-10" key={section.heading}>
      <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>
      {section.content.split('\n\n').map((block, index) => block.startsWith('- ')
        ? <ul className="list-disc pl-6 space-y-2 my-5" key={index}>{block.split('\n').map(line => <li key={line}><InlineLinks text={line.replace(/^- /, '')} /></li>)}</ul>
        : <p className="leading-8 mb-5" key={index}><InlineLinks text={block} /></p>)}
    </section>)}
    <nav className="mt-10 space-y-3 underline" aria-label="Nästa steg"><ul>{article.links.map(link => <li key={link.href}><Link to={link.href}>{link.label}</Link></li>)}</ul></nav>
  </BlogLayout>;
}
