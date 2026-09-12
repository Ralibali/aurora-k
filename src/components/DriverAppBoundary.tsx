import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isDriverApp, isDriverAppRoute } from '@/lib/driver-app';

export function DriverAppBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  if (isDriverApp && !isDriverAppRoute(pathname)) return <Navigate to="/driver" replace />;
  return <>{children}</>;
}
