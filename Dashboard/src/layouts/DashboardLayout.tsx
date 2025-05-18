import { useEffect } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  LayoutDashboard,
  Users,
  AlertTriangle,
  Bell,
  Settings,
  LogOut,
  ChevronRight 
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

function SidebarToggleButton({ show, onClick, className, iconClass, label }) {
  if (!show) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={className}
    >
      <ChevronRight className={iconClass} />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

function SidebarControls() {
  const sidebar = useSidebar();
  return (
    <>
      <SidebarToggleButton
        show={sidebar.open}
        onClick={() => sidebar.setOpen(false)}
        className="h-9 w-9"
        iconClass="h-4 w-4 rotate-180 transition-transform"
        label="Close sidebar"
      />
      <SidebarToggleButton
        show={!sidebar.open}
        onClick={() => sidebar.setOpen(true)}
        className="fixed top-6 left-2 z-50 shadow bg-white border rounded-full"
        iconClass="h-4 w-4 transition-transform"
        label="Open sidebar"
      />
    </>
  );
}

const DashboardLayout = () => {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-soar-purple"></div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isActive = (path: string) => location.pathname === path;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full relative">
        <Sidebar className="border-r" collapsible="offcanvas" variant="sidebar">
          <SidebarHeader className="h-16 flex items-center px-6 border-b">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-soar-purple" />
              <span className="font-semibold text-lg">SOARCERY</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <div className="py-4">
              <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                  Dashboard
                </h2>
                <div className="space-y-1">
                  {isAdmin ? (
                    <>
                      <Button
                        variant={isActive('/admin') ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        asChild
                      >
                        <Link to="/admin">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Overview
                        </Link>
                      </Button>
                      <Button
                        variant={isActive('/admin/clients') ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        asChild
                      >
                        <Link to="/admin/clients">
                          <Users className="mr-2 h-4 w-4" />
                          Clients
                        </Link>
                      </Button>
                      <Button
                        variant={isActive('/admin/pending') ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        asChild
                      >
                        <Link to="/admin/pending">
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Pending Approval
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant={isActive('/client') ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        asChild
                      >
                        <Link to="/client">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Overview
                        </Link>
                      </Button>
                      <Button
                        variant={isActive('/client/events') ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        asChild
                      >
                        <Link to="/client/events">
                          <Bell className="mr-2 h-4 w-4" />
                          Events
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                  Settings
                </h2>
                <div className="space-y-1">
                  <Button 
                    variant={isActive(isAdmin ? '/admin/settings' : '/client/settings') ? 'secondary' : 'ghost'} 
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to={isAdmin ? '/admin/settings' : '/client/settings'}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start" 
                    onClick={logout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex justify-center p-4">
              <SidebarControls />
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarControls />
        <div className="flex-1 flex flex-col min-h-screen max-h-screen overflow-hidden">
          <DashboardHeader 
            title={isAdmin ? "Admin Dashboard" : "Client Dashboard"}
            toggleSidebar={() => {
              const sidebar = useSidebar();
              sidebar.toggleSidebar();
            }} 
          />
          <main className="flex-1 p-6 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
