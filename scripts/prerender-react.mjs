import { build, loadConfigFromFile } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Render the actual public React pages. No separately maintained SEO body.
export async function createPublicRenderer() {
  const app = await readFile('src/App.tsx', 'utf8');
  const imports = new Map([...app.matchAll(/const (\w+) = lazy\(\(\) => import\(["'](.+?)["']\)\)/g)].map(m => [m[1], m[2]]));
  const routes = [...app.matchAll(/<Route path="([^"]+)" element=\{<(\w+)(?:\s*\/)?>\}/g)]
    .filter(m => !/^\/(?:admin|platform|driver)(?:\/|$)/.test(m[1]) && m[1] !== '*' && imports.has(m[2]));
  const components = [...new Set(routes.map(m => m[2]))];
  const dir = resolve('node_modules/.cache/public-prerender');
  await mkdir(dir, { recursive: true });
  const entry = `${components.map(name => `import ${name} from ${JSON.stringify(resolve('src', imports.get(name)))};`).join('\n')}
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PrerenderMetaContext } from '@/lib/page-meta-context';
export function render(route) {
 const meta = {};
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 const html = renderToString(<PrerenderMetaContext.Provider value={meta}><QueryClientProvider client={client}><TooltipProvider><MemoryRouter initialEntries={[route]}><Routes>${routes.map(m => `<Route path=${JSON.stringify(m[1])} element={<${m[2]} />} />`).join('')}</Routes></MemoryRouter></TooltipProvider></QueryClientProvider></PrerenderMetaContext.Provider>);
 client.clear();
 return { meta, html: html.replace(/opacity:0(?=[;\"])/g, 'opacity:1') };
}`;
  await writeFile(resolve(dir, 'entry.tsx'), entry);
  const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' });
  await build({
    configFile: false, logLevel: 'error', resolve: { alias: { '@': resolve('src') } },
    define: loaded.config.define,
    esbuild: { jsx: 'automatic' },
    build: { ssr: resolve(dir, 'entry.tsx'), outDir: resolve(dir, 'out'), emptyOutDir: true, rollupOptions: { output: { format: 'es', entryFileNames: 'entry.mjs' } } },
  });
  const module = await import(pathToFileURL(resolve(dir, 'out/entry.mjs')).href);
  return module.render;
}
