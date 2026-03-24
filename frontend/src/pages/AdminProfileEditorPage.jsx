import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ProfileTemplateEditor } from '../components/ProfileTemplateEditor';
import { TemplatePreview } from '../components/TemplatePreview';
import { toast } from 'sonner';
import { FileEdit, Save, Smartphone, ArrowLeft, Heart, User, MapPin, Wifi, Utensils, Building, Globe, Calendar, Coffee, MessageSquare, Star, CreditCard, Dog, Car } from 'lucide-react';
import { API_BASE } from '../utils/api';

const ICON_COMPONENTS = {
  heart: Heart, user: User, 'map-pin': MapPin, wifi: Wifi, utensils: Utensils,
  building: Building, globe: Globe, calendar: Calendar, coffee: Coffee,
  message: MessageSquare, star: Star, 'credit-card': CreditCard, dog: Dog, car: Car,
};

const cloneDeep = (value) => JSON.parse(JSON.stringify(value));
const TEMPLATE_MAX_FLOATING_BUTTONS = 3;
const TEMPLATE_FLOATING_BUTTON_OPTIONS = {
  personal: [
    { value: 'call_contact', label: 'Llamar contacto' },
    { value: 'send_location', label: 'Enviar ubicación' },
    { value: 'call_emergency', label: 'Llamar emergencia' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'share_profile', label: 'Compartir perfil' },
  ],
  business: [
    { value: 'send_survey', label: 'Responder encuesta' },
    { value: 'rate_restaurant', label: 'Calificar negocio' },
    { value: 'view_catalog_pdf', label: 'Ver catálogo' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'call_business', label: 'Llamar negocio' },
    { value: 'website', label: 'Sitio web' },
  ],
};
const DEFAULT_TEMPLATE_DISPLAY_OPTIONS = {
  show_profile_type_badge: true,
  show_business_banner: true,
  show_floating_actions: true,
  show_lead_form: true,
  show_manual_location_button: true,
};

const normalizeTemplatePublicSettings = (rawValue, category) => {
  const normalizedCategory = category === 'business' ? 'business' : 'personal';
  const options = TEMPLATE_FLOATING_BUTTON_OPTIONS[normalizedCategory] || TEMPLATE_FLOATING_BUTTON_OPTIONS.personal;
  const allowedValues = new Set(options.map((option) => option.value));
  const source = rawValue && typeof rawValue === 'object' ? rawValue : {};
  const requestedButtons = Array.isArray(source.floating_buttons)
    ? source.floating_buttons
    : Array.isArray(source.floatingButtons)
      ? source.floatingButtons
      : [];

  return {
    request_location_automatically: Boolean(
      source.request_location_automatically ?? source.requestLocationAutomatically
    ),
    top_profile_photo_enabled: Boolean(
      source.top_profile_photo_enabled
      ?? source.topProfilePhotoEnabled
      ?? source.profile_photo_enabled
    ),
    top_profile_photo_shape: (() => {
      const shape = String(
        source.top_profile_photo_shape
        ?? source.topProfilePhotoShape
        ?? source.profile_photo_shape
        ?? 'circle'
      ).trim().toLowerCase();
      if (shape === 'rounded' || shape === 'square') return shape;
      return 'circle';
    })(),
    floating_buttons: requestedButtons
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item, index, array) => item && allowedValues.has(item) && array.indexOf(item) === index)
      .slice(0, TEMPLATE_MAX_FLOATING_BUTTONS),
  };
};

const normalizeTemplateDisplayOptions = (rawValue, category) => {
  const raw = rawValue && typeof rawValue === 'object' ? rawValue : {};
  const normalizedCategory = category === 'business' ? 'business' : 'personal';
  return {
    show_profile_type_badge: Boolean(raw.show_profile_type_badge ?? raw.showProfileTypeBadge ?? DEFAULT_TEMPLATE_DISPLAY_OPTIONS.show_profile_type_badge),
    show_business_banner: normalizedCategory === 'business'
      ? Boolean(raw.show_business_banner ?? raw.showBusinessBanner ?? DEFAULT_TEMPLATE_DISPLAY_OPTIONS.show_business_banner)
      : false,
    show_floating_actions: Boolean(raw.show_floating_actions ?? raw.showFloatingActions ?? DEFAULT_TEMPLATE_DISPLAY_OPTIONS.show_floating_actions),
    show_lead_form: Boolean(raw.show_lead_form ?? raw.showLeadForm ?? (normalizedCategory === 'business')),
    show_manual_location_button: normalizedCategory === 'personal'
      ? Boolean(raw.show_manual_location_button ?? raw.showManualLocationButton ?? DEFAULT_TEMPLATE_DISPLAY_OPTIONS.show_manual_location_button)
      : false,
  };
};

const mergeFields = (existingFields = [], defaultFields = []) => {
  const mergedFields = Array.isArray(existingFields) ? [...existingFields] : [];
  defaultFields.forEach((defaultField) => {
    const idx = mergedFields.findIndex((field) =>
      (field?.id && field.id === defaultField.id) ||
      (field?.name && field.name === defaultField.name)
    );
    if (idx === -1) {
      mergedFields.push(cloneDeep(defaultField));
      return;
    }
    const existingField = mergedFields[idx] || {};
    mergedFields[idx] = {
      ...cloneDeep(defaultField),
      ...existingField,
      id: existingField.id || defaultField.id,
      name: existingField.name || defaultField.name,
      label: existingField.label || defaultField.label,
      type: existingField.type || defaultField.type,
      icon: existingField.icon || defaultField.icon || 'none',
      placeholder: existingField.placeholder ?? defaultField.placeholder ?? '',
      required: existingField.required ?? defaultField.required ?? false,
      visible: existingField.visible ?? defaultField.visible ?? true,
    };
  });
  return mergedFields;
};

