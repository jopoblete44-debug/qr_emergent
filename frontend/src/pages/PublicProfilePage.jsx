import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { createPublicLead, fetchPublicProfile, resolveMediaUrl, sendLocation, trackPublicActionClick, trackPublicProfileVisit } from '../utils/api';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  MapPin, Phone, Mail, Heart, AlertTriangle, Wifi, Globe, Clock, Shield,
  User, Building, Instagram, Facebook, Twitter, Youtube, Linkedin,
  CalendarDays, UtensilsCrossed, Hotel, QrCode, ClipboardCheck, MessageSquare, Star,
  CreditCard, Camera, FileText, Bell, Coffee, Home, Car, Baby, Dog
} from 'lucide-react';
import '../utils/i18n';

const THEME_COLORS = {
  medico: { bg: 'bg-red-50 dark:bg-red-950', accent: 'text-red-600', border: 'border-red-200 dark:border-red-800' },
  mascota: { bg: 'bg-emerald-50 dark:bg-emerald-950', accent: 'text-emerald-600', border: 'border-emerald-200 dark:border-emerald-800' },
  vehiculo: { bg: 'bg-blue-50 dark:bg-blue-950', accent: 'text-blue-600', border: 'border-blue-200 dark:border-blue-800' },
  nino: { bg: 'bg-purple-50 dark:bg-purple-950', accent: 'text-purple-600', border: 'border-purple-200 dark:border-purple-800' },
  restaurante: { bg: 'bg-amber-50 dark:bg-amber-950', accent: 'text-amber-600', border: 'border-amber-200 dark:border-amber-800' },
  hotel: { bg: 'bg-indigo-50 dark:bg-indigo-950', accent: 'text-indigo-600', border: 'border-indigo-200 dark:border-indigo-800' },
  wifi: { bg: 'bg-cyan-50 dark:bg-cyan-950', accent: 'text-cyan-600', border: 'border-cyan-200 dark:border-cyan-800' },
  tarjeta: { bg: 'bg-pink-50 dark:bg-pink-950', accent: 'text-pink-600', border: 'border-pink-200 dark:border-pink-800' },
  catalogo: { bg: 'bg-orange-50 dark:bg-orange-950', accent: 'text-orange-600', border: 'border-orange-200 dark:border-orange-800' },
  turismo: { bg: 'bg-teal-50 dark:bg-teal-950', accent: 'text-teal-600', border: 'border-teal-200 dark:border-teal-800' },
  checkin: { bg: 'bg-lime-50 dark:bg-lime-950', accent: 'text-lime-600', border: 'border-lime-200 dark:border-lime-800' },
  encuesta: { bg: 'bg-violet-50 dark:bg-violet-950', accent: 'text-violet-600', border: 'border-violet-200 dark:border-violet-800' },
  redes: { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950', accent: 'text-fuchsia-600', border: 'border-fuchsia-200 dark:border-fuchsia-800' },
  evento: { bg: 'bg-rose-50 dark:bg-rose-950', accent: 'text-rose-600', border: 'border-rose-200 dark:border-rose-800' },
};
const PERSONAL_TYPE_LABELS = {
  medico: 'Perfil Médico',
  mascota: 'Mascota',
  vehiculo: 'Vehículo',
  nino: 'Perfil de cuidado',
};
const BUSINESS_TYPE_LABELS = {
  restaurante: 'Restaurante',
  hotel: 'Hotel',
  wifi: 'Acceso WiFi',
  tarjeta: 'Tarjeta Digital',
  catalogo: 'Catálogo',
  turismo: 'Turismo',
  checkin: 'Check-in',
  encuesta: 'Encuesta',
  redes: 'Redes Sociales',
  evento: 'Evento',
};

const DataRow = ({ label, value, icon: Icon }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start py-3 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="font-medium text-sm text-right max-w-[60%]">{value}</span>
    </div>
  );
};

const PhoneLink = ({ phone, label }) => {
  if (!phone) return null;
  return (
    <a href={`tel:${phone}`} className="flex items-center gap-2 text-primary hover:underline py-1">
      <Phone className="h-4 w-4" />
      <span className="text-sm">{label || phone}</span>
    </a>
  );
};

const ContactCard = ({ title, children }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
    <h4 className="font-semibold text-sm">{title}</h4>
    {children}
  </div>
);

const looksLikeUrl = (value) => typeof value === 'string' && /^(https?:\/\/|www\.)/i.test(value.trim());
const looksLikeImageUrl = (value) =>
  typeof value === 'string' &&
  (
    /^\/?uploads\//i.test(value.trim()) ||
    /(\.png|\.jpe?g|\.webp|\.gif|\.bmp|\.svg)(\?.*)?$/i.test(value.trim())
  );
const isImageFieldName = (name) => /(photo|image|logo|avatar|foto|imagen)/i.test(name || '');
const splitMultilineValue = (value) => String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);
const TEMPLATE_ICON_MAP = {
  none: null,
  heart: Heart,
  user: User,
  'map-pin': MapPin,
  globe: Globe,
  shield: Shield,
  star: Star,
  clock: Clock,
  calendar: CalendarDays,
  wifi: Wifi,
  phone: Phone,
  mail: Mail,
  building: Building,
  'credit-card': CreditCard,
  camera: Camera,
  'file-text': FileText,
  message: MessageSquare,
  bell: Bell,
  alert: AlertTriangle,
  coffee: Coffee,
  utensils: UtensilsCrossed,
  home: Home,
  car: Car,
  baby: Baby,
  dog: Dog,
};
const getTemplateIcon = (iconName) => TEMPLATE_ICON_MAP[iconName] || null;
const normalizeExternalLink = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};
const normalizePublicActionUrl = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return resolveMediaUrl(trimmed);
  if (/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return null;
};
const normalizeProfileType = (value) => (String(value || '').trim().toLowerCase() === 'business' ? 'business' : 'personal');
const FLOATING_BUTTON_ALIASES = {
  location: 'send_location',
  call: 'call_contact',
  emergency_call: 'call_emergency',
  google_review: 'rate_restaurant',
  catalog_pdf: 'view_catalog_pdf',
};
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
const withAlpha = (hexColor, alpha = 1) => {
  if (typeof hexColor !== 'string') return null;
  const raw = hexColor.trim().replace('#', '');
  if (![3, 6].includes(raw.length)) return null;
  const normalized = raw.length === 3 ? raw.split('').map((item) => item + item).join('') : raw;
  const numeric = Number.parseInt(normalized, 16);
  if (Number.isNaN(numeric)) return null;
  const red = (numeric >> 16) & 255;
  const green = (numeric >> 8) & 255;
  const blue = numeric & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};
const buildGoogleReviewUrl = (data) => {
  if (!data || typeof data !== 'object') return null;
  const directLink = normalizePublicActionUrl(data.google_review_link || data.review_url || data.tripadvisor_url);
  if (directLink) return directLink;
  const placeId = String(data.google_review_place_id || '').trim();
  return placeId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}` : null;
};
const buildMapEmbedUrl = (data) => {
  if (!data || typeof data !== 'object') return null;
  const directMapLink = normalizePublicActionUrl(data.google_maps_url || data.maps_url || data.map_url);
  if (directMapLink && /^https?:\/\//i.test(directMapLink)) {
    if (/output=embed/i.test(directMapLink)) return directMapLink;
    return `${directMapLink}${directMapLink.includes('?') ? '&' : '?'}output=embed`;
  }

  const lat = Number.parseFloat(data.latitude ?? data.lat ?? data.map_latitude);
  const lng = Number.parseFloat(data.longitude ?? data.lng ?? data.lon ?? data.map_longitude);
  if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
    return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  }

  const address = String(data.map_address || data.address || data.location || '').trim();
  if (address) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`;
  }
  return null;
};
const buildMapOpenUrl = (data) => {
  if (!data || typeof data !== 'object') return null;
  const directMapLink = normalizePublicActionUrl(data.google_maps_url || data.maps_url || data.map_url);
  if (directMapLink) return directMapLink;
  const lat = Number.parseFloat(data.latitude ?? data.lat ?? data.map_latitude);
  const lng = Number.parseFloat(data.longitude ?? data.lng ?? data.lon ?? data.map_longitude);
  if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const address = String(data.map_address || data.address || data.location || '').trim();
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return null;
};
const resolveProfileImageUrl = (value, { trustExplicitImageField = false } = {}) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trustExplicitImageField && !looksLikeImageUrl(trimmed)) return null;
  return resolveMediaUrl(trimmed);
};
const getFirstImageFromData = (data, candidates = []) => {
  if (!data || typeof data !== 'object') return null;
  for (const key of candidates) {
    const raw = data[key];
    const resolved = resolveProfileImageUrl(raw, { trustExplicitImageField: true });
    if (resolved) {
      return resolved;
    }
  }
  const allValues = Object.values(data);
  for (const value of allValues) {
    const resolved = resolveProfileImageUrl(value);
    if (resolved) {
      return resolved;
    }
  }
  return null;
};
const parseItemLine = (line) => {
  const clean = String(line || '').trim();
  if (!clean) return null;
  const match = clean.match(/^(.*?)(?:\s*-\s*)(\$?.+)$/);
  if (!match) {
    return { name: clean, price: null };
  }
  return { name: match[1].trim(), price: match[2].trim() };
};

