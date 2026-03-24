import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Mail, MapPin, MessageSquareText, PhoneCall } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';

const contactChannels = [
  {
    icon: Mail,
    title: 'Email comercial',
    detail: 'hola@qrprofiles.com',
    description: 'Ideal para cotizaciones, alianzas y consultas de implementación.',
  },
  {
    icon: PhoneCall,
    title: 'Atención directa',
    detail: '+56 9 5555 5555',
    description: 'Para coordinar demos, seguimiento y soporte prioritario.',
  },
  {
    icon: MapPin,
    title: 'Cobertura',
    detail: 'LatAm & equipos remotos',
    description: 'Trabajamos de forma flexible con clientes de distintos mercados.',
  },
];

export const ContactPage = () => {
  return (
    <Layout>
      <div className="bg-background">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <MessageSquareText className="h-4 w-4" />
                Contacto
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Hablemos de la experiencia QR que necesitás construir.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Si querés lanzar una tienda, resolver una operación comercial o personalizar tu flujo, este es el punto de entrada correcto.
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {contactChannels.map(({ icon: Icon, title, detail, description }) => (
                <article key={title} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-semibold">{title}</h2>
                  <p className="mt-2 text-sm font-medium">{detail}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
                </article>
              ))}
            </div>

            <aside className="rounded-3xl border border-border bg-muted/40 p-6 shadow-sm">
              <div className="flex items-center gap-3 text-primary">
                <Clock3 className="h-5 w-5" />
                <span className="text-sm font-semibold">Tiempo estimado de respuesta</span>
              </div>
              <p className="mt-3 text-3xl font-bold">24 horas hábiles</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Centralizamos los pedidos para responder más rápido y con contexto. Si tu necesidad es inmediata, te conviene revisar servicios mientras tanto.
              </p>
              <div className="mt-6 space-y-3">
                <Button asChild className="w-full">
                  <Link to="/services">
                    Ver servicios
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/faq">Resolver dudas frecuentes</Link>
                </Button>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </Layout>
  );
};
