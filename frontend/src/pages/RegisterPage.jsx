import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    user_type: 'person',
    phone: '',
    address: '',
    business_name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register(formData);
      toast.success('¡Cuenta creada exitosamente!');
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-lg" data-testid="register-card">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Registrarse</CardTitle>
            <CardDescription>Crea tu cuenta en QR Profiles</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Cuenta</Label>
                <RadioGroup
                  value={formData.user_type}
                  onValueChange={(value) => handleChange('user_type', value)}
                  data-testid="register-user-type-radio"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="person" id="person" data-testid="register-type-person" />
                    <Label htmlFor="person" className="cursor-pointer">Persona Natural</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="business" id="business" data-testid="register-type-business" />
                    <Label htmlFor="business" className="cursor-pointer">Empresa</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{formData.user_type === 'business' ? 'Nombre de Contacto' : 'Nombre Completo'}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  data-testid="register-name-input"
                />
              </div>

              {formData.user_type === 'business' && (
                <div className="space-y-2">
                  <Label htmlFor="business_name">Nombre de la Empresa</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    data-testid="register-business-name-input"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  data-testid="register-email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                    data-testid="register-password-input"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    data-testid="register-toggle-password-visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  data-testid="register-phone-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección (opcional)</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  data-testid="register-address-input"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="register-submit-btn"
              >
                {loading ? 'Cargando...' : 'Crear Cuenta'}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-primary hover:underline" data-testid="register-login-link">
                  Inicia sesión
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Layout>
  );
};
