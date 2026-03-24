import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

export const Footer = () => {
  const socialLinks = [
    { label: 'Facebook', href: import.meta.env.VITE_SOCIAL_FACEBOOK_URL, Icon: Facebook },
    { label: 'Twitter/X', href: import.meta.env.VITE_SOCIAL_TWITTER_URL, Icon: Twitter },
    { label: 'Instagram', href: import.meta.env.VITE_SOCIAL_INSTAGRAM_URL, Icon: Instagram },
    { label: 'LinkedIn', href: import.meta.env.VITE_SOCIAL_LINKEDIN_URL, Icon: Linkedin },
  ];

  const companyLinks = [
    { to: '/about', label: 'Sobre Nosotros' },
    { to: '/contact', label: 'Contacto' },
    { to: '/faq', label: 'Preguntas Frecuentes' },
  ];

  const isConfiguredExternalUrl = (value) => (
    typeof value === 'string' && /^https?:\/\//i.test(value.trim())
  );

  return (
    <footer className="bg-muted border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">Q</span>
              </div>
              <span className="font-heading font-bold text-xl">QR Profiles</span>
            </div>
            <p className="text-sm text-muted-foreground">
              La plataforma líder en gestión de perfiles QR para personas y empresas.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Productos</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/shop?category=personal" className="hover:text-primary transition-colors">QR Personal</Link></li>
              <li><Link to="/shop?category=business" className="hover:text-primary transition-colors">QR Empresarial</Link></li>
              <li><Link to="/services" className="hover:text-primary transition-colors">Servicios</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Empresa</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {companyLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Síguenos</h3>
            <div className="flex space-x-4">
              {socialLinks.map(({ label, href, Icon }) => {
                const isConfigured = isConfiguredExternalUrl(href);
                const sharedClassName = 'text-muted-foreground transition-colors';

                if (isConfigured) {
                  return (
                    <a
                      key={label}
                      href={href.trim()}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      className={`${sharedClassName} hover:text-primary`}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                }

                return (
                  <span
                    key={label}
                    aria-label={`${label} no disponible`}
                    title={`${label} no disponible`}
                    className={`${sharedClassName} opacity-50 cursor-not-allowed`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="sr-only">{label} no disponible</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 QR Profiles. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
