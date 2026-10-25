import { describe, expect, it } from 'vitest';
import { validateCheck, type CheckInput } from './vehicle-check';
const complete: CheckInput = { tires: 'no_issue', lights: 'no_issue', damage: 'no_issue', safetyCritical: false, note: '' };
describe('vehicle observation rules', () => {
  it('requires all three answers for a normal check', () => {
    expect(validateCheck(complete)).toBeNull();
    for (const key of ['tires', 'lights', 'damage'] as const) expect(validateCheck({ ...complete, [key]: 'not_checked' })).not.toBeNull();
  });
  it('accepts an immediate safety-critical report without a completed checklist', () => {
    expect(validateCheck({ tires: 'not_checked', lights: 'not_checked', damage: 'not_checked', safetyCritical: true, note: 'Synlig skada på bromsslang' })).toBeNull();
  });
  it('requires a description for every reported deviation', () => {
    expect(validateCheck({ ...complete, safetyCritical: true, note: ' ' })).not.toBeNull();
    expect(validateCheck({ ...complete, lights: 'issue' })).not.toBeNull();
    expect(validateCheck({ ...complete, lights: 'issue', note: 'Bakljus ur funktion' })).toBeNull();
  });
  it('limits a description to 3000 characters', () => {
    expect(validateCheck({ ...complete, note: 'a'.repeat(3000) })).toBeNull();
    expect(validateCheck({ ...complete, note: 'a'.repeat(3001) })).not.toBeNull();
  });
});