const mergeSections = (existingSections = [], defaultSections = []) => {
  const mergedSections = Array.isArray(existingSections) ? [...existingSections] : [];
  defaultSections.forEach((defaultSection) => {
    const idx = mergedSections.findIndex((section) =>
      (section?.id && section.id === defaultSection.id) ||
      (section?.title && section.title === defaultSection.title)
    );
    if (idx === -1) {
      mergedSections.push(cloneDeep(defaultSection));
      return;
    }
    const existingSection = mergedSections[idx] || {};
    mergedSections[idx] = {
      ...cloneDeep(defaultSection),
      ...existingSection,
      id: existingSection.id || defaultSection.id,
      title: existingSection.title || defaultSection.title,
      icon: existingSection.icon || defaultSection.icon || 'none',
      description: existingSection.description ?? defaultSection.description ?? '',
      fields: mergeFields(existingSection.fields, defaultSection.fields),
    };
  });
  return mergedSections;
};

const mergeTemplatesByCategory = (existingTemplates = [], defaultTemplates = []) => {
  const existingList = Array.isArray(existingTemplates) ? existingTemplates : [];
  const defaultList = Array.isArray(defaultTemplates) ? defaultTemplates : [];

  const mergedFromDefaults = defaultList.map((defaultTemplate) => {
    const existingTemplate = existingList.find((template) => template?.key === defaultTemplate.key);
    if (!existingTemplate) {
      return {
        ...cloneDeep(defaultTemplate),
        default_public_settings: normalizeTemplatePublicSettings(
          defaultTemplate.default_public_settings,
          defaultTemplate.category
        ),
        display_options: normalizeTemplateDisplayOptions(
          defaultTemplate.display_options,
          defaultTemplate.category
        ),
      };
    }
    return {
      ...cloneDeep(defaultTemplate),
      ...existingTemplate,
      key: existingTemplate.key || defaultTemplate.key,
      label: existingTemplate.label || defaultTemplate.label,
      icon: existingTemplate.icon || defaultTemplate.icon,
      category: existingTemplate.category || defaultTemplate.category,
      enabled: existingTemplate.enabled ?? defaultTemplate.enabled ?? true,
      theme: {
        ...(defaultTemplate.theme || {}),
        ...(existingTemplate.theme || {}),
      },
      sections: mergeSections(existingTemplate.sections, defaultTemplate.sections),
      default_public_settings: normalizeTemplatePublicSettings(
        existingTemplate.default_public_settings ?? defaultTemplate.default_public_settings,
        existingTemplate.category || defaultTemplate.category
      ),
      display_options: normalizeTemplateDisplayOptions(
        existingTemplate.display_options ?? defaultTemplate.display_options,
        existingTemplate.category || defaultTemplate.category
      ),
    };
  });

  const customTemplates = existingList.filter(
    (existingTemplate) => !defaultList.some((defaultTemplate) => defaultTemplate.key === existingTemplate?.key)
  );
  const normalizedCustomTemplates = customTemplates.map((template) => ({
    ...template,
    default_public_settings: normalizeTemplatePublicSettings(template?.default_public_settings, template?.category),
    display_options: normalizeTemplateDisplayOptions(template?.display_options, template?.category),
  }));
  return [...mergedFromDefaults, ...normalizedCustomTemplates];
};

const mergeTemplatesWithDefaults = (savedConfig) => ({
  personal: mergeTemplatesByCategory(savedConfig?.personal, DEFAULT_TEMPLATES.personal),
  business: mergeTemplatesByCategory(savedConfig?.business, DEFAULT_TEMPLATES.business),
});

const createPreviewImage = (label, accent = '#4f46e5', background = '#eef2ff') =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="none">
      <rect width="640" height="360" rx="32" fill="${background}"/>
      <rect x="48" y="48" width="544" height="264" rx="28" fill="white" fill-opacity="0.9"/>
      <circle cx="320" cy="140" r="46" fill="${accent}" fill-opacity="0.18"/>
      <rect x="176" y="216" width="288" height="18" rx="9" fill="${accent}" fill-opacity="0.18"/>
      <rect x="228" y="246" width="184" height="14" rx="7" fill="${accent}" fill-opacity="0.10"/>
      <text x="320" y="146" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${accent}">
        Vista previa
      </text>
      <text x="320" y="302" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="${accent}">
        ${label}
      </text>
    </svg>
  `)}`;