const getPersonalPhoto = (subType, data) => {
  const candidateBySubtype = {
    medico: ['photo_url', 'patient_photo_url', 'avatar_url', 'image_url'],
    mascota: ['photo_url', 'pet_photo_url', 'avatar_url', 'image_url'],
    vehiculo: ['photo_url', 'vehicle_photo_url', 'car_photo_url', 'image_url'],
    nino: ['photo_url', 'child_photo_url', 'avatar_url', 'image_url'],
  };
  return getFirstImageFromData(data, candidateBySubtype[subType] || ['photo_url', 'avatar_url', 'image_url']);
};
const getTopProfilePhoto = (profileType, data, fallbackBusinessLogoUrl = null) => {
  const prioritizedCandidates = profileType === 'business'
    ? ['top_profile_photo_url', 'logo_url', 'avatar_url', 'photo_url', 'image_url']
    : ['top_profile_photo_url', 'photo_url', 'avatar_url', 'patient_photo_url', 'pet_photo_url', 'child_photo_url', 'vehicle_photo_url', 'image_url'];

  const direct = getFirstImageFromData(data, prioritizedCandidates);
  if (direct) return direct;
  if (profileType === 'business' && fallbackBusinessLogoUrl) return fallbackBusinessLogoUrl;
  return null;
};
const getPublicProfileTitle = (profile, data) => {
  const safeData = data && typeof data === 'object' ? data : {};
  const titleCandidates = profile?.profile_type === 'business'
    ? ['business_name', 'hotel_name', 'catalog_name', 'place_name', 'event_name', 'survey_title', 'display_name', 'title', 'full_name', 'company']
    : ['display_name', 'full_name', 'person_name', 'pet_name', 'patient_name', 'plate'];

  for (const key of titleCandidates) {
    const value = safeData[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  if (profile?.profile_type === 'business') {
    return BUSINESS_TYPE_LABELS[profile?.sub_type] || 'Perfil Empresa';
  }

  return PERSONAL_TYPE_LABELS[profile?.sub_type] || 'Perfil QR';
};

export const PublicProfilePage = () => {
  const { hash } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
    website: '',
    captcha_token: '',
  });
  const [turnstileReady, setTurnstileReady] = useState(false);
  const hasTrackedVisitRef = useRef(false);
  const turnstileContainerRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);
  const autoLocationTriggeredRef = useRef(false);
  const { t } = useTranslation();

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchPublicProfile(hash);
      setProfile(data);
      if (!hasTrackedVisitRef.current) {
        hasTrackedVisitRef.current = true;
        try {
          const params = new URLSearchParams(window.location.search);
          await trackPublicProfileVisit(hash, {
            user_agent: navigator.userAgent,
            campaign_source: params.get('utm_source') || undefined,
            campaign_medium: params.get('utm_medium') || undefined,
            campaign_name: params.get('utm_campaign') || undefined,
            campaign_term: params.get('utm_term') || undefined,
            campaign_content: params.get('utm_content') || undefined,
            variant: params.get('variant') || undefined,
          });
        } catch (trackError) {
          // Tracking is best-effort and should never block public profile rendering.
        }
      }
    } catch (error) {
      toast.error('Perfil no encontrado');
    } finally {
      setLoading(false);
    }
  }, [hash]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSendLocation = useCallback(({ silent = false } = {}) => {
    if (!navigator.geolocation) {
      if (!silent) {
        toast.error('Geolocalización no disponible');
      }
      return;
    }
    setSending(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await sendLocation(hash, position.coords.latitude, position.coords.longitude, navigator.userAgent);
          if (!silent) {
            toast.success('Ubicación enviada');
          }
        } catch (error) {
          if (!silent) {
            toast.error('Error al enviar ubicación');
          }
        } finally { setSending(false); }
      },
      () => {
        if (!silent) {
          toast.error('No se pudo obtener la ubicación');
        }
        setSending(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [hash]);

  const leadFormConfig = profile?.lead_form_config || {
    enabled: profile?.profile_type === 'business',
    title: 'Solicitar Contacto',
    success_message: 'Mensaje enviado',
    require_phone_or_email: true,
    captcha_enabled: false,
    turnstile_site_key: '',
  };
  const notificationConfig = profile?.notification_config && typeof profile.notification_config === 'object'
    ? profile.notification_config
    : {};
  const publicSettings = profile?.public_settings && typeof profile.public_settings === 'object'
    ? profile.public_settings
    : {};
  const templateDefaultPublicSettings = profile?.template?.default_public_settings && typeof profile.template.default_public_settings === 'object'
    ? profile.template.default_public_settings
    : {};
  const templateHasAutoLocationConfig = (
    Object.prototype.hasOwnProperty.call(templateDefaultPublicSettings, 'request_location_automatically')
    || Object.prototype.hasOwnProperty.call(templateDefaultPublicSettings, 'requestLocationAutomatically')
  );
  const templateHasTopPhotoEnabledConfig = (
    Object.prototype.hasOwnProperty.call(templateDefaultPublicSettings, 'top_profile_photo_enabled')
    || Object.prototype.hasOwnProperty.call(templateDefaultPublicSettings, 'topProfilePhotoEnabled')
    || Object.prototype.hasOwnProperty.call(templateDefaultPublicSettings, 'profile_photo_enabled')
  );
  const templateHasTopPhotoShapeConfig = (
    Object.prototype.hasOwnProperty.call(templateDefaultPublicSettings, 'top_profile_photo_shape')
    || Object.prototype.hasOwnProperty.call(templateDefaultPublicSettings, 'topProfilePhotoShape')
    || Object.prototype.hasOwnProperty.call(templateDefaultPublicSettings, 'profile_photo_shape')
  );
  const useProfilePublicOverrides = profile?.public_settings_customized === true;
  const profileRequestLocation = (
    publicSettings.request_location_automatically
    ?? publicSettings.requestLocationAutomatically
    ?? notificationConfig.request_location_automatically
    ?? notificationConfig.requestLocationAutomatically
  );
  const templateRequestLocation = (
    templateDefaultPublicSettings.request_location_automatically
    ?? templateDefaultPublicSettings.requestLocationAutomatically
  );
  const requestLocationAutomatically = Boolean(
    useProfilePublicOverrides
      ? profileRequestLocation
      : (templateHasAutoLocationConfig ? templateRequestLocation : profileRequestLocation)
  );
  const profileTopPhotoEnabled = (
    publicSettings.top_profile_photo_enabled
    ?? publicSettings.topProfilePhotoEnabled
    ?? publicSettings.profile_photo_enabled
    ?? notificationConfig.top_profile_photo_enabled
    ?? notificationConfig.topProfilePhotoEnabled
    ?? notificationConfig.profile_photo_enabled
  );
  const templateTopPhotoEnabled = (
    templateDefaultPublicSettings.top_profile_photo_enabled
    ?? templateDefaultPublicSettings.topProfilePhotoEnabled
    ?? templateDefaultPublicSettings.profile_photo_enabled
  );
  const topProfilePhotoEnabled = Boolean(
    useProfilePublicOverrides
      ? profileTopPhotoEnabled
      : (templateHasTopPhotoEnabledConfig ? templateTopPhotoEnabled : profileTopPhotoEnabled)
  );
  const profileTopPhotoShapeRaw = String(
    publicSettings.top_profile_photo_shape
    ?? publicSettings.topProfilePhotoShape
    ?? publicSettings.profile_photo_shape
    ?? notificationConfig.top_profile_photo_shape
    ?? notificationConfig.topProfilePhotoShape
    ?? notificationConfig.profile_photo_shape
    ?? 'circle'
  ).trim().toLowerCase();
  const templateTopPhotoShapeRaw = String(
    templateDefaultPublicSettings.top_profile_photo_shape
    ?? templateDefaultPublicSettings.topProfilePhotoShape
    ?? templateDefaultPublicSettings.profile_photo_shape
    ?? 'circle'
  ).trim().toLowerCase();
  const topProfilePhotoShapeRaw = useProfilePublicOverrides
    ? profileTopPhotoShapeRaw
    : (templateHasTopPhotoShapeConfig ? templateTopPhotoShapeRaw : profileTopPhotoShapeRaw);
  const topProfilePhotoShape = (topProfilePhotoShapeRaw === 'rounded' || topProfilePhotoShapeRaw === 'square')
    ? topProfilePhotoShapeRaw
    : 'circle';

  useEffect(() => {
    if (!leadFormConfig.captcha_enabled || !leadFormConfig.turnstile_site_key) {
      setTurnstileReady(false);
      return undefined;
    }

    let cancelled = false;
    let scriptEl = null;

    const handleScriptLoad = () => {
      if (cancelled || !window.turnstile || !turnstileContainerRef.current) return;
      if (turnstileWidgetIdRef.current !== null) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        } catch (_) {
          // ignore cleanup failures
        }
      }
      setLeadForm((prev) => ({ ...prev, captcha_token: '' }));
      turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: leadFormConfig.turnstile_site_key,
        callback: (token) => {
          setLeadForm((prev) => ({ ...prev, captcha_token: token }));
        },
        'expired-callback': () => {
          setLeadForm((prev) => ({ ...prev, captcha_token: '' }));
        },
        'error-callback': () => {
          setLeadForm((prev) => ({ ...prev, captcha_token: '' }));
        },
      });
      setTurnstileReady(true);
    };

    if (window.turnstile) {
      handleScriptLoad();
    } else {
      scriptEl = document.getElementById('cf-turnstile-script');
      if (scriptEl) {
        scriptEl.addEventListener('load', handleScriptLoad);
      } else {
        scriptEl = document.createElement('script');
        scriptEl.id = 'cf-turnstile-script';
        scriptEl.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        scriptEl.async = true;
        scriptEl.defer = true;
        scriptEl.addEventListener('load', handleScriptLoad);
        document.head.appendChild(scriptEl);
      }
    }

    return () => {
      cancelled = true;
      if (scriptEl) {
        scriptEl.removeEventListener('load', handleScriptLoad);
      }
      if (turnstileWidgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        } catch (_) {
          // ignore cleanup failures
        }
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [leadFormConfig.captcha_enabled, leadFormConfig.turnstile_site_key]);

  useEffect(() => {
    if (!profile || !requestLocationAutomatically) {
      return undefined;
    }
    if (autoLocationTriggeredRef.current) {
      return undefined;
    }

    autoLocationTriggeredRef.current = true;

    let cancelled = false;
    let timeoutId = null;

    const scheduleRequest = (delay = 900) => {
      timeoutId = window.setTimeout(() => {
        if (!cancelled) {
          handleSendLocation({ silent: true });
        }
      }, delay);
    };

    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((result) => {
          if (cancelled || result.state === 'denied') return;
          scheduleRequest(result.state === 'granted' ? 400 : 1200);
        })
        .catch(() => {
          scheduleRequest(1200);
        });
    } else {
      scheduleRequest(1200);
    }

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [handleSendLocation, hash, profile, requestLocationAutomatically]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Perfil No Encontrado</h2>
            <p className="text-muted-foreground">Este perfil QR no existe o ha sido eliminado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profile.status === 'paused') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Perfil Pausado</h2>
            <p className="text-muted-foreground">Este perfil QR ha sido temporalmente desactivado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = profile.expiration_date && profile.status === 'subscription' && new Date(profile.expiration_date) < new Date();
  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Perfil Expirado</h2>
            <p className="text-muted-foreground">
              Este perfil expiró el {new Date(profile.expiration_date).toLocaleDateString('es-CL')}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const d = profile.data || {};
  const template = profile.template && Array.isArray(profile.template.sections) ? profile.template : null;
  const fallbackTheme = THEME_COLORS[profile.sub_type] || { bg: 'bg-background', accent: 'text-primary', border: 'border-border' };
  const templateTheme = template?.theme && typeof template.theme === 'object' ? template.theme : {};
  const templateDisplayOptions = template?.display_options && typeof template.display_options === 'object'
    ? template.display_options
    : {};
  const templatePrimaryColor = typeof templateTheme.primary_color === 'string' && templateTheme.primary_color.trim()
    ? templateTheme.primary_color.trim()
    : null;
  const templateBgColor = typeof templateTheme.bg_color === 'string' && templateTheme.bg_color.trim()
    ? templateTheme.bg_color.trim()
    : null;
  const theme = fallbackTheme;
  const templateSectionStyle = templatePrimaryColor || templateBgColor
    ? {
      borderColor: templatePrimaryColor || undefined,
      backgroundColor: templateBgColor || undefined,
    }
    : undefined;
  const templateIconWrapperStyle = templatePrimaryColor || templateBgColor
    ? {
      borderColor: templatePrimaryColor || undefined,
      backgroundColor: templateBgColor || undefined,
    }
    : undefined;
  const templateIconStyle = templatePrimaryColor ? { color: templatePrimaryColor } : undefined;
  const pageThemeStyle = templateBgColor ? { backgroundColor: templateBgColor } : undefined;
  const cardPrimaryColor = templatePrimaryColor || undefined;
  const cardBorderSoft = templatePrimaryColor ? withAlpha(templatePrimaryColor, 0.35) : undefined;
  const cardGlowSoft = templatePrimaryColor ? withAlpha(templatePrimaryColor, 0.16) : undefined;
  const cardHeaderStyle = templatePrimaryColor
    ? {
      background: `linear-gradient(150deg, ${withAlpha(templatePrimaryColor, 0.2) || 'rgba(59,130,246,.15)'} 0%, rgba(255,255,255,0) 70%)`,
    }
    : undefined;
  const publicCardStyle = cardBorderSoft || cardGlowSoft
    ? {
      borderColor: cardBorderSoft,
      boxShadow: cardGlowSoft ? `0 18px 45px -28px ${cardGlowSoft}` : undefined,
    }
    : undefined;
  const floatingPanelStyle = {
    borderColor: cardBorderSoft || undefined,
    boxShadow: cardGlowSoft ? `0 22px 38px -26px ${cardGlowSoft}` : undefined,
  };
  const floatingPrimaryStyle = templatePrimaryColor
    ? {
      backgroundColor: templatePrimaryColor,
      borderColor: templatePrimaryColor,
      color: '#ffffff',
    }
    : undefined;
  const floatingOutlineStyle = templatePrimaryColor
    ? {
      borderColor: withAlpha(templatePrimaryColor, 0.35) || undefined,
      color: templatePrimaryColor,
      backgroundColor: withAlpha(templatePrimaryColor, 0.08) || undefined,
    }
    : undefined;
  const showProfileTypeBadge = Boolean(
    templateDisplayOptions.show_profile_type_badge ?? templateDisplayOptions.showProfileTypeBadge ?? true
  );
  const showBusinessBanner = profile.profile_type === 'business'
    ? Boolean(templateDisplayOptions.show_business_banner ?? templateDisplayOptions.showBusinessBanner ?? true)
    : false;
  const showFloatingActionsByTemplate = Boolean(
    templateDisplayOptions.show_floating_actions ?? templateDisplayOptions.showFloatingActions ?? true
  );
  const showLeadFormByTemplate = Boolean(
    templateDisplayOptions.show_lead_form
    ?? templateDisplayOptions.showLeadForm
    ?? (profile.profile_type === 'business')
  );
  const showManualLocationButtonByTemplate = profile.profile_type === 'personal'
    ? Boolean(templateDisplayOptions.show_manual_location_button ?? templateDisplayOptions.showManualLocationButton ?? true)
    : false;
  const showMapSectionByTemplate = Boolean(
    templateDisplayOptions.show_map_section
    ?? templateDisplayOptions.showMapSection
    ?? (profile.profile_type === 'business')
  );
  const showHighlightsByTemplate = Boolean(
    templateDisplayOptions.show_highlights
    ?? templateDisplayOptions.showHighlights
    ?? true
  );
  const templateCardStyle = (() => {
    const raw = String(templateDisplayOptions.card_style ?? templateDisplayOptions.cardStyle ?? 'elegant').trim().toLowerCase();
    return ['elegant', 'bold', 'glass'].includes(raw) ? raw : 'elegant';
  })();

  const renderMedical = () => {
    const photoSrc = getPersonalPhoto('medico', d);
    return (
      <div className="space-y-4">
        <section className={`rounded-xl border ${theme.border} ${theme.bg} p-4 shadow-sm`}>
          <div className="flex items-start gap-3">
            {photoSrc && (
              <img
                src={photoSrc}
                alt="Foto del perfil"
                className="h-20 w-20 rounded-xl object-cover border border-border bg-background"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-xs uppercase tracking-wide font-semibold ${theme.accent}`}>Perfil Médico</p>
              <h2 className="text-lg font-bold leading-tight">{d.patient_name || d.full_name || 'Información médica'}</h2>
              {d.blood_type && (
                <Badge variant="outline" className="mt-2">
                  Tipo de sangre: {d.blood_type}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Contacte al responsable o al médico tratante ante cualquier emergencia.
          </p>
        </section>

        <section className="rounded-xl border border-border/70 bg-background p-4">
          <h3 className="text-sm font-semibold mb-2">Información clínica</h3>
          <DataRow label="Alergias" value={d.allergies} />
          <DataRow label="Medicamentos" value={d.medications} />
          <DataRow label="Condiciones" value={d.conditions} />
          <DataRow label="Médico Tratante" value={d.doctor_name} />
          {d.doctor_phone && <PhoneLink phone={d.doctor_phone} label={`Dr. ${d.doctor_name || ''} - ${d.doctor_phone}`} />}
        </section>

        {(d.emergency_name || d.emergency_phone) && (
          <ContactCard title="Contacto de Emergencia">
            {d.emergency_name && <p className="text-sm">{d.emergency_name}</p>}
            <PhoneLink phone={d.emergency_phone} />
          </ContactCard>
        )}
      </div>
    );
  };

  const renderPet = () => {
    const photoSrc = getPersonalPhoto('mascota', d);
    return (
      <div className="space-y-4">
        <section className={`rounded-xl border ${theme.border} ${theme.bg} p-4 shadow-sm`}>
          <div className="flex items-center gap-3">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt={d.pet_name || 'Foto de la mascota'}
                className="h-20 w-20 rounded-xl object-cover border border-border bg-background"
              />
            ) : (
              <div className="h-20 w-20 rounded-xl border border-border bg-background flex items-center justify-center">
                <Dog className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-tight">{d.pet_name || 'Mascota identificada'}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {d.species && <Badge variant="outline">{d.species}</Badge>}
                {d.breed && <Badge variant="outline">{d.breed}</Badge>}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border/70 bg-background p-4">
          <h3 className="text-sm font-semibold mb-2">Datos de la mascota</h3>
          <DataRow label="Especie" value={d.species} />
          <DataRow label="Raza" value={d.breed} />
          <DataRow label="Color" value={d.color} />
          {d.vet_name && <DataRow label="Veterinario" value={d.vet_name} />}
          {d.vet_phone && <PhoneLink phone={d.vet_phone} label={`Vet: ${d.vet_phone}`} />}
        </section>

        {(d.owner_name || d.owner || d.owner_phone || d.phone) && (
          <ContactCard title="Dueño">
            {(d.owner_name || d.owner) && <p className="text-sm">{d.owner_name || d.owner}</p>}
            <PhoneLink phone={d.owner_phone || d.phone} />
            {(d.owner_email || d.email) && (
              <a href={`mailto:${d.owner_email || d.email}`} className="flex items-center gap-2 text-primary hover:underline py-1">
                <Mail className="h-4 w-4" />
                <span className="text-sm">{d.owner_email || d.email}</span>
              </a>
            )}
          </ContactCard>
        )}
      </div>
    );
  };

  const renderTemplateSections = () => {
    const useCompactTemplateLayout = (template?.sections?.length || 0) <= 1;
    return (
    <div className={useCompactTemplateLayout ? 'space-y-3' : 'space-y-4'}>
      {(template?.sections || []).map((section) => {
        const visibleFields = (section.fields || []).filter((field) => field?.visible !== false);
        const SectionIcon = getTemplateIcon(section.icon);
        const renderedFields = visibleFields.map((field) => {
          const fieldKey = field.name || field.id;
          const value = field.name ? (d[field.name] ?? d[field.id]) : d[field.id];
          if (value === undefined || value === null || value === '') return null;

          const label = field.label || fieldKey;
          const fieldType = field.type || 'text';
          const stringValue = String(value);
          const FieldIcon = getTemplateIcon(field.icon);

          if (fieldType === 'image' || isImageFieldName(fieldKey) || looksLikeImageUrl(stringValue)) {
            const imageSrc = fieldType === 'image'
              ? resolveProfileImageUrl(stringValue, { trustExplicitImageField: true })
              : resolveProfileImageUrl(stringValue, { trustExplicitImageField: isImageFieldName(fieldKey) });
            if (!imageSrc) return null;
            return (
              <div key={field.id || fieldKey} className="space-y-2 rounded-lg border border-border/70 bg-background p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <img src={imageSrc} alt={label} className="w-full max-h-72 object-cover rounded-lg border border-border/60" />
              </div>
            );
          }

          if (fieldType === 'tel') {
            return (
              <a
                key={field.id || fieldKey}
                href={`tel:${stringValue}`}
                className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-primary hover:bg-primary/5"
              >
                {FieldIcon ? <FieldIcon className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                <span>{label}: {stringValue}</span>
              </a>
            );
          }

          if (fieldType === 'email') {
            return (
              <a
                key={field.id || fieldKey}
                href={`mailto:${stringValue}`}
                className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-primary hover:bg-primary/5"
              >
                {FieldIcon ? <FieldIcon className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                <span>{label}: {stringValue}</span>
              </a>
            );
          }

          if (fieldType === 'url' || looksLikeUrl(stringValue)) {
            const href = normalizeExternalLink(stringValue);
            if (!href) return null;
            return (
              <a
                key={field.id || fieldKey}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-primary hover:bg-primary/5"
              >
                {FieldIcon ? <FieldIcon className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                <span>{label}: {stringValue}</span>
              </a>
            );
          }

          if (fieldType === 'textarea') {
            const lines = splitMultilineValue(stringValue);
            if (lines.length > 1) {
              return (
                <div key={field.id || fieldKey} className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    {FieldIcon && <FieldIcon className="h-3.5 w-3.5" />}
                    {label}
                  </p>
                  <div className="space-y-2">
                    {lines.map((line, idx) => (
                      <div key={`${field.id || fieldKey}-line-${idx}`} className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={field.id || fieldKey} className="space-y-1 py-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  {FieldIcon && <FieldIcon className="h-3.5 w-3.5" />}
                  {label}
                </p>
                <p className="text-sm whitespace-pre-wrap">{stringValue}</p>
              </div>
            );
          }

          return <DataRow key={field.id || fieldKey} label={label} value={stringValue} icon={FieldIcon || undefined} />;
        }).filter(Boolean);

        if (!renderedFields.length) return null;

        return (
          <section
            key={section.id || section.title}
            className={useCompactTemplateLayout
              ? 'space-y-3'
              : `space-y-3 rounded-xl border ${theme.border} bg-background/80 p-4 shadow-sm`}
            style={useCompactTemplateLayout ? undefined : templateSectionStyle}
          >
            {(section.title || section.description) && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {SectionIcon && (
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center ${theme.bg} border ${theme.border}`}
                      style={templateIconWrapperStyle}
                    >
                      <SectionIcon className={`h-3.5 w-3.5 ${theme.accent}`} style={templateIconStyle} />
                    </div>
                  )}
                  {section.title && <h3 className="font-semibold text-base">{section.title}</h3>}
                </div>
                {section.description && <p className="text-xs text-muted-foreground">{section.description}</p>}
              </div>
            )}
            <div className="space-y-2">
              {renderedFields}
            </div>
          </section>
        );
      })}
    </div>
  );
  };

  const renderVehicle = () => {
    const photoSrc = getPersonalPhoto('vehiculo', d);
    return (
      <div className="space-y-4">
        <section className={`rounded-xl border ${theme.border} ${theme.bg} p-4 shadow-sm`}>
          <div className="flex items-center gap-3">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt={d.plate || 'Foto del vehículo'}
                className="h-20 w-20 rounded-xl object-cover border border-border bg-background"
              />
            ) : (
              <div className="h-20 w-20 rounded-xl border border-border bg-background flex items-center justify-center">
                <Car className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className={`text-xs uppercase tracking-wide font-semibold ${theme.accent}`}>Vehículo</p>
              <h2 className="text-lg font-bold">{d.plate || [d.brand, d.model].filter(Boolean).join(' ') || 'Vehículo identificado'}</h2>
              {(d.brand || d.model) && <p className="text-sm text-muted-foreground">{[d.brand, d.model].filter(Boolean).join(' ')}</p>}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border/70 bg-background p-4">
          <h3 className="text-sm font-semibold mb-2">Información del vehículo</h3>
          <DataRow label="Patente" value={d.plate} />
          <DataRow label="Marca" value={d.brand} />
          <DataRow label="Modelo" value={d.model} />
          <DataRow label="Color" value={d.color} />
        </section>

        {(d.owner_name || d.owner || d.owner_phone || d.phone) && (
          <ContactCard title="Propietario">
            {(d.owner_name || d.owner) && <p className="text-sm">{d.owner_name || d.owner}</p>}
            <PhoneLink phone={d.owner_phone || d.phone} />
          </ContactCard>
        )}
      </div>
    );
  };

  const renderChild = () => {
    const photoSrc = getPersonalPhoto('nino', d);
    return (
      <div className="space-y-4">
        <section className={`rounded-xl border ${theme.border} ${theme.bg} p-4 shadow-sm`}>
          <div className="flex items-center gap-3">
            {photoSrc && (
              <img
                src={photoSrc}
                alt={d.full_name || d.person_name || 'Foto del perfil'}
                className="h-20 w-20 rounded-xl object-cover border border-border bg-background"
              />
            )}
            <div>
              <p className={`text-xs uppercase tracking-wide font-semibold ${theme.accent}`}>Perfil de cuidado</p>
              <h2 className="text-lg font-bold">{d.full_name || d.person_name || 'Persona identificada'}</h2>
              {d.age && <p className="text-sm text-muted-foreground">Edad: {d.age}</p>}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border/70 bg-background p-4">
          <h3 className="text-sm font-semibold mb-2">Información personal</h3>
          <DataRow label="Nombre" value={d.full_name || d.person_name} />
          <DataRow label="Edad" value={d.age} />
          <DataRow label="Condiciones" value={d.conditions || d.condition} />
          <DataRow label="Dirección" value={d.address} />
        </section>

        {(d.guardian_name || d.guardian_phone || d.emergency_name || d.emergency_phone) && (
          <ContactCard title="Tutor / Responsable">
            {(d.guardian_name || d.emergency_name) && <p className="text-sm">{d.guardian_name || d.emergency_name}</p>}
            <PhoneLink phone={d.guardian_phone || d.emergency_phone} />
          </ContactCard>
        )}
      </div>
    );
  };

  const renderRestaurant = () => (
    <div className="space-y-4">
      {resolveProfileImageUrl(d.logo_url, { trustExplicitImageField: true }) && (
        <div className="flex justify-center">
          <img src={resolveProfileImageUrl(d.logo_url, { trustExplicitImageField: true })} alt="Logo del perfil" className="h-16 w-16 rounded-full border border-border object-cover bg-white" />
        </div>
      )}
      {d.description && (
        <p className="text-muted-foreground text-sm text-center">{d.description}</p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {d.schedule && (
          <div className={`rounded-lg border ${theme.border} ${theme.bg} p-3`}>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Horario</p>
            <p className="text-sm font-medium mt-1">{d.schedule}</p>
          </div>
        )}
        {d.address && (
          <div className={`rounded-lg border ${theme.border} ${theme.bg} p-3`}>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Ubicación</p>
            <p className="text-sm font-medium mt-1">{d.address}</p>
          </div>
        )}
      </div>

      {d.menu_items && (
        <div className={`rounded-xl border ${theme.border} bg-background p-4`}>
          <h3 className="font-bold text-base mb-3 flex items-center gap-2">
            <UtensilsCrossed className={`h-4.5 w-4.5 ${theme.accent}`} />
            Menú recomendado
          </h3>
          <div className="space-y-2">
            {d.menu_items.split('\n').filter(Boolean).map((item, i) => {
              const parsed = parseItemLine(item);
              if (!parsed) return null;
              return (
                <div key={i} className="rounded-lg border border-border/70 px-3 py-2 bg-background/90">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{parsed.name}</p>
                    {parsed.price && <Badge variant="outline">{parsed.price}</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {d.phone && <PhoneLink phone={d.phone} label="Reservas y contacto" />}
      {normalizeExternalLink(d.website) && (
        <a href={normalizeExternalLink(d.website)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary text-sm hover:underline">
          <Globe className="h-4 w-4" />{d.website}
        </a>
      )}
      </div>
    </div>
  );

  const renderHotel = () => (
    <div className="space-y-4">
      {d.hotel_name && <h2 className="text-xl font-bold text-center">{d.hotel_name}</h2>}
      {d.description && <p className="text-sm text-muted-foreground text-center">{d.description}</p>}
      {d.welcome_message && (
        <div className={`${theme.bg} border ${theme.border} rounded-lg p-4`}>
          <p className="text-sm italic">{d.welcome_message}</p>
        </div>
      )}
      {(d.wifi_name || d.wifi_password) && (
        <div className="bg-cyan-50 dark:bg-cyan-950 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4">
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><Wifi className="h-4 w-4" />WiFi</h4>
          {d.wifi_name && <p className="text-sm">Red: <span className="font-mono font-medium">{d.wifi_name}</span></p>}
          {d.wifi_password && <p className="text-sm">Clave: <span className="font-mono font-medium">{d.wifi_password}</span></p>}
        </div>
      )}
      {(d.check_in || d.check_out || d.checkout_time) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(d.check_in || d.checkin_time) && (
            <div className="rounded-lg border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Check-in</p>
              <p className="text-sm font-medium mt-1">{d.check_in || d.checkin_time}</p>
            </div>
          )}
          {(d.check_out || d.checkout_time) && (
            <div className="rounded-lg border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Check-out</p>
              <p className="text-sm font-medium mt-1">{d.check_out || d.checkout_time}</p>
            </div>
          )}
        </div>
      )}
      {d.services && (
        <div className="rounded-lg border border-border/70 p-3">
          <p className="text-xs text-muted-foreground mb-2">Servicios</p>
          <div className="flex flex-wrap gap-2">
            {splitMultilineValue(d.services).map((service, idx) => (
              <Badge key={`hotel-service-${idx}`} variant="secondary">{service}</Badge>
            ))}
          </div>
        </div>
      )}
      {d.reception_phone && <PhoneLink phone={d.reception_phone} label={`Recepción: ${d.reception_phone}`} />}
      {d.phone && <PhoneLink phone={d.phone} label={`Recepción: ${d.phone}`} />}
      {d.address && <DataRow label="Dirección" value={d.address} icon={MapPin} />}
      {d.emergency_info && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-1">Info de Emergencia</h4>
          <p className="text-sm">{d.emergency_info}</p>
        </div>
      )}
    </div>
  );

  const renderWifi = () => (
    <div className="space-y-4">
      <div className="text-center py-4">
        <Wifi className={`h-16 w-16 ${theme.accent} mx-auto mb-3`} />
        <h2 className="text-xl font-bold">Conexión WiFi</h2>
      </div>
      <div className={`${theme.bg} border ${theme.border} rounded-lg p-5 space-y-3`}>
        {d.network_name && (
          <div><span className="text-xs text-muted-foreground block">Red</span><p className="font-mono font-bold text-lg">{d.network_name}</p></div>
        )}
        {d.password && (
          <div><span className="text-xs text-muted-foreground block">Contraseña</span><p className="font-mono font-bold text-lg select-all">{d.password}</p></div>
        )}
        {d.encryption && <DataRow label="Encriptación" value={d.encryption} />}
      </div>
    </div>
  );

  const renderBusinessCard = () => (
    <div className="space-y-4">
      {resolveProfileImageUrl(d.avatar_url || d.photo_url || d.logo_url, { trustExplicitImageField: true }) && (
        <div className="flex justify-center">
          <img
            src={resolveProfileImageUrl(d.avatar_url || d.photo_url || d.logo_url, { trustExplicitImageField: true })}
            alt={d.full_name || 'Avatar del perfil'}
            className="w-20 h-20 rounded-full object-cover border border-border/70"
          />
        </div>
      )}
      <div className="text-center py-2">
        {d.full_name && <h2 className="text-2xl font-bold">{d.full_name}</h2>}
        {(d.title || d.job_title) && <p className={`${theme.accent} font-medium`}>{d.title || d.job_title}</p>}
        {d.company && <p className="text-muted-foreground text-sm">{d.company}</p>}
      </div>
      <div className="space-y-2">
        {d.phone && <PhoneLink phone={d.phone} />}
        {d.email && (
          <a href={`mailto:${d.email}`} className="flex items-center gap-2 text-primary text-sm hover:underline">
            <Mail className="h-4 w-4" />{d.email}
          </a>
        )}
        {d.website && (
          <a href={normalizeExternalLink(d.website)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary text-sm hover:underline">
            <Globe className="h-4 w-4" />{d.website}
          </a>
        )}
        {d.linkedin && (
          <a href={d.linkedin.startsWith('http') ? d.linkedin : `https://linkedin.com/in/${d.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary text-sm hover:underline">
            <Linkedin className="h-4 w-4" />LinkedIn
          </a>
        )}
      </div>
    </div>
  );

  const renderCatalog = () => (
    <div className="space-y-4">
      {(d.catalog_name || d.business_name) && <h2 className="text-xl font-bold text-center">{d.catalog_name || d.business_name}</h2>}
      {d.description && <p className="text-muted-foreground text-sm text-center">{d.description}</p>}
      {d.products && (
        <div>
          <h3 className="font-bold text-base mb-2">Productos destacados</h3>
          <div className="grid grid-cols-1 gap-2">
            {d.products.split('\n').filter(Boolean).map((item, i) => {
              const parsed = parseItemLine(item);
              if (!parsed) return null;
              return (
                <div key={i} className="rounded-lg border border-border/70 bg-background px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{parsed.name}</p>
                    {parsed.price ? <Badge variant="outline">{parsed.price}</Badge> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {d.contact_info && <DataRow label="Contacto" value={d.contact_info} icon={Phone} />}
      {d.phone && <PhoneLink phone={d.phone} />}
      {normalizeExternalLink(d.website) && (
        <a href={normalizeExternalLink(d.website)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary text-sm hover:underline">
          <Globe className="h-4 w-4" />{d.website}
        </a>
      )}
    </div>
  );

  const renderTourism = () => (
    <div className="space-y-4">
      {d.place_name && <h2 className="text-xl font-bold text-center">{d.place_name}</h2>}
      {d.description && <p className="text-muted-foreground text-sm">{d.description}</p>}
      {d.history && (
        <div className={`${theme.bg} border ${theme.border} rounded-lg p-4`}>
          <h4 className="font-semibold text-sm mb-1">Historia</h4>
          <p className="text-sm">{d.history}</p>
        </div>
      )}
      {d.schedule && <DataRow label="Horario" value={d.schedule} icon={Clock} />}
      {d.hours && <DataRow label="Horario" value={d.hours} icon={Clock} />}
      {d.entry_fee && <DataRow label="Entrada" value={d.entry_fee} />}
      {d.address && <DataRow label="Dirección" value={d.address} icon={MapPin} />}
      {d.attractions && (
        <div className="rounded-lg border border-border/70 p-3">
          <p className="text-xs text-muted-foreground mb-2">Atracciones</p>
          <div className="space-y-1.5">
            {splitMultilineValue(d.attractions).map((item, idx) => (
              <div key={`attraction-${idx}`} className="text-sm rounded-md border border-border/50 px-2 py-1.5 bg-background">{item}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSocialLinks = () => {
    const socials = [
      { key: 'instagram', icon: Instagram, label: 'Instagram', url: (v) => v.startsWith('http') ? v : `https://instagram.com/${v}` },
      { key: 'facebook', icon: Facebook, label: 'Facebook', url: (v) => v.startsWith('http') ? v : `https://facebook.com/${v}` },
      { key: 'twitter', icon: Twitter, label: 'Twitter/X', url: (v) => v.startsWith('http') ? v : `https://x.com/${v}` },
      { key: 'tiktok', icon: Globe, label: 'TikTok', url: (v) => v.startsWith('http') ? v : `https://tiktok.com/@${v}` },
      { key: 'youtube', icon: Youtube, label: 'YouTube', url: (v) => v.startsWith('http') ? v : `https://youtube.com/${v}` },
      { key: 'linkedin', icon: Linkedin, label: 'LinkedIn', url: (v) => v.startsWith('http') ? v : `https://linkedin.com/in/${v}` },
      { key: 'website', icon: Globe, label: 'Sitio Web', url: (v) => v.startsWith('http') ? v : `https://${v}` },
    ];
    return (
      <div className="space-y-4">
        {d.display_name && <h2 className="text-2xl font-bold text-center">{d.display_name}</h2>}
        <div className="space-y-2">
          {socials.map(({ key, icon: Icon, label, url }) => {
            if (!d[key]) return null;
            return (
              <a key={key} href={url(d[key])} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Icon className={`h-5 w-5 ${theme.accent}`} />
                <span className="text-sm font-medium">{label}</span>
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEvent = () => (
    <div className="space-y-4">
      {resolveProfileImageUrl(d.banner_url || d.cover_image || d.image_url, { trustExplicitImageField: true }) && (
        <img
          src={resolveProfileImageUrl(d.banner_url || d.cover_image || d.image_url, { trustExplicitImageField: true })}
          alt={d.event_name || 'Imagen del evento'}
          className="w-full h-36 object-cover rounded-lg border border-border/70"
        />
      )}
      {d.event_name && <h2 className="text-xl font-bold text-center">{d.event_name}</h2>}
      {d.description && <p className="text-muted-foreground text-sm text-center">{d.description}</p>}
      {(d.date || d.time || d.location) && (
        <div className="grid grid-cols-1 gap-2">
          {d.date && (
            <div className="rounded-lg border border-border/70 px-3 py-2">
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p className="text-sm font-medium mt-1">{d.date}</p>
            </div>
          )}
          {d.time && (
            <div className="rounded-lg border border-border/70 px-3 py-2">
              <p className="text-xs text-muted-foreground">Hora</p>
              <p className="text-sm font-medium mt-1">{d.time}</p>
            </div>
          )}
          {d.location && (
            <div className="rounded-lg border border-border/70 px-3 py-2">
              <p className="text-xs text-muted-foreground">Lugar</p>
              <p className="text-sm font-medium mt-1">{d.location}</p>
            </div>
          )}
        </div>
      )}
      {d.agenda && (
        <div className="rounded-lg border border-border/70 px-3 py-3">
          <p className="text-xs text-muted-foreground mb-2">Agenda</p>
          <div className="space-y-1.5">
            {splitMultilineValue(d.agenda).map((item, idx) => (
              <div key={`agenda-${idx}`} className="text-sm rounded-md border border-border/50 px-2 py-1.5 bg-background">{item}</div>
            ))}
          </div>
        </div>
      )}
      {d.organizer && <DataRow label="Organizador" value={d.organizer} icon={User} />}
      {d.contact_phone && <PhoneLink phone={d.contact_phone} />}
    </div>
  );

  const renderCheckin = () => (
    <div className="space-y-4">
      {d.business_name && <h2 className="text-xl font-bold text-center">{d.business_name}</h2>}
      {d.welcome_message && (
        <div className={`${theme.bg} border ${theme.border} rounded-lg p-4 text-center`}>
          <p className="text-sm">{d.welcome_message}</p>
        </div>
      )}
      {d.address && <DataRow label="Dirección" value={d.address} icon={MapPin} />}
      {d.phone && <PhoneLink phone={d.phone} />}
    </div>
  );

  const renderSurvey = () => (
    <div className="space-y-4">
      {d.survey_title && <h2 className="text-xl font-bold text-center">{d.survey_title}</h2>}
      {d.description && <p className="text-muted-foreground text-sm text-center">{d.description}</p>}
      {d.questions && (
        <div className="space-y-2">
          {d.questions.split('\n').filter(Boolean).map((q, i) => (
            <div key={i} className="p-3 border rounded-lg text-sm">{i + 1}. {q}</div>
          ))}
        </div>
      )}
      {d.thank_you_message && (
        <div className={`${theme.bg} border ${theme.border} rounded-lg p-4 text-center`}>
          <p className="text-sm font-medium">{d.thank_you_message}</p>
        </div>
      )}
    </div>
  );

  const renderGeneric = () => (
    <div className="space-y-3">
      {Object.entries(d).filter(([_, v]) => v).map(([key, value]) => (
        <DataRow key={key} label={key.replace(/_/g, ' ')} value={String(value)} />
      ))}
    </div>
  );

  const RENDERERS = {
    medico: renderMedical,
    mascota: renderPet,
    vehiculo: renderVehicle,
    nino: renderChild,
    restaurante: renderRestaurant,
    hotel: renderHotel,
    wifi: renderWifi,
    tarjeta: renderBusinessCard,
    catalogo: renderCatalog,
    turismo: renderTourism,
    redes: renderSocialLinks,
    evento: renderEvent,
    checkin: renderCheckin,
    encuesta: renderSurvey,
  };

  const renderer = template?.sections?.length ? renderTemplateSections : (RENDERERS[profile.sub_type] || renderGeneric);

  const SUB_TYPE_ICONS = {
    medico: Heart, mascota: User, vehiculo: User, nino: User,
    restaurante: UtensilsCrossed, hotel: Hotel, wifi: Wifi, tarjeta: User,
    catalogo: Building, turismo: MapPin, checkin: ClipboardCheck,
    encuesta: MessageSquare, redes: Globe, evento: CalendarDays,
  };
  const ProfileIcon = SUB_TYPE_ICONS[profile.sub_type] || QrCode;
  const profileActions = Array.isArray(profile.actions) ? profile.actions : [];
  const profileTypeLabel = profile.profile_type === 'business'
    ? (BUSINESS_TYPE_LABELS[profile.sub_type] || 'Perfil Empresa')
    : (PERSONAL_TYPE_LABELS[profile.sub_type] || 'Perfil personal');
  const publicProfileTitle = getPublicProfileTitle(profile, d);
  const titleIsTypeFallback = String(publicProfileTitle || '').trim() === String(profileTypeLabel || '').trim();
  const displayProfileTitle = titleIsTypeFallback ? 'Perfil QR' : publicProfileTitle;
  const businessSubtitle = d.description || d.welcome_message || d.business_name || d.hotel_name || d.display_name || '';
  const businessBannerUrl = getFirstImageFromData(d, [
    'cover_image',
    'cover_image_url',
    'banner',
    'banner_url',
    'hero_image',
    'header_image',
  ]);
  const businessLogoUrl = getFirstImageFromData(d, [
    'logo',
    'logo_url',
    'avatar',
    'avatar_url',
  ]);
  const topProfilePhotoUrl = getTopProfilePhoto(profile.profile_type, d, businessLogoUrl);
  const topProfilePhotoShapeClass = topProfilePhotoShape === 'square'
    ? 'rounded-md'
    : topProfilePhotoShape === 'rounded'
      ? 'rounded-2xl'
      : 'rounded-full';
  const headerHighlights = (() => {
    const highlights = [];
    if (profile.profile_type === 'business') {
      const ratingValue = d.google_rating || d.rating || d.average_rating;
      if (ratingValue) highlights.push(`★ ${ratingValue}/5`);
      if (d.review_count || d.google_review_count) highlights.push(`${d.review_count || d.google_review_count} reseñas`);
      if (d.schedule || d.hours) highlights.push(`Horario: ${d.schedule || d.hours}`);
      if (d.price_range) highlights.push(`Precio: ${d.price_range}`);
      if (d.delivery_time) highlights.push(`Entrega: ${d.delivery_time}`);
      if (d.address) highlights.push(`Dirección: ${d.address}`);
      if (d.phone || d.contact_phone) highlights.push(`Tel: ${d.phone || d.contact_phone}`);
    } else {
      if (profile.sub_type === 'medico' && d.blood_type) highlights.push(`Tipo: ${d.blood_type}`);
      if (profile.sub_type === 'medico' && d.allergies) highlights.push('Alergias registradas');
      if (profile.sub_type === 'mascota' && d.species) highlights.push(String(d.species));
      if (profile.sub_type === 'mascota' && d.breed) highlights.push(String(d.breed));
      if (profile.sub_type === 'vehiculo' && d.plate) highlights.push(`Patente: ${d.plate}`);
      if (profile.sub_type === 'nino' && d.guardian_phone) highlights.push(`Tutor: ${d.guardian_phone}`);
    }
    return highlights.filter(Boolean).slice(0, 4);
  })();
  const profileFloatingButtonsSource = (
    Array.isArray(publicSettings.floating_buttons) ? publicSettings.floating_buttons
      : Array.isArray(publicSettings.floatingButtons) ? publicSettings.floatingButtons
      : Array.isArray(notificationConfig.floating_buttons) ? notificationConfig.floating_buttons
      : Array.isArray(notificationConfig.floatingButtons) ? notificationConfig.floatingButtons
      : []
  );
  const templateFloatingButtonsSource = (
    Array.isArray(templateDefaultPublicSettings.floating_buttons) ? templateDefaultPublicSettings.floating_buttons
      : Array.isArray(templateDefaultPublicSettings.floatingButtons) ? templateDefaultPublicSettings.floatingButtons
      : []
  );
  const templateHasFloatingButtonsConfig = (
    Object.prototype.hasOwnProperty.call(templateDefaultPublicSettings, 'floating_buttons')
    || Object.prototype.hasOwnProperty.call(templateDefaultPublicSettings, 'floatingButtons')
  );
  const selectedFloatingButtonsSource = useProfilePublicOverrides
    ? profileFloatingButtonsSource
    : (templateHasFloatingButtonsConfig ? templateFloatingButtonsSource : profileFloatingButtonsSource);
  const selectedFloatingButtons = selectedFloatingButtonsSource
    .map((item) => normalizeFloatingButtonType(extractFloatingButtonType(item), profile.profile_type))
    .filter((item, index, array) => item && array.indexOf(item) === index)
    .slice(0, 3);
  const resolvedFloatingButtonsSource = (
    Array.isArray(publicSettings.resolved_floating_buttons) ? publicSettings.resolved_floating_buttons
      : Array.isArray(publicSettings.floating_buttons_resolved) ? publicSettings.floating_buttons_resolved
      : Array.isArray(publicSettings.resolved_buttons) ? publicSettings.resolved_buttons
      : Array.isArray(profile.floating_buttons_resolved) ? profile.floating_buttons_resolved
      : Array.isArray(profile.resolved_buttons) ? profile.resolved_buttons
      : Array.isArray(notificationConfig.floating_buttons_resolved) ? notificationConfig.floating_buttons_resolved
      : Array.isArray(notificationConfig.resolved_buttons) ? notificationConfig.resolved_buttons
      : []
  );
  const normalizePhoneValue = (value) => {
    if (!value) return null;
    const normalized = String(value).trim().replace(/[^\d+]/g, '');
    if (!normalized) return null;
    return normalized.startsWith('+') ? normalized.slice(1) : normalized;
  };
  const primaryPhone = [
    d.whatsapp,
    d.phone,
    d.owner_phone,
    d.contact_phone,
    d.emergency_phone,
    d.vet_phone,
    d.doctor_phone,
  ].find(Boolean);
  const dedupeActions = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      if (!item) return false;
      const key = `${item.type || 'generic'}|${item.url || item.label || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const contactPhone = [d.contact_phone, d.owner_phone, d.phone].find(Boolean);
  const emergencyPhone = [d.emergency_phone, d.contact_phone].find(Boolean);
  const businessPhone = [d.phone, d.contact_phone, d.business_phone].find(Boolean);
  const fallbackFloatingButtons = selectedFloatingButtons.map((buttonType) => {
    if (buttonType === 'send_location') {
      return { type: 'send_location', label: 'Enviar ubicación', url: 'action://send-location' };
    }
    if (buttonType === 'whatsapp') {
      const existingWhatsappAction = profileActions.find((action) => action?.type === 'whatsapp' && action?.url);
      if (existingWhatsappAction) return existingWhatsappAction;
      const whatsappPhone = normalizePhoneValue(primaryPhone);
      if (!whatsappPhone) {
        return { type: 'whatsapp', label: 'WhatsApp', url: 'action://requires-whatsapp-phone' };
      }
      return {
        type: 'whatsapp',
        label: 'WhatsApp',
        url: `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Hola, te contacto desde el perfil ${publicProfileTitle}.`)}`,
      };
    }
    if (buttonType === 'rate_restaurant') {
      const googleReviewAction = profileActions.find((action) => action?.type === 'google_review' && action?.url);
      if (googleReviewAction) return googleReviewAction;
      const reviewUrl = buildGoogleReviewUrl(d);
      return reviewUrl
        ? { type: 'rate_restaurant', label: 'Calificar negocio', url: reviewUrl }
        : { type: 'rate_restaurant', label: 'Calificar negocio', url: 'action://requires-review-url' };
    }
    if (buttonType === 'call_contact') {
      const normalizedPhone = normalizePhoneValue(contactPhone);
      return normalizedPhone
        ? { type: 'call_contact', label: 'Llamar contacto', url: `tel:+${normalizedPhone}` }
        : { type: 'call_contact', label: 'Llamar contacto', url: 'action://requires-contact-phone' };
    }
    if (buttonType === 'call_emergency') {
      const normalizedPhone = normalizePhoneValue(emergencyPhone);
      return normalizedPhone
        ? { type: 'call_emergency', label: 'Llamar emergencia', url: `tel:+${normalizedPhone}` }
        : { type: 'call_emergency', label: 'Llamar emergencia', url: 'action://requires-emergency-phone' };
    }
    if (buttonType === 'call_business') {
      const normalizedPhone = normalizePhoneValue(businessPhone);
      return normalizedPhone
        ? { type: 'call_business', label: 'Llamar negocio', url: `tel:+${normalizedPhone}` }
        : { type: 'call_business', label: 'Llamar negocio', url: 'action://requires-business-phone' };
    }
    if (buttonType === 'share_profile') {
      return { type: 'share_profile', label: 'Compartir perfil', url: window.location.href };
    }
    if (buttonType === 'send_survey') {
      const surveyUrl = normalizePublicActionUrl(d.survey_url || d.feedback_url || d.form_url || d.google_form_url);
      return surveyUrl
        ? { type: 'send_survey', label: 'Responder encuesta', url: surveyUrl }
        : { type: 'send_survey', label: 'Responder encuesta', url: 'action://requires-survey-url' };
    }
    if (buttonType === 'view_catalog_pdf') {
      const catalogUrl = normalizePublicActionUrl(d.catalog_pdf_url || d.catalog_url || d.menu_pdf_url || d.menu_url || d.pdf_url);
      return catalogUrl
        ? { type: 'view_catalog_pdf', label: 'Ver catálogo', url: catalogUrl }
        : { type: 'view_catalog_pdf', label: 'Ver catálogo', url: 'action://requires-catalog-url' };
    }
    if (buttonType === 'google_review') {
      return profileActions.find((action) => action?.type === 'google_review' && action?.url) || null;
    }
    if (buttonType === 'website') {
      const websiteUrl = normalizePublicActionUrl(d.website || d.site_url);
      return websiteUrl
        ? { type: 'website', label: 'Sitio web', url: websiteUrl }
        : { type: 'website', label: 'Sitio web', url: 'action://requires-website-url' };
    }
    return null;
  });
  const resolvedFloatingButtons = resolvedFloatingButtonsSource
    .filter((button) => button && typeof button === 'object')
    .map((button) => ({
      type: button.type || button.key || 'generic',
      label: button.label || button.title || 'Abrir enlace',
      url: button.url || button.href || null,
    }));
  const resolvedByType = new Map(
    resolvedFloatingButtons
      .filter((button) => button?.type)
      .map((button) => [button.type, button])
  );
  const fallbackByType = new Map(
    fallbackFloatingButtons
      .filter((button) => button?.type)
      .map((button) => [button.type, button])
  );
  const selectedButtonActions = selectedFloatingButtons.map((buttonType) => (
    resolvedByType.get(buttonType)
    || fallbackByType.get(buttonType)
    || { type: buttonType, label: 'Acción', url: `action://requires-config/${buttonType}` }
  ));
  const floatingActionButtons = dedupeActions(selectedButtonActions).slice(0, 3);
  const renderActionIcon = (actionType) => {
    if (actionType === 'google_review') return <Star className="mr-2 h-4 w-4" />;
    if (actionType === 'rate_restaurant') return <Star className="mr-2 h-4 w-4" />;
    if (actionType === 'whatsapp') return <MessageSquare className="mr-2 h-4 w-4" />;
    if (actionType === 'send_location' || actionType === 'location') return <MapPin className="mr-2 h-4 w-4" />;
    if (actionType === 'call_contact' || actionType === 'call_emergency' || actionType === 'call_business' || actionType === 'call') {
      return <Phone className="mr-2 h-4 w-4" />;
    }
    if (actionType === 'send_survey') return <FileText className="mr-2 h-4 w-4" />;
    if (actionType === 'share_profile') return <QrCode className="mr-2 h-4 w-4" />;
    return <Globe className="mr-2 h-4 w-4" />;
  };

  const getTrackingParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      campaign_source: params.get('utm_source') || undefined,
      campaign_medium: params.get('utm_medium') || undefined,
      campaign_name: params.get('utm_campaign') || undefined,
      campaign_term: params.get('utm_term') || undefined,
      campaign_content: params.get('utm_content') || undefined,
      variant: params.get('variant') || undefined,
    };
  };

  const handleActionClick = async (action) => {
    if (action?.type === 'location' || action?.type === 'send_location') {
      handleSendLocation();
      return;
    }
    if (typeof action?.url === 'string' && action.url.startsWith('action://')) {
      toast.info('Completa los datos del perfil para habilitar este botón.');
      return;
    }
    try {
      await trackPublicActionClick(hash, {
        action_type: action?.type || 'generic',
        label: action?.label || 'CTA',
        url: action?.url,
        ...getTrackingParams(),
      });
    } catch (_) {
      // Best-effort tracking.
    }
    if (action?.url) {
      if (/^(mailto:|tel:)/i.test(action.url)) {
        window.location.href = action.url;
        return;
      }
      window.open(action.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleLeadInputChange = (field, value) => {
    setLeadForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    const hasData = leadForm.name || leadForm.phone || leadForm.email || leadForm.message;
    if (!hasData) {
      toast.error('Ingresa al menos un dato de contacto o mensaje');
      return;
    }
    if (leadFormConfig.require_phone_or_email && !leadForm.phone && !leadForm.email) {
      toast.error('Ingresa teléfono o email para poder contactarte');
      return;
    }
    if (leadFormConfig.captcha_enabled && !leadFormConfig.turnstile_site_key) {
      toast.error('Captcha no configurado, inténtalo más tarde');
      return;
    }
    if (leadFormConfig.captcha_enabled && leadFormConfig.turnstile_site_key && !leadForm.captcha_token) {
      toast.error('Completa la verificación anti-spam');
      return;
    }

    try {
      setSubmittingLead(true);
      await createPublicLead(hash, {
        ...leadForm,
        ...getTrackingParams(),
      });
      toast.success(leadFormConfig.success_message || 'Mensaje enviado');
      setLeadForm({ name: '', phone: '', email: '', message: '', website: '', captcha_token: '' });
      if (leadFormConfig.captcha_enabled && window.turnstile && turnstileWidgetIdRef.current !== null) {
        try {
          window.turnstile.reset(turnstileWidgetIdRef.current);
        } catch (_) {
          // Ignore reset issues.
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo enviar el mensaje');
    } finally {
      setSubmittingLead(false);
    }
  };
  const pageBgClass = profile.profile_type === 'business'
    ? `bg-gradient-to-b from-background via-background to-muted/30 ${theme.bg}`
    : theme.bg;
  const mapEmbedUrl = showMapSectionByTemplate ? buildMapEmbedUrl(d) : null;
  const mapOpenUrl = showMapSectionByTemplate ? buildMapOpenUrl(d) : null;
  const mapAddressLabel = d.map_address || d.address || d.location || '';
  const visualCardClassName = templateCardStyle === 'glass'
    ? 'border-white/50 bg-white/80 backdrop-blur-md shadow-2xl'
    : templateCardStyle === 'bold'
      ? 'border-2 shadow-[0_26px_70px_-40px_rgba(15,23,42,0.7)]'
      : 'border border-border/70 shadow-sm';
  const hasFloatingActions = showFloatingActionsByTemplate && floatingActionButtons.length > 0;
  const showTopProfilePhoto = topProfilePhotoEnabled && Boolean(topProfilePhotoUrl);
  const showLegacyHeaderAvatar = !showTopProfilePhoto;

  return (
    <div
      className={`min-h-screen ${pageBgClass} px-2 pb-4 pt-3 sm:px-4 ${hasFloatingActions ? 'pb-28' : ''}`}
      style={pageThemeStyle}
      data-testid="public-profile-page"
    >
      <div className="mx-auto w-full max-w-[560px]">
        <Card className={`mb-4 overflow-hidden ${visualCardClassName}`} style={publicCardStyle}>
          {profile.profile_type === 'business' && showBusinessBanner && businessBannerUrl && (
            <div className="relative h-36 w-full border-b border-border/60">
              <img
                src={businessBannerUrl}
                alt="Imagen principal del perfil"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
            </div>
          )}
          <CardHeader className="text-center pb-3" style={cardHeaderStyle}>
            {showLegacyHeaderAvatar && profile.profile_type === 'business' && businessLogoUrl ? (
              <div className="mx-auto -mt-12 mb-2">
                <img
                  src={businessLogoUrl}
                  alt="Logo del perfil"
                  className="w-20 h-20 rounded-full object-cover border-4 border-background shadow-lg bg-background"
                />
              </div>
            ) : showLegacyHeaderAvatar ? (
              <div
                className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${theme.bg} border ${theme.border}`}
                style={templateIconWrapperStyle}
              >
                <ProfileIcon className={`h-6 w-6 ${theme.accent}`} style={templateIconStyle} />
              </div>
            ) : null}
            {showProfileTypeBadge && (
              <Badge
                variant="secondary"
                className="mx-auto mb-2 border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                style={cardPrimaryColor ? { borderColor: withAlpha(cardPrimaryColor, 0.35), color: cardPrimaryColor } : undefined}
              >
                {profileTypeLabel}
              </Badge>
            )}
            <CardTitle
              className={`font-heading ${titleIsTypeFallback ? 'text-xl' : 'text-2xl'}`}
              data-testid="profile-name"
            >
              {displayProfileTitle}
            </CardTitle>
            {showTopProfilePhoto && (
              <div className="mx-auto mt-3">
                <img
                  src={topProfilePhotoUrl}
                  alt="Foto principal del perfil"
                  className={`h-24 w-24 object-cover border-2 border-background shadow-lg ${topProfilePhotoShapeClass}`}
                />
              </div>
            )}
            {profile.profile_type === 'business' && businessSubtitle && (
              <p className="text-sm text-muted-foreground mt-2">{businessSubtitle}</p>
            )}
            {showHighlightsByTemplate && headerHighlights.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {headerHighlights.map((item, index) => (
                  <Badge key={`${item}-${index}`} variant="outline" className="max-w-full text-[11px] font-normal">
                    <span className="truncate">{item}</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="px-3 pb-4 pt-0 sm:px-4">
            {renderer()}
          </CardContent>
        </Card>

        {mapEmbedUrl && (
          <Card className={`mb-4 overflow-hidden ${visualCardClassName}`} style={publicCardStyle}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ubicación
              </CardTitle>
              {mapAddressLabel && (
                <p className="text-xs text-muted-foreground">{mapAddressLabel}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/70">
                <iframe
                  src={mapEmbedUrl}
                  title="Mapa del perfil"
                  className="h-52 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              {mapOpenUrl && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(mapOpenUrl, '_blank', 'noopener,noreferrer')}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Abrir en Google Maps
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {profile.profile_type === 'personal' && showManualLocationButtonByTemplate && (
          <Button
            className="w-full mb-4"
            size="lg"
            onClick={() => handleSendLocation()}
            disabled={sending}
            data-testid="send-location-btn"
            style={floatingPrimaryStyle}
          >
            <MapPin className="mr-2 h-5 w-5" />
            {sending ? 'Enviando...' : 'Enviar Mi Ubicación'}
          </Button>
        )}

        {leadFormConfig.enabled && showLeadFormByTemplate && (
          <Card
            className={`mb-4 ${profile.profile_type === 'business' ? `${theme.border} border` : ''}`}
            style={publicCardStyle}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{leadFormConfig.title || 'Solicitar Contacto'}</CardTitle>
              {profile.profile_type === 'business' && (
                <p className="text-xs text-muted-foreground">Completa tus datos y el negocio te contactará.</p>
              )}
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleLeadSubmit}>
                <div className="hidden" aria-hidden="true">
                  <Input
                    tabIndex={-1}
                    autoComplete="off"
                    value={leadForm.website}
                    onChange={(e) => handleLeadInputChange('website', e.target.value)}
                    placeholder="Website"
                  />
                </div>
                <Input
                  value={leadForm.name}
                  onChange={(e) => handleLeadInputChange('name', e.target.value)}
                  placeholder="Tu nombre"
                  data-testid="public-lead-name"
                />
                <Input
                  value={leadForm.phone}
                  onChange={(e) => handleLeadInputChange('phone', e.target.value)}
                  placeholder="Tu teléfono"
                  data-testid="public-lead-phone"
                />
                <Input
                  type="email"
                  value={leadForm.email}
                  onChange={(e) => handleLeadInputChange('email', e.target.value)}
                  placeholder="Tu email"
                  data-testid="public-lead-email"
                />
                <Textarea
                  value={leadForm.message}
                  onChange={(e) => handleLeadInputChange('message', e.target.value)}
                  rows={3}
                  placeholder="Mensaje"
                  data-testid="public-lead-message"
                />
                {leadFormConfig.captcha_enabled && (
                  <div className="space-y-2">
                    {leadFormConfig.turnstile_site_key ? (
                      <div ref={turnstileContainerRef} data-testid="public-lead-turnstile"></div>
                    ) : (
                      <p className="text-xs text-destructive">
                        Captcha no disponible para este formulario.
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {!leadFormConfig.turnstile_site_key
                        ? 'Captcha pendiente de configuración.'
                        : turnstileReady
                        ? 'Verificación anti-spam activa.'
                        : 'Cargando verificación anti-spam...'}
                    </p>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submittingLead || (leadFormConfig.captcha_enabled && !leadForm.captcha_token)}
                  data-testid="public-lead-submit"
                >
                  {submittingLead ? 'Enviando...' : 'Enviar Mensaje'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {hasFloatingActions && (
          <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] md:inset-x-6">
            <div
              className={`grid gap-2 rounded-2xl border border-border/70 bg-background/95 p-2 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/85 ${
              floatingActionButtons.length === 1
                ? 'grid-cols-1'
                : floatingActionButtons.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
            }`}
              style={floatingPanelStyle}
            >
              {floatingActionButtons.map((action, index) => (
                <Button
                  type="button"
                  key={`${action.type || 'floating'}-${index}`}
                  className="h-12 px-3 rounded-xl text-xs font-semibold sm:text-sm"
                  variant={action.type === 'location' || action.type === 'send_location' ? 'default' : 'outline'}
                  onClick={() => handleActionClick(action)}
                  style={(action.type === 'location' || action.type === 'send_location') ? floatingPrimaryStyle : floatingOutlineStyle}
                >
                  {renderActionIcon(action.type)}
                  <span className="truncate">{action.label || 'Abrir'}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4 pb-4">
          Powered by QR Profiles
        </p>
      </div>
    </div>
  );
};
