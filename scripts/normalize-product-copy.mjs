#!/usr/bin/env node

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DIST = resolve(process.cwd(), 'dist');
const replacements = [
  [/ingen setup-avgift/gi, 'en setup- och onboardingkostnad på 3 500 kr'],
  [/ingen setupavgift/gi, 'en setup- och onboardingkostnad på 3 500 kr'],
  [/Fortnox eller Visma/g, 'Fortnox'],
];

function htmlFiles(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
  });
}

let changed = 0;
for (const file of htmlFiles(DIST)) {
  const original = readFileSync(file, 'utf8');
  const normalized = replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), original);
  if (normalized !== original) {
    writeFileSync(file, normalized);
    changed += 1;
  }
}

const pricePage = resolve(DIST, 'vad-kostar-transportledningssystem', 'index.html');
const priceHtml = readFileSync(pricePage, 'utf8');
if (!priceHtml.includes('3 500 kr')) {
  throw new Error('Den statiska prissidan saknar den beslutade setupkostnaden 3 500 kr.');
}
if (/ingen setup-?avgift/i.test(priceHtml)) {
  throw new Error('Den statiska prissidan innehåller fortfarande felaktig information om setupavgift.');
}

console.log(`Produktinformationen normaliserades i ${changed} statiska HTML-filer.`);
