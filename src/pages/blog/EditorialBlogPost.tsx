import { Link, useParams } from 'react-router-dom';
import { BlogLayout } from '@/components/BlogLayout';
import articles from '@/content/editorial/articles.json';
import NotFound from '@/pages/NotFound';

export default function EditorialBlogPost() {
  const { slug } = useParams();
  const article = articles.find(post => post.slug === slug);
  if (!article) return <NotFound />;
  return <BlogLayout {...article}>
    <p className="text-lg leading-8 mb-8">{article.intro}</p>
    {article.sections.map(section => <section className="mt-10" key={section.heading}>
      <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>
      {section.content.split('\n\n').map((block, index) => block.startsWith('- ')
        ? <ul className="list-disc pl-6 space-y-2 my-5" key={index}>{block.split('\n').map(line => <li key={line}>{line.replace(/^- /, '')}</li>)}</ul>
        : <p className="leading-8 mb-5" key={index}>{block}</p>)}
    </section>)}
    <nav className="mt-10 space-y-3 underline" aria-label="Nästa steg"><ul>{article.links.map(link => <li key={link.href}><Link to={link.href}>{link.label}</Link></li>)}</ul></nav>
  </BlogLayout>;
}
