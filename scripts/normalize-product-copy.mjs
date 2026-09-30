#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export function checkProductCopy(html, pricePage = false) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  if (pricePage && (!text.includes('449 kr') || !text.includes('exkl. moms'))) throw new Error('Prissidan måste visa 449 kr och exkl. moms.');
  // Reject affirmative setup charges, whatever the amount. Explicitly free
  // setup and the optional assistance offer are permitted.
  const fee = /(?:setup[- ]?(?:avgift|kostnad)|startavgift|engångs(?:avgift|kostnad)|uppstartsavgift)/gi;
  for (const match of text.matchAll(fee)) {
    const before = text.slice(Math.max(0, match.index - 100), match.index);
    if (/(?:ingen|inga|utan|inte någon|0 kr)\s*$/i.test(before)) continue;
    const context = text.slice(Math.max(0, match.index - 100), match.index + 140);
    if (!/valfri uppstartshjälp/i.test(context)) throw new Error('Statisk HTML beskriver en obligatorisk setupavgift.');
  }
  for (const match of text.matchAll(/3[ ,]?500\s*(?:kr|SEK)/gi)) {
    const context = text.slice(Math.max(0, match.index - 100), match.index + 180);
    if (!/valfri uppstartshjälp/i.test(context)) throw new Error('Uppstartshjälp måste beskrivas som valfri.');
  }
}
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) scan(path);
    else if (entry.name.endsWith('.html')) checkProductCopy(readFileSync(path, 'utf8'), path.endsWith('/vad-kostar-transportledningssystem/index.html'));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  scan(resolve('dist'));
  console.log('Priskontroll godkänd: exkl. moms och ingen obligatorisk startavgift.');
}
