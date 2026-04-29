import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const STORAGE_KEY = 'aurora_demo_mode';

/**
 * Frontend-only demo mode.
 *
 * Usage:
 * - Add ?demo=1 to enable and persist demo mode.
 * - Add ?demo=0 to disable and persist disabled mode.
 * - Or call enable()/disable() from UI.
 *
 * Demo mode never writes demo records to the database. It only lets pages show
 * sample data when the real account is empty, which makes sales demos much
 * stronger and safer.
 */
export function useDemoMode() {
  const [searchParams] = useSearchParams();
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  });

  useEffect(() => {
    const demoParam = searchParams.get('demo');
    if (demoParam === '1') {
      window.localStorage.setItem(STORAGE_KEY, '1');
      setEnabled(true);
    }
    if (demoParam === '0') {
      window.localStorage.removeItem(STORAGE_KEY);
      setEnabled(false);
    }
  }, [searchParams]);

  const enable = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, '1');
    setEnabled(true);
  }, []);

  const disable = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setEnabled(false);
  }, []);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      if (next) window.localStorage.setItem(STORAGE_KEY, '1');
      else window.localStorage.removeItem(STORAGE_KEY);
      return next;
    });
  }, []);

  return useMemo(() => ({ enabled, enable, disable, toggle }), [enabled, enable, disable, toggle]);
}
