import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Building2, HeartPulse, QrCode, ShoppingCart, Sparkles } from 'lucide-react';
import { resolveMediaUrl } from '../utils/api';

const PRODUCT_VISUALS = {
  personal: {
    icon: HeartPulse,
    label: 'Uso personal',
    helper: 'Ideal para identificación, emergencias y contacto rápido.',
    gradient: 'from-rose-500/20 via-orange-500/10 to-background',
    iconClassName: 'text-rose-500',
  },
  business: {
    icon: Building2,
    label: 'Uso empresarial',
    helper: 'Pensado para atención, operación y conversión desde un QR.',
    gradient: 'from-indigo-500/20 via-cyan-500/10 to-background',
    iconClassName: 'text-indigo-500',
  },
  default: {
    icon: QrCode,
    label: 'Solución QR',
    helper: 'Listo para integrarse con tus flujos actuales.',
    gradient: 'from-slate-500/20 via-slate-500/10 to-background',
    iconClassName: 'text-slate-700 dark:text-slate-200',
  },
};

const getProductVisualMeta = (product = {}) => {
  if (product.category === 'personal') return PRODUCT_VISUALS.personal;
  if (product.category === 'business') return PRODUCT_VISUALS.business;
  return PRODUCT_VISUALS.default;
};

export const ProductMedia = ({ product, variant = 'card' }) => {
  const isThumb = variant === 'thumb';
  const productImageUrl = resolveMediaUrl(product?.image_url);

  if (productImageUrl) {
    return (
      <img
        src={productImageUrl}
        alt={product.name}
        className={isThumb ? 'h-full w-full object-cover' : 'h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'}
      />
    );
  }

  const meta = getProductVisualMeta(product);
  const Icon = meta.icon;

  return (
    <div className={`flex h-full w-full flex-col justify-between bg-gradient-to-br ${meta.gradient} ${isThumb ? 'p-3' : 'p-5'}`}>
      <div className={`inline-flex ${isThumb ? 'h-10 w-10' : 'h-12 w-12'} items-center justify-center rounded-2xl bg-background/90 shadow-sm ${meta.iconClassName}`}>
        <Icon className={isThumb ? 'h-5 w-5' : 'h-6 w-6'} />
      </div>
      <div className="space-y-1">
        <p className={`${isThumb ? 'text-xs' : 'text-sm'} font-semibold text-foreground`}>{meta.label}</p>
        {!isThumb && <p className="text-xs text-muted-foreground">{meta.helper}</p>}
      </div>
    </div>
  );
};

export const ProductCard = ({ product, onAddToCart }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(price);
  };

  const meta = getProductVisualMeta(product);
  const hasStock = Number.isFinite(Number(product?.stock));
  const availabilityLabel = hasStock && Number(product.stock) > 0
    ? `${Number(product.stock)} disponibles`
    : 'Disponibilidad a confirmar';

  return (
    <Card
      className="group flex h-full flex-col overflow-hidden border-border/70 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl"
      data-testid={`product-card-${product.id}`}
    >
      <CardHeader className="p-0">
        <div className="aspect-[4/3] overflow-hidden border-b border-border/60 bg-muted/30">
          <ProductMedia product={product} variant="card" />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {meta.label}
            </p>
            <CardTitle className="font-heading text-xl leading-tight">{product.name}</CardTitle>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {product.category || 'QR'}
          </Badge>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {product.item_type === 'subscription_service' && (
            <Badge variant="outline">
              Suscripción {product.subscription_period === 'yearly' ? 'anual' : 'mensual'}
            </Badge>
          )}
          {product.auto_generate_qr && (
            <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
              Activación QR automática
            </Badge>
          )}
        </div>

        {product.item_type === 'subscription_service' && (
          <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Cupos QR incluidos: {Number(product.qr_quota_granted || 0)}
            </p>
          </div>
        )}

        <CardDescription className="mb-5 text-sm leading-relaxed text-muted-foreground">
          {product.description || 'Una solución QR preparada para ayudarte a lanzar más rápido.'}
        </CardDescription>

        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-2xl font-bold font-heading text-primary">{formatPrice(product.price)}</span>
              <span className="text-xs text-muted-foreground">{availabilityLabel}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>{meta.helper}</span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <Button
          className="w-full h-11"
          onClick={() => onAddToCart(product)}
          data-testid={`add-to-cart-btn-${product.id}`}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Agregar al carrito
        </Button>
      </CardFooter>
    </Card>
  );
};
