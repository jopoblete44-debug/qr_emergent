import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Heart, User, MapPin, Globe, Shield, Star, Clock, Calendar, Wifi, Phone, Mail,
  Building, CreditCard, Camera, FileText, MessageSquare, Bell, AlertTriangle,
  Coffee, Utensils, Home, Car, Baby, Dog
} from 'lucide-react';

const ICON_MAP = {
  heart: Heart, user: User, 'map-pin': MapPin, globe: Globe, shield: Shield,
  star: Star, clock: Clock, calendar: Calendar, wifi: Wifi, phone: Phone, mail: Mail,
  building: Building, 'credit-card': CreditCard, camera: Camera,
  'file-text': FileText, message: MessageSquare, bell: Bell, alert: AlertTriangle,
  coffee: Coffee, utensils: Utensils, home: Home, car: Car, baby: Baby, dog: Dog,
};

const getIcon = (name) => ICON_MAP[name] || null;
const splitLines = (value) => String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);
const looksLikeUrl = (value) => typeof value === 'string' && /^(https?:\/\/|www\.)/i.test(value.trim());
const looksLikeImageUrl = (value) =>
  typeof value === 'string' &&
  /^(https?:\/\/|www\.)/i.test(value.trim()) &&
  /(\.png|\.jpe?g|\.webp|\.gif|\.bmp|\.svg)(\?.*)?$/i.test(value.trim());
const isImageFieldName = (name) => /(photo|image|logo|avatar|foto|imagen|banner|cover)/i.test(name || '');
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
const parseMapValue = (rawValue) => {
  const value = String(rawValue || '').trim();
  if (!value) return null;
  if (/https?:\/\/(www\.)?google\.[^/]+\/maps/i.test(value)) {
    return { label: 'Link de Google Maps', value };
  }
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value)) {
    return { label: 'Coordenadas', value };
  }
  return { label: 'Dirección', value };
};

