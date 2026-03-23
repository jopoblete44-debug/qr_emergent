import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  LayoutDashboard, QrCode, Users, Settings, BarChart3, FileEdit, Moon, Sun, Menu, Package, Inbox
} from 'lucide-react';
import { Button } from './ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';

const adminNavItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { title: 'Códigos QR', icon: QrCode, href: '/admin/qr-profiles' },
  { title: 'Clientes', icon: Users, href: '/admin/users' },
  { title: 'Leads', icon: Inbox, href: '/admin/leads' },
  { title: 'Editor de Perfiles', icon: FileEdit, href: '/admin/profile-editor' },
  { title: 'Productos y Servicios', icon: Package, href: '/admin/store' },
  { title: 'Analítica', icon: BarChart3, href: '/admin/analytics' },
  { title: 'Configuración', icon: Settings, href: '/admin/settings' },
];

const AdminNavLinks = ({ isActive, closeOnClick = false }) => (
  <nav className="space-y-1">
    {adminNavItems.map((item) => {
      const link = (
        <Link
          to={item.href}
          data-testid={`admin-nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive(item.href)
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.title}
        </Link>
      );

      if (!closeOnClick) return <React.Fragment key={item.href}>{link}</React.Fragment>;
      return (
        <SheetClose asChild key={item.href}>
          {link}
        </SheetClose>
      );
    })}
  </nav>
);

export const AdminSidebarMobile = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isActive = (href) => {
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" data-testid="admin-mobile-menu-btn" aria-label="Abrir menú admin">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[290px] p-0">
          <SheetHeader className="border-b border-border px-4 py-4">
            <SheetTitle>Administración</SheetTitle>
          </SheetHeader>
          <div className="px-3 py-4">
            <AdminNavLinks isActive={isActive} closeOnClick />
          </div>
          <div className="border-t border-border p-3">
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
              {theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export const AdminSidebar = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const isActive = (href) => {
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="hidden lg:flex w-56 shrink-0 border-r border-border bg-card min-h-[calc(100vh-64px)] flex-col" data-testid="admin-sidebar">
      <div className="px-3 py-4 flex-1">
        <div className="mb-4 px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administración</span>
        </div>
        <AdminNavLinks isActive={isActive} />
      </div>
      <div className="border-t border-border p-3">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={toggleTheme}>
          {theme === 'light' ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
          {theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
        </Button>
      </div>
    </aside>
  );
};
