import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Eye, EyeOff,
  Type, AlignLeft, Phone, Mail, Hash, Link, List, Calendar,
  Heart, User, MapPin, Globe, Shield, Star, Clock, Wifi,
  Building, CreditCard, Camera, FileText, MessageSquare, Bell, AlertTriangle,
  Coffee, Utensils, Home, Car, Baby, Dog
} from 'lucide-react';
import { getEffectiveFieldType, isImageLikeField } from '../utils/imageFieldUtils';

const FIELD_TYPES = [
  { value: 'text', label: 'Texto', icon: Type },
  { value: 'textarea', label: 'Texto largo', icon: AlignLeft },
  { value: 'tel', label: 'Teléfono', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'number', label: 'Número', icon: Hash },
  { value: 'url', label: 'URL', icon: Link },
  { value: 'image', label: 'Imagen', icon: Camera },
  { value: 'select', label: 'Selección', icon: List },
  { value: 'date', label: 'Fecha', icon: Calendar },
];

const ICON_OPTIONS = [
  { value: 'none', label: 'Sin ícono', icon: null },
  { value: 'heart', label: 'Corazón', icon: Heart },
  { value: 'user', label: 'Persona', icon: User },
  { value: 'map-pin', label: 'Ubicación', icon: MapPin },
  { value: 'globe', label: 'Mundo', icon: Globe },
  { value: 'shield', label: 'Escudo', icon: Shield },
  { value: 'star', label: 'Estrella', icon: Star },
  { value: 'clock', label: 'Reloj', icon: Clock },
  { value: 'wifi', label: 'WiFi', icon: Wifi },
  { value: 'phone', label: 'Teléfono', icon: Phone },
  { value: 'mail', label: 'Correo', icon: Mail },
  { value: 'building', label: 'Edificio', icon: Building },
  { value: 'credit-card', label: 'Tarjeta', icon: CreditCard },
  { value: 'camera', label: 'Cámara', icon: Camera },
  { value: 'file-text', label: 'Documento', icon: FileText },
  { value: 'message', label: 'Mensaje', icon: MessageSquare },
  { value: 'bell', label: 'Campana', icon: Bell },
  { value: 'alert', label: 'Alerta', icon: AlertTriangle },
  { value: 'coffee', label: 'Café', icon: Coffee },
  { value: 'utensils', label: 'Cubiertos', icon: Utensils },
  { value: 'home', label: 'Casa', icon: Home },
  { value: 'car', label: 'Auto', icon: Car },
  { value: 'baby', label: 'Bebé', icon: Baby },
  { value: 'dog', label: 'Mascota', icon: Dog },
];

const COLOR_PRESETS = [
  { name: 'Rojo', value: '#dc2626', bg: '#fef2f2' },
  { name: 'Azul', value: '#2563eb', bg: '#eff6ff' },
  { name: 'Verde', value: '#16a34a', bg: '#f0fdf4' },
  { name: 'Púrpura', value: '#9333ea', bg: '#faf5ff' },
  { name: 'Ámbar', value: '#d97706', bg: '#fffbeb' },
  { name: 'Rosa', value: '#db2777', bg: '#fdf2f8' },
  { name: 'Cian', value: '#0891b2', bg: '#ecfeff' },
  { name: 'Índigo', value: '#4f46e5', bg: '#eef2ff' },
  { name: 'Teal', value: '#0d9488', bg: '#f0fdfa' },
  { name: 'Naranja', value: '#ea580c', bg: '#fff7ed' },
];

const DEFAULT_SECTION = () => ({
  id: `section_${Date.now()}`,
  title: 'Nueva Sección',
  description: '',
  icon: 'none',
  collapsed: false,
  fields: [],
});

const DEFAULT_FIELD = () => ({
  id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  name: `campo_${Date.now()}`,
  label: 'Nuevo Campo',
  type: 'text',
  placeholder: '',
  options: [],
  required: false,
  visible: true,
  icon: 'none',
});

