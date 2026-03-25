import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { QRProfileCard } from '../components/QRProfileCard';
import { ProfileDataEditor } from '../components/ProfileDataEditor';
import {
  fetchMyQRProfiles,
  createQRProfile,
  updateQRProfile,
  updateQRStatus,
  deleteQRProfile,
  fetchMyOrders,
  fetchQRCreationPolicy,
  fetchProfileTypesConfig,
} from '../utils/api';
import { toast } from 'sonner';
import { Plus, QrCode, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { API_BASE, getQrDownloadExtension } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const DEFAULT_PUBLIC_SETTINGS = {
  request_location_automatically: false,
  top_profile_photo_enabled: false,
  top_profile_photo_shape: 'circle',
  floating_buttons: [],
};
const FLOATING_BUTTON_ALIASES = {
  location: 'send_location',
  call: 'call_contact',
  emergency_call: 'call_emergency',
  google_review: 'rate_restaurant',
  catalog_pdf: 'view_catalog_pdf',
};

const normalizeProfileType = (value) => (String(value || '').trim().toLowerCase() === 'business' ? 'business' : 'personal');

const normalizeFloatingButtonType = (buttonType, profileType) => {
  const normalizedProfileType = normalizeProfileType(profileType);
  const rawType = String(buttonType || '').trim().toLowerCase();
  if (!rawType) return null;

  let mappedType = FLOATING_BUTTON_ALIASES[rawType] || rawType;
  if (rawType === 'call') {
    mappedType = normalizedProfileType === 'business' ? 'call_business' : 'call_contact';
  }

  const allowedTypes = normalizedProfileType === 'business'
    ? ['send_survey', 'rate_restaurant', 'view_catalog_pdf', 'whatsapp', 'call_business', 'website']
    : ['call_contact', 'send_location', 'call_emergency', 'whatsapp', 'share_profile'];

  return allowedTypes.includes(mappedType) ? mappedType : null;
};
const extractFloatingButtonType = (button) => {
  if (typeof button === 'string') return button;
  if (button && typeof button === 'object') {
    return button.type || button.key || button.value || button.button_type || '';
  }
  return '';
};

const normalizePublicSettings = (value, profileType) => {
  const raw = value && typeof value === 'object' ? value : {};
  const floatingButtonsSource = Array.isArray(raw.floating_buttons)
    ? raw.floating_buttons
    : Array.isArray(raw.floatingButtons)
      ? raw.floatingButtons
      : [];

  return {
    request_location_automatically: Boolean(
      raw.request_location_automatically ?? raw.requestLocationAutomatically
    ),
    top_profile_photo_enabled: Boolean(
      raw.top_profile_photo_enabled
      ?? raw.topProfilePhotoEnabled
      ?? raw.profile_photo_enabled
    ),
    top_profile_photo_shape: (() => {
      const shape = String(
        raw.top_profile_photo_shape
        ?? raw.topProfilePhotoShape
        ?? raw.profile_photo_shape
        ?? 'circle'
      ).trim().toLowerCase();
      if (shape === 'rounded' || shape === 'square') return shape;
      return 'circle';
    })(),
    floating_buttons: floatingButtonsSource
      .map((buttonType) => normalizeFloatingButtonType(extractFloatingButtonType(buttonType), profileType))
      .filter((buttonType, index, array) => buttonType && array.indexOf(buttonType) === index)
      .slice(0, 3),
  };
};

const arePublicSettingsEqual = (leftValue, rightValue, profileType) => {
  const left = normalizePublicSettings(leftValue, profileType);
  const right = normalizePublicSettings(rightValue, profileType);
  if (left.request_location_automatically !== right.request_location_automatically) {
    return false;
  }
  if (left.top_profile_photo_enabled !== right.top_profile_photo_enabled) {
    return false;
  }
  if (left.top_profile_photo_shape !== right.top_profile_photo_shape) {
    return false;
  }
  if (left.floating_buttons.length !== right.floating_buttons.length) {
    return false;
  }
  return left.floating_buttons.every((button, index) => button === right.floating_buttons[index]);
};

const getProfilePublicSettings = (profile) => normalizePublicSettings(
  profile?.public_settings ?? profile?.notification_config ?? DEFAULT_PUBLIC_SETTINGS,
  profile?.profile_type
);

export const DashboardPage = () => {
  const FALLBACK_PERSONAL_SUBTYPES = [
    { value: 'medico', label: 'Médico' },
    { value: 'mascota', label: 'Mascota' },
    { value: 'vehiculo', label: 'Vehículo' },
    { value: 'nino', label: 'Niño/Adulto Mayor' },
  ];

  const FALLBACK_BUSINESS_SUBTYPES = [
    { value: 'restaurante', label: 'Restaurante' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'wifi', label: 'WiFi' },
    { value: 'tarjeta', label: 'Tarjeta de Presentación' },
    { value: 'catalogo', label: 'Catálogo de Productos' },
    { value: 'turismo', label: 'Información Turística' },
    { value: 'checkin', label: 'Check-in Digital' },
    { value: 'encuesta', label: 'Encuestas/Feedback' },
    { value: 'redes', label: 'Links de Redes Sociales' },
    { value: 'evento', label: 'Información de Eventos' },
  ];

  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [qrCreationPolicy, setQrCreationPolicy] = useState(null);
  const [profileTemplatesConfig, setProfileTemplatesConfig] = useState(null);
  const [profileTypeOptions, setProfileTypeOptions] = useState({
    personal: FALLBACK_PERSONAL_SUBTYPES,
    business: FALLBACK_BUSINESS_SUBTYPES,
  });
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [newProfile, setNewProfile] = useState({
    name: '',
    alias: '',
    profile_type: 'personal',
    sub_type: 'medico',
    status: 'indefinite',
    data: {},
    public_settings: DEFAULT_PUBLIC_SETTINGS,
    public_settings_customized: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profilesData, ordersData, templatesConfig] = await Promise.all([
        fetchMyQRProfiles(),
        fetchMyOrders(),
        fetchProfileTypesConfig().catch(() => null),
      ]);
      setProfiles(profilesData);
      setOrders(ordersData);
      if (templatesConfig && typeof templatesConfig === 'object') {
        setProfileTemplatesConfig(templatesConfig);
        const mapCategory = (category, fallback) => {
          const templates = Array.isArray(templatesConfig?.[category]) ? templatesConfig[category] : [];
          const enabled = templates
            .filter((template) => template?.enabled !== false && template?.key)
            .map((template) => ({ value: template.key, label: template.label || template.key }));
          return enabled.length > 0 ? enabled : fallback;
        };
        setProfileTypeOptions({
          personal: mapCategory('personal', FALLBACK_PERSONAL_SUBTYPES),
          business: mapCategory('business', FALLBACK_BUSINESS_SUBTYPES),
        });
      } else {
        setProfileTemplatesConfig(null);
      }
      try {
        const policy = await fetchQRCreationPolicy();
        setQrCreationPolicy(policy);
      } catch (_) {
        setQrCreationPolicy(null);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (qrCreationPolicy && !qrCreationPolicy.can_create) {
      toast.error(qrCreationPolicy.message || 'No tienes habilitada la creación manual de QR');
      return;
    }

    // Validar si es empresa para perfiles business
    if (newProfile.profile_type === 'business' && user?.user_type !== 'business') {
      toast.error('Solo empresas pueden crear perfiles empresariales');
      return;
    }

    try {
      const computedName = (() => {
        const alias = String(newProfile.alias || '').trim();
        if (alias) return alias;
        const subtypeLabel = (newProfile.profile_type === 'personal' ? personalSubTypes : businessSubTypes)
          .find((option) => option.value === newProfile.sub_type)?.label || 'Perfil QR';
        return `${subtypeLabel} ${new Date().toLocaleDateString('es-CL')}`;
      })();
      const normalizedPublicSettings = normalizePublicSettings(newProfile.public_settings, newProfile.profile_type);
      const templateDefaults = getTemplateDefaultPublicSettings(newProfile.profile_type, newProfile.sub_type);
      await createQRProfile({
        ...newProfile,
        name: computedName,
        public_settings: normalizedPublicSettings,
        public_settings_customized: !arePublicSettingsEqual(
          normalizedPublicSettings,
          templateDefaults,
          newProfile.profile_type
        ),
      });
      toast.success('Perfil QR creado exitosamente');
      setShowCreateDialog(false);
      setNewProfile({
        name: '',
        alias: '',
        profile_type: 'personal',
        sub_type: 'medico',
        status: 'indefinite',
        data: {},
        public_settings: DEFAULT_PUBLIC_SETTINGS,
        public_settings_customized: false,
      });
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Error al crear perfil');
    }
  };

  const handleEditProfile = (profile) => {
    const templateDefaults = (() => {
      const templates = Array.isArray(profileTemplatesConfig?.[profile?.profile_type]) ? profileTemplatesConfig[profile.profile_type] : [];
      const template = templates.find((item) => item?.key === profile?.sub_type);
      return normalizePublicSettings(template?.default_public_settings ?? DEFAULT_PUBLIC_SETTINGS, profile?.profile_type);
    })();
    const profilePublicSettings = getProfilePublicSettings(profile);
    const mergedPublicSettings = normalizePublicSettings(
      { ...templateDefaults, ...profilePublicSettings },
      profile?.profile_type
    );
    setEditingProfile({
      ...profile,
      alias: profile.alias || profile.name,
      public_settings: mergedPublicSettings,
      public_settings_customized: typeof profile?.public_settings_customized === 'boolean'
        ? profile.public_settings_customized
        : !arePublicSettingsEqual(mergedPublicSettings, templateDefaults, profile?.profile_type),
    });
    setShowEditDialog(true);
  };

  const handleUpdateProfile = async () => {
    try {
      const computedName = (() => {
        const alias = String(editingProfile.alias || '').trim();
        if (alias) return alias;
        const existingName = String(editingProfile.name || '').trim();
        if (existingName) return existingName;
        const subtypeLabel = (editingProfile.profile_type === 'personal' ? personalSubTypes : businessSubTypes)
          .find((option) => option.value === editingProfile.sub_type)?.label || 'Perfil QR';
        return `${subtypeLabel} ${new Date().toLocaleDateString('es-CL')}`;
      })();
      const normalizedPublicSettings = normalizePublicSettings(editingProfile.public_settings, editingProfile.profile_type);
      const templateDefaults = getTemplateDefaultPublicSettings(editingProfile.profile_type, editingProfile.sub_type);
      await updateQRProfile(editingProfile.id, {
        name: computedName,
        alias: editingProfile.alias,
        profile_type: editingProfile.profile_type,
        sub_type: editingProfile.sub_type,
        data: editingProfile.data,
        public_settings: normalizedPublicSettings,
        public_settings_customized: !arePublicSettingsEqual(
          normalizedPublicSettings,
          templateDefaults,
          editingProfile.profile_type
        ),
      });
      toast.success('Perfil actualizado exitosamente');
      setShowEditDialog(false);
      setEditingProfile(null);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar perfil');
    }
  };

  const handleDownloadQR = async (profile) => {
    try {
      const response = await fetch(`${API_BASE}/qr-profiles/${profile.id}/generate-qr`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const blob = await response.blob();
      const extension = getQrDownloadExtension(response.headers.get('content-type'));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${profile.hash}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('QR descargado');
    } catch (error) {
      console.error(error);
      toast.error('Error al descargar QR');
    }
  };

  const handleToggleStatus = async (profile) => {
    try {
      const newStatus = profile.status === 'paused' ? 'indefinite' : 'paused';
      await updateQRStatus(profile.id, newStatus);
      toast.success(`Perfil ${newStatus === 'paused' ? 'pausado' : 'activado'}`);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar estado');
    }
  };

  const handleViewProfile = (profile) => {
    window.open(`/profile/${profile.hash}`, '_blank');
  };

  const handleDelete = async (profile) => {
    if (!window.confirm('¿Estás seguro de eliminar este perfil?')) return;
    
    try {
      await deleteQRProfile(profile.id);
      toast.success('Perfil eliminado');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar perfil');
    }
  };

  const personalSubTypes = profileTypeOptions.personal || FALLBACK_PERSONAL_SUBTYPES;
  const businessSubTypes = profileTypeOptions.business || FALLBACK_BUSINESS_SUBTYPES;
  const getTemplateDefaultPublicSettings = (profileType, subType) => {
    const templates = Array.isArray(profileTemplatesConfig?.[profileType]) ? profileTemplatesConfig[profileType] : [];
    const template = templates.find((item) => item?.key === subType);
    return normalizePublicSettings(template?.default_public_settings ?? DEFAULT_PUBLIC_SETTINGS, profileType);
  };
  const canCreateProfiles = !qrCreationPolicy || qrCreationPolicy.can_create;
  const isPersonUser = user?.user_type === 'person';
  const blockedProfilesCtaHref = isPersonUser
    ? '/shop?category=personal'
    : '/shop?category=business&item_type=subscription_service';
  const blockedProfilesCtaLabel = isPersonUser ? 'Comprar productos' : 'Comprar Suscripción';
  const blockedEmptyStateLabel = isPersonUser ? 'Comprar productos' : 'Ver Suscripciones';

  const subTypes = newProfile.profile_type === 'personal' ? personalSubTypes : businessSubTypes;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="dashboard-container">
          <div className="flex justify-between items-center mb-8">
            <h1 className="font-heading font-bold text-3xl sm:text-4xl" data-testid="dashboard-title">
              Mi Dashboard
            </h1>
            {canCreateProfiles ? (
              <Button onClick={() => setShowCreateDialog(true)} data-testid="create-profile-btn">
                <Plus className="mr-2 h-4 w-4" />
                Crear Perfil QR
              </Button>
            ) : (
              <Link to={blockedProfilesCtaHref}>
                <Button variant="outline" data-testid="buy-subscription-btn">
                  {blockedProfilesCtaLabel}
                </Button>
              </Link>
            )}
          </div>

          {qrCreationPolicy && !qrCreationPolicy.can_create && !isPersonUser && (
            <Card className="mb-6 border-amber-300 bg-amber-50">
              <CardContent className="py-4 text-sm">
                <p className="font-medium text-amber-900">Creación manual de QR deshabilitada</p>
                <p className="text-amber-800 mt-1">
                  {qrCreationPolicy.message || 'Debes comprar una suscripción para habilitar nuevos QR.'}
                </p>
              </CardContent>
            </Card>
          )}

          {user?.user_type === 'business' && (
            <Card className="mb-6">
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-medium">Suscripciones empresariales</p>
                  <p className="text-sm text-muted-foreground">
                    Revisa vigencias, cupos y renueva mensual o anual.
                  </p>
                </div>
                <Link to="/subscriptions">
                  <Button variant="outline" data-testid="go-subscriptions-btn">
                    Gestionar suscripciones
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Perfiles QR</CardTitle>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-profiles">{profiles.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Órdenes Totales</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-orders">{orders.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Órdenes Pagadas</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-paid-orders">
                  {orders.filter(o => o.status === 'paid').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* QR Profiles */}
          <div className="mb-8">
            <h2 className="font-heading font-bold text-2xl mb-4">Mis Perfiles QR</h2>
            {profiles.length === 0 ? (
              <Card className="p-8 text-center">
                <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No tienes perfiles QR</h3>
                <p className="text-muted-foreground mb-4">
                  {canCreateProfiles
                    ? 'Crea tu primer perfil QR para comenzar'
                    : isPersonUser
                      ? 'Explorá productos personales para activar un nuevo QR.'
                      : 'La creación manual está deshabilitada. Compra una suscripción para obtener cupos QR.'}
                </p>
                {canCreateProfiles ? (
                  <Button onClick={() => setShowCreateDialog(true)} data-testid="empty-create-profile-btn">
                    Crear Perfil QR
                  </Button>
                ) : (
                  <Link to={blockedProfilesCtaHref}>
                    <Button variant="outline" data-testid="empty-buy-subscription-btn">
                      {blockedEmptyStateLabel}
                    </Button>
                  </Link>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map(profile => (
                  <QRProfileCard
                    key={profile.id}
                    profile={profile}
                    onDownloadQR={handleDownloadQR}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDelete}
                    onEdit={handleEditProfile}
                    onViewProfile={handleViewProfile}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Create Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="create-profile-dialog">
              <DialogHeader>
                <DialogTitle>Crear Perfil QR</DialogTitle>
                <DialogDescription>
                  Crea un nuevo perfil QR con información personalizada
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Información Básica</TabsTrigger>
                  <TabsTrigger value="data">Datos del Perfil</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="alias">Alias (Nombre Interno)</Label>
                    <Input
                      id="alias"
                      value={newProfile.alias}
                      onChange={(e) => setNewProfile({ ...newProfile, alias: e.target.value })}
                      placeholder="Para tu identificación interna"
                      data-testid="profile-alias-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile_type">Tipo de Perfil</Label>
                    <Select
                      value={newProfile.profile_type}
                      onValueChange={(value) => {
                        const firstSubtype = (value === 'personal' ? personalSubTypes : businessSubTypes)[0]?.value || '';
                        setNewProfile({
                          ...newProfile,
                          profile_type: value,
                          sub_type: firstSubtype,
                          data: {},
                          public_settings: getTemplateDefaultPublicSettings(value, firstSubtype),
                          public_settings_customized: false,
                        });
                      }}
                    >
                      <SelectTrigger data-testid="profile-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="business">Empresarial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub_type">Categoría</Label>
                    <Select
                      value={newProfile.sub_type}
                      onValueChange={(value) => setNewProfile({
                        ...newProfile,
                        sub_type: value,
                        data: {},
                        public_settings: getTemplateDefaultPublicSettings(newProfile.profile_type, value),
                        public_settings_customized: false,
                      })}
                    >
                      <SelectTrigger data-testid="profile-subtype-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {subTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select
                      value={newProfile.status}
                      onValueChange={(value) => setNewProfile({ ...newProfile, status: value })}
                    >
                      <SelectTrigger data-testid="profile-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indefinite">Indefinido</SelectItem>
                        <SelectItem value="subscription">Suscripción</SelectItem>
                        <SelectItem value="paused">Pausado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                <TabsContent value="data" className="space-y-4 py-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Completa la información que se mostrará cuando alguien escanee este QR
                  </div>
                  <ProfileDataEditor
                    profileType={newProfile.profile_type}
                    subType={newProfile.sub_type}
                    data={newProfile.data}
                    onChange={(data) => setNewProfile({ ...newProfile, data })}
                    publicSettings={newProfile.public_settings}
                    onPublicSettingsChange={(public_settings) => {
                      const templateDefaults = getTemplateDefaultPublicSettings(newProfile.profile_type, newProfile.sub_type);
                      setNewProfile({
                        ...newProfile,
                        public_settings,
                        public_settings_customized: !arePublicSettingsEqual(public_settings, templateDefaults, newProfile.profile_type),
                      });
                    }}
                    profileTypesConfig={profileTemplatesConfig}
                  />
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} data-testid="cancel-create-btn">
                  Cancelar
                </Button>
                <Button onClick={handleCreateProfile} data-testid="confirm-create-btn">
                  Crear Perfil QR
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          {editingProfile && (
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="edit-profile-dialog">
                <DialogHeader>
                  <DialogTitle>Editar Perfil QR</DialogTitle>
                  <DialogDescription>
                    Actualiza la información de tu perfil QR
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Información Básica</TabsTrigger>
                    <TabsTrigger value="data">Datos del Perfil</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-alias">Nombre Interno (Alias)</Label>
                      <Input
                        id="edit-alias"
                        value={editingProfile.alias || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, alias: e.target.value })}
                        placeholder="Para tu identificación interna"
                        data-testid="edit-profile-alias-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-sub-type">Categoría</Label>
                    <Select
                      value={editingProfile.sub_type}
                      onValueChange={(value) => setEditingProfile({
                        ...editingProfile,
                        sub_type: value,
                        public_settings: getTemplateDefaultPublicSettings(editingProfile.profile_type, value),
                        public_settings_customized: false,
                      })}
                    >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(editingProfile.profile_type === 'personal' ? personalSubTypes : businessSubTypes).map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                  <TabsContent value="data" className="space-y-4 py-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      Edita la información que se muestra cuando alguien escanea este QR
                    </div>
                    <ProfileDataEditor
                      profileType={editingProfile.profile_type}
                      subType={editingProfile.sub_type}
                      data={editingProfile.data || {}}
                      onChange={(data) => setEditingProfile({ ...editingProfile, data })}
                      publicSettings={editingProfile.public_settings || DEFAULT_PUBLIC_SETTINGS}
                      onPublicSettingsChange={(public_settings) => {
                        const templateDefaults = getTemplateDefaultPublicSettings(editingProfile.profile_type, editingProfile.sub_type);
                        setEditingProfile({
                          ...editingProfile,
                          public_settings,
                          public_settings_customized: !arePublicSettingsEqual(public_settings, templateDefaults, editingProfile.profile_type),
                        });
                      }}
                      profileTypesConfig={profileTemplatesConfig}
                    />
                  </TabsContent>
                </Tabs>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpdateProfile} data-testid="confirm-edit-btn">
                    Guardar Cambios
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};
