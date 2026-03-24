import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { Button } from './ui/button';
import { Moon, Sun, ShoppingCart, User, LogOut, LayoutDashboard, Shield, Menu, X } from 'lucide-react';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { itemCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const showCartShortcut = !location.pathname.startsWith('/admin');
  const isAdminRoute = location.pathname.startsWith('/admin');

  const navigationLinks = useMemo(() => {
    const links = [
      { to: '/shop', label: 'Tienda', testId: 'nav-shop-link' },
      { to: '/services', label: 'Servicios', testId: 'nav-services-link' },
    ];

    if (user?.is_admin) {
      links.push({ to: '/admin', label: 'Admin', testId: 'nav-admin-link' });
    } else if (user) {
      links.push({ to: '/dashboard', label: 'Dashboard', testId: 'nav-dashboard-link' });
    }

    return links;
  }, [user]);

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
    navigate('/');
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2" data-testid="nav-home-link">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">Q</span>
            </div>
            <span className="font-heading font-bold text-xl">QR Profiles</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            {navigationLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium hover:text-primary transition-colors"
                data-testid={link.testId}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            {showCartShortcut && (
              <Button asChild variant="ghost" size="icon" className="relative" data-testid="global-cart-shortcut">
                <Link to="/shop" aria-label="Abrir tienda y carrito">
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-1 -right-2 h-5 min-w-5 px-1.5 text-[10px] leading-4">
                      {itemCount}
                    </Badge>
                  )}
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="theme-toggle-btn"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>

            {!user ? (
              <div className="hidden md:flex items-center space-x-2">
                <Button variant="ghost" asChild data-testid="nav-login-btn">
                  <Link to="/login">Iniciar Sesión</Link>
                </Button>
                <Button asChild data-testid="nav-register-btn">
                  <Link to="/register">Registrarse</Link>
                </Button>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="user-menu-btn">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!user.is_admin && (
                    <DropdownMenuItem asChild data-testid="user-menu-dashboard">
                      <Link to="/dashboard" className="flex items-center">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user.is_admin && (
                    <DropdownMenuItem asChild data-testid="user-menu-admin">
                      <Link to="/admin" className="flex items-center">
                        <Shield className="mr-2 h-4 w-4" />
                        Panel Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} data-testid="user-menu-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
              data-testid="mobile-nav-toggle"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden">
          <button
            type="button"
            className="fixed inset-0 top-16 z-40 bg-background/70 backdrop-blur-sm"
            onClick={closeMobileMenu}
            aria-label="Cerrar menú móvil"
          />
          <div
            id="mobile-navigation-drawer"
            className="fixed inset-x-0 top-16 z-50 border-b border-border bg-background shadow-lg"
          >
            <div className="container mx-auto px-4 sm:px-6 py-4">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-2">
                  {navigationLinks.map((link) => {
                    const isActive = location.pathname === link.to || (link.to === '/admin' && isAdminRoute);

                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={closeMobileMenu}
                        className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/60 text-foreground hover:bg-muted'
                        }`}
                        data-testid={`${link.testId}-mobile`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>

                {!user ? (
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button variant="outline" asChild data-testid="nav-login-btn-mobile">
                      <Link to="/login" onClick={closeMobileMenu}>Iniciar Sesión</Link>
                    </Button>
                    <Button asChild data-testid="nav-register-btn-mobile">
                      <Link to="/register" onClick={closeMobileMenu}>Registrarse</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {user.is_admin ? <Shield className="h-5 w-5" /> : <User className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {user.username || user.email || 'Tu cuenta'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.is_admin ? 'Acceso administrativo' : 'Acceso a tu dashboard'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-4 w-full justify-center"
                      onClick={handleLogout}
                      data-testid="user-menu-logout-mobile"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
