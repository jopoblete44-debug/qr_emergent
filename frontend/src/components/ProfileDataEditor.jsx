import React, { useEffect, useMemo, useState } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { fetchProfileTypesConfig, resolveMediaUrl, uploadProfileImage } from '../utils/api';
import { getEffectiveFieldType } from '../utils/imageFieldUtils';
import { toast } from 'sonner';
import { Globe, MapPin, MessageSquare, Phone, Star } from 'lucide-react';

const MAX_FLOATING_BUTTONS = 3;
const DEFAULT_PUBLIC_SETTINGS = {
  request_location_automatically: false,
  floating_buttons: [],
};
const PROFILE_FLOATING_BUTTON_OPTIONS = {
  personal: [
    { value: 'call_contact', label: 'Llamar contacto', description: 'Llama al contacto principal del perfil', icon: Phone },
    { value: 'send_location', label: 'Enviar ubicación', description: 'CTA para compartir o abrir la ubicación', icon: MapPin },
    { value: 'call_emergency', label: 'Llamar emergencia', description: 'Prioriza el teléfono de emergencia', icon: Phone },
    { value: 'whatsapp', label: 'WhatsApp', description: 'Abrir chat directo', icon: MessageSquare },
    { value: 'share_profile', label: 'Compartir perfil', description: 'Comparte el perfil público del QR', icon: Globe },
  ],
  business: [
    { value: 'send_survey', label: 'Responder encuesta', description: 'Abre formulario o encuesta del negocio', icon: MessageSquare },
    { value: 'rate_restaurant', label: 'Calificar negocio', description: 'CTA de reseña o calificación', icon: Star },
    { value: 'view_catalog_pdf', label: 'Ver catálogo', description: 'Abre catálogo, menú o PDF público', icon: Globe },
    { value: 'whatsapp', label: 'WhatsApp', description: 'Abrir chat directo', icon: MessageSquare },
    { value: 'call_business', label: 'Llamar negocio', description: 'Llama al teléfono principal del negocio', icon: Phone },
    { value: 'website', label: 'Sitio web', description: 'Abrir web principal', icon: Globe },
  ],
};
const LEGACY_FLOATING_BUTTON_ALIASES = {
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

  let mappedType = LEGACY_FLOATING_BUTTON_ALIASES[rawType] || rawType;

  if (rawType === 'call') {
    mappedType = normalizedProfileType === 'business' ? 'call_business' : 'call_contact';
  }

  const allowedTypes = new Set(
    (PROFILE_FLOATING_BUTTON_OPTIONS[normalizedProfileType] || []).map((option) => option.value)
  );

  return allowedTypes.has(mappedType) ? mappedType : null;
};

const normalizePublicSettings = (value, profileType) => {
  const raw = value && typeof value === 'object' ? value : {};
  const floatingButtonSource = Array.isArray(raw.floating_buttons)
    ? raw.floating_buttons
    : Array.isArray(raw.floatingButtons)
      ? raw.floatingButtons
      : [];
  const floatingButtons = Array.isArray(floatingButtonSource)
    ? floatingButtonSource
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .map((item) => normalizeFloatingButtonType(item, profileType))
      .filter((item, index, array) => item && array.indexOf(item) === index)
      .slice(0, MAX_FLOATING_BUTTONS)
    : [];

  return {
    request_location_automatically: Boolean(
      raw.request_location_automatically ?? raw.requestLocationAutomatically
    ),
    floating_buttons: floatingButtons,
  };
};

