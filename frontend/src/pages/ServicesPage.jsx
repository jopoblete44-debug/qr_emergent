import React from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Heart, QrCode, Car, Building2, Wifi, UtensilsCrossed, Hotel, CheckSquare, FileText, Users, MapIcon, MessageSquare, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

export const ServicesPage = () => {
  const personalServices = [
    {
      icon: <Heart className="h-8 w-8" />,
      title: 'QR Médico',
      description: 'Información médica de emergencia al alcance de un escaneo. Incluye tipo de sangre, alergias, medicamentos y contacto de emergencia.',
      features: ['Alerta visual de emergencia', 'Contacto automático', 'Historial médico', 'Ubicación en tiempo real'],
      color: 'text-red-500',
    },
    {
      icon: <QrCode className="h-8 w-8" />,
      title: 'QR Mascota',
      description: 'Aumenta las posibilidades de recuperar a tu mascota perdida. Información del dueño, foto y recompensa.',
      features: ['Foto de la mascota', 'Datos del dueño', 'Notificación instantánea', 'Sistema de recompensas'],
      color: 'text-emerald-500',
    },
    {
      icon: <Car className="h-8 w-8" />,
      title: 'QR Vehículo',
      description: 'Guarda documentos y datos del vehículo de forma segura. Perfecto para emergencias o verificaciones.',
      features: ['Documentos digitales', 'Datos del seguro', 'Contacto del propietario', 'Historial de mantenimiento'],
      color: 'text-blue-500',
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'QR Niños y Adultos Mayores',
      description: 'Perfil especial para personas con dificultades de comunicación. Alzheimer, autismo, etc.',
      features: ['Contactos de emergencia', 'Información médica', 'Dirección de casa', 'Alertas automáticas'],
      color: 'text-purple-500',
    },
  ];

  const businessServices = [
    {
      icon: <UtensilsCrossed className="h-8 w-8" />,
      title: 'QR Restaurante',
      description: 'Menús digitales modernos y fáciles de actualizar. Reduce costos de impresión y mejora la experiencia del cliente.',
      features: ['Menú digital', 'Actualización instantánea', 'Multi-idioma', 'Descarga PDF'],
      color: 'text-amber-500',
    },
    {
      icon: <Hotel className="h-8 w-8" />,
      title: 'QR Hotel',
      description: 'Información completa para huéspedes. Servicios, horarios, WiFi, mapa del hotel y más.',
      features: ['Info del hotel', 'Servicios disponibles', 'Mapa interactivo', 'Check-in digital'],
      color: 'text-purple-500',
    },
    {
      icon: <Wifi className="h-8 w-8" />,
      title: 'QR WiFi',
      description: 'Acceso instantáneo a tu red WiFi. Los clientes se conectan escaneando el código.',
      features: ['Conexión automática', 'Sin contraseñas', 'Fácil de compartir', 'Seguro'],
      color: 'text-indigo-500',
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: 'QR Tarjeta de Presentación',
      description: 'Tarjeta de presentación digital moderna. Comparte tu información de contacto instantáneamente.',
      features: ['Datos de contacto', 'Redes sociales', 'Portafolio', 'Guardar en contactos'],
      color: 'text-blue-600',
    },
    {
      icon: <Building2 className="h-8 w-8" />,
      title: 'QR Catálogo de Productos',
      description: 'Catálogo digital de productos o servicios. Actualizable en tiempo real.',
      features: ['Catálogo digital', 'Precios actualizables', 'Imágenes HD', 'Enlaces de compra'],
      color: 'text-green-600',
    },
    {
      icon: <MapIcon className="h-8 w-8" />,
      title: 'QR Información Turística',
      description: 'Información completa para turistas. Historia, mapas, guías y recomendaciones.',
      features: ['Guías turísticas', 'Mapas interactivos', 'Multi-idioma', 'Rutas sugeridas'],
      color: 'text-orange-500',
    },
    {
      icon: <CheckSquare className="h-8 w-8" />,
      title: 'QR Check-in Digital',
      description: 'Sistema de check-in sin contacto. Perfecto para hoteles, eventos y más.',
      features: ['Check-in rápido', 'Sin papeles', 'Confirmación instantánea', 'Historial'],
      color: 'text-cyan-500',
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: 'QR Encuestas y Feedback',
      description: 'Recopila feedback de tus clientes de forma rápida y sencilla.',
      features: ['Encuestas personalizadas', 'Análisis de datos', 'Respuestas en tiempo real', 'Reportes'],
      color: 'text-pink-500',
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'QR Links de Redes Sociales',
      description: 'Centraliza todos tus enlaces de redes sociales en un solo QR.',
      features: ['Múltiples enlaces', 'Diseño personalizado', 'Estadísticas de clicks', 'Fácil actualización'],
      color: 'text-violet-500',
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: 'QR Información de Eventos',
      description: 'Comparte detalles de tu evento de forma instantánea. Horarios, ubicación y más.',
      features: ['Detalles del evento', 'Calendario', 'Mapa de ubicación', 'Notificaciones'],
      color: 'text-teal-500',
    },
  ];

  return (
    <Layout>
      <div className="py-20">
        {/* Hero Section */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl mb-6">
            Nuestros Servicios
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            Ofrecemos soluciones QR completas para personas y empresas. Desde emergencias médicas hasta menús digitales y más.
          </p>
          <Button size="lg" asChild>
            <Link to="/shop">Ver Productos</Link>
          </Button>
        </div>

        {/* Servicios Personales */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="mb-12">
            <h2 className="font-heading font-bold text-3xl mb-3">Servicios Personales</h2>
            <p className="text-muted-foreground">Soluciones QR para proteger lo que más te importa</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {personalServices.map((service, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className={`${service.color} mb-3`}>
                    {service.icon}
                  </div>
                  <CardTitle className="font-heading text-2xl">{service.title}</CardTitle>
                  <CardDescription className="text-base">{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm">
                        <CheckSquare className="h-4 w-4 mr-2 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Servicios Empresariales */}
        <div className="bg-muted/50 py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12">
              <h2 className="font-heading font-bold text-3xl mb-3">Servicios Empresariales</h2>
              <p className="text-muted-foreground">Soluciones QR profesionales para hacer crecer tu negocio</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businessServices.map((service, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={`${service.color} mb-3`}>
                      {service.icon}
                    </div>
                    <CardTitle className="font-heading text-xl">{service.title}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm">
                          <CheckSquare className="h-3 w-3 mr-2 text-primary flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl mb-6">
            ¿Listo para comenzar?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Crea tu cuenta y obtén tu primer perfil QR hoy mismo. Todos nuestros servicios incluyen gestión centralizada, notificaciones y estadísticas.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/register">Registrarse Gratis</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/shop">Ver Precios</Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};
