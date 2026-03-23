import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  MapPin, Phone, Mail, Heart, Wifi, Globe, Clock,
  User, Building, Instagram, Facebook, Twitter, Youtube, Linkedin,
  CalendarDays, UtensilsCrossed, Hotel, QrCode, ClipboardCheck, MessageSquare
} from 'lucide-react';

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

const SUB_TYPE_ICONS = {
  medico: Heart, mascota: User, vehiculo: User, nino: User,
  restaurante: UtensilsCrossed, hotel: Hotel, wifi: Wifi, tarjeta: User,
  catalogo: Building, turismo: MapPin, checkin: ClipboardCheck,
  encuesta: MessageSquare, redes: Globe, evento: CalendarDays,
};

const DataRow = ({ label, value, icon: Icon }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}{label}
      </span>
      <span className="font-medium text-xs text-right max-w-[55%]">{value}</span>
    </div>
  );
};

const PhoneLink = ({ phone, label }) => {
  if (!phone) return null;
  return (
    <div className="flex items-center gap-1.5 text-primary py-0.5">
      <Phone className="h-3 w-3" />
      <span className="text-xs">{label || phone}</span>
    </div>
  );
};

const ContactCard = ({ title, children }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-md p-3 space-y-1">
    <h4 className="font-semibold text-xs">{title}</h4>
    {children}
  </div>
);

