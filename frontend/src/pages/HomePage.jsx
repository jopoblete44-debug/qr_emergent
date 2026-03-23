import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Layout } from '../components/Layout';
import {
  ArrowRight,
  Building2,
  Car,
  CheckCircle2,
  Clock3,
  HeartPulse,
  Hotel,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Store,
  UtensilsCrossed,
  Users,
  Wifi,
} from 'lucide-react';

const audiencePills = ['Personas', 'Empresas', 'Mobile-first', 'Sin fricción'];

const trustPoints = [
  {
    icon: ShieldCheck,
    title: 'Perfiles listos para emergencias y ventas',
    description: 'Unificá información clave para actuar rápido cuando alguien escanea.',
  },
  {
    icon: Smartphone,
    title: 'Experiencia pensada para celular',
    description: 'Cada flujo prioriza lectura, CTA y respuesta inmediata desde el móvil.',
  },
  {
    icon: Clock3,
    title: 'Actualización simple',
    description: 'Cambiás contenido una vez y tu QR sigue apuntando a la última versión.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Elegí el caso de uso',
    description: 'Seleccioná una solución personal o empresarial según tu necesidad.',
  },
  {
    number: '02',
    title: 'Cargá datos e imágenes desde tu dispositivo',
    description: 'Completá la información importante y mantené una experiencia upload-only.',
  },
  {
    number: '03',
    title: 'Publicá y compartí tu QR',
    description: 'Usalo en credenciales, vehículos, locales, mesas, vitrinas o campañas.',
  },
];

const useCases = [
  {
    icon: HeartPulse,
    title: 'QR Médico',
    description: 'Datos críticos, contactos y respuestas rápidas para contextos de emergencia.',
    badge: 'Personal',
    accent: 'from-rose-500/15 via-rose-500/10 to-transparent',
    iconColor: 'text-rose-500',
  },
  {
    icon: QrCode,
    title: 'QR Mascota',
    description: 'Facilitá el regreso a casa con información clara y contacto inmediato.',
    badge: 'Personal',
    accent: 'from-emerald-500/15 via-emerald-500/10 to-transparent',
    iconColor: 'text-emerald-500',
  },
  {
    icon: Car,
    title: 'QR Vehículo',
    description: 'Mostrá datos relevantes del auto y acelerá la comunicación ante incidentes.',
    badge: 'Personal',
    accent: 'from-sky-500/15 via-sky-500/10 to-transparent',
    iconColor: 'text-sky-500',
  },
  {
    icon: UtensilsCrossed,
    title: 'QR Restaurante',
    description: 'Menús, reservas y contacto directo en una vista clara para cada mesa.',
    badge: 'Empresa',
    accent: 'from-amber-500/15 via-amber-500/10 to-transparent',
    iconColor: 'text-amber-500',
  },
  {
    icon: Hotel,
    title: 'QR Hotel',
    description: 'Bienvenida, WiFi, check-in y servicios útiles desde un solo escaneo.',
    badge: 'Empresa',
    accent: 'from-violet-500/15 via-violet-500/10 to-transparent',
    iconColor: 'text-violet-500',
  },
  {
    icon: Wifi,
    title: 'QR WiFi',
    description: 'Reducí fricción para clientes, visitas o huéspedes con acceso inmediato.',
    badge: 'Empresa',
    accent: 'from-indigo-500/15 via-indigo-500/10 to-transparent',
    iconColor: 'text-indigo-500',
  },
];

const valueProps = [
  {
    icon: Users,
    title: 'Para usuarios y empresas',
    description: 'La misma plataforma resuelve identificación, atención, ventas y operación.',
  },
  {
    icon: Building2,
    title: 'Gestión centralizada',
    description: 'Administrá perfiles, productos y flujos desde un único dashboard.',
  },
  {
    icon: Store,
    title: 'CTA con intención',
    description: 'Cada pantalla prioriza la acción correcta: comprar, registrar o escanear.',
  },
  {
    icon: ScanLine,
    title: 'Escaneos con propósito',
    description: 'Convertí un QR en información útil, contacto directo y seguimiento real.',
  },
];

