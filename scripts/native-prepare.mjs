import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const platforms = process.argv.slice(2);
for (const platform of platforms.length ? platforms : ['ios', 'android']) {
  if (!['ios', 'android'].includes(platform)) throw new Error('Expected ios or android');
  const cap = (...args) => execFileSync(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', ...args], { stdio: 'inherit' });
  if (!existsSync(platform)) cap('add', platform);
  execFileSync(process.execPath, [`scripts/${platform}-post-add.mjs`], { stdio: 'inherit' });
  cap('sync', platform);
}
