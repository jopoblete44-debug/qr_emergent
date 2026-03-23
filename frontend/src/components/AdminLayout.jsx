import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AdminSidebar, AdminSidebarMobile } from './AdminSidebar';
import { Button } from './ui/button';
import { LogOut, Shield } from 'lucide-react';

export const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background" data-testid="admin-layout">
      {/* Admin Top Bar */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <AdminSidebarMobile />
            <Link to="/admin" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-lg">QR Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name || user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="admin-logout-btn">
              <LogOut className="h-4 w-4 mr-1" />
              Salir
            </Button>
          </div>
        </div>
      </header>
      {/* Content */}
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 overflow-auto min-h-[calc(100vh-56px)]">
          {children}
        </main>
      </div>
    </div>
  );
};
