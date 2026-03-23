import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

export const Footer = () => {
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
              <li><Link to="/about" className="hover:text-primary transition-colors">Sobre Nosotros</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contacto</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">Preguntas Frecuentes</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Síguenos</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
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
