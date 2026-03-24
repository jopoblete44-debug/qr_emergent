import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, QrCode, ShieldCheck, Sparkles } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';

const pillars = [
  {
    icon: QrCode,
    title: 'Experiencias QR listas para usar',
    description: 'Creamos perfiles y flujos simples para que una persona o una empresa publique su identidad digital sin fricción.',
  },
  {
    icon: ShieldCheck,
    title: 'Operación confiable',
    description: 'Priorizamos claridad, control y administración centralizada para que vender, editar y medir no sea una locura cósmica.',
  },
  {
    icon: Sparkles,
    title: 'Diseño pensado mobile-first',
    description: 'La experiencia arranca en el teléfono porque ahí vive la interacción real con el QR, el catálogo y el contacto.',
  },
];

export const AboutPage = () => {
  return (
    <Layout>
      <div className="bg-background">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Building2 className="h-4 w-4" />
                Sobre QR Profiles
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Convertimos un QR en una puerta de entrada clara, medible y profesional.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Ayudamos a personas, equipos comerciales y marcas a presentar su información clave con una experiencia prolija, rápida y fácil de compartir.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to="/shop">
                    Ver la tienda
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/services">Explorar servicios</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-muted/40">
          <div className="container mx-auto grid gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Nuestra forma de trabajar</h2>
              <p className="mt-4 text-muted-foreground">
                Diseñamos experiencias que ordenan lo importante: vender mejor, compartir datos útiles y acompañar al usuario desde el primer toque hasta la acción final.
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-background p-6 shadow-sm">
              <h3 className="text-lg font-semibold">¿Querés hablar con el equipo?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Si necesitás una implementación a medida o una propuesta comercial, tenemos una ruta directa para eso.
              </p>
              <Button asChild className="mt-6 w-full">
                <Link to="/contact">Ir a contacto</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};
