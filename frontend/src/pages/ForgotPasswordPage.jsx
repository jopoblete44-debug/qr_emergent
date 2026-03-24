import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { requestPasswordResetCode, resetPasswordWithCode } from '../utils/api';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isResetFormValid = useMemo(() => (
    Boolean(email.trim() && code.trim() && newPassword.trim() && confirmPassword.trim())
  ), [email, code, newPassword, confirmPassword]);

  const handleRequestCode = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await requestPasswordResetCode(email.trim());
      toast.success(response?.message || 'Si el correo existe, te enviamos un código de recuperación.');
      if (response?.dev_reset_code) {
        setCode(response.dev_reset_code);
        toast.info(`Código de desarrollo: ${response.dev_reset_code}`);
      }
      setStep('reset');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No pudimos procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (!isResetFormValid) return;
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const response = await resetPasswordWithCode({
        email: email.trim(),
        code: code.trim(),
        new_password: newPassword,
      });
      toast.success(response?.message || 'Contraseña actualizada correctamente.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No pudimos actualizar tu contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Recuperar contraseña</CardTitle>
            <CardDescription>
              {step === 'request'
                ? 'Te enviaremos un código para restablecer tu acceso.'
                : 'Ingresa el código recibido y define tu nueva contraseña.'}
            </CardDescription>
          </CardHeader>

          {step === 'request' ? (
            <form onSubmit={handleRequestCode}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Correo electrónico</Label>
                  <div className="relative">
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      className="pl-9"
                      data-testid="forgot-password-email-input"
                    />
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar código'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="text-primary hover:underline">
                    Volver al login
                  </Link>
                </p>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Correo electrónico</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    data-testid="reset-password-email-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-code">Código de recuperación</Label>
                  <div className="relative">
                    <Input
                      id="reset-code"
                      type="text"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      placeholder="Ej: 123456"
                      required
                      className="pl-9 tracking-[0.2em]"
                      data-testid="reset-password-code-input"
                    />
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                      data-testid="reset-password-new-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((previous) => !previous)}
                      className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                      data-testid="reset-password-confirm-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((previous) => !previous)}
                      className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading || !isResetFormValid}>
                  {loading ? 'Actualizando...' : 'Actualizar contraseña'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep('request')}
                  disabled={loading}
                >
                  Solicitar otro código
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </Layout>
  );
};
