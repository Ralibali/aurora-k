import { Link, useParams } from 'react-router-dom';
import { BlogLayout } from '@/components/BlogLayout';
import articles from '@/content/editorial/articles.json';
import NotFound from '@/pages/NotFound';

export default function EditorialBlogPost() {
  const { slug } = useParams();
  const article = articles.find(post => post.slug === slug);
  if (!article) return <NotFound />;
  return <BlogLayout {...article}>
    <p>{article.intro}</p>
    {article.sections.map(section => <section key={section.heading}>
      <h2>{section.heading}</h2>
      {section.content.split('\n\n').map((block, index) => block.startsWith('- ')
        ? <ul key={index}>{block.split('\n').map(line => <li key={line}>{line.replace(/^- /, '')}</li>)}</ul>
        : <p key={index}>{block}</p>)}
    </section>)}
    <nav aria-label="Nästa steg"><ul>{article.links.map(link => <li key={link.href}><Link to={link.href}>{link.label}</Link></li>)}</ul></nav>
  </BlogLayout>;
}
