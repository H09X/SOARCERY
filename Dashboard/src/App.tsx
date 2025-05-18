
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./layouts/DashboardLayout";
import EventDetailsPage from "./pages/EventDetailsPage";
import SettingsPage from "./pages/SettingsPage";

// Client Pages
import ClientDashboardPage from "./pages/client/ClientDashboardPage";
import ClientEventsPage from "./pages/client/ClientEventsPage";

// Admin Pages
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminClientsPage from "./pages/admin/AdminClientsPage";
import AdminClientEventsPage from "./pages/admin/AdminClientEventsPage";
import AdminPendingEventsPage from "./pages/admin/AdminPendingEventsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected Dashboard Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Client Routes */}
            <Route path="/" element={<DashboardLayout />}>
              <Route path="client" element={<ClientDashboardPage />} />
              <Route path="client/events" element={<ClientEventsPage />} />
              <Route path="client/settings" element={<SettingsPage />} />
            </Route>
            
            {/* Admin Routes */}
            <Route path="/" element={<DashboardLayout />}>
              <Route path="admin" element={<AdminDashboardPage />} />
              <Route path="admin/clients" element={<AdminClientsPage />} />
              <Route path="admin/client/:clientId" element={<AdminClientEventsPage />} />
              <Route path="admin/pending" element={<AdminPendingEventsPage />} />
              <Route path="admin/settings" element={<SettingsPage />} />
            </Route>
            
            {/* Event Details (accessible by both client and admin) */}
            <Route path="event/:eventId" element={<EventDetailsPage />} />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
