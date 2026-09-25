import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { outputClaim } from './customer-claims.mjs';

const root = process.argv[2] ?? 'dist';
let files = 0;
const failures = [];
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) scan(path);
    else if (entry.isFile()) {
      files += 1;
      if (outputClaim(readFileSync(path, 'utf8'))) failures.push(path);
    }
  }
}
scan(root);
if (!files) throw new Error('Byggkontrollen kräver ett färdigt bygge.');
if (failures.length) throw new Error(`Otillåtna kundpåståenden i bygget:\n${failures.join('\n')}`);
console.log(`Kundpåståendekontroll godkänd: ${files} byggfiler.`);