const DEFAULT_TEMPLATES = {
  personal: [
    {
      key: 'medico', label: 'Médico', icon: 'heart', enabled: true, category: 'personal',
      theme: { primary_color: '#dc2626', bg_color: '#fef2f2' },
      sections: [
        { id: 's_emergency', title: 'Información de Emergencia', description: 'Datos críticos para respuesta rápida ante accidentes.', icon: 'alert', fields: [
          { id: 'photo_url', name: 'photo_url', label: 'Foto de Perfil', type: 'image', required: false, visible: true, icon: 'camera', placeholder: '' },
          { id: 'blood_type', name: 'blood_type', label: 'Tipo de Sangre', type: 'text', required: true, visible: true, icon: 'heart', placeholder: 'Ej: O+, A-' },
          { id: 'allergies', name: 'allergies', label: 'Alergias', type: 'textarea', required: false, visible: true, icon: 'alert', placeholder: 'Lista de alergias' },
          { id: 'medications', name: 'medications', label: 'Medicamentos', type: 'textarea', required: false, visible: true, icon: 'none', placeholder: 'Medicamentos actuales' },
          { id: 'conditions', name: 'conditions', label: 'Condiciones Médicas', type: 'textarea', required: false, visible: true, icon: 'none', placeholder: 'Condiciones' },
        ]},
        { id: 's_doctor', title: 'Médico Tratante', description: 'Contacto de profesional a cargo para continuidad de atención.', icon: 'user', fields: [
          { id: 'doctor_name', name: 'doctor_name', label: 'Nombre del Médico', type: 'text', required: false, visible: true, icon: 'user', placeholder: '' },
          { id: 'doctor_phone', name: 'doctor_phone', label: 'Teléfono del Médico', type: 'tel', required: false, visible: true, icon: 'phone', placeholder: '+56...' },
        ]},
        { id: 's_contact', title: 'Contacto de Emergencia', description: 'Persona responsable a quien llamar en caso urgente.', icon: 'phone', fields: [
          { id: 'emergency_name', name: 'emergency_name', label: 'Nombre Contacto', type: 'text', required: true, visible: true, icon: 'user', placeholder: '' },
          { id: 'emergency_phone', name: 'emergency_phone', label: 'Teléfono Contacto', type: 'tel', required: true, visible: true, icon: 'phone', placeholder: '+56...' },
        ]},
      ],
    },
    {
      key: 'mascota', label: 'Mascota', icon: 'dog', enabled: true, category: 'personal',
      theme: { primary_color: '#16a34a', bg_color: '#f0fdf4' },
      sections: [
        { id: 's_pet', title: 'Datos de la Mascota', description: 'Identificación visual y datos básicos para retorno seguro.', icon: 'dog', fields: [
          { id: 'photo_url', name: 'photo_url', label: 'Foto de la Mascota', type: 'image', required: false, visible: true, icon: 'camera', placeholder: '' },
          { id: 'pet_name', name: 'pet_name', label: 'Nombre', type: 'text', required: true, visible: true, icon: 'none', placeholder: '' },
          { id: 'species', name: 'species', label: 'Especie', type: 'text', required: true, visible: true, icon: 'none', placeholder: 'Perro, Gato...' },
          { id: 'breed', name: 'breed', label: 'Raza', type: 'text', required: false, visible: true, icon: 'none', placeholder: '' },
          { id: 'color', name: 'color', label: 'Color', type: 'text', required: false, visible: true, icon: 'none', placeholder: '' },
        ]},
        { id: 's_owner', title: 'Dueño', description: 'Datos de contacto para devolución inmediata.', icon: 'user', fields: [
          { id: 'owner_name', name: 'owner_name', label: 'Nombre del Dueño', type: 'text', required: true, visible: true, icon: 'user', placeholder: '' },
          { id: 'owner_phone', name: 'owner_phone', label: 'Teléfono', type: 'tel', required: true, visible: true, icon: 'phone', placeholder: '+56...' },
        ]},
        { id: 's_vet', title: 'Veterinario', description: 'Información clínica para casos urgentes.', icon: 'heart', fields: [
          { id: 'vet_name', name: 'vet_name', label: 'Nombre', type: 'text', required: false, visible: true, icon: 'none', placeholder: '' },
          { id: 'vet_phone', name: 'vet_phone', label: 'Teléfono', type: 'tel', required: false, visible: true, icon: 'phone', placeholder: '' },
        ]},
      ],
    },
    {
      key: 'vehiculo', label: 'Vehículo', icon: 'car', enabled: true, category: 'personal',
      theme: { primary_color: '#2563eb', bg_color: '#eff6ff' },
      sections: [
        { id: 's_vehicle', title: 'Datos del Vehículo', description: 'Identificación de patente y rasgos visuales del vehículo.', icon: 'car', fields: [
          { id: 'photo_url', name: 'photo_url', label: 'Foto del Vehículo', type: 'image', required: false, visible: true, icon: 'camera', placeholder: '' },
          { id: 'plate', name: 'plate', label: 'Patente', type: 'text', required: true, visible: true, icon: 'none', placeholder: '' },
          { id: 'brand', name: 'brand', label: 'Marca', type: 'text', required: false, visible: true, icon: 'none', placeholder: '' },
          { id: 'model', name: 'model', label: 'Modelo', type: 'text', required: false, visible: true, icon: 'none', placeholder: '' },
          { id: 'color', name: 'color', label: 'Color', type: 'text', required: false, visible: true, icon: 'none', placeholder: '' },
        ]},
        { id: 's_owner', title: 'Propietario', description: 'Contacto para notificar rápidamente al propietario.', icon: 'user', fields: [
          { id: 'owner_name', name: 'owner_name', label: 'Nombre', type: 'text', required: true, visible: true, icon: 'user', placeholder: '' },
          { id: 'owner_phone', name: 'owner_phone', label: 'Teléfono', type: 'tel', required: true, visible: true, icon: 'phone', placeholder: '' },
        ]},
      ],
    },
    {
      key: 'nino', label: 'Niño / Adulto Mayor', icon: 'user', enabled: true, category: 'personal',
      theme: { primary_color: '#9333ea', bg_color: '#faf5ff' },
      sections: [
        { id: 's_person', title: 'Datos Personales', description: 'Información de identificación para asistencia segura.', icon: 'user', fields: [
          { id: 'photo_url', name: 'photo_url', label: 'Foto', type: 'image', required: false, visible: true, icon: 'camera', placeholder: '' },
          { id: 'full_name', name: 'full_name', label: 'Nombre Completo', type: 'text', required: true, visible: true, icon: 'user', placeholder: '' },
          { id: 'age', name: 'age', label: 'Edad', type: 'text', required: false, visible: true, icon: 'none', placeholder: '' },
          { id: 'conditions', name: 'conditions', label: 'Condiciones Médicas', type: 'textarea', required: false, visible: true, icon: 'heart', placeholder: '' },
          { id: 'address', name: 'address', label: 'Dirección', type: 'text', required: false, visible: true, icon: 'map-pin', placeholder: '' },
        ]},
        { id: 's_guardian', title: 'Tutor / Responsable', description: 'Datos de contacto del responsable principal.', icon: 'shield', fields: [
          { id: 'guardian_name', name: 'guardian_name', label: 'Nombre del Tutor', type: 'text', required: true, visible: true, icon: 'user', placeholder: '' },
          { id: 'guardian_phone', name: 'guardian_phone', label: 'Teléfono', type: 'tel', required: true, visible: true, icon: 'phone', placeholder: '' },
        ]},
      ],
    },
  ],
  business: [
    {
      key: 'restaurante', label: 'Restaurante', icon: 'utensils', enabled: true, category: 'business',
      theme: { primary_color: '#d97706', bg_color: '#fffbeb' },
      sections: [
        { id: 's_info', title: 'Identidad y Carta', description: 'Presentación del local y menú para convertir visitas en reservas.', icon: 'utensils', fields: [
          { id: 'logo_url', name: 'logo_url', label: 'Logo', type: 'image', required: false, visible: true, icon: 'camera', placeholder: '' },
          { id: 'cover_image_url', name: 'cover_image_url', label: 'Imagen de Portada', type: 'image', required: false, visible: true, icon: 'camera', placeholder: '' },
          { id: 'description', name: 'description', label: 'Descripción', type: 'textarea', required: false, visible: true, icon: 'none', placeholder: 'Sobre el restaurante' },
          { id: 'menu_items', name: 'menu_items', label: 'Menú (uno por línea)', type: 'textarea', required: false, visible: true, icon: 'utensils', placeholder: 'Plato - $precio' },
        ]},
        { id: 's_contact', title: 'Contacto', description: 'Canales de reserva y ubicación.', icon: 'phone', fields: [
          { id: 'phone', name: 'phone', label: 'Teléfono', type: 'tel', required: false, visible: true, icon: 'phone', placeholder: '' },
          { id: 'address', name: 'address', label: 'Dirección', type: 'text', required: false, visible: true, icon: 'map-pin', placeholder: '' },
          { id: 'schedule', name: 'schedule', label: 'Horario', type: 'text', required: false, visible: true, icon: 'clock', placeholder: '' },
          { id: 'website', name: 'website', label: 'Sitio Web', type: 'url', required: false, visible: true, icon: 'globe', placeholder: '' },
        ]},
      ],
    },
    {
      key: 'hotel', label: 'Hotel', icon: 'building', enabled: true, category: 'business',
      theme: { primary_color: '#4f46e5', bg_color: '#eef2ff' },
      sections: [
        { id: 's_welcome', title: 'Bienvenida', description: 'Primera impresión para huéspedes y check-in rápido.', icon: 'star', fields: [
          { id: 'cover_image_url', name: 'cover_image_url', label: 'Imagen de Portada', type: 'image', required: false, visible: true, icon: 'camera', placeholder: '' },
          { id: 'hotel_name', name: 'hotel_name', label: 'Nombre del Hotel', type: 'text', required: true, visible: true, icon: 'building', placeholder: '' },
          { id: 'description', name: 'description', label: 'Descripción', type: 'textarea', required: false, visible: true, icon: 'none', placeholder: '' },
          { id: 'welcome_message', name: 'welcome_message', label: 'Mensaje de Bienvenida', type: 'textarea', required: false, visible: true, icon: 'message', placeholder: '' },
        ]},
        { id: 's_wifi', title: 'WiFi', description: 'Acceso inmediato para huéspedes.', icon: 'wifi', fields: [
          { id: 'wifi_name', name: 'wifi_name', label: 'Red WiFi', type: 'text', required: false, visible: true, icon: 'wifi', placeholder: '' },
          { id: 'wifi_password', name: 'wifi_password', label: 'Contraseña WiFi', type: 'text', required: false, visible: true, icon: 'none', placeholder: '' },
        ]},
        { id: 's_info', title: 'Información', description: 'Datos operativos y de emergencia.', icon: 'clock', fields: [
          { id: 'services', name: 'services', label: 'Servicios (uno por línea)', type: 'textarea', required: false, visible: true, icon: 'coffee', placeholder: '' },
          { id: 'check_in', name: 'check_in', label: 'Hora Check-in', type: 'text', required: false, visible: true, icon: 'clock', placeholder: '' },
          { id: 'check_out', name: 'check_out', label: 'Hora Check-out', type: 'text', required: false, visible: true, icon: 'clock', placeholder: '' },
          { id: 'address', name: 'address', label: 'Dirección', type: 'text', required: false, visible: true, icon: 'map-pin', placeholder: '' },
          { id: 'checkout_time', name: 'checkout_time', label: 'Hora de Checkout', type: 'text', required: false, visible: true, icon: 'clock', placeholder: '' },
          { id: 'reception_phone', name: 'reception_phone', label: 'Teléfono Recepción', type: 'tel', required: false, visible: true, icon: 'phone', placeholder: '' },
          { id: 'emergency_info', name: 'emergency_info', label: 'Info de Emergencia', type: 'textarea', required: false, visible: true, icon: 'alert', placeholder: '' },
        ]},
      ],
    },
    {
      key: 'wifi', label: 'WiFi', icon: 'wifi', enabled: true, category: 'business',
      theme: { primary_color: '#0891b2', bg_color: '#ecfeff' },
      sections: [
        { id: 's_wifi', title: 'Conexión WiFi', icon: 'wifi', fields: [
          { id: 'network_name', name: 'network_name', label: 'Nombre de Red', type: 'text', required: true, visible: true, icon: 'wifi', placeholder: '' },
          { id: 'password', name: 'password', label: 'Contraseña', type: 'text', required: true, visible: true, icon: 'none', placeholder: '' },
          { id: 'encryption', name: 'encryption', label: 'Encriptación', type: 'text', required: false, visible: true, icon: 'shield', placeholder: 'WPA2, WPA3' },
        ]},
      ],
    },
    {
      key: 'tarjeta', label: 'Tarjeta de Presentación', icon: 'credit-card', enabled: true, category: 'business',
      theme: { primary_color: '#db2777', bg_color: '#fdf2f8' },
      sections: [
        { id: 's_personal', title: 'Datos Personales', description: 'Presentación profesional para networking y ventas.', icon: 'user', fields: [
          { id: 'avatar_url', name: 'avatar_url', label: 'Foto/Avatar', type: 'image', required: false, visible: true, icon: 'camera', placeholder: '' },
          { id: 'full_name', name: 'full_name', label: 'Nombre Completo', type: 'text', required: true, visible: true, icon: 'user', placeholder: '' },
          { id: 'title', name: 'title', label: 'Cargo', type: 'text', required: false, visible: true, icon: 'star', placeholder: '' },
          { id: 'company', name: 'company', label: 'Empresa', type: 'text', required: false, visible: true, icon: 'building', placeholder: '' },
        ]},
        { id: 's_contact', title: 'Contacto', description: 'Canales directos para cerrar oportunidades.', icon: 'phone', fields: [
          { id: 'email', name: 'email', label: 'Email', type: 'email', required: false, visible: true, icon: 'mail', placeholder: '' },
          { id: 'phone', name: 'phone', label: 'Teléfono', type: 'tel', required: false, visible: true, icon: 'phone', placeholder: '' },
          { id: 'website', name: 'website', label: 'Sitio Web', type: 'url', required: false, visible: true, icon: 'globe', placeholder: '' },
          { id: 'linkedin', name: 'linkedin', label: 'LinkedIn', type: 'url', required: false, visible: true, icon: 'globe', placeholder: '' },
        ]},
      ],
    },
    {
      key: 'redes', label: 'Redes Sociales', icon: 'globe', enabled: true, category: 'business',
      theme: { primary_color: '#c026d3', bg_color: '#fdf4ff' },
      sections: [
        { id: 's_name', title: 'Perfil', icon: 'user', fields: [
          { id: 'display_name', name: 'display_name', label: 'Nombre a Mostrar', type: 'text', required: true, visible: true, icon: 'user', placeholder: '' },
        ]},
        { id: 's_links', title: 'Redes', icon: 'globe', fields: [
          { id: 'instagram', name: 'instagram', label: 'Instagram', type: 'url', required: false, visible: true, icon: 'globe', placeholder: '@usuario' },
          { id: 'facebook', name: 'facebook', label: 'Facebook', type: 'url', required: false, visible: true, icon: 'globe', placeholder: '' },
          { id: 'twitter', name: 'twitter', label: 'Twitter/X', type: 'url', required: false, visible: true, icon: 'globe', placeholder: '@usuario' },
          { id: 'tiktok', name: 'tiktok', label: 'TikTok', type: 'url', required: false, visible: true, icon: 'globe', placeholder: '@usuario' },
          { id: 'youtube', name: 'youtube', label: 'YouTube', type: 'url', required: false, visible: true, icon: 'globe', placeholder: '' },
          { id: 'linkedin', name: 'linkedin', label: 'LinkedIn', type: 'url', required: false, visible: true, icon: 'globe', placeholder: '' },
          { id: 'website', name: 'website', label: 'Sitio Web', type: 'url', required: false, visible: true, icon: 'globe', placeholder: '' },
        ]},
      ],
    },
    {
      key: 'evento', label: 'Evento', icon: 'calendar', enabled: true, category: 'business',
      theme: { primary_color: '#e11d48', bg_color: '#fff1f2' },
      sections: [
        { id: 's_event', title: 'Datos del Evento', description: 'Landing rápida para asistentes con agenda y acceso.', icon: 'calendar', fields: [
          { id: 'banner_url', name: 'banner_url', label: 'Banner del Evento', type: 'image', required: false, visible: true, icon: 'camera', placeholder: '' },
          { id: 'event_name', name: 'event_name', label: 'Nombre del Evento', type: 'text', required: true, visible: true, icon: 'star', placeholder: '' },
          { id: 'description', name: 'description', label: 'Descripción', type: 'textarea', required: false, visible: true, icon: 'none', placeholder: '' },
          { id: 'date', name: 'date', label: 'Fecha', type: 'text', required: false, visible: true, icon: 'calendar', placeholder: '' },
          { id: 'time', name: 'time', label: 'Hora', type: 'text', required: false, visible: true, icon: 'clock', placeholder: '' },
          { id: 'location', name: 'location', label: 'Lugar', type: 'text', required: false, visible: true, icon: 'map-pin', placeholder: '' },
          { id: 'agenda', name: 'agenda', label: 'Agenda (una por línea)', type: 'textarea', required: false, visible: true, icon: 'file-text', placeholder: '' },
          { id: 'organizer', name: 'organizer', label: 'Organizador', type: 'text', required: false, visible: true, icon: 'user', placeholder: '' },
          { id: 'contact_phone', name: 'contact_phone', label: 'Teléfono', type: 'tel', required: false, visible: true, icon: 'phone', placeholder: '' },
        ]},
      ],
    },
    {
      key: 'catalogo', label: 'Catálogo', icon: 'building', enabled: true, category: 'business',
      theme: { primary_color: '#ea580c', bg_color: '#fff7ed' },
      sections: [
        { id: 's_catalog', title: 'Catálogo', description: 'Muestra productos y precios para compras rápidas.', icon: 'building', fields: [
          { id: 'cover_image_url', name: 'cover_image_url', label: 'Imagen Principal', type: 'image', required: false, visible: true, icon: 'camera', placeholder: '' },
          { id: 'business_name', name: 'business_name', label: 'Nombre del Negocio', type: 'text', required: true, visible: true, icon: 'building', placeholder: '' },
          { id: 'catalog_name', name: 'catalog_name', label: 'Nombre del Catálogo', type: 'text', required: false, visible: true, icon: 'file-text', placeholder: '' },
          { id: 'description', name: 'description', label: 'Descripción', type: 'textarea', required: false, visible: true, icon: 'none', placeholder: '' },
          { id: 'products', name: 'products', label: 'Productos (uno por línea)', type: 'textarea', required: false, visible: true, icon: 'none', placeholder: '' },
          { id: 'contact_info', name: 'contact_info', label: 'Información de Contacto', type: 'text', required: false, visible: true, icon: 'phone', placeholder: '' },
          { id: 'phone', name: 'phone', label: 'Teléfono', type: 'tel', required: false, visible: true, icon: 'phone', placeholder: '' },
          { id: 'website', name: 'website', label: 'Sitio Web', type: 'url', required: false, visible: true, icon: 'globe', placeholder: '' },
        ]},
      ],
    },
    {
      key: 'turismo', label: 'Turismo', icon: 'map-pin', enabled: true, category: 'business',
      theme: { primary_color: '#0d9488', bg_color: '#f0fdfa' },
      sections: [
        { id: 's_tourism', title: 'Lugar Turístico', description: 'Información de visita para turistas y visitantes.', icon: 'map-pin', fields: [
          { id: 'cover_image_url', name: 'cover_image_url', label: 'Imagen del Lugar', type: 'image', required: false, visible: true, icon: 'camera', placeholder: '' },
          { id: 'place_name', name: 'place_name', label: 'Nombre del Lugar', type: 'text', required: true, visible: true, icon: 'map-pin', placeholder: '' },
          { id: 'description', name: 'description', label: 'Descripción', type: 'textarea', required: false, visible: true, icon: 'none', placeholder: '' },
          { id: 'history', name: 'history', label: 'Historia', type: 'textarea', required: false, visible: true, icon: 'none', placeholder: '' },
          { id: 'attractions', name: 'attractions', label: 'Atracciones (una por línea)', type: 'textarea', required: false, visible: true, icon: 'star', placeholder: '' },
          { id: 'hours', name: 'hours', label: 'Horario', type: 'text', required: false, visible: true, icon: 'clock', placeholder: '' },
          { id: 'schedule', name: 'schedule', label: 'Horario', type: 'text', required: false, visible: true, icon: 'clock', placeholder: '' },
          { id: 'entry_fee', name: 'entry_fee', label: 'Costo de Entrada', type: 'text', required: false, visible: true, icon: 'credit-card', placeholder: '' },
          { id: 'address', name: 'address', label: 'Dirección', type: 'text', required: false, visible: true, icon: 'map-pin', placeholder: '' },
        ]},
      ],
    },
    {
      key: 'checkin', label: 'Check-in', icon: 'star', enabled: true, category: 'business',
      theme: { primary_color: '#65a30d', bg_color: '#f7fee7' },
      sections: [
        { id: 's_checkin', title: 'Check-in Digital', icon: 'star', fields: [
          { id: 'business_name', name: 'business_name', label: 'Nombre del Negocio', type: 'text', required: true, visible: true, icon: 'building', placeholder: '' },
          { id: 'welcome_message', name: 'welcome_message', label: 'Mensaje de Bienvenida', type: 'textarea', required: false, visible: true, icon: 'message', placeholder: '' },
          { id: 'address', name: 'address', label: 'Dirección', type: 'text', required: false, visible: true, icon: 'map-pin', placeholder: '' },
          { id: 'phone', name: 'phone', label: 'Teléfono', type: 'tel', required: false, visible: true, icon: 'phone', placeholder: '' },
        ]},
      ],
    },
    {
      key: 'encuesta', label: 'Encuesta', icon: 'message', enabled: true, category: 'business',
      theme: { primary_color: '#7c3aed', bg_color: '#f5f3ff' },
      sections: [
        { id: 's_survey', title: 'Encuesta / Feedback', icon: 'message', fields: [
          { id: 'survey_title', name: 'survey_title', label: 'Título', type: 'text', required: true, visible: true, icon: 'none', placeholder: '' },
          { id: 'description', name: 'description', label: 'Descripción', type: 'textarea', required: false, visible: true, icon: 'none', placeholder: '' },
          { id: 'questions', name: 'questions', label: 'Preguntas (una por línea)', type: 'textarea', required: false, visible: true, icon: 'message', placeholder: '' },
          { id: 'thank_you_message', name: 'thank_you_message', label: 'Mensaje de Agradecimiento', type: 'text', required: false, visible: true, icon: 'heart', placeholder: '' },
        ]},
      ],
    },
  ],
};

