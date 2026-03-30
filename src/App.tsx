import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAssignments from "./pages/admin/AdminAssignments";
import AdminAssignmentDetail from "./pages/admin/AdminAssignmentDetail";
import AdminNewAssignment from "./pages/admin/AdminNewAssignment";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminCustomerDetail from "./pages/admin/AdminCustomerDetail";
import AdminNewCustomer from "./pages/admin/AdminNewCustomer";
import AdminDrivers from "./pages/admin/AdminDrivers";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminNewInvoice from "./pages/admin/AdminNewInvoice";
import AdminReports from "./pages/admin/AdminReports";
import AdminStatistics from "./pages/admin/AdminStatistics";
import AdminSettings from "./pages/admin/AdminSettings";
import DriverAssignments from "./pages/driver/DriverAssignments";
import DriverAssignmentDetail from "./pages/driver/DriverAssignmentDetail";
import DriverProfile from "./pages/driver/DriverProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LoginPage />} />
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
            {/* Driver routes */}
            <Route path="/driver" element={<ProtectedRoute requiredRole="driver"><DriverAssignments /></ProtectedRoute>} />
            <Route path="/driver/assignment/:id" element={<ProtectedRoute requiredRole="driver"><DriverAssignmentDetail /></ProtectedRoute>} />
            <Route path="/driver/profile" element={<ProtectedRoute requiredRole="driver"><DriverProfile /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <PwaInstallPrompt />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