export const TemplatePreview = ({ template, sampleData = {} }) => {
  if (!template) return null;

  const primaryColor = template.theme?.primary_color || '#2563eb';
  const bgColor = template.theme?.bg_color || '#f8fafc';
  const ProfileIcon = getIcon(template.icon) || Heart;
  const displayOptions = template.display_options && typeof template.display_options === 'object'
    ? template.display_options
    : {};
  const cardStyle = ['elegant', 'bold', 'glass'].includes(String(displayOptions.card_style || '').toLowerCase())
    ? String(displayOptions.card_style).toLowerCase()
    : 'elegant';
  const isBold = cardStyle === 'bold';
  const isGlass = cardStyle === 'glass';
  const templateHasExplicitMapField = Boolean(
    template.sections?.some((section) => (
      (section.fields || []).some((field) => String(field?.type || '').trim().toLowerCase() === 'map' && field?.visible !== false)
    ))
  );
  const showMapPreview = Boolean(displayOptions.show_map_section ?? (template.category === 'business')) && !templateHasExplicitMapField;
  const pageOverlayStyle = isBold
    ? {
      background: `radial-gradient(circle at top right, ${withAlpha(primaryColor, 0.32) || 'rgba(59,130,246,.32)'} 0%, rgba(2,6,23,0) 62%)`,
    }
    : isGlass
      ? {
        background: `linear-gradient(135deg, ${withAlpha(primaryColor, 0.18) || 'rgba(59,130,246,.18)'} 0%, rgba(255,255,255,0.22) 58%, rgba(255,255,255,0.45) 100%)`,
      }
      : {
        background: `linear-gradient(180deg, ${withAlpha(primaryColor, 0.1) || 'rgba(59,130,246,.1)'} 0%, rgba(255,255,255,0) 55%)`,
      };
  const cardClassName = isBold
    ? 'overflow-hidden border-2 border-slate-900/10 bg-slate-950 text-slate-100 shadow-[0_26px_70px_-35px_rgba(2,6,23,0.9)]'
    : isGlass
      ? 'overflow-hidden border border-white/55 bg-white/70 backdrop-blur-xl shadow-[0_26px_60px_-28px_rgba(15,23,42,0.45)]'
      : 'overflow-hidden border border-border/70 bg-white shadow-[0_16px_42px_-28px_rgba(15,23,42,0.35)]';
  const cardInlineStyle = isBold
    ? {
      background: `linear-gradient(160deg, ${withAlpha(primaryColor, 0.18) || 'rgba(59,130,246,.18)'} 0%, rgba(2,6,23,0.96) 55%, rgba(2,6,23,1) 100%)`,
      borderColor: withAlpha(primaryColor, 0.42) || undefined,
    }
    : isGlass
      ? {
        borderColor: withAlpha(primaryColor, 0.35) || undefined,
      }
      : {
        borderColor: withAlpha(primaryColor, 0.32) || undefined,
      };
  const sectionBaseClassName = isBold
    ? 'rounded-xl border p-3.5 space-y-2'
    : isGlass
      ? 'rounded-xl border border-white/60 bg-white/65 p-3.5 space-y-2 backdrop-blur'
      : 'rounded-xl border p-3.5 space-y-2';
  const sectionBaseStyle = isBold
    ? {
      borderColor: withAlpha(primaryColor, 0.42) || undefined,
      backgroundColor: withAlpha(primaryColor, 0.13) || 'rgba(30,41,59,.35)',
    }
    : {
      borderColor: withAlpha(primaryColor, 0.28) || undefined,
      backgroundColor: withAlpha(primaryColor, isGlass ? 0.08 : 0.06) || undefined,
    };
  const cardTitleClassName = isBold ? 'text-base text-white' : 'text-base';
  const subtleTextClassName = isBold ? 'text-slate-300' : 'text-muted-foreground';

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className="relative min-h-full overflow-hidden p-3"
      data-testid="template-preview"
    >
      <div className="pointer-events-none absolute inset-0" style={pageOverlayStyle} />
      <Card className={`relative ${cardClassName}`} style={cardInlineStyle}>
        <CardHeader className="px-4 pb-2 pt-4 text-center">
          <div
            className="mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-full border"
            style={{
              backgroundColor: withAlpha(primaryColor, isBold ? 0.2 : 0.12) || bgColor,
              borderColor: withAlpha(primaryColor, 0.36) || undefined,
            }}
          >
            <ProfileIcon className="h-5 w-5" style={{ color: isBold ? '#ffffff' : primaryColor }} />
          </div>
          <CardTitle className={cardTitleClassName}>{template.label || 'Perfil'}</CardTitle>
          <p className={`text-[10px] ${subtleTextClassName}`}>
            Estilo {cardStyle === 'elegant' ? 'Elegante' : cardStyle === 'bold' ? 'Atrevido' : 'Glass'}
          </p>
        </CardHeader>

        <CardContent className="space-y-3 px-4 pb-4">
          {template.sections?.map((section) => {
            const SectionIcon = getIcon(section.icon);
            const visibleFields = section.fields?.filter((field) => field.visible !== false) || [];
            if (!visibleFields.length && !section.title) return null;

            return (
              <div key={section.id} className="space-y-2">
                {section.title && (
                  <div className="flex items-center gap-1.5 pb-0.5">
                    {SectionIcon && <SectionIcon className="h-3.5 w-3.5" style={{ color: isBold ? '#ffffff' : primaryColor }} />}
                    <h4 className={`text-xs font-semibold uppercase tracking-wide ${isBold ? 'text-white' : ''}`}>
                      {section.title}
                    </h4>
                  </div>
                )}

                <div className={sectionBaseClassName} style={sectionBaseStyle}>
                  {section.description && (
                    <p className={`text-[10px] ${subtleTextClassName}`}>{section.description}</p>
                  )}

                  {visibleFields.map((field) => {
                    const FieldIcon = getIcon(field.icon);
                    const value = sampleData[field.name] || sampleData[field.id] || '';
                    const stringValue = String(value || '');
                    const fieldKey = field.id || field.name;

                    if ((field.type === 'image' || isImageFieldName(field.name || field.id) || looksLikeImageUrl(stringValue)) && value) {
                      const src = looksLikeUrl(stringValue) && !stringValue.startsWith('http') ? `https://${stringValue}` : stringValue;
                      return (
                        <div key={fieldKey} className="space-y-1">
                          <span className={`flex items-center gap-1 text-[10px] ${subtleTextClassName}`}>
                            {FieldIcon && <FieldIcon className="h-2.5 w-2.5" />}
                            {field.label}
                          </span>
                          <img
                            src={src}
                            alt={field.label || 'Imagen'}
                            className="h-24 w-full rounded-md border border-border/50 object-cover"
                          />
                        </div>
                      );
                    }

                    if (field.type === 'map') {
                      const mapData = parseMapValue(value);
                      return (
                        <div key={fieldKey} className="space-y-1.5 rounded-lg border border-border/55 bg-background/70 p-2">
                          <span className={`flex items-center gap-1 text-[10px] ${subtleTextClassName}`}>
                            {FieldIcon ? <FieldIcon className="h-2.5 w-2.5" /> : <MapPin className="h-2.5 w-2.5" />}
                            {field.label || 'Mapa'}
                          </span>
                          <div className="flex h-14 items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/40 px-2 text-center text-[10px]">
                            {mapData ? `${mapData.label}: ${mapData.value}` : 'Dirección o coordenadas del mapa'}
                          </div>
                        </div>
                      );
                    }

                    if (field.type === 'tel' && value) {
                      return (
                        <div key={fieldKey} className="flex items-center gap-1.5 py-1">
                          {FieldIcon ? <FieldIcon className="h-3 w-3" style={{ color: isBold ? '#ffffff' : primaryColor }} /> : <Phone className="h-3 w-3" style={{ color: isBold ? '#ffffff' : primaryColor }} />}
                          <span className="text-xs" style={{ color: isBold ? '#f8fafc' : primaryColor }}>{value}</span>
                        </div>
                      );
                    }

                    if ((field.type === 'url' || field.type === 'email') && value) {
                      return (
                        <div key={fieldKey} className="flex items-center gap-1.5 py-1">
                          {FieldIcon ? <FieldIcon className="h-3 w-3" style={{ color: isBold ? '#ffffff' : primaryColor }} /> : <Globe className="h-3 w-3" style={{ color: isBold ? '#ffffff' : primaryColor }} />}
                          <span className="text-xs" style={{ color: isBold ? '#f8fafc' : primaryColor }}>{value}</span>
                        </div>
                      );
                    }

                    if (field.type === 'textarea' && value) {
                      const lines = splitLines(value);
                      if (lines.length > 1) {
                        return (
                          <div key={fieldKey} className="space-y-1">
                            <span className={`flex items-center gap-1 text-[10px] ${subtleTextClassName}`}>
                              {FieldIcon && <FieldIcon className="h-2.5 w-2.5" />}
                              {field.label}
                            </span>
                            <div className="space-y-1">
                              {lines.map((line, lineIdx) => (
                                <div key={`${fieldKey}-line-${lineIdx}`} className="rounded-md border border-border/55 bg-background/80 px-2 py-1 text-xs">
                                  {line}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={fieldKey} className="py-1">
                          <span className={`flex items-center gap-1 text-[10px] ${subtleTextClassName}`}>
                            {FieldIcon && <FieldIcon className="h-2.5 w-2.5" />}
                            {field.label}
                          </span>
                          <p className="mt-0.5 whitespace-pre-wrap text-xs">{value}</p>
                        </div>
                      );
                    }

                    return (
                      <div key={fieldKey} className={`flex items-start justify-between border-b border-border/40 py-1.5 last:border-0 ${isBold ? 'text-slate-100' : ''}`}>
                        <span className={`flex items-center gap-1 text-[10px] ${subtleTextClassName}`}>
                          {FieldIcon && <FieldIcon className="h-2.5 w-2.5" />}
                          {field.label}
                          {field.required && <span className="text-destructive">*</span>}
                        </span>
                        <span className="max-w-[55%] text-right text-xs font-medium">
                          {value || <span className={`italic text-[10px] ${subtleTextClassName}`}>{field.placeholder || '---'}</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {showMapPreview && (
            <div className={sectionBaseClassName} style={sectionBaseStyle}>
              <div className="mb-2 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" style={{ color: isBold ? '#ffffff' : primaryColor }} />
                <p className={`text-xs font-semibold uppercase tracking-wide ${isBold ? 'text-white' : ''}`}>Mapa</p>
              </div>
              <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/40">
                <span className={`text-[10px] ${subtleTextClassName}`}>Vista del mapa en el perfil público</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {template.category === 'personal' && (
        <div className="mt-3 px-1">
          <div
            className="flex w-full items-center justify-center gap-1 rounded-xl py-2 text-center text-xs font-semibold text-white"
            style={{
              background: isBold
                ? `linear-gradient(120deg, ${withAlpha(primaryColor, 0.88) || primaryColor} 0%, rgba(15,23,42,0.92) 100%)`
                : primaryColor,
              boxShadow: `0 16px 30px -22px ${withAlpha(primaryColor, 0.75) || 'rgba(37,99,235,.75)'}`,
            }}
          >
            <MapPin className="h-3.5 w-3.5" />
            Enviar Mi Ubicación
          </div>
        </div>
      )}

      <p className={`mt-2 text-center text-[9px] ${subtleTextClassName}`}>Powered by QR Profiles</p>
    </div>
  );
};
