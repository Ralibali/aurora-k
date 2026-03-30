import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAssignments from "./pages/admin/AdminAssignments";
import AdminAssignmentDetail from "./pages/admin/AdminAssignmentDetail";
import AdminNewAssignment from "./pages/admin/AdminNewAssignment";
import AdminDrivers from "./pages/admin/AdminDrivers";
import AdminReports from "./pages/admin/AdminReports";
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
          <Route path="/admin/drivers" element={<AdminDrivers />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          {/* Driver routes */}
          <Route path="/driver" element={<DriverAssignments />} />
          <Route path="/driver/assignment/:id" element={<DriverAssignmentDetail />} />
          <Route path="/driver/profile" element={<DriverProfile />} />
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
