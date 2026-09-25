import { readFileSync, readdirSync } from 'node:fs';
import { editorialClaim } from './customer-claims.mjs';
import assert from 'node:assert/strict';
const articles = JSON.parse(readFileSync(new URL('../src/content/editorial/articles.json', import.meta.url), 'utf8'));
const seen = new Set();
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
for (const article of articles) {
  checkArticleClaims(article, article.slug);
  assert.match(article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert(!seen.has(article.slug), `Duplicate editorial slug: ${article.slug}`); seen.add(article.slug);
  assert(article.title || article.h1, 'Missing title');
  const date = article.publishDate || article.publishedDate;
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/); assert(date <= today, 'Future article must stay in draft queue');
  assert(article.intro && article.sections?.length, 'Missing complete article');
  assert(article.sections.every(s => s.heading && s.content), 'Empty section');
  assert(article.editorial?.aiAssisted === true && article.editorial.searchIntent, 'Missing editorial provenance');
  for (const field of ['sourceCheckedAt', 'publishedAt']) {
    const timestamp = Date.parse(article.editorial[field]);
    assert(Number.isFinite(timestamp) && timestamp <= Date.now(), `Invalid ${field}`);
  }
  assert(article.editorial.sourceUrls.length, 'Missing source review');
  for (const url of article.editorial.sourceUrls) assert(new URL(url).protocol === 'https:', 'Source must use HTTPS');
  for (const section of article.sections) assert(!/<script|javascript:|onerror=/i.test(section.content), 'Unsafe article markup');
}

function checkArticleClaims(value, source) {
  if (typeof value === 'string') checkClaims(value, source);
  else if (value && typeof value === 'object') {
    checkClaims(JSON.stringify(value), source);
    for (const child of Object.values(value)) checkArticleClaims(child, source);
  }
}

function checkClaims(text, source) {
  const claim = editorialClaim(text);
  assert(!claim, `Otillåtet kundpåstående eller kundcitat i ${source}: ${claim}`);
}

// Kontrollera också äldre TSX-artiklar och redaktionella utkast.
function checkDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = new URL(entry.name, directory);
    if (entry.isDirectory()) checkDirectory(new URL(`${entry.name}/`, directory));
    else if (/\.(?:tsx?|json|md|mdx|html)$/i.test(entry.name)) {
      const text = readFileSync(path, 'utf8');
      if (entry.name.endsWith('.json')) checkArticleClaims(JSON.parse(text), path.pathname);
      else checkClaims(text, path.pathname);
    }
  }
}
checkDirectory(new URL('../src/pages/blog/', import.meta.url));
checkDirectory(new URL('../content/', import.meta.url));
checkClaims(readFileSync(new URL('../src/lib/blog-data.ts', import.meta.url), 'utf8'), 'src/lib/blog-data.ts');

console.log(`Redaktionell kontroll godkänd: ${articles.length} artiklar samt bloggsidor och utkast.`);
