import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
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
        <Routes>
          <Route path="/" element={<LoginPage />} />
          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/assignments" element={<AdminAssignments />} />
          <Route path="/admin/assignments/new" element={<AdminNewAssignment />} />
          <Route path="/admin/assignments/:id" element={<AdminAssignmentDetail />} />
          <Route path="/admin/customers" element={<AdminCustomers />} />
          <Route path="/admin/customers/new" element={<AdminNewCustomer />} />
          <Route path="/admin/customers/:id" element={<AdminCustomerDetail />} />
          <Route path="/admin/drivers" element={<AdminDrivers />} />
          <Route path="/admin/invoices" element={<AdminInvoices />} />
          <Route path="/admin/invoices/new" element={<AdminNewInvoice />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/statistics" element={<AdminStatistics />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          {/* Driver routes */}
          <Route path="/driver" element={<DriverAssignments />} />
          <Route path="/driver/assignment/:id" element={<DriverAssignmentDetail />} />
          <Route path="/driver/profile" element={<DriverProfile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <PwaInstallPrompt />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
