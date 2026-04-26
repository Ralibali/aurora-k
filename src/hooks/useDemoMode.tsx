import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface DemoModeContextValue {
  enabled: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

const STORAGE_KEY = 'aurora-demo-mode';

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);
  const enable = useCallback(() => setEnabled(true), []);
  const disable = useCallback(() => setEnabled(false), []);

  return (
    <DemoModeContext.Provider value={{ enabled, toggle, enable, disable }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) {
    // Safe fallback when used outside provider (e.g. driver/portal routes)
    return { enabled: false, toggle: () => {}, enable: () => {}, disable: () => {} };
  }
  return ctx;
}