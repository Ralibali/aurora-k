import { expect, it } from 'vitest';
import { renderEditorialArticle } from '../../scripts/editorial-html.mjs';
import articles from '../content/editorial/articles.json';
it('renders complete editorial content and next-step links without executable text', () => {
  const article = articles[0];
  const html = renderEditorialArticle(article);
  expect(html).toContain(article.sections.at(-1)!.heading);
  expect((html.match(/<h1/g) || []).length).toBe(1);
  expect(html).toContain('href="/blogg"');
  expect(html).toContain('AI-assisterad originalguide');
  const unsafe = renderEditorialArticle({ ...article, intro: '<script>alert(1)</script>', sections: [] });
  expect(unsafe).not.toContain('<script>');
  expect(unsafe).toContain('&lt;script&gt;');
});