export const ProfilePreview = ({ profile }) => {
  if (!profile) return null;

  const d = profile.data || {};
  const theme = THEME_COLORS[profile.sub_type] || { bg: 'bg-background', accent: 'text-primary', border: 'border-border' };
  const ProfileIcon = SUB_TYPE_ICONS[profile.sub_type] || QrCode;

  const renderMedical = () => (
    <div className="space-y-2">
      <div className={`${theme.bg} border ${theme.border} rounded-md p-2`}>
        <div className="flex items-center gap-1.5"><Heart className={`h-3.5 w-3.5 ${theme.accent}`} /><span className="font-bold text-xs uppercase">Emergencia Médica</span></div>
      </div>
      <DataRow label="Tipo de Sangre" value={d.blood_type} />
      <DataRow label="Alergias" value={d.allergies} />
      <DataRow label="Medicamentos" value={d.medications} />
      <DataRow label="Condiciones" value={d.conditions} />
      <DataRow label="Médico" value={d.doctor_name} />
      {d.doctor_phone && <PhoneLink phone={d.doctor_phone} label={`Dr. ${d.doctor_name || ''}`} />}
      {(d.emergency_name || d.emergency_phone) && (
        <ContactCard title="Contacto de Emergencia">
          {d.emergency_name && <p className="text-xs">{d.emergency_name}</p>}
          <PhoneLink phone={d.emergency_phone} />
        </ContactCard>
      )}
    </div>
  );

  const renderPet = () => (
    <div className="space-y-2">
      {d.pet_name && <h3 className="text-base font-bold text-center">{d.pet_name}</h3>}
      <DataRow label="Especie" value={d.species} />
      <DataRow label="Raza" value={d.breed} />
      <DataRow label="Color" value={d.color} />
      {d.vet_name && <DataRow label="Veterinario" value={d.vet_name} />}
      {d.vet_phone && <PhoneLink phone={d.vet_phone} label={`Vet: ${d.vet_phone}`} />}
      {(d.owner_name || d.owner_phone) && (
        <ContactCard title="Dueño">{d.owner_name && <p className="text-xs">{d.owner_name}</p>}<PhoneLink phone={d.owner_phone} /></ContactCard>
      )}
    </div>
  );

  const renderVehicle = () => (
    <div className="space-y-2">
      <DataRow label="Patente" value={d.plate} />
      <DataRow label="Marca" value={d.brand} />
      <DataRow label="Modelo" value={d.model} />
      <DataRow label="Color" value={d.color} />
      {(d.owner_name || d.owner_phone) && (
        <ContactCard title="Propietario">{d.owner_name && <p className="text-xs">{d.owner_name}</p>}<PhoneLink phone={d.owner_phone} /></ContactCard>
      )}
    </div>
  );

  const renderChild = () => (
    <div className="space-y-2">
      <DataRow label="Nombre" value={d.full_name} />
      <DataRow label="Edad" value={d.age} />
      <DataRow label="Condiciones" value={d.conditions} />
      <DataRow label="Dirección" value={d.address} />
      {(d.guardian_name || d.guardian_phone) && (
        <ContactCard title="Tutor">{d.guardian_name && <p className="text-xs">{d.guardian_name}</p>}<PhoneLink phone={d.guardian_phone} /></ContactCard>
      )}
    </div>
  );

  const renderRestaurant = () => (
    <div className="space-y-2">
      {d.description && <p className="text-muted-foreground text-xs text-center">{d.description}</p>}
      {d.menu_items && (
        <div>
          <h4 className="font-bold text-sm mb-1 flex items-center gap-1"><UtensilsCrossed className={`h-3.5 w-3.5 ${theme.accent}`} />Menú</h4>
          {d.menu_items.split('\n').filter(Boolean).map((item, i) => (
            <div key={i} className="py-1 px-2 border-b border-border/50 text-xs">{item}</div>
          ))}
        </div>
      )}
      {d.schedule && <DataRow label="Horario" value={d.schedule} icon={Clock} />}
      {d.website && <div className="flex items-center gap-1 text-xs text-primary"><Globe className="h-3 w-3" />{d.website}</div>}
      {d.phone && <PhoneLink phone={d.phone} />}
      {d.address && <DataRow label="Dirección" value={d.address} icon={MapPin} />}
    </div>
  );

  const renderHotel = () => (
    <div className="space-y-2">
      {d.hotel_name && <h3 className="text-base font-bold text-center">{d.hotel_name}</h3>}
      {d.welcome_message && <div className={`${theme.bg} border ${theme.border} rounded-md p-2`}><p className="text-xs italic">{d.welcome_message}</p></div>}
      {(d.wifi_name || d.wifi_password) && (
        <div className="bg-cyan-50 dark:bg-cyan-950 border border-cyan-200 dark:border-cyan-800 rounded-md p-2">
          <h5 className="font-semibold text-xs flex items-center gap-1 mb-1"><Wifi className="h-3 w-3" />WiFi</h5>
          {d.wifi_name && <p className="text-xs">Red: <span className="font-mono">{d.wifi_name}</span></p>}
          {d.wifi_password && <p className="text-xs">Clave: <span className="font-mono">{d.wifi_password}</span></p>}
        </div>
      )}
      {d.checkout_time && <DataRow label="Checkout" value={d.checkout_time} icon={Clock} />}
      {d.reception_phone && <PhoneLink phone={d.reception_phone} label="Recepción" />}
    </div>
  );

  const renderWifi = () => (
    <div className="space-y-2 text-center">
      <Wifi className={`h-10 w-10 ${theme.accent} mx-auto`} />
      <h3 className="font-bold">Conexión WiFi</h3>
      <div className={`${theme.bg} border ${theme.border} rounded-md p-3 space-y-2`}>
        {d.network_name && <div><span className="text-xs text-muted-foreground block">Red</span><p className="font-mono font-bold">{d.network_name}</p></div>}
        {d.password && <div><span className="text-xs text-muted-foreground block">Clave</span><p className="font-mono font-bold">{d.password}</p></div>}
      </div>
    </div>
  );

  const renderBusinessCard = () => (
    <div className="space-y-2 text-center">
      {d.full_name && <h3 className="text-lg font-bold">{d.full_name}</h3>}
      {d.title && <p className={`text-xs ${theme.accent}`}>{d.title}</p>}
      {d.company && <p className="text-xs text-muted-foreground">{d.company}</p>}
      <div className="space-y-1 text-left pt-1">
        {d.phone && <PhoneLink phone={d.phone} />}
        {d.email && <div className="flex items-center gap-1 text-xs text-primary"><Mail className="h-3 w-3" />{d.email}</div>}
        {d.website && <div className="flex items-center gap-1 text-xs text-primary"><Globe className="h-3 w-3" />{d.website}</div>}
        {d.linkedin && <div className="flex items-center gap-1 text-xs text-primary"><Linkedin className="h-3 w-3" />LinkedIn</div>}
      </div>
    </div>
  );

  const renderCatalog = () => (
    <div className="space-y-2">
      {d.business_name && <h3 className="font-bold text-center">{d.business_name}</h3>}
      {d.description && <p className="text-xs text-muted-foreground text-center">{d.description}</p>}
      {d.products && d.products.split('\n').filter(Boolean).map((item, i) => (
        <div key={i} className="py-1 px-2 border-b text-xs">{item}</div>
      ))}
      {d.phone && <PhoneLink phone={d.phone} />}
    </div>
  );

  const renderTourism = () => (
    <div className="space-y-2">
      {d.place_name && <h3 className="font-bold text-center">{d.place_name}</h3>}
      {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
      {d.history && <div className={`${theme.bg} border ${theme.border} rounded-md p-2`}><h5 className="font-semibold text-xs">Historia</h5><p className="text-xs">{d.history}</p></div>}
      {d.schedule && <DataRow label="Horario" value={d.schedule} />}
      {d.entry_fee && <DataRow label="Entrada" value={d.entry_fee} />}
      {d.address && <DataRow label="Dirección" value={d.address} />}
    </div>
  );

  const renderSocialLinks = () => {
    const links = [
      { key: 'instagram', icon: Instagram, label: 'Instagram' },
      { key: 'facebook', icon: Facebook, label: 'Facebook' },
      { key: 'twitter', icon: Twitter, label: 'Twitter/X' },
      { key: 'tiktok', icon: Globe, label: 'TikTok' },
      { key: 'youtube', icon: Youtube, label: 'YouTube' },
      { key: 'linkedin', icon: Linkedin, label: 'LinkedIn' },
      { key: 'website', icon: Globe, label: 'Web' },
    ];
    return (
      <div className="space-y-2">
        {d.display_name && <h3 className="font-bold text-center">{d.display_name}</h3>}
        {links.map(({ key, icon: Icon, label }) => d[key] ? (
          <div key={key} className="flex items-center gap-2 p-2 border rounded-md">
            <Icon className={`h-4 w-4 ${theme.accent}`} /><span className="text-xs">{label}</span>
          </div>
        ) : null)}
      </div>
    );
  };

  const renderEvent = () => (
    <div className="space-y-2">
      {d.event_name && <h3 className="font-bold text-center">{d.event_name}</h3>}
      {d.description && <p className="text-xs text-muted-foreground text-center">{d.description}</p>}
      {d.date && <DataRow label="Fecha" value={d.date} icon={CalendarDays} />}
      {d.time && <DataRow label="Hora" value={d.time} icon={Clock} />}
      {d.location && <DataRow label="Lugar" value={d.location} icon={MapPin} />}
      {d.organizer && <DataRow label="Organizador" value={d.organizer} />}
      {d.contact_phone && <PhoneLink phone={d.contact_phone} />}
    </div>
  );

  const renderCheckin = () => (
    <div className="space-y-2">
      {d.business_name && <h3 className="font-bold text-center">{d.business_name}</h3>}
      {d.welcome_message && <div className={`${theme.bg} border ${theme.border} rounded-md p-2 text-center`}><p className="text-xs">{d.welcome_message}</p></div>}
      {d.address && <DataRow label="Dirección" value={d.address} icon={MapPin} />}
      {d.phone && <PhoneLink phone={d.phone} />}
    </div>
  );

  const renderSurvey = () => (
    <div className="space-y-2">
      {d.survey_title && <h3 className="font-bold text-center">{d.survey_title}</h3>}
      {d.description && <p className="text-xs text-muted-foreground text-center">{d.description}</p>}
      {d.questions && d.questions.split('\n').filter(Boolean).map((q, i) => (
        <div key={i} className="p-2 border rounded text-xs">{i + 1}. {q}</div>
      ))}
      {d.thank_you_message && <div className={`${theme.bg} border ${theme.border} rounded-md p-2 text-center`}><p className="text-xs">{d.thank_you_message}</p></div>}
    </div>
  );

  const renderGeneric = () => (
    <div className="space-y-1">
      {Object.entries(d).filter(([_, v]) => v).map(([key, value]) => (
        <DataRow key={key} label={key.replace(/_/g, ' ')} value={String(value)} />
      ))}
    </div>
  );

  const RENDERERS = {
    medico: renderMedical, mascota: renderPet, vehiculo: renderVehicle, nino: renderChild,
    restaurante: renderRestaurant, hotel: renderHotel, wifi: renderWifi, tarjeta: renderBusinessCard,
    catalogo: renderCatalog, turismo: renderTourism, redes: renderSocialLinks, evento: renderEvent,
    checkin: renderCheckin, encuesta: renderSurvey,
  };

  const renderer = RENDERERS[profile.sub_type] || renderGeneric;

  return (
    <div className={`${theme.bg} p-3 min-h-full`}>
      <Card className="shadow-sm">
        <CardHeader className="text-center pb-2 pt-4 px-4">
          <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${theme.bg} border ${theme.border}`}>
            <ProfileIcon className={`h-5 w-5 ${theme.accent}`} />
          </div>
          <CardTitle className="text-lg">{profile.name}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {renderer()}
        </CardContent>
      </Card>
      {profile.profile_type === 'personal' && (
        <div className="mt-3 px-1">
          <div className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-center text-sm font-medium flex items-center justify-center gap-1.5">
            <MapPin className="h-4 w-4" />Enviar Mi Ubicación
          </div>
        </div>
      )}
      <p className="text-center text-[10px] text-muted-foreground mt-3">Powered by QR Profiles</p>
    </div>
  );
};
