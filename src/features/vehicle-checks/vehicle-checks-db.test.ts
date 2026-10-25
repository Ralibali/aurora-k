// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('enforces vehicle observation permissions and keeps assignment time untouched in PostgreSQL', () => {
  const output = execFileSync(process.execPath, ['supabase/tests/vehicle-checks.mjs'], { encoding: 'utf8', timeout: 30_000 });
  expect(output).toContain('untouched time verified');
}, 35_000);