import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

const originalPush = history.pushState;
const originalReplace = history.replaceState;
const consentKey = 'aurora_ga4_consent_v1';
let runtime: typeof import('@/lib/ga4Runtime');
let StandaloneDemoPage: typeof import('./MobileConversionShell')['StandaloneDemoPage'];
const events = () => (window as unknown as { dataLayer: ArrayLike<unknown>[] }).dataLayer
  .map(row => Array.from(row)).filter(row => row[0] === 'event');

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  history.pushState = originalPush;
  history.replaceState = originalReplace;
  history.replaceState({}, '', '/boka-demo');
  localStorage.clear();
  document.head.querySelectorAll('script').forEach(script => script.remove());
  delete (window as unknown as { gtag?: unknown }).gtag;
  (window as unknown as { dataLayer: unknown[] }).dataLayer = [];
  runtime = await import('@/lib/ga4Runtime');
  runtime.initGa4({ measurementId: 'G-TEST123456', hosts: [location.hostname], excluded: ['/admin'], consentKey });
  ({ StandaloneDemoPage } = await import('./MobileConversionShell'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  history.pushState = originalPush;
  history.replaceState = originalReplace;
});

describe('standalone demo statistics choice', () => {
  it('keeps new visitors untracked and lets them decline statistics on the standalone page', () => {
    render(<StandaloneDemoPage />);
    expect(events()).toEqual([]);
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();

    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByRole('button', { name: 'Acceptera statistik' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Endast nödvändiga' }));

    expect(events()).toEqual([]);
    expect(JSON.parse(localStorage.getItem(consentKey)!)).toMatchObject({ analytics: false });
    expect(screen.getByRole('button', { name: 'Cookieinställningar' })).toBeInTheDocument();
  });

  it('allows an explicit choice and later withdrawal without leaving the standalone page', () => {
    render(<StandaloneDemoPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Cookieinställningar' }));
    expect(events()).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Acceptera statistik' }));
    expect(events().map(row => row[1])).toEqual(['page_view']);
    expect(JSON.parse(localStorage.getItem(consentKey)!)).toMatchObject({ analytics: true });

    fireEvent.click(screen.getByRole('button', { name: 'Cookieinställningar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Endast nödvändiga' }));
    runtime.sendAnalyticsEvent('demo_page_view');
    expect(events().map(row => row[1])).toEqual(['page_view']);
    expect(JSON.parse(localStorage.getItem(consentKey)!)).toMatchObject({ analytics: false });
  });
});
