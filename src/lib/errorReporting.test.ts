import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ init: vi.fn(), options: { enabled: true } }));
vi.mock('@sentry/react', () => ({ init: mocks.init, getClient: () => ({ getOptions: () => mocks.options }) }));
import { installConsentAwareErrorReporting } from './errorReporting';

describe('optional browser diagnostics', () => {
  beforeEach(() => { localStorage.clear(); mocks.init.mockClear(); mocks.options.enabled = true; });
  it('does not initialize before a choice and stops after withdrawal', () => {
    installConsentAwareErrorReporting();
    expect(mocks.init).not.toHaveBeenCalled();
    window.dispatchEvent(new CustomEvent('privacy:analytics-consent', { detail: true }));
    expect(mocks.init).toHaveBeenCalledOnce();
    const options = mocks.init.mock.calls[0][0];
    expect(options.replaysSessionSampleRate).toBe(0);
    const event = { user: { email: 'private@example.test' }, extra: { brief: 'private' }, logentry: { message: 'private' }, breadcrumbs: [{ message: 'private' }], request: { url: 'https://auroratransport.se/track/private-token?email=private@example.test', headers: { authorization: 'secret' } }, exception: { values: [{ type: 'Error', value: 'private', stacktrace: { frames: [{ filename: 'https://auroratransport.se/track/private-token?email=private@example.test', abs_path: 'https://auroratransport.se/track/private-token', context_line: 'private', vars: { email: 'private' }, lineno: 3 }] } }] } };
    expect(options.beforeSend(event)).toEqual({ breadcrumbs: [], request: { url: 'https://auroratransport.se' }, exception: { values: [{ type: 'Error', stacktrace: { frames: [{ filename: 'https://auroratransport.se', lineno: 3 }] } }] } });
    window.dispatchEvent(new CustomEvent('privacy:analytics-consent', { detail: false }));
    expect(mocks.options.enabled).toBe(false);
    expect(options.beforeSend({ message: 'ignored' })).toBeNull();
  });
});
