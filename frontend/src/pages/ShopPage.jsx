import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight,
  CreditCard,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { ProductCard, ProductMedia } from '../components/ProductCard';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useCart } from '../contexts/CartContext';
import { fetchProductsWithFilters } from '../utils/api';

const CATEGORY_LABELS = {
  personal: 'Personal',
  business: 'Empresa',
};

const ITEM_TYPE_LABELS = {
  subscription_service: 'Suscripción',
  service: 'Servicio',
  product: 'Producto',
};

const QUICK_BENEFITS = [
  {
    icon: ShieldCheck,
    title: 'Checkout claro',
    description: 'Resumen visible y CTA directo para no perder conversiones.',
  },
  {
    icon: PackageCheck,
    title: 'Planes y productos QR',
    description: 'Elegí desde soluciones personales hasta flujos empresariales.',
  },
  {
    icon: CreditCard,
    title: 'Compra con contexto',
    description: 'Cada tarjeta explica valor, cupos y activaciones relevantes.',
  },
];

export const ShopPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { cart, setCart, addToCart, removeFromCart, updateQuantity, itemCount } = useCart();

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const category = searchParams.get('category');
      const itemType = searchParams.get('item_type');
      const data = await fetchProductsWithFilters({
        ...(category ? { category } : {}),
        ...(itemType ? { item_type: itemType } : {}),
      });
      setProducts(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (Array.isArray(location.state?.cart)) {
      setCart(location.state.cart);
      if (location.state.openCart) {
        setShowCart(true);
      }
    }
  }, [location.state, setCart]);

  const handleAddToCart = (product) => {
    addToCart(product);
    toast.success(`${product.name} agregado al carrito`);
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(price);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    navigate('/checkout', { state: { cart } });
  };

  const category = searchParams.get('category');
  const itemType = searchParams.get('item_type');
  const activeFilters = [
    category ? { label: 'Categoría', value: CATEGORY_LABELS[category] || category } : null,
    itemType ? { label: 'Tipo', value: ITEM_TYPE_LABELS[itemType] || itemType } : null,
  ].filter(Boolean);
  const hasFilters = activeFilters.length > 0;

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Cargando soluciones QR...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-cyan-500/10 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant="secondary">Compra mobile-first</Badge>
                <Badge variant="secondary">QR para personas y empresas</Badge>
                <Badge variant="secondary">CTA claros</Badge>
              </div>

              <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl" data-testid="shop-title">
                Tienda QR pensada para decidir rápido y comprar con contexto
              </h1>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground">
                Encontrá productos, servicios y suscripciones con información clara, beneficios visibles y un carrito simple para avanzar sin fricción.
              </p>

              {hasFilters && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {activeFilters.map((filter) => (
                    <Badge key={`${filter.label}-${filter.value}`} variant="outline">
                      {filter.label}: {filter.value}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              {hasFilters && (
                <Button variant="outline" className="h-11" onClick={() => navigate('/shop')}>
                  Limpiar filtros
                </Button>
              )}
              <Button
                onClick={() => setShowCart(!showCart)}
                className="relative h-11"
                data-testid="cart-toggle-btn"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Ver carrito
                {itemCount > 0 && (
                  <Badge className="ml-2" variant="secondary">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {QUICK_BENEFITS.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="border-border/70 bg-background/80 shadow-none">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {products.length === 0 ? (
          <Card className="border-dashed border-border/80">
            <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-heading font-semibold">No encontramos productos para este filtro</h2>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Probá quitando filtros o explorá nuestros servicios para encontrar la solución QR que mejor encaje con tu flujo.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {hasFilters && (
                  <Button onClick={() => navigate('/shop')}>Ver toda la tienda</Button>
                )}
                <Button variant="outline" asChild>
                  <Link to="/services">Ir a servicios</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Mostrando <span className="font-semibold text-foreground">{products.length}</span> opciones para activar tus flujos QR.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </>
        )}

        {itemCount > 0 && !showCart && (
          <div className="fixed inset-x-4 bottom-4 z-40 sm:hidden">
            <Button className="h-12 w-full shadow-xl" onClick={() => setShowCart(true)}>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Abrir carrito ({itemCount}) · {formatPrice(getTotalPrice())}
            </Button>
          </div>
        )}

        {showCart && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px]"
              onClick={() => setShowCart(false)}
              aria-label="Cerrar carrito"
            />
            <div
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[430px] flex-col border-l border-border bg-background shadow-2xl"
              data-testid="cart-sidebar"
            >
              <div className="border-b border-border px-6 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-2xl font-bold">Tu carrito</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {itemCount} {itemCount === 1 ? 'ítem seleccionado' : 'ítems seleccionados'}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowCart(false)} data-testid="cart-close-btn">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold">El carrito está vacío</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sumá productos o planes para continuar con el checkout.
                  </p>
                  <Button className="mt-6" onClick={() => setShowCart(false)}>
                    Seguir explorando
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    {cart.map((item) => (
                      <Card key={item.id} className="overflow-hidden" data-testid={`cart-item-${item.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="h-16 w-16 overflow-hidden rounded-2xl border border-border/60 bg-muted/30">
                              <ProductMedia product={item} variant="thumb" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="text-sm font-semibold leading-tight">{item.name}</h3>
                                  <p className="mt-1 text-sm text-muted-foreground">{formatPrice(item.price)}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeFromCart(item.id)}
                                  data-testid={`remove-item-${item.id}`}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="mt-4 flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  data-testid={`decrease-qty-${item.id}`}
                                  className="h-8 w-8 p-0"
                                >
                                  -
                                </Button>
                                <span className="min-w-8 text-center text-sm" data-testid={`qty-${item.id}`}>
                                  {item.quantity}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  data-testid={`increase-qty-${item.id}`}
                                  className="h-8 w-8 p-0"
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="border-t border-border bg-background px-6 py-5">
                    <div className="mb-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                      <p className="text-sm font-medium">Resumen listo para checkout</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Revisá cantidades, confirmá el total y seguí al pago desde un flujo simple y directo.
                      </p>
                    </div>
                    <div className="mb-4 flex items-center justify-between text-lg font-bold">
                      <span>Total</span>
                      <span data-testid="cart-total">{formatPrice(getTotalPrice())}</span>
                    </div>
                    <Button className="h-11 w-full" onClick={handleCheckout} data-testid="checkout-btn">
                      Proceder al pago
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};