const SAMPLE_DATA = {
  medico: { photo_url: createPreviewImage('Perfil médico', '#dc2626', '#fef2f2'), blood_type: 'O+', allergies: 'Penicilina', emergency_name: 'María García', emergency_phone: '+56912345678' },
  mascota: { photo_url: createPreviewImage('Foto mascota', '#16a34a', '#f0fdf4'), pet_name: 'Luna', species: 'Perro', breed: 'Labrador', owner_name: 'Carlos', owner_phone: '+56987654321' },
  vehiculo: { photo_url: createPreviewImage('Foto vehículo', '#2563eb', '#eff6ff'), plate: 'AB-1234', brand: 'Toyota', model: 'Corolla', owner_name: 'Ana', owner_phone: '+56955555555' },
  nino: { photo_url: createPreviewImage('Foto familiar', '#9333ea', '#faf5ff'), full_name: 'Sofía López', age: '8 años', guardian_name: 'Pedro López', guardian_phone: '+56911111111' },
  restaurante: { logo_url: createPreviewImage('Logo restaurante', '#d97706', '#fffbeb'), cover_image_url: createPreviewImage('Portada restaurante', '#d97706', '#fffbeb'), description: 'Comida chilena tradicional', menu_items: 'Empanada - $2.990\nCazuela - $5.990', phone: '+56922222222', address: 'Av. Principal 123', schedule: 'Lun-Sab 12:00-23:00' },
  hotel: { cover_image_url: createPreviewImage('Portada hotel', '#4f46e5', '#eef2ff'), hotel_name: 'Hotel Vista Mar', description: 'Habitaciones premium frente al mar', welcome_message: 'Bienvenido a su estancia', wifi_name: 'Hotel_Guest', wifi_password: 'guest2024', services: 'WiFi Gratis\nPiscina\nSpa', check_in: '15:00', check_out: '12:00', checkout_time: '12:00 PM' },
  wifi: { network_name: 'MiRed_WiFi', password: 'clave123', encryption: 'WPA2' },
  tarjeta: { avatar_url: createPreviewImage('Avatar profesional', '#db2777', '#fdf2f8'), full_name: 'Juan Pérez', title: 'Director Comercial', company: 'Tech Corp', email: 'juan@tech.com', phone: '+56933333333' },
  redes: { display_name: 'Mi Marca', instagram: '@mimarca', twitter: '@mimarca', website: 'mimarca.com' },
  evento: { banner_url: createPreviewImage('Banner evento', '#e11d48', '#fff1f2'), event_name: 'Conferencia Tech 2026', date: '15 Abril 2026', time: '09:00 - 18:00', location: 'Centro de Convenciones', agenda: '09:00 Registro\n10:00 Keynote\n13:00 Networking' },
  catalogo: { cover_image_url: createPreviewImage('Portada catálogo', '#ea580c', '#fff7ed'), business_name: 'Tienda ABC', catalog_name: 'Colección Verano', description: 'Los mejores productos', products: 'Producto A - $10.990\nProducto B - $15.990' },
  turismo: { cover_image_url: createPreviewImage('Imagen turística', '#0d9488', '#f0fdfa'), place_name: 'Mirador del Valle', description: 'Vista panorámica increíble', schedule: 'Lun-Dom 08:00-18:00', attractions: 'Mirador principal\nSendero corto\nZona fotográfica' },
  checkin: { business_name: 'Clínica Salud', welcome_message: 'Bienvenido, por favor registre su visita' },
  encuesta: { survey_title: 'Encuesta de Satisfacción', questions: '¿Cómo fue su experiencia?\n¿Nos recomendaría?', thank_you_message: 'Gracias por su tiempo' },
};

