import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LeadForm } from './LeadForm';
import { DemoBookingModal } from './DemoBookingModal';
import { MobileConversionShell, StandaloneDemoPage } from './MobileConversionShell';
import { FormAnalyticsObserver } from './FormAnalyticsObserver';

const { insert, invoke, track, trackEvent } = vi.hoisted(() => ({
  insert: vi.fn(), invoke: vi.fn(), track: vi.fn(), trackEvent: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ insert }), functions: { invoke } },
}));
vi.mock('@/lib/track', () => ({ track }));

beforeEach(() => {
  vi.clearAllMocks();
  window.analyticsEvent = trackEvent;
  invoke.mockResolvedValue({ data: {}, error: null });
  history.replaceState({}, '', '/');
  // jsdom implements textContent but not the rendered innerText property.
  Object.defineProperty(document.body, 'innerText', { configurable: true, get: () => document.body.textContent || '' });
});
afterEach(cleanup);

const cases = [
  { source: 'lead_form', ids: ['lead-person', 'lead-company', 'lead-email'], renderForm: () => <LeadForm /> },
  { source: 'demo_modal', ids: ['demo-name', 'demo-company', 'demo-email'], renderForm: () => <DemoBookingModal open onOpenChange={() => {}} lang="sv" /> },
  { source: 'demo_modal', ids: ['demo-name', 'demo-company', 'demo-email'], renderForm: () => <DemoBookingModal open onOpenChange={() => {}} lang="en" /> },
  { source: 'standalone_demo', ids: ['standalone_demo-contactPerson', 'standalone_demo-companyName', 'standalone_demo-email'], renderForm: () => <StandaloneDemoPage /> },
  { source: 'mobile_demo', ids: ['mobile_demo-contactPerson', 'mobile_demo-companyName', 'mobile_demo-email'], renderForm: () => <MobileConversionShell /> },
];

function fillForm(testCase: typeof cases[number]) {
  render(<>{testCase.renderForm()}<FormAnalyticsObserver /></>);
  if (testCase.source === 'mobile_demo') fireEvent.click(screen.getByRole('button', { name: /Boka kostnadsfri demo/ }));
  const values = ['Test Person', 'Test Company', 'test@example.com'];
  testCase.ids.forEach((id, index) => fireEvent.change(document.getElementById(id)!, { target: { value: values[index] } }));
  return document.getElementById(testCase.ids[0])!.closest('form')!;
}

describe.each(cases)('confirmed lead analytics: $source', (testCase) => {
  it('records one outcome only after saving, independent of confirmation text or language', async () => {
    let resolveSave!: (result: { error: null }) => void;
    insert.mockReturnValueOnce(new Promise(resolve => { resolveSave = resolve; }));
    const form = fillForm(testCase);
    fireEvent.submit(form);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(trackEvent).not.toHaveBeenCalled();

    await act(async () => resolveSave({ error: null }));
    await waitFor(() => expect(trackEvent).toHaveBeenCalledTimes(2));
    expect(trackEvent).toHaveBeenCalledWith('Generate Lead', { props: { lead_source: testCase.source } });
    expect(trackEvent).toHaveBeenCalledWith('Demo Requested', { props: { source: testCase.source } });
    expect(trackEvent.mock.calls.filter(([event]) => event === 'Generate Lead')).toHaveLength(1);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(track.mock.calls.some(([event]) => event === 'generate_lead' || event === 'lead_submit_success')).toBe(false);
  });

  it('does not record an outcome or send notification when saving fails', async () => {
    insert.mockResolvedValueOnce({ error: { message: 'Save failed' } });
    const form = fillForm(testCase);
    await act(async () => fireEvent.submit(form));
    expect(insert).toHaveBeenCalledTimes(1);
    expect(trackEvent).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });
});

it('does not infer a new lead from thank-you text appearing on a page', async () => {
  const { rerender } = render(<FormAnalyticsObserver />);
  rerender(<><FormAnalyticsObserver /><p>Din intresseanmälan har landat. Bokningen är mottagen.</p></>);
  await act(async () => {});
  expect(track).not.toHaveBeenCalled();
  expect(trackEvent).not.toHaveBeenCalled();
});
