import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy-load all pages for faster initial load
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
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
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const DriverAssignments = lazy(() => import("./pages/driver/DriverAssignments"));
const DriverAssignmentDetail = lazy(() => import("./pages/driver/DriverAssignmentDetail"));
const DriverProfile = lazy(() => import("./pages/driver/DriverProfile"));
const DriverTimeReport = lazy(() => import("./pages/driver/DriverTimeReport"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/portal" element={<CustomerPortal />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                {/* Admin routes */}
                <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/assignments" element={<ProtectedRoute requiredRole="admin"><AdminAssignments /></ProtectedRoute>} />
                <Route path="/admin/assignments/new" element={<ProtectedRoute requiredRole="admin"><AdminNewAssignment /></ProtectedRoute>} />
                <Route path="/admin/assignments/:id" element={<ProtectedRoute requiredRole="admin"><AdminAssignmentDetail /></ProtectedRoute>} />
                <Route path="/admin/customers" element={<ProtectedRoute requiredRole="admin"><AdminCustomers /></ProtectedRoute>} />
                <Route path="/admin/customers/new" element={<ProtectedRoute requiredRole="admin"><AdminNewCustomer /></ProtectedRoute>} />
                <Route path="/admin/customers/:id" element={<ProtectedRoute requiredRole="admin"><AdminCustomerDetail /></ProtectedRoute>} />
                <Route path="/admin/drivers" element={<ProtectedRoute requiredRole="admin"><AdminDrivers /></ProtectedRoute>} />
                <Route path="/admin/invoices" element={<ProtectedRoute requiredRole="admin"><AdminInvoices /></ProtectedRoute>} />
                <Route path="/admin/invoices/new" element={<ProtectedRoute requiredRole="admin"><AdminNewInvoice /></ProtectedRoute>} />
                <Route path="/admin/reports" element={<ProtectedRoute requiredRole="admin"><AdminReports /></ProtectedRoute>} />
                <Route path="/admin/statistics" element={<ProtectedRoute requiredRole="admin"><AdminStatistics /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
                <Route path="/admin/driver-settings" element={<ProtectedRoute requiredRole="admin"><AdminDriverSettings /></ProtectedRoute>} />
                <Route path="/admin/live-map" element={<ProtectedRoute requiredRole="admin"><AdminLiveMap /></ProtectedRoute>} />
                <Route path="/admin/calendar" element={<ProtectedRoute requiredRole="admin"><AdminCalendar /></ProtectedRoute>} />
                <Route path="/admin/articles" element={<ProtectedRoute requiredRole="admin"><AdminArticles /></ProtectedRoute>} />
                <Route path="/admin/vehicles" element={<ProtectedRoute requiredRole="admin"><AdminVehicles /></ProtectedRoute>} />
                <Route path="/admin/orders" element={<ProtectedRoute requiredRole="admin"><AdminOrders /></ProtectedRoute>} />
                <Route path="/admin/order-templates" element={<ProtectedRoute requiredRole="admin"><AdminOrderTemplates /></ProtectedRoute>} />
                {/* Driver routes */}
                <Route path="/driver" element={<ProtectedRoute requiredRole="driver"><DriverAssignments /></ProtectedRoute>} />
                <Route path="/driver/assignment/:id" element={<ProtectedRoute requiredRole="driver"><DriverAssignmentDetail /></ProtectedRoute>} />
                <Route path="/driver/time-report" element={<ProtectedRoute requiredRole="driver"><DriverTimeReport /></ProtectedRoute>} />
                <Route path="/driver/profile" element={<ProtectedRoute requiredRole="driver"><DriverProfile /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
        <PwaInstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
