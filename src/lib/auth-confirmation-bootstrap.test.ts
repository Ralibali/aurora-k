import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const fragment = '#token_hash=TOKEN_HASH_0123456789&type=recovery';
type BootstrapWindow = Window & { __auroraTakeAuthConfirmation?: string; observedUrls: string[] };

describe('auth confirmation HTML bootstrap', () => {
  it('is the first script in the actual HTML and runs synchronously before external resources', () => {
    const document = new JSDOM(html).window.document;
    const script = document.querySelector('script');
    expect(script?.id).toBe('aurora-auth-confirmation-bootstrap');
    expect(script?.getAttribute('src')).toBeNull();
    expect(script?.getAttribute('type')).toBeNull();
    expect(script?.hasAttribute('async')).toBe(false);
    expect(script?.hasAttribute('defer')).toBe(false);
    const external = document.querySelectorAll('script[src]');
    expect(external.length).toBeGreaterThanOrEqual(3);
    for (const resource of document.querySelectorAll('script[src], link[href^="https:"]')) {
      expect(script!.compareDocumentPosition(resource) & 4).toBe(4);
    }
  });

  it('cleans the URL before later scripts execute, then deletes and clears its one-use memory getter', () => {
    // Replace external script bodies with a synchronous URL observer. No
    // resources are enabled or requested; use the real inline HTML bootstrap.
    const isolatedHtml = html.replace(/<script\b[^>]*\bsrc=[^>]*>[\s\S]*?<\/script>/gi,
      '<script>window.observedUrls = window.observedUrls || []; window.observedUrls.push(window.location.href);</script>');
    const dom = new JSDOM(isolatedHtml, { url: `https://auroratransport.se/auth/confirm?next=ignored${fragment}`, runScripts: 'dangerously' });
    const window = dom.window as unknown as BootstrapWindow;
    try {
      expect(window.location.href).toBe('https://auroratransport.se/auth/confirm');
      expect(window.observedUrls.length).toBeGreaterThanOrEqual(3);
      expect(window.observedUrls.every(url => url === 'https://auroratransport.se/auth/confirm')).toBe(true);
      expect(Object.keys(window)).not.toContain('__auroraTakeAuthConfirmation');
      expect(window.localStorage.length).toBe(0);
      expect(window.sessionStorage.length).toBe(0);
      const getter = Object.getOwnPropertyDescriptor(window, '__auroraTakeAuthConfirmation')!.get!;
      expect(window.__auroraTakeAuthConfirmation).toBe(fragment);
      expect(Object.prototype.hasOwnProperty.call(window, '__auroraTakeAuthConfirmation')).toBe(false);
      expect(window.__auroraTakeAuthConfirmation).toBeUndefined();
      // Even a retained reference cannot recover the captured token again.
      expect(getter.call(window)).toBe('');
    } finally { dom.window.close(); }
  });

  it.each(['/register', '/auth/confirm/', '/auth/confirmation'])('leaves other routes untouched: %s', path => {
    const dom = new JSDOM(html, { url: `https://auroratransport.se${path}?keep=1${fragment}`, runScripts: 'dangerously' });
    try {
      expect(dom.window.location.pathname).toBe(path);
      expect(dom.window.location.search).toBe('?keep=1');
      expect(dom.window.location.hash).toBe(fragment);
      expect(Object.prototype.hasOwnProperty.call(dom.window, '__auroraTakeAuthConfirmation')).toBe(false);
    } finally { dom.window.close(); }
  });
});
