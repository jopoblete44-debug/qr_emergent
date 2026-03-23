import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { Button } from './ui/button';
import { Moon, Sun, ShoppingCart, User, LogOut, LayoutDashboard, Shield } from 'lucide-react';
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
  const showCartShortcut = !location.pathname.startsWith('/admin');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
            <Link to="/shop" className="text-sm font-medium hover:text-primary transition-colors" data-testid="nav-shop-link">
              Tienda
            </Link>
            <Link to="/services" className="text-sm font-medium hover:text-primary transition-colors" data-testid="nav-services-link">
              Servicios
            </Link>
            {user && !user.is_admin && (
              <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors" data-testid="nav-dashboard-link">
                Dashboard
              </Link>
            )}
            {user?.is_admin && (
              <Link to="/admin" className="text-sm font-medium hover:text-primary transition-colors" data-testid="nav-admin-link">
                Admin
              </Link>
            )}
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
              <div className="flex items-center space-x-2">
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
          </div>
        </div>
      </div>
    </nav>
  );
};
