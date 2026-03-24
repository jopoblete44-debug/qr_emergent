import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Building2,
  Calendar,
  Car,
  CheckSquare,
  FileText,
  Heart,
  Hotel,
  MapIcon,
  MessageSquare,
  QrCode,
  Sparkles,
  Users,
  UtensilsCrossed,
  Wifi,
} from 'lucide-react';

const AUDIENCE_CARDS = [
  {
    key: 'person',
    title: 'Soluciones para personas',
    description: 'Perfiles QR orientados a emergencias, familia, mascotas y datos que tienen que aparecer rápido cuando alguien escanea.',
    bullets: ['Acciones rápidas: llamar, WhatsApp, ubicación', 'Experiencia clara desde mobile', 'Pensado para asistencia y seguridad'],
    cta: '/shop?category=personal',
    badge: 'Persona',
    icon: Heart,
  },
  {
    key: 'business',
    title: 'Soluciones para empresas',
    description: 'Experiencias QR pensadas para vender, atender, informar y capturar leads con menos fricción.',
    bullets: ['Botones flotantes para reservar, escribir o comprar', 'Opciones por servicio, sucursal o catálogo', 'Enfoque comercial y operativo'],
    cta: '/shop?category=business',
    badge: 'Empresa',
    icon: Building2,
  },
];

const PERSONAL_SERVICES = [
  { icon: Heart, title: 'QR Médico', description: 'Datos médicos y contacto prioritario al alcance de un escaneo.', features: ['Alergias', 'Medicamentos', 'Contacto responsable', 'Lectura rápida'] },
  { icon: QrCode, title: 'QR Mascota', description: 'Más chances de recuperar a tu mascota con información clara y contacto directo.', features: ['Foto', 'Datos del dueño', 'Aviso rápido', 'Flujo simple'] },
  { icon: Car, title: 'QR Vehículo', description: 'Seguro, contacto y datos importantes en un solo acceso rápido.', features: ['Documentos', 'Seguro', 'Propietario', 'Orden'] },
  { icon: Users, title: 'QR Niños y Adultos Mayores', description: 'Una capa extra de seguridad para personas con dificultades de comunicación o autonomía.', features: ['Contactos', 'Datos clínicos', 'Dirección', 'Respuesta rápida'] },
];

const BUSINESS_SERVICES = [
  { icon: UtensilsCrossed, title: 'QR Restaurante', description: 'Menús, promos y acciones directas desde la mesa.', features: ['Menú digital', 'Cambios instantáneos', 'WhatsApp', 'Reserva o pedido'] },
  { icon: Hotel, title: 'QR Hotel', description: 'Servicios, horarios, WiFi y mapas en una sola experiencia clara.', features: ['Info centralizada', 'WiFi', 'Mapa', 'Atención ordenada'] },
  { icon: Wifi, title: 'QR WiFi', description: 'Conexión inmediata y sin fricción para clientes o huéspedes.', features: ['Acceso simple', 'Menos soporte', 'Compartible', 'Rápido'] },
  { icon: FileText, title: 'QR Tarjeta de Presentación', description: 'Presentación profesional con acciones flotantes para llamar, escribir o visitar tu web.', features: ['Contacto directo', 'Redes', 'Portafolio', 'Networking'] },
  { icon: Building2, title: 'QR Catálogo', description: 'Mostrá productos o servicios con una estructura lista para convertir desde móvil.', features: ['Catálogo vivo', 'Fotos y precios', 'CTA a compra', 'Escalable'] },
  { icon: MapIcon, title: 'QR Turismo', description: 'Mapas, rutas y recomendaciones en una experiencia más amigable.', features: ['Mapas', 'Guías', 'Rutas', 'Acceso rápido'] },
  { icon: Calendar, title: 'QR Eventos', description: 'Horarios, ubicación y llamados a la acción para asistentes y equipos.', features: ['Agenda', 'Ubicación', 'Registro', 'Actualización inmediata'] },
  { icon: MessageSquare, title: 'QR Feedback', description: 'Capturá opinión del cliente justo cuando el contexto está fresco.', features: ['Encuestas', 'Aprendizaje rápido', 'Menos abandono', 'Mejor señal'] },
];

const FLOATING_ACTIONS = [
  { title: 'Persona', description: 'Acciones orientadas a asistencia.', actions: ['Llamar emergencia', 'WhatsApp', 'Ver ubicación', 'Abrir ficha'] },
  { title: 'Empresa', description: 'Acciones orientadas a conversión.', actions: ['Reservar', 'Cotizar', 'WhatsApp', 'Ir a catálogo o mapa'] },
];

