import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart3, MapPin, Settings, User, History, Menu, Inbox, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    title: 'Estadísticas',
    icon: BarChart3,
    href: '/statistics',
  },
  {
    title: 'Ubicaciones',
    icon: MapPin,
    href: '/locations',
  },
  {
    title: 'Historial',
    icon: History,
    href: '/scan-history',
  },
  {
    title: 'Leads',
    icon: Inbox,
    href: '/leads',
  },
  {
    title: 'Suscripciones',
    icon: CreditCard,
    href: '/subscriptions',
  },
  {
    title: 'Mi Cuenta',
    icon: User,
    href: '/account',
  },
  {
    title: 'Configuración',
    icon: Settings,
    href: '/settings',
  },
];

const SidebarLinks = ({ isActive, closeOnClick = false }) => (
  <nav className="space-y-2">
    {menuItems.map((item) => {
      const Icon = item.icon;
      const link = (
        <Link
          to={item.href}
          className={cn(
            'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
            isActive(item.href)
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          )}
          data-testid={`sidebar-${item.href.slice(1)}`}
        >
          <Icon className="h-5 w-5" />
          <span className="font-medium">{item.title}</span>
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

export const DashboardSidebarMobile = () => {
  const location = useLocation();
  const isActive = (href) => location.pathname === href;

  return (
    <div className="lg:hidden sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="px-4 py-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" data-testid="dashboard-mobile-menu-btn">
              <Menu className="h-4 w-4" />
              Menú
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="border-b border-border px-4 py-4">
              <SheetTitle>Navegación</SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <SidebarLinks isActive={isActive} closeOnClick />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export const DashboardSidebar = () => {
  const location = useLocation();
  const isActive = (href) => location.pathname === href;

  return (
    <aside className="w-64 border-r border-border bg-card h-[calc(100vh-4rem)] sticky top-16 hidden lg:block">
      <div className="p-4">
        <SidebarLinks isActive={isActive} />
      </div>
    </aside>
  );
};
