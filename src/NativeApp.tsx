import { lazy, Suspense, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DriverLayout } from '@/components/DriverLayout';
import { DriverPushNotifications } from '@/components/DriverPushNotifications';
import { NativeAppRuntime } from '@/components/NativeAppRuntime';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const DriverAssignments = lazy(() => import('@/pages/driver/DriverAssignments'));
const DriverAssignmentDetail = lazy(() => import('@/pages/driver/DriverAssignmentDetail'));
const DriverProfile = lazy(() => import('@/pages/driver/DriverProfile'));
const DriverTimeReport = lazy(() => import('@/pages/driver/DriverTimeReport'));

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

// A separate entry keeps website, administration, payments and PDF encryption
// dependencies out of the distributed app, rather than merely hiding routes.
export default function NativeApp() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster /><Sonner />
          <BrowserRouter>
            <AuthProvider>
              <ErrorBoundary>
                <ScrollToTop />
                <NativeAppRuntime />
                <DriverPushNotifications />
                <Suspense fallback={<div role="status" aria-label="Laddar sida" className="flex min-h-screen items-center justify-center bg-background">Laddar…</div>}>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/driver" element={<ProtectedRoute requiredRole="driver"><DriverLayout showInvoices={false} /></ProtectedRoute>}>
                      <Route index element={<Navigate to="assignments" replace />} />
                      <Route path="assignments" element={<DriverAssignments />} />
                      <Route path="assignments/:id" element={<DriverAssignmentDetail />} />
                      <Route path="assignment/:id" element={<DriverAssignmentDetail />} />
                      <Route path="time-report" element={<DriverTimeReport />} />
                      <Route path="profile" element={<DriverProfile />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/driver" replace />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
