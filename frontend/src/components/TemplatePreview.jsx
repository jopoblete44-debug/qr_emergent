import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Heart, User, MapPin, Globe, Shield, Star, Clock, Wifi, Phone, Mail,
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

export const TemplatePreview = ({ template, sampleData = {} }) => {
  if (!template) return null;

  const primaryColor = template.theme?.primary_color || '#dc2626';
  const bgColor = template.theme?.bg_color || '#fef2f2';
  const ProfileIcon = getIcon(template.icon) || Heart;

  return (
    <div style={{ backgroundColor: bgColor }} className="p-3 min-h-full" data-testid="template-preview">
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="text-center pb-2 pt-4 px-4">
          <div
            className="mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-1.5 border"
            style={{ backgroundColor: bgColor, borderColor: `${primaryColor}40` }}
          >
            <ProfileIcon className="h-5 w-5" style={{ color: primaryColor }} />
          </div>
          <CardTitle className="text-base">{template.label || 'Perfil'}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {template.sections?.map((section) => {
            const SectionIcon = getIcon(section.icon);
            const visibleFields = section.fields?.filter(f => f.visible !== false) || [];
            if (visibleFields.length === 0 && !section.title) return null;

            return (
              <div key={section.id} className="space-y-1.5">
                {/* Section header */}
                {section.title && (
                  <div className="flex items-center gap-1.5 pb-1">
                    {SectionIcon && <SectionIcon className="h-3.5 w-3.5" style={{ color: primaryColor }} />}
                    <h4 className="font-semibold text-xs uppercase tracking-wide">{section.title}</h4>
                  </div>
                )}

                <div
                  className="rounded-lg border p-2.5 space-y-1.5"
                  style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}25` }}
                >
                  {section.description && (
                    <p className="text-[10px] text-muted-foreground">{section.description}</p>
                  )}

                  {/* Fields */}
                  {visibleFields.map((field) => {
                    const FieldIcon = getIcon(field.icon);
                    const value = sampleData[field.name] || sampleData[field.id] || '';
                    const stringValue = String(value || '');

                    if ((field.type === 'image' || isImageFieldName(field.name || field.id) || looksLikeImageUrl(stringValue)) && value) {
                      const src = looksLikeUrl(stringValue) && !stringValue.startsWith('http') ? `https://${stringValue}` : stringValue;
                      return (
                        <div key={field.id} className="space-y-1">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            {FieldIcon && <FieldIcon className="h-2.5 w-2.5" />}
                            {field.label}
                          </span>
                          <img
                            src={src}
                            alt={field.label || 'Imagen'}
                            className="w-full h-24 rounded-md object-cover border border-border/50"
                          />
                        </div>
                      );
                    }

                    if (field.type === 'tel' && value) {
                      return (
                        <div key={field.id} className="flex items-center gap-1.5 py-1">
                          {FieldIcon ? <FieldIcon className="h-3 w-3" style={{ color: primaryColor }} /> : <Phone className="h-3 w-3" style={{ color: primaryColor }} />}
                          <span className="text-xs" style={{ color: primaryColor }}>{value}</span>
                        </div>
                      );
                    }

                    if ((field.type === 'url' || field.type === 'email') && value) {
                      return (
                        <div key={field.id} className="flex items-center gap-1.5 py-1">
                          {FieldIcon ? <FieldIcon className="h-3 w-3" style={{ color: primaryColor }} /> : <Globe className="h-3 w-3" style={{ color: primaryColor }} />}
                          <span className="text-xs" style={{ color: primaryColor }}>{value}</span>
                        </div>
                      );
                    }

                    if (field.type === 'textarea' && value) {
                      const lines = splitLines(value);
                      if (lines.length > 1) {
                        return (
                          <div key={field.id} className="space-y-1">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              {FieldIcon && <FieldIcon className="h-2.5 w-2.5" />}
                              {field.label}
                            </span>
                            <div className="space-y-1">
                              {lines.map((line, lineIdx) => (
                                <div key={`${field.id}-line-${lineIdx}`} className="text-xs rounded-md border border-border/50 bg-background px-2 py-1">
                                  {line}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={field.id} className="py-1">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            {FieldIcon && <FieldIcon className="h-2.5 w-2.5" />}
                            {field.label}
                          </span>
                          <p className="text-xs mt-0.5 whitespace-pre-wrap">{value}</p>
                        </div>
                      );
                    }

                    return (
                      <div key={field.id} className="flex justify-between items-start py-1.5 border-b border-border/40 last:border-0">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          {FieldIcon && <FieldIcon className="h-2.5 w-2.5" />}
                          {field.label}
                          {field.required && <span className="text-destructive">*</span>}
                        </span>
                        <span className="font-medium text-xs text-right max-w-[55%]">
                          {value || <span className="text-muted-foreground/40 italic text-[10px]">{field.placeholder || '---'}</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Location button for personal types */}
      {template.category === 'personal' && (
        <div className="mt-3 px-1">
          <div
            className="w-full rounded-lg py-2 text-center text-xs font-medium flex items-center justify-center gap-1 text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <MapPin className="h-3.5 w-3.5" />Enviar Mi Ubicación
          </div>
        </div>
      )}
      <p className="text-center text-[9px] text-muted-foreground mt-2">Powered by QR Profiles</p>
    </div>
  );
};
