import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditorialBlogPost from '@/pages/blog/EditorialBlogPost';
vi.mock('@/components/BlogLayout', () => ({
  BlogLayout: ({ children }: { children: React.ReactNode }) => <article>{children}</article>,
}));
afterEach(cleanup);
it('keeps editorial body links usable after React takes over the prerendered page', () => {
  render(<MemoryRouter initialEntries={['/blogg/stam-av-transportunderlag-fore-fakturering']}>
    <Routes>
      <Route path="/blogg/:slug" element={<EditorialBlogPost />} />
      <Route path="/tjanster" element={<h1>Tjänster öppnade</h1>} />
    </Routes>
  </MemoryRouter>);
  expect(screen.getByRole('link', { name: 'överlämningsmallen för transportledning' }).getAttribute('href'))
    .toBe('/blogg/overlamning-transportledning-checklista');
  fireEvent.click(screen.getByRole('link', { name: 'Aurora Transports tjänster', exact: true }));
  expect(screen.getByRole('heading', { name: 'Tjänster öppnade' })).toBeTruthy();
});