export const AdminProfileEditorPage = () => {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/profile-types-config?_t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data === 'object') {
          setTemplates(mergeTemplatesWithDefaults(data));
          return;
        }
      }
      setTemplates(cloneDeep(DEFAULT_TEMPLATES));
    } catch (e) {
      setTemplates(cloneDeep(DEFAULT_TEMPLATES));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/admin/profile-types-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(templates),
      });
      if (!response.ok) throw new Error('Failed');
      toast.success('Configuración guardada');
      await loadConfig();
    } catch (e) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectTemplate = (category, key) => {
    setSelectedKey(key);
    setSelectedCategory(category);
  };

  const selectedTemplate = selectedKey
    ? templates[selectedCategory]?.find(t => t.key === selectedKey)
    : null;
  const selectedTemplateCategory = selectedCategory || selectedTemplate?.category || 'personal';
  const selectedFloatingButtonOptions = TEMPLATE_FLOATING_BUTTON_OPTIONS[selectedTemplateCategory] || TEMPLATE_FLOATING_BUTTON_OPTIONS.personal;
  const selectedTemplatePublicSettings = normalizeTemplatePublicSettings(
    selectedTemplate?.default_public_settings,
    selectedTemplateCategory
  );
  const selectedTemplateDisplayOptions = normalizeTemplateDisplayOptions(
    selectedTemplate?.display_options,
    selectedTemplateCategory
  );

  const updateSelectedTemplate = (updatedTemplate) => {
    setTemplates(prev => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].map(t =>
        t.key === selectedKey ? { ...t, ...updatedTemplate } : t
      ),
    }));
  };
  const updateSelectedTemplatePublicSettings = (patch) => {
    if (!selectedTemplate) return;
    const mergedSettings = normalizeTemplatePublicSettings(
      {
        ...selectedTemplatePublicSettings,
        ...patch,
      },
      selectedTemplateCategory
    );
    updateSelectedTemplate({ default_public_settings: mergedSettings });
  };
  const updateSelectedTemplateDisplayOptions = (patch) => {
    if (!selectedTemplate) return;
    const mergedOptions = normalizeTemplateDisplayOptions(
      {
        ...selectedTemplateDisplayOptions,
        ...patch,
      },
      selectedTemplateCategory
    );
    updateSelectedTemplate({ display_options: mergedOptions });
  };

  const toggleSelectedTemplateFloatingButton = (buttonType) => {
    const currentButtons = selectedTemplatePublicSettings.floating_buttons;
    if (currentButtons.includes(buttonType)) {
      updateSelectedTemplatePublicSettings({
        floating_buttons: currentButtons.filter((item) => item !== buttonType),
      });
      return;
    }
    if (currentButtons.length >= TEMPLATE_MAX_FLOATING_BUTTONS) return;
    updateSelectedTemplatePublicSettings({
      floating_buttons: [...currentButtons, buttonType],
    });
  };

  const getIconComp = (name) => ICON_COMPONENTS[name] || Star;
  const renderProfileCard = (category, template) => {
    const Icon = getIconComp(template.icon);
    const isActive = selectedKey === template.key;
    const fieldCount = template.sections?.reduce((sum, s) => sum + (s.fields?.length || 0), 0) || 0;

    return (
      <Card
        key={template.key}
        className={`cursor-pointer transition-all hover:shadow-md ${isActive ? 'ring-2 ring-primary shadow-md' : ''} ${!template.enabled ? 'opacity-50' : ''}`}
        onClick={() => handleSelectTemplate(category, template.key)}
        data-testid={`template-card-${template.key}`}
      >
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: template.theme?.bg_color || '#f3f4f6' }}
            >
              <Icon className="h-4.5 w-4.5" style={{ color: template.theme?.primary_color || '#6b7280' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{template.label}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{fieldCount} campos</span>
                <span className="text-[10px] text-muted-foreground">{template.sections?.length || 0} secciones</span>
                {!template.enabled && <Badge variant="secondary" className="text-[9px] h-4">Inactivo</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <ProtectedRoute adminOnly>
      <AdminLayout>
        <div className="p-6 lg:p-8" data-testid="admin-profile-editor">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
                <FileEdit className="h-6 w-6" />
                Editor de Perfiles
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {selectedTemplate
                  ? `Editando: ${selectedTemplate.label}`
                  : 'Configura tipos de perfil, campos, secciones y colores'}
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving} data-testid="save-config-btn">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar Todo'}
            </Button>
          </div>

          {/* Profile selection grid */}
          {!selectedTemplate && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="personal">Personal ({templates.personal.length})</TabsTrigger>
                <TabsTrigger value="business">Empresa ({templates.business.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="personal" className="mt-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {templates.personal.map(t => renderProfileCard('personal', t))}
                </div>
              </TabsContent>
              <TabsContent value="business" className="mt-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {templates.business.map(t => renderProfileCard('business', t))}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Template Editor + Preview */}
          {selectedTemplate && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedKey(null); setSelectedCategory(null); }}
                className="mb-4"
                data-testid="back-to-types-btn"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Volver a los tipos de perfil
              </Button>

              <Card className="mb-4">
                <CardContent className="space-y-4 p-4">
                  <div className="space-y-1">
                    <p className="font-semibold">Comportamiento por defecto del QR público</p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                    <div>
                      <p className="text-sm font-medium">Solicitar ubicación automáticamente</p>
                    </div>
                    <Switch
                      checked={selectedTemplatePublicSettings.request_location_automatically}
                      onCheckedChange={(checked) => updateSelectedTemplatePublicSettings({ request_location_automatically: checked })}
                    />
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Foto superior destacada</p>
                        <p className="text-xs text-muted-foreground">Se muestra debajo del nombre del perfil.</p>
                      </div>
                      <Switch
                        checked={selectedTemplatePublicSettings.top_profile_photo_enabled}
                        onCheckedChange={(checked) => updateSelectedTemplatePublicSettings({ top_profile_photo_enabled: checked })}
                      />
                    </div>
                    {selectedTemplatePublicSettings.top_profile_photo_enabled && (
                      <div className="max-w-xs">
                        <p className="text-xs text-muted-foreground mb-1">Forma predeterminada</p>
                        <Select
                          value={selectedTemplatePublicSettings.top_profile_photo_shape}
                          onValueChange={(value) => updateSelectedTemplatePublicSettings({ top_profile_photo_shape: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="circle">Circular</SelectItem>
                            <SelectItem value="rounded">Redondeado</SelectItem>
                            <SelectItem value="square">Cuadrado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                    <p className="text-sm font-medium">Visibilidad de bloques</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
                        <span className="text-xs">Mostrar tipo de perfil</span>
                        <Switch
                          checked={selectedTemplateDisplayOptions.show_profile_type_badge}
                          onCheckedChange={(checked) => updateSelectedTemplateDisplayOptions({ show_profile_type_badge: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
                        <span className="text-xs">Botones flotantes</span>
                        <Switch
                          checked={selectedTemplateDisplayOptions.show_floating_actions}
                          onCheckedChange={(checked) => updateSelectedTemplateDisplayOptions({ show_floating_actions: checked })}
                        />
                      </div>

                      {selectedTemplateCategory === 'business' && (
                        <>
                          <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
                            <span className="text-xs">Banner negocio</span>
                            <Switch
                              checked={selectedTemplateDisplayOptions.show_business_banner}
                              onCheckedChange={(checked) => updateSelectedTemplateDisplayOptions({ show_business_banner: checked })}
                            />
                          </div>
                          <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
                            <span className="text-xs">Formulario de contacto</span>
                            <Switch
                              checked={selectedTemplateDisplayOptions.show_lead_form}
                              onCheckedChange={(checked) => updateSelectedTemplateDisplayOptions({ show_lead_form: checked })}
                            />
                          </div>
                        </>
                      )}

                      {selectedTemplateCategory === 'personal' && (
                        <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
                          <span className="text-xs">Botón manual de ubicación</span>
                          <Switch
                            checked={selectedTemplateDisplayOptions.show_manual_location_button}
                            onCheckedChange={(checked) => updateSelectedTemplateDisplayOptions({ show_manual_location_button: checked })}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Botones flotantes predeterminados</p>
                      <span className="text-xs text-muted-foreground">
                        {selectedTemplatePublicSettings.floating_buttons.length}/{TEMPLATE_MAX_FLOATING_BUTTONS}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {selectedFloatingButtonOptions.map((option) => {
                        const active = selectedTemplatePublicSettings.floating_buttons.includes(option.value);
                        return (
                          <Button
                            key={option.value}
                            type="button"
                            variant={active ? 'default' : 'outline'}
                            className="justify-start"
                            onClick={() => toggleSelectedTemplateFloatingButton(option.value)}
                            disabled={!active && selectedTemplatePublicSettings.floating_buttons.length >= TEMPLATE_MAX_FLOATING_BUTTONS}
                          >
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-6">
                {/* Editor */}
                <div className="flex-1 min-w-0">
                  <ProfileTemplateEditor
                    template={selectedTemplate}
                    onChange={updateSelectedTemplate}
                  />
                </div>

                {/* Mobile Preview */}
                <div className="hidden lg:block w-[320px] shrink-0">
                  <div className="sticky top-20">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Vista Previa Móvil</span>
                    </div>
                    <div
                      className="border-[3px] border-foreground/20 rounded-[2rem] overflow-hidden bg-background shadow-xl"
                      style={{ width: '300px', height: '580px' }}
                      data-testid="mobile-preview-frame"
                    >
                      <div className="bg-foreground/20 mx-auto mt-2 rounded-full" style={{ width: '120px', height: '6px' }} />
                      <div className="overflow-y-auto" style={{ height: '560px' }}>
                        <TemplatePreview
                          template={selectedTemplate}
                          sampleData={SAMPLE_DATA[selectedTemplate.key] || {}}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
};