export const HomePage = () => {
  return (
    <Layout>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.28),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.18),_transparent_30%)]" />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <div className="flex flex-wrap gap-2 mb-5">
                {audiencePills.map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur"
                  >
                    {pill}
                  </span>
                ))}
              </div>

              <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Un QR que no solo se escanea.
                <span className="block bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
                  Se entiende y activa la acción correcta.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base text-slate-200 sm:text-lg">
                QR Profiles te ayuda a resolver emergencias, atención al cliente, ventas y operaciones
                con perfiles QR claros, editables y pensados para uso real en móvil.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild data-testid="hero-shop-btn" className="h-12 px-6 text-base">
                  <Link to="/shop">
                    Ver productos y planes
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  data-testid="hero-services-btn"
                  className="h-12 border-white/20 bg-white/5 px-6 text-base text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/services">Explorar soluciones</Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {trustPoints.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                        <Icon className="h-5 w-5 text-cyan-300" />
                      </div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative mx-auto w-full max-w-lg"
            >
              <div className="rounded-[2rem] border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur-xl">
                <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/70 p-5">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="rounded-full bg-white/10 px-3 py-1">Vista mobile-first</span>
                    <span>Panel QR</span>
                  </div>

                  <div className="mt-5 rounded-3xl bg-gradient-to-br from-cyan-400/20 via-white/10 to-violet-400/20 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-200">Escaneá y resolvé</p>
                        <h2 className="mt-1 text-2xl font-semibold">Experiencia clara para cada caso</h2>
                      </div>
                      <div className="rounded-2xl bg-white/10 p-3">
                        <QrCode className="h-8 w-8 text-cyan-300" />
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {[
                        'Emergencias con datos críticos visibles',
                        'Menús, check-in y contacto en un mismo flujo',
                        'Perfiles listos para editar sin rehacer el QR',
                      ].map((line) => (
                        <div key={line} className="flex items-center gap-3 rounded-2xl bg-slate-950/45 px-4 py-3">
                          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                          <span className="text-sm text-slate-100">{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Usuarios</p>
                      <p className="mt-2 text-lg font-semibold">Seguridad y contacto rápido</p>
                      <p className="mt-1 text-sm text-slate-300">Médico, mascota, vehículo y más.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Empresas</p>
                      <p className="mt-2 text-lg font-semibold">Operación y conversión</p>
                      <p className="mt-1 text-sm text-slate-300">Restaurantes, hoteles, WiFi, eventos y catálogos.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-background py-14 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Cómo funciona</span>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Tres pasos para pasar del QR lindo al QR útil
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              La diferencia está en la claridad del flujo: elegir, cargar, publicar y responder.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-border/70 shadow-sm">
                  <CardHeader>
                    <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                      {step.number}
                    </div>
                    <CardTitle className="font-heading text-xl">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">{step.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-14 sm:py-16" data-testid="use-cases-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Casos listos para activar</span>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Soluciones QR que se adaptan al contexto, no al revés
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Cada plantilla prioriza la información necesaria para ayudar, vender o acelerar una gestión.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full md:w-auto">
              <Link to="/shop">Ir a la tienda</Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <motion.div
                  key={useCase.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full overflow-hidden border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                    <CardHeader>
                      <div className={`mb-4 rounded-3xl bg-gradient-to-br ${useCase.accent} p-5`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className={`rounded-2xl bg-background/85 p-3 ${useCase.iconColor}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <span className="rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                            {useCase.badge}
                          </span>
                        </div>
                        <p className="mt-6 text-sm font-medium text-muted-foreground">Escaneo con intención</p>
                        <p className="mt-1 text-lg font-semibold">{useCase.title}</p>
                      </div>
                      <CardTitle className="font-heading text-xl">{useCase.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">{useCase.description}</CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-background py-14 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Por qué funciona</span>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Menos ruido visual. Más claridad, confianza y acción.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {valueProps.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full border-border/70 shadow-sm">
                    <CardHeader>
                      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="font-heading text-xl">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">{item.description}</CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-primary py-14 text-primary-foreground sm:py-16">
        <div className="container mx-auto px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary-foreground/90">
            CTA principal
          </span>
          <h2 className="mt-5 font-heading text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Empezá con una experiencia QR que sí guía al usuario
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-primary-foreground/90 sm:text-lg">
            Creá tu cuenta, elegí tu flujo y activá perfiles QR claros para personas, equipos y negocios.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" asChild data-testid="cta-register-btn" className="h-12 px-6 text-base">
              <Link to="/register">Registrarse gratis</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 border-white/30 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white">
              <Link to="/shop">Ver tienda</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};
