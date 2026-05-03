import { describe, expect, it } from 'vitest';
import { blogPosts } from './blog-data';
import { PRERENDER_ROUTES, SEO_ROUTES } from './seo-routes';

describe('SEO routes', () => {
  it('contains every blog post', () => {
    const paths = SEO_ROUTES.map((route) => route.path);

    for (const post of blogPosts) {
      expect(paths).toContain(`/blogg/${post.slug}`);
    }
  });

  it('does not contain duplicate routes', () => {
    const paths = SEO_ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('uses the same public SEO routes for prerendering', () => {
    expect(PRERENDER_ROUTES).toEqual(SEO_ROUTES.map((route) => route.path));
  });
});
