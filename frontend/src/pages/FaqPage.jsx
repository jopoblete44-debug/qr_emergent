import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, LifeBuoy } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';

const faqs = [
  {
    question: '¿Qué puedo hacer con un perfil QR?',
    answer: 'Podés concentrar datos personales, comerciales o corporativos en una sola experiencia pública y fácil de compartir.',
  },
  {
    question: '¿Necesito ser empresa para usar la plataforma?',
    answer: 'No. La tienda contempla opciones personales y empresariales para distintos niveles de complejidad.',
  },
  {
    question: '¿Puedo administrar mis perfiles después de comprar?',
    answer: 'Sí. Los usuarios no admin acceden a su dashboard para gestionar contenido, métricas y configuraciones disponibles.',
  },
  {
    question: '¿Ofrecen servicios además del producto?',
    answer: 'Sí. Hay una ruta específica de servicios para implementación, acompañamiento y necesidades a medida.',
  },
];

export const FaqPage = () => {
  return (
    <Layout>
      <div className="bg-background">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <HelpCircle className="h-4 w-4" />
                Preguntas frecuentes
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Respuestas rápidas para que avances sin fricción.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Acá resolvemos las dudas más comunes sobre tienda, perfiles y servicios. Si necesitás algo más específico, seguí por contacto.
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {faqs.map(({ question, answer }) => (
                <details
                  key={question}
                  className="rounded-3xl border border-border bg-card p-6 shadow-sm"
                >
                  <summary className="cursor-pointer list-none text-left text-lg font-semibold">
                    <span className="flex items-center justify-between gap-4">
                      {question}
                      <span className="text-sm text-primary">+</span>
                    </span>
                  </summary>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{answer}</p>
                </details>
              ))}
            </div>

            <aside className="rounded-3xl border border-border bg-muted/40 p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LifeBuoy className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">¿Seguís con dudas?</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Elegí el camino que mejor encaje con tu necesidad actual para no perder tiempo.
              </p>
              <div className="mt-6 space-y-3">
                <Button asChild className="w-full">
                  <Link to="/contact">Hablar con el equipo</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/shop">Explorar tienda</Link>
                </Button>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </Layout>
  );
};