export const ServicesPage = () => {
  return (
    <Layout>
      <div className="py-10 sm:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <section className="rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-cyan-500/10 p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">Mobile-first</Badge>
                  <Badge variant="secondary">Persona + empresa</Badge>
                  <Badge variant="secondary">Botones flotantes con contexto</Badge>
                </div>
                <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight">Servicios QR pensados para que la gente actúe, no se pierda</h1>
                <p className="mt-4 max-w-3xl text-base sm:text-lg text-muted-foreground">Desde emergencias personales hasta catálogos, reservas y atención comercial: organizamos cada experiencia para que el escaneo termine en una acción útil.</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" asChild><Link to="/shop">Ver tienda</Link></Button>
                  <Button size="lg" variant="outline" asChild><Link to="/register">Crear cuenta</Link></Button>
                </div>
              </div>

              <Card className="border-primary/20 bg-background/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5 text-primary" />Qué mejora esta página pública</CardTitle>
                  <CardDescription>Más claridad, más intención comercial y una narrativa alineada con los nuevos botones flotantes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-2xl border p-3"><p className="font-medium text-foreground">Para personas</p><p className="mt-1">Asistencia, seguridad y lectura rápida en momentos sensibles.</p></div>
                  <div className="rounded-2xl border p-3"><p className="font-medium text-foreground">Para empresas</p><p className="mt-1">Catálogo, reservas, contacto, mapa y flujos listos para convertir.</p></div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Elegí tu camino</p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold">Opciones claras según quién sos</h2>
              <p className="text-muted-foreground max-w-2xl">No mezclemos audiencias. Acá separás persona y empresa desde el inicio para que el mensaje no pierda fuerza.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {AUDIENCE_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.key} className="h-full rounded-3xl border-border/70">
                    <CardHeader className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-6 w-6" /></div>
                        <Badge variant="outline">{card.badge}</Badge>
                      </div>
                      <CardTitle className="text-2xl">{card.title}</CardTitle>
                      <CardDescription className="text-base">{card.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {card.bullets.map((bullet) => <li key={bullet} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckSquare className="h-4 w-4 text-primary mt-0.5" /><span>{bullet}</span></li>)}
                      </ul>
                      <Button asChild className="w-full sm:w-auto"><Link to={card.cta}>Ver opciones {card.badge.toLowerCase()}</Link></Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Soluciones para personas</p>
              <h2 className="font-heading text-3xl font-bold">Seguridad, asistencia y contexto útil</h2>
              <p className="text-muted-foreground max-w-2xl">Diseñadas para que, cuando alguien escanea, entienda rápido qué hacer y cómo ayudarte.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {PERSONAL_SERVICES.map((service) => {
                const Icon = service.icon;
                return (
                  <Card key={service.title} className="rounded-3xl border-border/70">
                    <CardHeader>
                      <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-6 w-6" /></div>
                      <CardTitle className="text-2xl">{service.title}</CardTitle>
                      <CardDescription className="text-base">{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {service.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckSquare className="h-4 w-4 text-primary mt-0.5" /><span>{feature}</span></li>)}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl bg-muted/40 p-6 sm:p-8 space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Botones flotantes con intención</p>
              <h2 className="font-heading text-3xl font-bold">La página pública tiene que invitar a actuar</h2>
              <p className="text-muted-foreground max-w-2xl">Estos recorridos están alineados con las nuevas acciones flotantes para que cada perfil tenga llamados relevantes, no ruido.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {FLOATING_ACTIONS.map((group) => (
                <Card key={group.title} className="rounded-3xl border-border/70 bg-background/90">
                  <CardHeader><CardTitle>{group.title}</CardTitle><CardDescription>{group.description}</CardDescription></CardHeader>
                  <CardContent className="flex flex-wrap gap-2">{group.actions.map((action) => <Badge key={action} variant="outline">{action}</Badge>)}</CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Soluciones para empresas</p>
              <h2 className="font-heading text-3xl font-bold">Conversión, atención y operación en un solo flujo</h2>
              <p className="text-muted-foreground max-w-2xl">Acá el QR no es decoración. Tiene que llevar a reservar, comprar, escribir, ubicarse o entender el servicio.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {BUSINESS_SERVICES.map((service) => {
                const Icon = service.icon;
                return (
                  <Card key={service.title} className="rounded-3xl border-border/70">
                    <CardHeader>
                      <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                      <CardTitle className="text-xl">{service.title}</CardTitle>
                      <CardDescription>{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {service.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckSquare className="h-4 w-4 text-primary mt-0.5" /><span>{feature}</span></li>)}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-primary/20 bg-primary/5 p-6 text-center sm:p-8">
            <h2 className="font-heading font-bold text-3xl sm:text-4xl">¿Listo para elegir la experiencia correcta?</h2>
            <p className="mt-3 max-w-2xl mx-auto text-muted-foreground">Arrancá con una cuenta persona o empresa, elegí el tipo de solución y después escalá con productos, suscripciones y perfiles QR.</p>
            <div className="mt-6 flex flex-col gap-3 justify-center sm:flex-row">
              <Button size="lg" asChild><Link to="/register">Crear cuenta</Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/shop">Ver precios y opciones</Link></Button>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};