export const ProfileTemplateEditor = ({ template, onChange }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  const sections = Array.isArray(template?.sections) ? template.sections : [];

  const normalizeField = (field = {}) => {
    const effectiveType = getEffectiveFieldType(field);
    return field?.type === effectiveType ? field : { ...field, type: effectiveType };
  };

  const normalizeSections = (templateSections = []) => {
    let hasChanges = false;

    const normalizedSections = templateSections.map((section) => {
      const fields = Array.isArray(section?.fields) ? section.fields : [];
      let sectionChanged = false;

      const normalizedFields = fields.map((field) => {
        const normalizedField = normalizeField(field);
        if (normalizedField !== field) {
          sectionChanged = true;
        }
        return normalizedField;
      });

      if (!sectionChanged) return section;

      hasChanges = true;
      return { ...section, fields: normalizedFields };
    });

    return hasChanges ? normalizedSections : templateSections;
  };

  const normalizeTemplateFields = (nextTemplate) => {
    if (!nextTemplate || !Array.isArray(nextTemplate.sections)) return nextTemplate;

    const normalizedSections = normalizeSections(nextTemplate.sections);
    if (normalizedSections === nextTemplate.sections) return nextTemplate;

    return { ...nextTemplate, sections: normalizedSections };
  };

  const hasImageLikeTypeMismatch = (templateSections = []) => (
    templateSections.some((section) => (
      (section?.fields || []).some((field) => isImageLikeField(field) && field?.type !== 'image')
    ))
  );

  useEffect(() => {
    if (!hasImageLikeTypeMismatch(sections)) return;
    onChange(normalizeTemplateFields(template));
  }, [sections, template, onChange]);

  const updateTemplate = (updates) => {
    onChange(normalizeTemplateFields({ ...template, ...updates }));
  };

  const updateSection = (sectionIdx, updates) => {
    const newSections = [...sections];
    newSections[sectionIdx] = { ...newSections[sectionIdx], ...updates };
    updateTemplate({ sections: newSections });
  };

  const addSection = () => {
    const newSection = DEFAULT_SECTION();
    updateTemplate({ sections: [...sections, newSection] });
    setExpandedSection(sections.length);
  };

  const removeSection = (idx) => {
    updateTemplate({ sections: sections.filter((_, i) => i !== idx) });
  };

  const moveSection = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const newSections = [...sections];
    [newSections[idx], newSections[newIdx]] = [newSections[newIdx], newSections[idx]];
    updateTemplate({ sections: newSections });
    setExpandedSection(newIdx);
  };

  const addField = (sectionIdx) => {
    const newSections = [...sections];
    const section = newSections[sectionIdx];
    const fields = Array.isArray(section?.fields) ? section.fields : [];
    newSections[sectionIdx] = { ...section, fields: [...fields, DEFAULT_FIELD()] };
    updateTemplate({ sections: newSections });
  };

  const updateField = (sectionIdx, fieldIdx, updates) => {
    const newSections = [...sections];
    const section = newSections[sectionIdx];
    const fields = Array.isArray(section?.fields) ? [...section.fields] : [];
    fields[fieldIdx] = {
      ...fields[fieldIdx],
      ...updates,
    };
    newSections[sectionIdx] = { ...section, fields };
    updateTemplate({ sections: newSections });
  };

  const removeField = (sectionIdx, fieldIdx) => {
    const newSections = [...sections];
    const section = newSections[sectionIdx];
    const fields = Array.isArray(section?.fields) ? [...section.fields] : [];
    fields.splice(fieldIdx, 1);
    newSections[sectionIdx] = { ...section, fields };
    updateTemplate({ sections: newSections });
  };

  const moveField = (sectionIdx, fieldIdx, direction) => {
    const newIdx = fieldIdx + direction;
    const fields = sections[sectionIdx].fields;
    if (newIdx < 0 || newIdx >= fields.length) return;
    const newSections = [...sections];
    const arr = [...newSections[sectionIdx].fields];
    [arr[fieldIdx], arr[newIdx]] = [arr[newIdx], arr[fieldIdx]];
    newSections[sectionIdx] = { ...newSections[sectionIdx], fields: arr };
    updateTemplate({ sections: newSections });
  };

  const getIconComponent = (iconName) => {
    const found = ICON_OPTIONS.find(i => i.value === iconName);
    return found?.icon || null;
  };

  return (
    <div className="space-y-4" data-testid="profile-template-editor">
      {/* Profile Type Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Configuración General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del Tipo</Label>
              <Input
                value={template.label}
                onChange={(e) => updateTemplate({ label: e.target.value })}
                data-testid="template-label"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ícono del Perfil</Label>
              <Select value={template.icon || 'heart'} onValueChange={(v) => updateTemplate({ icon: v })}>
                <SelectTrigger data-testid="template-icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.filter(i => i.icon).map(opt => {
                    const Icon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{opt.label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <Label className="text-xs">Colores del Tema</Label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => updateTemplate({
                    theme: { ...template.theme, primary_color: preset.value, bg_color: preset.bg }
                  })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    template.theme?.primary_color === preset.value ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                  data-testid={`color-${preset.name.toLowerCase()}`}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={template.theme?.primary_color || '#dc2626'}
                  onChange={(e) => updateTemplate({
                    theme: { ...template.theme, primary_color: e.target.value }
                  })}
                  className="w-8 h-8 rounded cursor-pointer border-0"
                />
                <div>
                  <span className="text-[10px] text-muted-foreground block">Color Principal</span>
                  <span className="font-mono text-xs">{template.theme?.primary_color || '#dc2626'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={template.theme?.bg_color || '#fef2f2'}
                  onChange={(e) => updateTemplate({
                    theme: { ...template.theme, bg_color: e.target.value }
                  })}
                  className="w-8 h-8 rounded cursor-pointer border-0"
                />
                <div>
                  <span className="text-[10px] text-muted-foreground block">Color de Fondo</span>
                  <span className="font-mono text-xs">{template.theme?.bg_color || '#fef2f2'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <Label className="text-xs">Tipo Habilitado</Label>
              <p className="text-[10px] text-muted-foreground">Los clientes podrán crear perfiles de este tipo</p>
            </div>
            <Switch
              checked={template.enabled !== false}
              onCheckedChange={(v) => updateTemplate({ enabled: v })}
              data-testid="template-enabled"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {sections.map((section, sIdx) => {
        const isExpanded = expandedSection === sIdx;
        const SectionIcon = getIconComponent(section.icon);

        return (
          <Card key={section.id} className={`transition-shadow ${isExpanded ? 'ring-1 ring-primary/30' : ''}`} data-testid={`section-${sIdx}`}>
            <CardHeader
              className="pb-2 cursor-pointer"
              onClick={() => setExpandedSection(isExpanded ? null : sIdx)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  {SectionIcon && <SectionIcon className="h-4 w-4" style={{ color: template.theme?.primary_color }} />}
                  <Input
                    value={section.title}
                    onChange={(e) => { e.stopPropagation(); updateSection(sIdx, { title: e.target.value }); }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-sm font-semibold border-none shadow-none px-1 focus-visible:ring-1"
                    data-testid={`section-title-${sIdx}`}
                  />
                  <Badge variant="outline" className="text-[10px] shrink-0">{section.fields.length} campos</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); moveSection(sIdx, -1); }} disabled={sIdx === 0}>
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); moveSection(sIdx, 1); }} disabled={sIdx === sections.length - 1}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); removeSection(sIdx); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-2 pt-0">
                {/* Section settings */}
                <div className="flex gap-2 pb-2 border-b">
                  <Select value={section.icon || 'none'} onValueChange={(v) => updateSection(sIdx, { icon: v })}>
                    <SelectTrigger className="w-36 h-7 text-xs">
                      <SelectValue placeholder="Ícono" />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-1.5 text-xs">
                            {opt.icon && <opt.icon className="h-3 w-3" />}{opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={section.description || ''}
                    onChange={(e) => updateSection(sIdx, { description: e.target.value })}
                    className="h-7 text-xs"
                    placeholder="Descripción de la sección (opcional)"
                  />
                </div>

                {/* Fields */}
                {section.fields.map((field, fIdx) => {
                  const FieldIcon = getIconComponent(field.icon);
                  const fieldIsImageLike = isImageLikeField(field);
                  const effectiveFieldType = getEffectiveFieldType(field);
                  const availableFieldTypes = fieldIsImageLike
                    ? FIELD_TYPES.filter((fieldType) => fieldType.value === 'image')
                    : FIELD_TYPES;
                  return (
                    <div
                      key={field.id}
                      className={`border rounded-lg p-2.5 space-y-2 ${!field.visible ? 'opacity-50 bg-muted/30' : 'bg-background'}`}
                      data-testid={`field-${sIdx}-${fIdx}`}
                    >
                      {/* Field header */}
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {FieldIcon && <FieldIcon className="h-3.5 w-3.5 shrink-0" style={{ color: template.theme?.primary_color }} />}
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(sIdx, fIdx, { label: e.target.value })}
                          className="h-6 text-xs font-medium border-none shadow-none px-1 flex-1 focus-visible:ring-1"
                        />
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveField(sIdx, fIdx, -1)} disabled={fIdx === 0}>
                            <ChevronUp className="h-2.5 w-2.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveField(sIdx, fIdx, 1)} disabled={fIdx === section.fields.length - 1}>
                            <ChevronDown className="h-2.5 w-2.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="h-5 w-5 p-0"
                            onClick={() => updateField(sIdx, fIdx, { visible: !field.visible })}
                            title={field.visible ? 'Ocultar' : 'Mostrar'}
                          >
                            {field.visible ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5 text-muted-foreground" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => removeField(sIdx, fIdx)}>
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Field config row */}
                      <div className="flex items-center gap-2 pl-5">
                        <Select
                          value={effectiveFieldType}
                          onValueChange={(v) => updateField(sIdx, fIdx, { type: fieldIsImageLike ? 'image' : v })}
                          disabled={fieldIsImageLike}
                        >
                          <SelectTrigger className="w-28 h-6 text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFieldTypes.map(ft => (
                              <SelectItem key={ft.value} value={ft.value}>
                                <span className="flex items-center gap-1 text-xs"><ft.icon className="h-3 w-3" />{ft.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={field.icon || 'none'} onValueChange={(v) => updateField(sIdx, fIdx, { icon: v })}>
                          <SelectTrigger className="w-28 h-6 text-[10px]">
                            <SelectValue placeholder="Ícono" />
                          </SelectTrigger>
                          <SelectContent>
                            {ICON_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className="flex items-center gap-1 text-[10px]">
                                  {opt.icon && <opt.icon className="h-3 w-3" />}{opt.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={field.placeholder || ''}
                          onChange={(e) => updateField(sIdx, fIdx, { placeholder: e.target.value })}
                          className="h-6 text-[10px] flex-1"
                          placeholder="Placeholder..."
                        />
                        <label className="flex items-center gap-1 text-[10px] shrink-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(sIdx, fIdx, { required: e.target.checked })}
                            className="rounded h-3 w-3"
                          />
                          Req.
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-5">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Nombre interno del campo</Label>
                          <Input
                            value={field.name || ''}
                            onChange={(e) => updateField(sIdx, fIdx, { name: e.target.value })}
                            className="h-6 text-[10px]"
                            placeholder="ej: menu_items, wifi_name"
                          />
                          {fieldIsImageLike && (
                            <p className="text-[10px] text-muted-foreground">
                              Este nombre se detecta como imagen y queda forzado a tipo imagen.
                            </p>
                          )}
                        </div>
                        {effectiveFieldType === 'select' && (
                          <div className="space-y-1">
                            <Label className="text-[10px]">Opciones (una por línea)</Label>
                            <Textarea
                              rows={2}
                              value={Array.isArray(field.options) ? field.options.join('\n') : ''}
                              onChange={(e) => updateField(sIdx, fIdx, {
                                options: e.target.value
                                  .split('\n')
                                  .map((opt) => opt.trim())
                                  .filter(Boolean),
                              })}
                              className="text-[10px]"
                              placeholder={'Opción 1\nOpción 2\nOpción 3'}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add field button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs border-dashed"
                  onClick={() => addField(sIdx)}
                  data-testid={`add-field-btn-${sIdx}`}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Agregar Campo
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Add section button */}
      <Button
        variant="outline"
        className="w-full border-dashed h-10"
        onClick={addSection}
        data-testid="add-section-btn"
      >
        <Plus className="mr-2 h-4 w-4" />
        Agregar Sección
      </Button>
    </div>
  );
};
