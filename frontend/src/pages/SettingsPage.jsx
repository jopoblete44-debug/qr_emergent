import React from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export const SettingsPage = () => {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="settings-page">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl mb-8">Configuración</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Notificaciones */}
            <Card>
              <CardHeader>
                <CardTitle>Notificaciones</CardTitle>
                <CardDescription>Configura cómo y cuándo recibir notificaciones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificaciones por Email</Label>
                    <p className="text-sm text-muted-foreground">Recibe alertas de escaneos por email</p>
                  </div>
                  <Switch data-testid="email-notifications-switch" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificaciones WhatsApp</Label>
                    <p className="text-sm text-muted-foreground">Recibe alertas instantáneas por WhatsApp</p>
                  </div>
                  <Switch data-testid="whatsapp-notifications-switch" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificaciones Telegram</Label>
                    <p className="text-sm text-muted-foreground">Recibe alertas por Telegram</p>
                  </div>
                  <Switch data-testid="telegram-notifications-switch" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Resumen Semanal</Label>
                    <p className="text-sm text-muted-foreground">Recibe un resumen semanal de actividad</p>
                  </div>
                  <Switch data-testid="weekly-summary-switch" />
                </div>
              </CardContent>
            </Card>

            {/* Privacidad */}
            <Card>
              <CardHeader>
                <CardTitle>Privacidad y Seguridad</CardTitle>
                <CardDescription>Controla quién puede ver tu información</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="profile-visibility">Visibilidad de Perfil</Label>
                  <Select defaultValue="public">
                    <SelectTrigger id="profile-visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Público</SelectItem>
                      <SelectItem value="private">Privado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mostrar Ubicación en Tiempo Real</Label>
                    <p className="text-sm text-muted-foreground">Permite que otros vean tu ubicación</p>
                  </div>
                  <Switch data-testid="location-visibility-switch" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Historial de Escaneos</Label>
                    <p className="text-sm text-muted-foreground">Guardar historial de escaneos</p>
                  </div>
                  <Switch defaultChecked data-testid="scan-history-switch" />
                </div>
              </CardContent>
            </Card>

            {/* Apariencia */}
            <Card>
              <CardHeader>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>Personaliza la apariencia de tu dashboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select defaultValue="es">
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <Select defaultValue="america-santiago">
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="america-santiago">Santiago (GMT-3)</SelectItem>
                      <SelectItem value="america-buenos_aires">Buenos Aires (GMT-3)</SelectItem>
                      <SelectItem value="america-sao_paulo">São Paulo (GMT-3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Zona de Peligro */}
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
                <CardDescription>Acciones irreversibles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Eliminar Cuenta</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Eliminar tu cuenta permanentemente. Esta acción no se puede deshacer.
                  </p>
                  <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors text-sm">
                    Eliminar Cuenta
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};