export const ProfileDataEditor = ({
  profileType,
  subType,
  data,
  onChange,
  publicSettings = undefined,
  onPublicSettingsChange,
  notificationConfig = undefined,
  onNotificationConfigChange,
}) => {
  const [profileTypesConfig, setProfileTypesConfig] = useState(null);
  const [uploadingField, setUploadingField] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfileTypesConfig = async () => {
      try {
        const config = await fetchProfileTypesConfig();
        if (isMounted && config && typeof config === 'object') {
          setProfileTypesConfig(config);
        }
      } catch (error) {
        // Fallback a formularios estáticos cuando no hay configuración dinámica.
      }
    };

    loadProfileTypesConfig();
    return () => { isMounted = false; };
  }, []);

  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  const dynamicTemplate = useMemo(() => {
    if (!profileTypesConfig || !profileType || !subType) return null;
    const templates = profileTypesConfig?.[profileType];
    if (!Array.isArray(templates)) return null;
    return templates.find((template) => template?.key === subType && template?.enabled !== false) || null;
  }, [profileTypesConfig, profileType, subType]);
  const normalizedProfileType = useMemo(() => normalizeProfileType(profileType), [profileType]);
  const availableFloatingButtonOptions = useMemo(
    () => PROFILE_FLOATING_BUTTON_OPTIONS[normalizedProfileType] || PROFILE_FLOATING_BUTTON_OPTIONS.personal,
    [normalizedProfileType]
  );
  const normalizedPublicSettings = useMemo(
    () => normalizePublicSettings(publicSettings ?? notificationConfig ?? DEFAULT_PUBLIC_SETTINGS, normalizedProfileType),
    [notificationConfig, normalizedProfileType, publicSettings]
  );

  const handlePublicSettingsUpdate = (patch) => {
    const nextSettings = normalizePublicSettings({
      ...normalizedPublicSettings,
      ...patch,
    }, normalizedProfileType);

    if (onPublicSettingsChange) {
      onPublicSettingsChange(nextSettings);
      return;
    }
    if (onNotificationConfigChange) {
      onNotificationConfigChange(nextSettings);
    }
  };

  const handleToggleFloatingButton = (buttonType) => {
    const currentButtons = normalizedPublicSettings.floating_buttons;
    if (currentButtons.includes(buttonType)) {
      handlePublicSettingsUpdate({
        floating_buttons: currentButtons.filter((item) => item !== buttonType),
      });
      return;
    }
    if (currentButtons.length >= MAX_FLOATING_BUTTONS) {
      toast.error(`Puedes seleccionar hasta ${MAX_FLOATING_BUTTONS} botones flotantes`);
      return;
    }
    handlePublicSettingsUpdate({
      floating_buttons: [...currentButtons, buttonType],
    });
  };

  const getDynamicFieldValue = (field) => {
    if (!field) return '';
    if (field.name && data[field.name] !== undefined) return data[field.name];
    if (field.id && data[field.id] !== undefined) return data[field.id];
    return '';
  };

  const handleDynamicFieldChange = (field, value) => {
    const next = { ...data };
    if (field?.name) next[field.name] = value;
    if (field?.id && field.id !== field.name) next[field.id] = value;
    onChange(next);
  };

  const handleUploadImage = async (fieldKey, file, onUploaded) => {
    if (!file) return;
    try {
      setUploadingField(fieldKey);
      const response = await uploadProfileImage(file);
      if (!response?.url) throw new Error('No URL returned');
      onUploaded(response.url);
      toast.success('Imagen subida correctamente');
    } catch (error) {
      toast.error('No se pudo subir la imagen');
    } finally {
      setUploadingField(null);
    }
  };

  const renderImageField = ({
    fieldKey,
    label,
    value,
    onValueChange,
  }) => {
    const previewUrl = resolveMediaUrl(value);

    return (
      <div className="space-y-2">
        <Label htmlFor={fieldKey}>{label}</Label>
        <Input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleUploadImage(fieldKey, e.target.files?.[0], onValueChange)}
        />
        <p className="text-xs text-muted-foreground">
          Solo se permiten imágenes subidas desde tu dispositivo.
        </p>
        {uploadingField === fieldKey && (
          <p className="text-xs text-muted-foreground">Subiendo imagen...</p>
        )}
        {previewUrl && (
          <div className="space-y-2">
            <img
              src={previewUrl}
              alt={label}
              className="w-28 h-28 rounded-md object-cover border border-border"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => onValueChange('')}>
              Quitar imagen
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderQrSettingsSection = () => (
    <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">Configuración pública del QR</h4>
        <p className="text-xs text-muted-foreground">
          Definí comportamiento de ubicación y hasta {MAX_FLOATING_BUTTONS} botones flotantes para la vista pública.
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-background px-3 py-3">
        <div className="space-y-1">
          <Label htmlFor="request-location-automatically" className="text-sm font-medium">
            Solicitar ubicación automáticamente
          </Label>
          <p className="text-xs text-muted-foreground">
            Se intentará pedir geolocalización al abrir el perfil público, de forma no intrusiva.
          </p>
        </div>
        <Switch
          id="request-location-automatically"
          checked={normalizedPublicSettings.request_location_automatically}
          onCheckedChange={(checked) => handlePublicSettingsUpdate({ request_location_automatically: checked })}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-medium">Botones flotantes</Label>
          <span className="text-xs text-muted-foreground">
            {normalizedPublicSettings.floating_buttons.length}/{MAX_FLOATING_BUTTONS} seleccionados
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {availableFloatingButtonOptions.map((option) => {
            const isActive = normalizedPublicSettings.floating_buttons.includes(option.value);
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                type="button"
                variant={isActive ? 'default' : 'outline'}
                className="h-auto items-start justify-start px-3 py-3 text-left"
                onClick={() => handleToggleFloatingButton(option.value)}
              >
                <Icon className="mr-2 mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs opacity-80">{option.description}</span>
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderDynamicField = (field) => {
    const fieldKey = field.id || field.name;
    const value = getDynamicFieldValue(field);
    const normalizedValue = value ?? '';
    const label = field.label || field.name || 'Campo';
    const placeholder = field.placeholder || '';
    const required = field.required === true;
    const type = getEffectiveFieldType(field);

    const baseProps = {
      id: fieldKey,
      value: normalizedValue,
      onChange: (e) => handleDynamicFieldChange(field, e.target.value),
      placeholder,
      required,
    };

    if (type === 'image') {
      return renderImageField({
        fieldKey,
        label,
        value: normalizedValue,
        onValueChange: (v) => handleDynamicFieldChange(field, v),
      });
    }

    if (type === 'textarea') {
      return (
        <Textarea
          {...baseProps}
          rows={3}
        />
      );
    }

    if (type === 'select' && Array.isArray(field.options) && field.options.length > 0) {
      return (
        <Select value={normalizedValue ? String(normalizedValue) : undefined} onValueChange={(v) => handleDynamicFieldChange(field, v)}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder || 'Selecciona una opción'} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => {
              const optionValue = String(option);
              return (
                <SelectItem key={`${fieldKey}-${optionValue}`} value={optionValue}>
                  {optionValue}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        {...baseProps}
        type={type === 'date' ? 'date' : (type === 'number' ? 'number' : (type === 'email' ? 'email' : (type === 'url' ? 'url' : (type === 'tel' ? 'tel' : 'text'))))}
      />
    );
  };

  const renderDynamicTemplateForm = () => {
    const sections = dynamicTemplate?.sections || [];
    if (!sections.length) return null;

    return (
      <div className="space-y-6">
        {sections.map((section) => {
          const visibleFields = (section.fields || []).filter((f) => f?.visible !== false);
          if (!visibleFields.length) return null;

          return (
            <div key={section.id || section.title} className="space-y-3">
              {section.title && (
                <h4 className="font-semibold text-sm text-foreground">{section.title}</h4>
              )}
              <div className="space-y-2">
                {visibleFields.map((field) => {
                  const fieldKey = field.id || field.name;
                  const fieldIsImage = getEffectiveFieldType(field) === 'image';
                  return (
                    <div key={fieldKey} className="space-y-2">
                      {!fieldIsImage && (
                        <Label htmlFor={fieldKey}>
                          {field.label || field.name}
                          {field.required ? ' *' : ''}
                        </Label>
                      )}
                      {renderDynamicField(field)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Campos para perfil médico
  const renderMedicalFields = () => (
    <>
      <div className="space-y-2">
        {renderImageField({
          fieldKey: 'photo_url',
          label: 'Foto de Perfil',
          value: data.photo_url || '',
          onValueChange: (v) => handleChange('photo_url', v)
        })}
      </div>
      <div className="space-y-2">
        <Label htmlFor="blood_type">Tipo de Sangre</Label>
        <Input
          id="blood_type"
          value={data.blood_type || ''}
          onChange={(e) => handleChange('blood_type', e.target.value)}
          placeholder="Ej: O+, A-, etc."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="allergies">Alergias</Label>
        <Textarea
          id="allergies"
          value={data.allergies || ''}
          onChange={(e) => handleChange('allergies', e.target.value)}
          placeholder="Lista de alergias conocidas"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="medications">Medicamentos</Label>
        <Textarea
          id="medications"
          value={data.medications || ''}
          onChange={(e) => handleChange('medications', e.target.value)}
          placeholder="Medicamentos que toma actualmente"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="conditions">Condiciones Médicas</Label>
        <Textarea
          id="conditions"
          value={data.conditions || ''}
          onChange={(e) => handleChange('conditions', e.target.value)}
          placeholder="Condiciones médicas importantes"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emergency_name">Contacto de Emergencia - Nombre</Label>
        <Input
          id="emergency_name"
          value={data.emergency_name || ''}
          onChange={(e) => handleChange('emergency_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emergency_phone">Contacto de Emergencia - Teléfono</Label>
        <Input
          id="emergency_phone"
          type="tel"
          value={data.emergency_phone || ''}
          onChange={(e) => handleChange('emergency_phone', e.target.value)}
        />
      </div>
    </>
  );

  // Campos para perfil de mascota
  const renderPetFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="pet_name">Nombre de la Mascota</Label>
        <Input
          id="pet_name"
          value={data.pet_name || ''}
          onChange={(e) => handleChange('pet_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="species">Especie</Label>
        <Input
          id="species"
          value={data.species || ''}
          onChange={(e) => handleChange('species', e.target.value)}
          placeholder="Ej: Perro, Gato"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="breed">Raza</Label>
        <Input
          id="breed"
          value={data.breed || ''}
          onChange={(e) => handleChange('breed', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="owner_name">Nombre del Dueño</Label>
        <Input
          id="owner_name"
          value={data.owner_name || ''}
          onChange={(e) => handleChange('owner_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="owner_phone">Teléfono del Dueño</Label>
        <Input
          id="owner_phone"
          type="tel"
          value={data.owner_phone || ''}
          onChange={(e) => handleChange('owner_phone', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="owner_email">Email del Dueño</Label>
        <Input
          id="owner_email"
          type="email"
          value={data.owner_email || ''}
          onChange={(e) => handleChange('owner_email', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          value={data.address || ''}
          onChange={(e) => handleChange('address', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reward">Recompensa (CLP)</Label>
        <Input
          id="reward"
          type="number"
          value={data.reward || ''}
          onChange={(e) => handleChange('reward', e.target.value)}
          placeholder="Monto en pesos chilenos"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vet_name">Veterinario</Label>
        <Input
          id="vet_name"
          value={data.vet_name || ''}
          onChange={(e) => handleChange('vet_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vet_phone">Teléfono Veterinario</Label>
        <Input
          id="vet_phone"
          type="tel"
          value={data.vet_phone || ''}
          onChange={(e) => handleChange('vet_phone', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        {renderImageField({
          fieldKey: 'photo_url',
          label: 'Foto de la Mascota',
          value: data.photo_url || '',
          onValueChange: (v) => handleChange('photo_url', v)
        })}
      </div>
    </>
  );

  // Campos para perfil de vehículo
  const renderVehicleFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="brand">Marca</Label>
        <Input
          id="brand"
          value={data.brand || ''}
          onChange={(e) => handleChange('brand', e.target.value)}
          placeholder="Ej: Toyota, Chevrolet"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="model">Modelo</Label>
        <Input
          id="model"
          value={data.model || ''}
          onChange={(e) => handleChange('model', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="year">Año</Label>
        <Input
          id="year"
          type="number"
          value={data.year || ''}
          onChange={(e) => handleChange('year', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="plate">Patente</Label>
        <Input
          id="plate"
          value={data.plate || ''}
          onChange={(e) => handleChange('plate', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="owner">Propietario</Label>
        <Input
          id="owner"
          value={data.owner || ''}
          onChange={(e) => handleChange('owner', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          type="tel"
          value={data.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="insurance">Seguro</Label>
        <Input
          id="insurance"
          value={data.insurance || ''}
          onChange={(e) => handleChange('insurance', e.target.value)}
          placeholder="Nombre de la aseguradora"
        />
      </div>
      <div className="space-y-2">
        {renderImageField({
          fieldKey: 'photo_url',
          label: 'Foto del Vehículo',
          value: data.photo_url || '',
          onValueChange: (v) => handleChange('photo_url', v)
        })}
      </div>
    </>
  );

  // Campos para perfil de niño/adulto mayor
  const renderElderlyFields = () => (
    <>
      <div className="space-y-2">
        {renderImageField({
          fieldKey: 'photo_url',
          label: 'Foto',
          value: data.photo_url || '',
          onValueChange: (v) => handleChange('photo_url', v)
        })}
      </div>
      <div className="space-y-2">
        <Label htmlFor="person_name">Nombre Completo</Label>
        <Input
          id="person_name"
          value={data.person_name || ''}
          onChange={(e) => handleChange('person_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="age">Edad</Label>
        <Input
          id="age"
          type="number"
          value={data.age || ''}
          onChange={(e) => handleChange('age', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="condition">Condición</Label>
        <Input
          id="condition"
          value={data.condition || ''}
          onChange={(e) => handleChange('condition', e.target.value)}
          placeholder="Ej: Alzheimer, Autismo"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Dirección de Casa</Label>
        <Input
          id="address"
          value={data.address || ''}
          onChange={(e) => handleChange('address', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emergency_name">Contacto de Emergencia - Nombre</Label>
        <Input
          id="emergency_name"
          value={data.emergency_name || ''}
          onChange={(e) => handleChange('emergency_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emergency_phone">Contacto de Emergencia - Teléfono</Label>
        <Input
          id="emergency_phone"
          type="tel"
          value={data.emergency_phone || ''}
          onChange={(e) => handleChange('emergency_phone', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="medications">Medicamentos</Label>
        <Textarea
          id="medications"
          value={data.medications || ''}
          onChange={(e) => handleChange('medications', e.target.value)}
          rows={3}
        />
      </div>
    </>
  );

  // Campos para perfil de restaurante
  const renderRestaurantFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción del Restaurante</Label>
        <Textarea
          id="description"
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="menu_items">Items del Menú (uno por línea)</Label>
        <Textarea
          id="menu_items"
          value={data.menu_items || ''}
          onChange={(e) => handleChange('menu_items', e.target.value)}
          placeholder="Pizza Margarita - $8.990\nPasta Carbonara - $9.990"
          rows={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          type="tel"
          value={data.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          value={data.address || ''}
          onChange={(e) => handleChange('address', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        {renderImageField({
          fieldKey: 'logo_url',
          label: 'Logo',
          value: data.logo_url || '',
          onValueChange: (v) => handleChange('logo_url', v)
        })}
      </div>
    </>
  );

  // Campos para perfil de hotel
  const renderHotelFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="hotel_name">Nombre del Hotel</Label>
        <Input
          id="hotel_name"
          value={data.hotel_name || ''}
          onChange={(e) => handleChange('hotel_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="services">Servicios (uno por línea)</Label>
        <Textarea
          id="services"
          value={data.services || ''}
          onChange={(e) => handleChange('services', e.target.value)}
          placeholder="WiFi Gratis\nDesayuno incluido\nPiscina\nGimnasio"
          rows={6}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="check_in">Hora de Check-in</Label>
        <Input
          id="check_in"
          value={data.check_in || ''}
          onChange={(e) => handleChange('check_in', e.target.value)}
          placeholder="Ej: 15:00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="check_out">Hora de Check-out</Label>
        <Input
          id="check_out"
          value={data.check_out || ''}
          onChange={(e) => handleChange('check_out', e.target.value)}
          placeholder="Ej: 12:00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono Recepción</Label>
        <Input
          id="phone"
          type="tel"
          value={data.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          value={data.address || ''}
          onChange={(e) => handleChange('address', e.target.value)}
        />
      </div>
    </>
  );

  // Campos para perfil de WiFi
  const renderWiFiFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="network_name">Nombre de la Red (SSID)</Label>
        <Input
          id="network_name"
          value={data.network_name || ''}
          onChange={(e) => handleChange('network_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña WiFi</Label>
        <Input
          id="password"
          type="text"
          value={data.password || ''}
          onChange={(e) => handleChange('password', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="security_type">Tipo de Seguridad</Label>
        <Input
          id="security_type"
          value={data.security_type || ''}
          onChange={(e) => handleChange('security_type', e.target.value)}
          placeholder="Ej: WPA2, WPA3"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="instructions">Instrucciones de Conexión</Label>
        <Textarea
          id="instructions"
          value={data.instructions || ''}
          onChange={(e) => handleChange('instructions', e.target.value)}
          rows={4}
        />
      </div>
    </>
  );

  // Campos para tarjeta de presentación
  const renderBusinessCardFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="full_name">Nombre Completo</Label>
        <Input
          id="full_name"
          value={data.full_name || ''}
          onChange={(e) => handleChange('full_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="job_title">Cargo</Label>
        <Input
          id="job_title"
          value={data.job_title || ''}
          onChange={(e) => handleChange('job_title', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="company">Empresa</Label>
        <Input
          id="company"
          value={data.company || ''}
          onChange={(e) => handleChange('company', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={data.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          type="tel"
          value={data.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Sitio Web</Label>
        <Input
          id="website"
          type="url"
          value={data.website || ''}
          onChange={(e) => handleChange('website', e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="linkedin">LinkedIn</Label>
        <Input
          id="linkedin"
          type="url"
          value={data.linkedin || ''}
          onChange={(e) => handleChange('linkedin', e.target.value)}
          placeholder="https://linkedin.com/in/..."
        />
      </div>
    </>
  );

  // Campos para catálogo de productos
  const renderCatalogFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="catalog_name">Nombre del Catálogo</Label>
        <Input
          id="catalog_name"
          value={data.catalog_name || ''}
          onChange={(e) => handleChange('catalog_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="products">Productos (uno por línea: Nombre - Precio)</Label>
        <Textarea
          id="products"
          value={data.products || ''}
          onChange={(e) => handleChange('products', e.target.value)}
          placeholder="Producto A - $19.990\nProducto B - $29.990"
          rows={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact_info">Información de Contacto</Label>
        <Input
          id="contact_info"
          value={data.contact_info || ''}
          onChange={(e) => handleChange('contact_info', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Sitio Web para Compras</Label>
        <Input
          id="website"
          type="url"
          value={data.website || ''}
          onChange={(e) => handleChange('website', e.target.value)}
          placeholder="https://..."
        />
      </div>
    </>
  );

  // Campos para información turística
  const renderTourismFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="place_name">Nombre del Lugar</Label>
        <Input
          id="place_name"
          value={data.place_name || ''}
          onChange={(e) => handleChange('place_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="history">Historia</Label>
        <Textarea
          id="history"
          value={data.history || ''}
          onChange={(e) => handleChange('history', e.target.value)}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="attractions">Atracciones (una por línea)</Label>
        <Textarea
          id="attractions"
          value={data.attractions || ''}
          onChange={(e) => handleChange('attractions', e.target.value)}
          rows={5}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hours">Horarios de Apertura</Label>
        <Input
          id="hours"
          value={data.hours || ''}
          onChange={(e) => handleChange('hours', e.target.value)}
          placeholder="Ej: Lun-Dom 9:00-18:00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          value={data.address || ''}
          onChange={(e) => handleChange('address', e.target.value)}
        />
      </div>
    </>
  );

  // Campos para redes sociales
  const renderSocialLinksFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={data.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Ej: Mis Redes Sociales"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio / Descripción</Label>
        <Textarea
          id="bio"
          value={data.bio || ''}
          onChange={(e) => handleChange('bio', e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="instagram">Instagram</Label>
        <Input
          id="instagram"
          type="url"
          value={data.instagram || ''}
          onChange={(e) => handleChange('instagram', e.target.value)}
          placeholder="https://instagram.com/..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="facebook">Facebook</Label>
        <Input
          id="facebook"
          type="url"
          value={data.facebook || ''}
          onChange={(e) => handleChange('facebook', e.target.value)}
          placeholder="https://facebook.com/..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="twitter">Twitter/X</Label>
        <Input
          id="twitter"
          type="url"
          value={data.twitter || ''}
          onChange={(e) => handleChange('twitter', e.target.value)}
          placeholder="https://x.com/..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tiktok">TikTok</Label>
        <Input
          id="tiktok"
          type="url"
          value={data.tiktok || ''}
          onChange={(e) => handleChange('tiktok', e.target.value)}
          placeholder="https://tiktok.com/@..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="youtube">YouTube</Label>
        <Input
          id="youtube"
          type="url"
          value={data.youtube || ''}
          onChange={(e) => handleChange('youtube', e.target.value)}
          placeholder="https://youtube.com/..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Sitio Web</Label>
        <Input
          id="website"
          type="url"
          value={data.website || ''}
          onChange={(e) => handleChange('website', e.target.value)}
          placeholder="https://..."
        />
      </div>
    </>
  );

  // Campos para eventos
  const renderEventFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="event_name">Nombre del Evento</Label>
        <Input
          id="event_name"
          value={data.event_name || ''}
          onChange={(e) => handleChange('event_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">Fecha del Evento</Label>
        <Input
          id="date"
          type="date"
          value={data.date || ''}
          onChange={(e) => handleChange('date', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="time">Hora</Label>
        <Input
          id="time"
          type="time"
          value={data.time || ''}
          onChange={(e) => handleChange('time', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Lugar</Label>
        <Input
          id="location"
          value={data.location || ''}
          onChange={(e) => handleChange('location', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          value={data.address || ''}
          onChange={(e) => handleChange('address', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="organizer">Organizador</Label>
        <Input
          id="organizer"
          value={data.organizer || ''}
          onChange={(e) => handleChange('organizer', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact">Contacto</Label>
        <Input
          id="contact"
          type="tel"
          value={data.contact || ''}
          onChange={(e) => handleChange('contact', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Sitio Web / Registro</Label>
        <Input
          id="website"
          type="url"
          value={data.website || ''}
          onChange={(e) => handleChange('website', e.target.value)}
          placeholder="https://..."
        />
      </div>
    </>
  );

  // Campos para check-in digital
  const renderCheckinFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="business_name">Nombre del Negocio</Label>
        <Input
          id="business_name"
          value={data.business_name || ''}
          onChange={(e) => handleChange('business_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="welcome_message">Mensaje de Bienvenida</Label>
        <Textarea
          id="welcome_message"
          value={data.welcome_message || ''}
          onChange={(e) => handleChange('welcome_message', e.target.value)}
          placeholder="Mensaje que verán al hacer check-in"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          value={data.address || ''}
          onChange={(e) => handleChange('address', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          type="tel"
          value={data.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
        />
      </div>
    </>
  );

  // Campos para encuestas/feedback
  const renderSurveyFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="survey_title">Título de la Encuesta</Label>
        <Input
          id="survey_title"
          value={data.survey_title || ''}
          onChange={(e) => handleChange('survey_title', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="questions">Preguntas (una por línea)</Label>
        <Textarea
          id="questions"
          value={data.questions || ''}
          onChange={(e) => handleChange('questions', e.target.value)}
          placeholder="¿Cómo calificaría nuestro servicio?\n¿Recomendaría nuestro negocio?\n¿Qué podríamos mejorar?"
          rows={6}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="thank_you_message">Mensaje de Agradecimiento</Label>
        <Input
          id="thank_you_message"
          value={data.thank_you_message || ''}
          onChange={(e) => handleChange('thank_you_message', e.target.value)}
          placeholder="Gracias por tu opinión"
        />
      </div>
    </>
  );

  // Campos genéricos para otros tipos
  const renderGenericFields = () => (
    <div className="space-y-2">
      <Label htmlFor="description">Descripción / Información</Label>
      <Textarea
        id="description"
        value={data.description || ''}
        onChange={(e) => handleChange('description', e.target.value)}
        placeholder="Agrega la información que deseas mostrar en este perfil"
        rows={6}
      />
    </div>
  );

  let profileFields = null;

  if (dynamicTemplate?.sections?.length) {
    profileFields = renderDynamicTemplateForm();
  } else if (profileType === 'personal') {
    switch (subType) {
      case 'medico':
        profileFields = renderMedicalFields();
        break;
      case 'mascota':
        profileFields = renderPetFields();
        break;
      case 'vehiculo':
        profileFields = renderVehicleFields();
        break;
      case 'nino':
        profileFields = renderElderlyFields();
        break;
      default:
        profileFields = renderGenericFields();
        break;
    }
  } else if (profileType === 'business') {
    switch (subType) {
      case 'restaurante':
        profileFields = renderRestaurantFields();
        break;
      case 'hotel':
        profileFields = renderHotelFields();
        break;
      case 'wifi':
        profileFields = renderWiFiFields();
        break;
      case 'tarjeta':
        profileFields = renderBusinessCardFields();
        break;
      case 'catalogo':
        profileFields = renderCatalogFields();
        break;
      case 'turismo':
        profileFields = renderTourismFields();
        break;
      case 'redes':
        profileFields = renderSocialLinksFields();
        break;
      case 'evento':
        profileFields = renderEventFields();
        break;
      case 'checkin':
        profileFields = renderCheckinFields();
        break;
      case 'encuesta':
        profileFields = renderSurveyFields();
        break;
      default:
        profileFields = renderGenericFields();
        break;
    }
  } else {
    profileFields = renderGenericFields();
  }

  return (
    <div className="space-y-6">
      {renderQrSettingsSection()}
      {profileFields}
    </div>
  );
};
