import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = await login(email, password);
      toast.success('¡Bienvenido!');
      navigate(userData.is_admin ? '/admin' : '/dashboard');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md" data-testid="login-card">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Iniciar Sesión</CardTitle>
            <CardDescription>Ingresa a tu cuenta de QR Profiles</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    data-testid="login-toggle-password-visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading ? 'Cargando...' : 'Iniciar Sesión'}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                <Link to="/forgot-password" className="text-primary hover:underline" data-testid="login-forgot-password-link">
                  ¿Olvidaste tu contraseña?
                </Link>
              </p>
              <p className="text-sm text-center text-muted-foreground">
                ¿No tienes cuenta?{' '}
                <Link to="/register" className="text-primary hover:underline" data-testid="login-register-link">
                  Regístrate aquí
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Layout>
  );
};
