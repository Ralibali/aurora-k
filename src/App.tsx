import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { CookieConsent } from "@/components/CookieConsent";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { PlatformAdminGuard } from "@/components/PlatformAdminGuard";
import { AdminShell } from "@/components/AdminLayout";
import { DriverLayout } from "@/components/DriverLayout";
import { PlatformAdminShell } from "@/components/PlatformAdminLayout";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const TransportledningssystemPage = lazy(() => import("./pages/TransportledningssystemPage"));
const CoredinationAlternativPage = lazy(() => import("./pages/CoredinationAlternativPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const JoinPage = lazy(() => import("./pages/JoinPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminAssignments = lazy(() => import("./pages/admin/AdminAssignments"));
const AdminAssignmentDetail = lazy(() => import("./pages/admin/AdminAssignmentDetail"));
const AdminNewAssignment = lazy(() => import("./pages/admin/AdminNewAssignment"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminCustomerDetail = lazy(() => import("./pages/admin/AdminCustomerDetail"));
const AdminNewCustomer = lazy(() => import("./pages/admin/AdminNewCustomer"));
const AdminDrivers = lazy(() => import("./pages/admin/AdminDrivers"));
const AdminInvoices = lazy(() => import("./pages/admin/AdminInvoices"));
const AdminNewInvoice = lazy(() => import("./pages/admin/AdminNewInvoice"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminStatistics = lazy(() => import("./pages/admin/AdminStatistics"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminDriverSettings = lazy(() => import("./pages/admin/AdminDriverSettings"));
const AdminLiveMap = lazy(() => import("./pages/admin/AdminLiveMap"));
const AdminCalendar = lazy(() => import("./pages/admin/AdminCalendar"));
const AdminArticles = lazy(() => import("./pages/admin/AdminArticles"));
const AdminVehicles = lazy(() => import("./pages/admin/AdminVehicles"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminOrderTemplates = lazy(() => import("./pages/admin/AdminOrderTemplates"));
const AdminAbsences = lazy(() => import("./pages/admin/AdminAbsences"));
const AdminApprovals = lazy(() => import("./pages/admin/AdminApprovals"));
const AdminInvoiceTemplates = lazy(() => import("./pages/admin/AdminInvoiceTemplates"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminBookingRequests = lazy(() => import("./pages/admin/AdminBookingRequests"));
const AdminExternalResources = lazy(() => import("./pages/admin/AdminExternalResources"));
const AdminSatisfaction = lazy(() => import("./pages/admin/AdminSatisfaction"));
const AdminEnvironment = lazy(() => import("./pages/admin/AdminEnvironment"));
const AdminApiDocs = lazy(() => import("./pages/admin/AdminApiDocs"));
const AdminRouteOptimizer = lazy(() => import("./pages/admin/AdminRouteOptimizer"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const DriverAssignments = lazy(() => import("./pages/driver/DriverAssignments"));
const DriverAssignmentDetail = lazy(() => import("./pages/driver/DriverAssignmentDetail"));
const DriverProfile = lazy(() => import("./pages/driver/DriverProfile"));
const DriverTimeReport = lazy(() => import("./pages/driver/DriverTimeReport"));
const DriverInvoices = lazy(() => import("./pages/driver/DriverInvoices"));
const PlatformDashboard = lazy(() => import("./pages/platform/PlatformDashboard"));
const PlatformCompanies = lazy(() => import("./pages/platform/PlatformCompanies"));
const PlatformSupport = lazy(() => import("./pages/platform/PlatformSupport"));
const PlatformAnnouncements = lazy(() => import("./pages/platform/PlatformAnnouncements"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-4 w-full max-w-md px-4">
        <div className="h-8 w-2/3 mx-auto rounded bg-muted animate-pulse" />
        <div className="h-4 w-full rounded bg-muted animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/transportledningssystem" element={<TransportledningssystemPage />} />
                <Route path="/coredination-alternativ" element={<CoredinationAlternativPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/join" element={<JoinPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/portal" element={<CustomerPortal />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Admin routes — share a single sidebar shell */}
                <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><SubscriptionGuard><AdminShell /></SubscriptionGuard></ProtectedRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="assignments" element={<AdminAssignments />} />
                  <Route path="assignments/new" element={<AdminNewAssignment />} />
                  <Route path="assignments/:id" element={<AdminAssignmentDetail />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="customers/new" element={<AdminNewCustomer />} />
                  <Route path="customers/:id" element={<AdminCustomerDetail />} />
                  <Route path="drivers" element={<AdminDrivers />} />
                  <Route path="invoices" element={<AdminInvoices />} />
                  <Route path="invoices/new" element={<AdminNewInvoice />} />
                  <Route path="reports" element={<AdminReports />} />
                  <Route path="statistics" element={<AdminStatistics />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="driver-settings" element={<AdminDriverSettings />} />
                  <Route path="live-map" element={<AdminLiveMap />} />
                  <Route path="calendar" element={<AdminCalendar />} />
                  <Route path="articles" element={<AdminArticles />} />
                  <Route path="vehicles" element={<AdminVehicles />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="order-templates" element={<AdminOrderTemplates />} />
                  <Route path="absences" element={<AdminAbsences />} />
                  <Route path="approvals" element={<AdminApprovals />} />
                  <Route path="invoice-templates" element={<AdminInvoiceTemplates />} />
                  <Route path="notifications" element={<AdminNotifications />} />
                  <Route path="booking-requests" element={<AdminBookingRequests />} />
                  <Route path="external-resources" element={<AdminExternalResources />} />
                  <Route path="satisfaction" element={<AdminSatisfaction />} />
                  <Route path="environment" element={<AdminEnvironment />} />
                  <Route path="api" element={<AdminApiDocs />} />
                  <Route path="routes" element={<AdminRouteOptimizer />} />
                </Route>

                {/* Platform admin routes */}
                <Route path="/platform" element={<PlatformAdminGuard><PlatformAdminShell /></PlatformAdminGuard>}>
                  <Route index element={<PlatformDashboard />} />
                  <Route path="companies" element={<PlatformCompanies />} />
                  <Route path="support" element={<PlatformSupport />} />
                  <Route path="announcements" element={<PlatformAnnouncements />} />
                </Route>

{/* Driver routes — share a single layout shell */}
                <Route path="/driver" element={<ProtectedRoute requiredRole="driver"><DriverLayout /></ProtectedRoute>}>
                  <Route index element={<DriverAssignments />} />
                  <Route path="assignments" element={<DriverAssignments />} />
                  <Route path="assignment/:id" element={<DriverAssignmentDetail />} />
                  <Route path="time-report" element={<DriverTimeReport />} />
                  <Route path="profile" element={<DriverProfile />} />
                  <Route path="invoices" element={<DriverInvoices />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
        <PwaInstallPrompt />
        <CookieConsent />
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
