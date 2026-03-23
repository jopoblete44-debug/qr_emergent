import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Save, Settings, Bell, Globe, CreditCard, Shield, Store, TrendingUp, Truck } from 'lucide-react';
import { fetchAdminSettings, updateAdminSettings, seedFreeCouponFromSettings, uploadImageFile } from '../utils/api';

export const AdminSettingsPage = () => {
  const [settings, setSettings] = useState({
    site_name: 'QR Profiles',
    site_description: 'Plataforma de gestión de perfiles QR',
    brand_logo_url: '',
    favicon_url: '',
    seo_title: 'QR Profiles | Plataforma de perfiles QR',
    seo_description: 'Crea, administra y optimiza perfiles QR para empresas y personas.',
    seo_keywords: 'QR, perfiles QR, tarjetas QR, marketing QR',
    seo_og_image_url: '',
    seo_indexing_enabled: true,
    contact_email: '',
    contact_phone: '',
    default_qr_expiration_days: 365,
    max_qr_per_person: 5,
    max_qr_per_business: 50,
    allow_person_create_qr: false,
    allow_business_create_qr: true,
    enable_notifications_email: false,
    enable_notifications_whatsapp: false,
    enable_notifications_telegram: false,
    notification_email_sender: '',
    whatsapp_api_key: '',
    telegram_bot_token: '',
    enable_payments: false,
    currency: 'CLP',
    mercadopago_public_key: '',
    mercadopago_access_token: '',
    enable_store: true,
    enable_coupons: true,
    default_shipping_cost: 2990,
    shipping_regions: [],
    store_theme_mode: 'default',
    store_primary_color: '#111827',
    store_secondary_color: '#1f2937',
    store_accent_color: '#0ea5e9',
    store_home_banner_url: '',
    store_support_email: '',
    store_support_whatsapp: '',
    store_enable_guest_checkout: false,
    store_enable_out_of_stock_waitlist: false,
    enforce_master_only_subscription_purchase: true,
    allow_admin_manual_subscription_grants: true,
    enable_google_reviews_cta: false,
    google_review_link: '',
    google_review_place_id: '',
    enable_whatsapp_cta: false,
    whatsapp_number: '',
    whatsapp_default_message: 'Hola, te contacto desde el QR.',
    enable_whatsapp_after_scan: false,
    enable_campaign_tracking: true,
    enable_ab_tracking: true,
    enable_loyalty_program: false,
    loyalty_points_per_scan: 1,
    loyalty_redeem_threshold: 50,
    enable_public_lead_form: true,
    lead_form_title: 'Solicitar Contacto',
    lead_form_success_message: 'Mensaje enviado',
    require_lead_phone_or_email: true,
    lead_rate_limit_window_seconds: 60,
    lead_rate_limit_max_requests: 3,
    enable_lead_honeypot: true,
    enable_lead_turnstile: false,
    turnstile_site_key: '',
    turnstile_secret_key: '',
    enable_lead_notifications: false,
    lead_notification_emails: '',
    lead_notification_webhook_url: '',
    auto_language_detection: false,
    default_language: 'es',
    maintenance_mode: false,
    maintenance_message: 'Estamos en mantenimiento. Volvemos pronto.',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingSettingKey, setUploadingSettingKey] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await fetchAdminSettings();
      if (data && typeof data === 'object') {
        setSettings(prev => ({
          ...prev,
          ...data,
          shipping_regions: Array.isArray(data.shipping_regions) ? data.shipping_regions : prev.shipping_regions,
        }));
      }
    } catch (error) {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateAdminSettings(settings);
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleUploadSettingImage = async (key, file, scope) => {
    if (!file) return;
    try {
      setUploadingSettingKey(key);
      const response = await uploadImageFile(file, scope);
      if (!response?.url) throw new Error('Upload sin URL');
      updateSetting(key, response.url);
      toast.success('Imagen subida correctamente');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo subir la imagen');
    } finally {
      setUploadingSettingKey('');
    }
  };

  const updateShippingRegion = (regionId, patch) => {
    setSettings((prev) => ({
      ...prev,
      shipping_regions: (prev.shipping_regions || []).map((region) => (
        region.id === regionId ? { ...region, ...patch } : region
      )),
    }));
  };

  const updateShippingCommune = (regionId, communeId, patch) => {
    setSettings((prev) => ({
      ...prev,
      shipping_regions: (prev.shipping_regions || []).map((region) => {
        if (region.id !== regionId) return region;
        return {
          ...region,
          communes: (region.communes || []).map((commune) => (
            commune.id === communeId ? { ...commune, ...patch } : commune
          )),
        };
      }),
    }));
  };

  const applyRegionPriceToCommunes = (regionId) => {
    setSettings((prev) => ({
      ...prev,
      shipping_regions: (prev.shipping_regions || []).map((region) => {
        if (region.id !== regionId) return region;
        const regionPrice = Number(region.price || 0);
        return {
          ...region,
          communes: (region.communes || []).map((commune) => ({ ...commune, price: regionPrice })),
        };
      }),
    }));
  };

  const toggleRegionEnabled = (regionId, enabled) => {
    setSettings((prev) => ({
      ...prev,
      shipping_regions: (prev.shipping_regions || []).map((region) => {
        if (region.id !== regionId) return region;
        return {
          ...region,
          enabled,
          communes: (region.communes || []).map((commune) => ({ ...commune, enabled })),
        };
      }),
    }));
  };

  const handleSeedFreeCoupon = async () => {
    try {
      await seedFreeCouponFromSettings();
      toast.success('Cupón FREE listo para pruebas');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo crear el cupón FREE');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute adminOnly>
        <AdminLayout>
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div></div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute adminOnly>
      <AdminLayout>
        <div className="p-6 lg:p-8 space-y-6" data-testid="admin-settings">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Configuración
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Configuración general de la plataforma</p>
            </div>
            <Button onClick={handleSave} disabled={saving} data-testid="save-settings-btn">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>

          <Tabs defaultValue="general">
            <TabsList className="w-full flex flex-wrap gap-2 h-auto">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="qr">Códigos QR</TabsTrigger>
              <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
              <TabsTrigger value="payments">Pagos</TabsTrigger>
              <TabsTrigger value="subscriptions">Suscripciones</TabsTrigger>
              <TabsTrigger value="store">Tienda</TabsTrigger>
              <TabsTrigger value="shipping">Envíos</TabsTrigger>
              <TabsTrigger value="growth">Growth</TabsTrigger>
              <TabsTrigger value="advanced">Avanzado</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />Información del Sitio</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre del Sitio</Label>
                      <Input value={settings.site_name} onChange={(e) => updateSetting('site_name', e.target.value)} data-testid="setting-site-name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email de Contacto</Label>
                      <Input value={settings.contact_email} onChange={(e) => updateSetting('contact_email', e.target.value)} data-testid="setting-contact-email" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea value={settings.site_description} onChange={(e) => updateSetting('site_description', e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono de Contacto</Label>
                    <Input value={settings.contact_phone} onChange={(e) => updateSetting('contact_phone', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Logo principal</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadSettingImage('brand_logo_url', e.target.files?.[0], 'brand')}
                      />
                      {uploadingSettingKey === 'brand_logo_url' && <p className="text-xs text-muted-foreground">Subiendo...</p>}
                      {settings.brand_logo_url && (
                        <div className="space-y-2">
                          <img src={settings.brand_logo_url} alt="Logo" className="w-20 h-20 rounded object-cover border" />
                          <Button type="button" size="sm" variant="outline" onClick={() => updateSetting('brand_logo_url', '')}>
                            Quitar logo
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Favicon</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadSettingImage('favicon_url', e.target.files?.[0], 'brand')}
                      />
                      {uploadingSettingKey === 'favicon_url' && <p className="text-xs text-muted-foreground">Subiendo...</p>}
                      {settings.favicon_url && (
                        <div className="space-y-2">
                          <img src={settings.favicon_url} alt="Favicon" className="w-12 h-12 rounded object-cover border" />
                          <Button type="button" size="sm" variant="outline" onClick={() => updateSetting('favicon_url', '')}>
                            Quitar favicon
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border-t pt-4 space-y-3">
                    <h3 className="text-sm font-semibold">SEO</h3>
                    <div className="space-y-2">
                      <Label>Título SEO</Label>
                      <Input value={settings.seo_title} onChange={(e) => updateSetting('seo_title', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción SEO</Label>
                      <Textarea
                        value={settings.seo_description}
                        onChange={(e) => updateSetting('seo_description', e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Palabras clave SEO</Label>
                      <Input
                        value={settings.seo_keywords}
                        onChange={(e) => updateSetting('seo_keywords', e.target.value)}
                        placeholder="qr, negocios, perfiles digitales..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Imagen Open Graph</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadSettingImage('seo_og_image_url', e.target.files?.[0], 'seo')}
                      />
                      {uploadingSettingKey === 'seo_og_image_url' && <p className="text-xs text-muted-foreground">Subiendo...</p>}
                      {settings.seo_og_image_url && (
                        <div className="space-y-2">
                          <img src={settings.seo_og_image_url} alt="Open Graph" className="w-24 h-16 rounded object-cover border" />
                          <Button type="button" size="sm" variant="outline" onClick={() => updateSetting('seo_og_image_url', '')}>
                            Quitar imagen
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Permitir indexación (SEO)</Label>
                        <p className="text-xs text-muted-foreground">Si se desactiva, la tienda puede marcarse como no indexable.</p>
                      </div>
                      <Switch checked={settings.seo_indexing_enabled} onCheckedChange={(v) => updateSetting('seo_indexing_enabled', v)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Configuración de QR</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Expiración por defecto (días)</Label>
                      <Input type="number" value={settings.default_qr_expiration_days} onChange={(e) => updateSetting('default_qr_expiration_days', parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Máx. QRs por Persona</Label>
                      <Input type="number" value={settings.max_qr_per_person} onChange={(e) => updateSetting('max_qr_per_person', parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Máx. QRs por Empresa</Label>
                      <Input type="number" value={settings.max_qr_per_business} onChange={(e) => updateSetting('max_qr_per_business', parseInt(e.target.value))} />
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Permitir Creación de QR (Persona)</Label>
                        <p className="text-xs text-muted-foreground">Los usuarios tipo persona pueden crear sus propios QR</p>
                      </div>
                      <Switch checked={settings.allow_person_create_qr} onCheckedChange={(v) => updateSetting('allow_person_create_qr', v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Permitir Creación de QR (Empresa)</Label>
                        <p className="text-xs text-muted-foreground">Los usuarios tipo empresa pueden crear sus propios QR</p>
                      </div>
                      <Switch checked={settings.allow_business_create_qr} onCheckedChange={(v) => updateSetting('allow_business_create_qr', v)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />Canales de Notificación</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label>Email</Label>
                        <p className="text-xs text-muted-foreground">Notificaciones por correo electrónico</p>
                      </div>
                      <Switch checked={settings.enable_notifications_email} onCheckedChange={(v) => updateSetting('enable_notifications_email', v)} />
                    </div>
                    {settings.enable_notifications_email && (
                      <div className="space-y-2 pl-4">
                        <Label>Email del Remitente</Label>
                        <Input value={settings.notification_email_sender} onChange={(e) => updateSetting('notification_email_sender', e.target.value)} placeholder="noreply@tudominio.com" />
                      </div>
                    )}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label>WhatsApp</Label>
                        <p className="text-xs text-muted-foreground">Notificaciones vía WhatsApp Business API</p>
                      </div>
                      <Switch checked={settings.enable_notifications_whatsapp} onCheckedChange={(v) => updateSetting('enable_notifications_whatsapp', v)} />
                    </div>
                    {settings.enable_notifications_whatsapp && (
                      <div className="space-y-2 pl-4">
                        <Label>API Key de WhatsApp</Label>
                        <Input type="password" value={settings.whatsapp_api_key} onChange={(e) => updateSetting('whatsapp_api_key', e.target.value)} />
                      </div>
                    )}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label>Telegram</Label>
                        <p className="text-xs text-muted-foreground">Notificaciones vía Bot de Telegram</p>
                      </div>
                      <Switch checked={settings.enable_notifications_telegram} onCheckedChange={(v) => updateSetting('enable_notifications_telegram', v)} />
                    </div>
                    {settings.enable_notifications_telegram && (
                      <div className="space-y-2 pl-4">
                        <Label>Token del Bot de Telegram</Label>
                        <Input type="password" value={settings.telegram_bot_token} onChange={(e) => updateSetting('telegram_bot_token', e.target.value)} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" />Configuración de Pagos</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Habilitar Pagos</Label>
                      <p className="text-xs text-muted-foreground">Activar sistema de pagos con MercadoPago</p>
                    </div>
                    <Switch checked={settings.enable_payments} onCheckedChange={(v) => updateSetting('enable_payments', v)} />
                  </div>
                  {settings.enable_payments && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Moneda</Label>
                        <Input value={settings.currency} onChange={(e) => updateSetting('currency', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>MercadoPago Public Key</Label>
                        <Input value={settings.mercadopago_public_key} onChange={(e) => updateSetting('mercadopago_public_key', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>MercadoPago Access Token</Label>
                        <Input type="password" value={settings.mercadopago_access_token} onChange={(e) => updateSetting('mercadopago_access_token', e.target.value)} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscriptions" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Reglas de Suscripciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Solo cuentas master compran suscripciones</Label>
                      <p className="text-xs text-muted-foreground">
                        Bloquea compras de planes QR para subcuentas y cuentas no empresariales.
                      </p>
                    </div>
                    <Switch
                      checked={settings.enforce_master_only_subscription_purchase}
                      onCheckedChange={(v) => updateSetting('enforce_master_only_subscription_purchase', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Permitir otorgamiento manual desde Admin</Label>
                      <p className="text-xs text-muted-foreground">
                        Habilita que Admin gestione suscripciones en Clientes &gt; botón Suscripciones.
                      </p>
                    </div>
                    <Switch
                      checked={settings.allow_admin_manual_subscription_grants}
                      onCheckedChange={(v) => updateSetting('allow_admin_manual_subscription_grants', v)}
                    />
                  </div>

                  <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                    Las subcuentas asociadas continúan usando los cupos de la cuenta master mientras la suscripción esté vigente.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="store" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4" />Configuración de Tienda</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Habilitar Tienda</Label>
                      <p className="text-xs text-muted-foreground">Permite compras de productos y servicios</p>
                    </div>
                    <Switch checked={settings.enable_store} onCheckedChange={(v) => updateSetting('enable_store', v)} />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Habilitar Cupones</Label>
                      <p className="text-xs text-muted-foreground">Permite aplicar cupones en checkout</p>
                    </div>
                    <Switch checked={settings.enable_coupons} onCheckedChange={(v) => updateSetting('enable_coupons', v)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Color principal</Label>
                      <Input value={settings.store_primary_color} onChange={(e) => updateSetting('store_primary_color', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Color secundario</Label>
                      <Input value={settings.store_secondary_color} onChange={(e) => updateSetting('store_secondary_color', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Color acento</Label>
                      <Input value={settings.store_accent_color} onChange={(e) => updateSetting('store_accent_color', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tema visual de tienda</Label>
                      <Input value={settings.store_theme_mode} onChange={(e) => updateSetting('store_theme_mode', e.target.value)} placeholder="default, elegant, minimal..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Banner principal de tienda</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadSettingImage('store_home_banner_url', e.target.files?.[0], 'store')}
                    />
                    {uploadingSettingKey === 'store_home_banner_url' && <p className="text-xs text-muted-foreground">Subiendo...</p>}
                    {settings.store_home_banner_url && (
                      <div className="space-y-2">
                        <img src={settings.store_home_banner_url} alt="Banner tienda" className="w-full max-w-sm h-28 rounded object-cover border" />
                        <Button type="button" size="sm" variant="outline" onClick={() => updateSetting('store_home_banner_url', '')}>
                          Quitar banner
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email soporte tienda</Label>
                      <Input value={settings.store_support_email} onChange={(e) => updateSetting('store_support_email', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp soporte tienda</Label>
                      <Input value={settings.store_support_whatsapp} onChange={(e) => updateSetting('store_support_whatsapp', e.target.value)} placeholder="569..." />
                    </div>
                  </div>
                  <div className="space-y-3 border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Permitir checkout invitado</Label>
                        <p className="text-xs text-muted-foreground">Si está activo, se habilita flujo técnico para compras sin sesión.</p>
                      </div>
                      <Switch checked={settings.store_enable_guest_checkout} onCheckedChange={(v) => updateSetting('store_enable_guest_checkout', v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Lista de espera sin stock</Label>
                        <p className="text-xs text-muted-foreground">Permite registrar interés cuando no hay stock.</p>
                      </div>
                      <Switch checked={settings.store_enable_out_of_stock_waitlist} onCheckedChange={(v) => updateSetting('store_enable_out_of_stock_waitlist', v)} />
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <Button type="button" variant="outline" onClick={handleSeedFreeCoupon} data-testid="seed-free-coupon-btn">
                      Crear/Verificar Cupón FREE
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      El cupón FREE aplica 100% de descuento al producto y envío para pruebas.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shipping" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Configuración de Envíos (Chile)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Costo de envío por defecto (CLP)</Label>
                    <Input
                      type="number"
                      value={settings.default_shipping_cost}
                      onChange={(e) => updateSetting('default_shipping_cost', parseInt(e.target.value || '0', 10))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estas regiones y comunas se usan para calcular el envío en checkout. Puedes editar precio por región o comuna y habilitar/deshabilitar cobertura.
                  </p>
                  <div className="space-y-3">
                    {(settings.shipping_regions || []).map((region) => (
                      <details key={region.id} className="border rounded-lg p-3" open={false}>
                        <summary className="cursor-pointer list-none">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{region.name}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${region.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}>
                                {region.enabled ? 'Habilitada' : 'Deshabilitada'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Precio región</Label>
                              <Input
                                type="number"
                                className="w-28 h-8"
                                value={region.price}
                                onChange={(e) => updateShippingRegion(region.id, { price: parseInt(e.target.value || '0', 10) })}
                              />
                              <Switch checked={!!region.enabled} onCheckedChange={(v) => toggleRegionEnabled(region.id, v)} />
                            </div>
                          </div>
                        </summary>
                        <div className="mt-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              Comunas: {(region.communes || []).length}
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => applyRegionPriceToCommunes(region.id)}
                            >
                              Aplicar precio región a comunas
                            </Button>
                          </div>
                          <div className="max-h-72 overflow-auto border rounded-md">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left px-2 py-1">Comuna</th>
                                  <th className="text-left px-2 py-1">Precio</th>
                                  <th className="text-left px-2 py-1">Habilitada</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(region.communes || []).map((commune) => (
                                  <tr key={commune.id} className="border-t">
                                    <td className="px-2 py-1.5">{commune.name}</td>
                                    <td className="px-2 py-1.5">
                                      <Input
                                        type="number"
                                        className="h-8 w-28"
                                        value={commune.price}
                                        onChange={(e) => updateShippingCommune(region.id, commune.id, { price: parseInt(e.target.value || '0', 10) })}
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <Switch
                                        checked={!!commune.enabled}
                                        onCheckedChange={(v) => updateShippingCommune(region.id, commune.id, { enabled: v })}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="growth" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Configuración de Crecimiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-3 border rounded-lg p-3">
                    <h3 className="font-semibold text-sm">CTA Perfil Público</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Habilitar CTA Google Reviews</Label>
                        <p className="text-xs text-muted-foreground">Muestra botón para dejar reseña en Google.</p>
                      </div>
                      <Switch checked={settings.enable_google_reviews_cta} onCheckedChange={(v) => updateSetting('enable_google_reviews_cta', v)} />
                    </div>
                    {settings.enable_google_reviews_cta && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Link directo de reseña</Label>
                          <Input
                            value={settings.google_review_link}
                            onChange={(e) => updateSetting('google_review_link', e.target.value)}
                            placeholder="https://search.google.com/local/writereview?placeid=..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Google Place ID (alternativo)</Label>
                          <Input
                            value={settings.google_review_place_id}
                            onChange={(e) => updateSetting('google_review_place_id', e.target.value)}
                            placeholder="ChIJ..."
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t pt-3">
                      <div>
                        <Label>Habilitar CTA WhatsApp</Label>
                        <p className="text-xs text-muted-foreground">Muestra botón de contacto por WhatsApp.</p>
                      </div>
                      <Switch checked={settings.enable_whatsapp_cta} onCheckedChange={(v) => updateSetting('enable_whatsapp_cta', v)} />
                    </div>
                    {settings.enable_whatsapp_cta && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Número WhatsApp por defecto</Label>
                          <Input
                            value={settings.whatsapp_number}
                            onChange={(e) => updateSetting('whatsapp_number', e.target.value)}
                            placeholder="56912345678"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Mensaje por defecto</Label>
                          <Textarea
                            value={settings.whatsapp_default_message}
                            onChange={(e) => updateSetting('whatsapp_default_message', e.target.value)}
                            rows={2}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Sugerir WhatsApp después del escaneo</Label>
                            <p className="text-xs text-muted-foreground">Devuelve enlace en API para flujos automáticos.</p>
                          </div>
                          <Switch checked={settings.enable_whatsapp_after_scan} onCheckedChange={(v) => updateSetting('enable_whatsapp_after_scan', v)} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 border rounded-lg p-3">
                    <h3 className="font-semibold text-sm">Tracking de Campañas</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Habilitar tracking UTM</Label>
                        <p className="text-xs text-muted-foreground">Captura utm_source, utm_medium, utm_campaign, etc.</p>
                      </div>
                      <Switch checked={settings.enable_campaign_tracking} onCheckedChange={(v) => updateSetting('enable_campaign_tracking', v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Habilitar tracking A/B</Label>
                        <p className="text-xs text-muted-foreground">Captura parámetro variant para test A/B.</p>
                      </div>
                      <Switch checked={settings.enable_ab_tracking} onCheckedChange={(v) => updateSetting('enable_ab_tracking', v)} />
                    </div>
                  </div>

                  <div className="space-y-3 border rounded-lg p-3">
                    <h3 className="font-semibold text-sm">Formulario de Leads Público</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Habilitar formulario de contacto</Label>
                        <p className="text-xs text-muted-foreground">Muestra formulario para captar leads en perfiles business.</p>
                      </div>
                      <Switch checked={settings.enable_public_lead_form} onCheckedChange={(v) => updateSetting('enable_public_lead_form', v)} />
                    </div>
                    {settings.enable_public_lead_form && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Título del formulario</Label>
                          <Input
                            value={settings.lead_form_title}
                            onChange={(e) => updateSetting('lead_form_title', e.target.value)}
                            placeholder="Solicitar Contacto"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Mensaje de éxito</Label>
                          <Input
                            value={settings.lead_form_success_message}
                            onChange={(e) => updateSetting('lead_form_success_message', e.target.value)}
                            placeholder="Mensaje enviado"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Requerir teléfono o email</Label>
                            <p className="text-xs text-muted-foreground">Evita leads sin datos de contacto.</p>
                          </div>
                          <Switch checked={settings.require_lead_phone_or_email} onCheckedChange={(v) => updateSetting('require_lead_phone_or_email', v)} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 border rounded-lg p-3">
                    <h3 className="font-semibold text-sm">Anti-spam Leads</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ventana rate limit (segundos)</Label>
                        <Input
                          type="number"
                          min={10}
                          value={settings.lead_rate_limit_window_seconds}
                          onChange={(e) => updateSetting('lead_rate_limit_window_seconds', parseInt(e.target.value || '60', 10))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Máx. solicitudes por IP</Label>
                        <Input
                          type="number"
                          min={1}
                          value={settings.lead_rate_limit_max_requests}
                          onChange={(e) => updateSetting('lead_rate_limit_max_requests', parseInt(e.target.value || '3', 10))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Honeypot anti-bot</Label>
                        <p className="text-xs text-muted-foreground">Bloquea formularios automatizados básicos.</p>
                      </div>
                      <Switch checked={settings.enable_lead_honeypot} onCheckedChange={(v) => updateSetting('enable_lead_honeypot', v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Habilitar Cloudflare Turnstile</Label>
                        <p className="text-xs text-muted-foreground">Captcha opcional para leads públicos.</p>
                      </div>
                      <Switch checked={settings.enable_lead_turnstile} onCheckedChange={(v) => updateSetting('enable_lead_turnstile', v)} />
                    </div>
                    {settings.enable_lead_turnstile && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Turnstile Site Key</Label>
                          <Input
                            value={settings.turnstile_site_key}
                            onChange={(e) => updateSetting('turnstile_site_key', e.target.value)}
                            placeholder="0x4AAAA..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Turnstile Secret Key</Label>
                          <Input
                            type="password"
                            value={settings.turnstile_secret_key}
                            onChange={(e) => updateSetting('turnstile_secret_key', e.target.value)}
                            placeholder="0x4AAAA..."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 border rounded-lg p-3">
                    <h3 className="font-semibold text-sm">Notificaciones de Leads</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Habilitar notificaciones de lead</Label>
                        <p className="text-xs text-muted-foreground">Dispara alertas al crear un lead público.</p>
                      </div>
                      <Switch checked={settings.enable_lead_notifications} onCheckedChange={(v) => updateSetting('enable_lead_notifications', v)} />
                    </div>
                    {settings.enable_lead_notifications && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Emails de alerta (separados por coma)</Label>
                          <Input
                            value={settings.lead_notification_emails}
                            onChange={(e) => updateSetting('lead_notification_emails', e.target.value)}
                            placeholder="ventas@tuempresa.com, crm@tuempresa.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Webhook de alerta (Zapier/Make/Slack)</Label>
                          <Input
                            value={settings.lead_notification_webhook_url}
                            onChange={(e) => updateSetting('lead_notification_webhook_url', e.target.value)}
                            placeholder="https://hooks..."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 border rounded-lg p-3">
                    <h3 className="font-semibold text-sm">Programa de Fidelización</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Habilitar fidelización</Label>
                        <p className="text-xs text-muted-foreground">Otorga puntos por escaneos y permite canje.</p>
                      </div>
                      <Switch checked={settings.enable_loyalty_program} onCheckedChange={(v) => updateSetting('enable_loyalty_program', v)} />
                    </div>
                    {settings.enable_loyalty_program && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Puntos por escaneo</Label>
                          <Input
                            type="number"
                            min={0}
                            value={settings.loyalty_points_per_scan}
                            onChange={(e) => updateSetting('loyalty_points_per_scan', parseInt(e.target.value || '0', 10))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Umbral de canje</Label>
                          <Input
                            type="number"
                            min={1}
                            value={settings.loyalty_redeem_threshold}
                            onChange={(e) => updateSetting('loyalty_redeem_threshold', parseInt(e.target.value || '1', 10))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Configuración Avanzada</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Detección Automática de Idioma</Label>
                      <p className="text-xs text-muted-foreground">Mostrar perfiles públicos en el idioma del dispositivo</p>
                    </div>
                    <Switch checked={settings.auto_language_detection} onCheckedChange={(v) => updateSetting('auto_language_detection', v)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Idioma por Defecto</Label>
                    <Input value={settings.default_language} onChange={(e) => updateSetting('default_language', e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between border-t pt-4">
                    <div>
                      <Label className="text-destructive">Modo Mantenimiento</Label>
                      <p className="text-xs text-muted-foreground">Bloquea el acceso público al sitio</p>
                    </div>
                    <Switch checked={settings.maintenance_mode} onCheckedChange={(v) => updateSetting('maintenance_mode', v)} />
                  </div>
                  {settings.maintenance_mode && (
                    <div className="space-y-2">
                      <Label>Mensaje de Mantenimiento</Label>
                      <Textarea value={settings.maintenance_message} onChange={(e) => updateSetting('maintenance_message', e.target.value)} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
};
