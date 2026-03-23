import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { createCheckoutPreference, fetchCheckoutQuote, fetchShippingRegions } from '../utils/api';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { ArrowLeft, CreditCard, MapPin, Minus, Package, Plus, Ticket, Trash2 } from 'lucide-react';

export const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, setCart, removeFromCart, updateQuantity, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [quote, setQuote] = useState(null);
  const [shippingOptions, setShippingOptions] = useState({ default_shipping_cost: 0, regions: [] });
  const [shippingRegionId, setShippingRegionId] = useState('');
  const [shippingCommuneId, setShippingCommuneId] = useState('');
  const renewalBucketIdFromState = typeof location.state?.renewal_bucket_id === 'string'
    ? location.state.renewal_bucket_id
    : null;
  const renewalBucketIdFromQuery = new URLSearchParams(location.search).get('renewal_bucket_id');
  const renewalBucketId = renewalBucketIdFromState || renewalBucketIdFromQuery || null;

  useEffect(() => {
    if (Array.isArray(location.state?.cart) && location.state.cart.length > 0) {
      setCart(location.state.cart);
    }
  }, [location.state, setCart]);

  useEffect(() => {
    if (cart.length === 0) {
      navigate('/shop', { replace: true });
    }
  }, [cart, navigate]);

  useEffect(() => {
    const loadShipping = async () => {
      try {
        const data = await fetchShippingRegions();
        const regions = Array.isArray(data?.regions) ? data.regions : [];
        setShippingOptions({
          default_shipping_cost: Number(data?.default_shipping_cost || 0),
          regions,
        });
        if (regions.length > 0) {
          const firstRegion = regions[0];
          setShippingRegionId(firstRegion.id || firstRegion.name || '');
          const firstCommune = Array.isArray(firstRegion.communes) ? firstRegion.communes[0] : null;
          setShippingCommuneId(firstCommune?.id || firstCommune?.name || '');
        }
      } catch (error) {
        toast.error('No se pudo cargar el catálogo de envíos');
      }
    };
    loadShipping();
  }, []);

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const selectedRegion = shippingOptions.regions.find(
    (region) => (region.id || region.name) === shippingRegionId
  ) || null;
  const availableCommunes = Array.isArray(selectedRegion?.communes) ? selectedRegion.communes : [];
  const selectedCommune = availableCommunes.find(
    (commune) => (commune.id || commune.name) === shippingCommuneId
  ) || null;
  const hasSubscriptionItems = cart.some((item) => item.item_type === 'subscription_service');

  const getOrderPayload = () => ({
    items: cart.map(item => ({
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
    })),
    total: getTotalPrice(),
    coupon_code: couponCode || null,
    shipping_cost: null,
    shipping_region: selectedRegion?.name || null,
    shipping_commune: selectedCommune?.name || null,
    renewal_bucket_id: renewalBucketId && hasSubscriptionItems ? renewalBucketId : null,
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(price);
  };

  const refreshQuote = async ({ notifyCoupon = false } = {}) => {
    setQuoteLoading(true);
    try {
      const response = await fetchCheckoutQuote(getOrderPayload());
      setQuote(response);
      if (notifyCoupon && response?.coupon_applied) {
        toast.success(`Cupón ${couponCode.toUpperCase()} aplicado`);
      } else if (notifyCoupon && couponCode.trim() && !response?.coupon_applied) {
        toast.error('Cupón no válido para esta compra');
      }
    } catch (error) {
      setQuote(null);
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string' && detail.toLowerCase().includes('authorization')) {
        toast.error('Debes iniciar sesión para continuar');
        navigate('/login');
      } else {
        toast.error(detail || 'No se pudo cotizar el pedido');
      }
    } finally {
      setQuoteLoading(false);
    }
  };

  useEffect(() => {
    if (cart.length === 0) return;
    refreshQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, shippingRegionId, shippingCommuneId]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Ingresa un cupón');
      return;
    }
    await refreshQuote({ notifyCoupon: true });
  };

  const handleRemoveFromCart = (productId) => {
    removeFromCart(productId);
    setQuote(null);
  };

  const handleUpdateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    updateQuantity(productId, quantity);
    setQuote(null);
  };

  const handleBackToCart = () => {
    navigate('/shop', {
      state: {
        cart,
        openCart: true,
      }
    });
  };

  const handlePayment = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para continuar');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const orderData = getOrderPayload();

      const response = await createCheckoutPreference(orderData);

      if (response.init_point) {
        // Redirigir a MercadoPago
        window.location.href = response.init_point;
      } else if (response.status === 'paid') {
        clearCart();
        toast.success('Compra validada. QR generado automáticamente.');
        navigate('/dashboard');
      } else {
        toast.info(response.message || 'Orden creada. Sistema de pago en configuración.');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = quote?.subtotal ?? getTotalPrice();
  const shipping = quote?.shipping_cost ?? shippingOptions.default_shipping_cost ?? 0;
  const discount = quote?.discount_amount ?? 0;
  const finalTotal = quote?.final_total ?? (subtotal + shipping - discount);

  if (cart.length === 0) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-heading font-bold text-3xl mb-8" data-testid="checkout-title">
            Finalizar Compra
          </h1>
          {renewalBucketId && (
            <p className="text-sm text-muted-foreground mb-4">
              Estás renovando una suscripción existente.
            </p>
          )}
          <div className="mb-6">
            <Button type="button" variant="outline" onClick={handleBackToCart} data-testid="checkout-back-to-cart-btn">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al carrito
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="mr-2 h-5 w-5" />
                    Resumen de Orden
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center py-3 border-b border-border" data-testid={`checkout-item-${item.id}`}>
                        <div className="flex items-center space-x-4">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div>
                            <h3 className="font-semibold">{item.name}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                data-testid={`checkout-decrease-qty-${item.id}`}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="text-sm min-w-6 text-center" data-testid={`checkout-qty-${item.id}`}>{item.quantity}</span>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                data-testid={`checkout-increase-qty-${item.id}`}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="destructive"
                                className="h-8 w-8"
                                onClick={() => handleRemoveFromCart(item.id)}
                                data-testid={`checkout-remove-item-${item.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <span className="font-semibold">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Total</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 pb-3 border-b border-border">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Envío
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="space-y-1">
                        <Label>Región</Label>
                        <Select
                          value={shippingRegionId}
                          onValueChange={(value) => {
                            setShippingRegionId(value);
                            const region = shippingOptions.regions.find((item) => (item.id || item.name) === value);
                            const firstCommune = Array.isArray(region?.communes) ? region.communes[0] : null;
                            setShippingCommuneId(firstCommune?.id || firstCommune?.name || '');
                          }}
                        >
                          <SelectTrigger data-testid="checkout-shipping-region-select">
                            <SelectValue placeholder="Selecciona región" />
                          </SelectTrigger>
                          <SelectContent>
                            {shippingOptions.regions.map((region) => (
                              <SelectItem key={region.id || region.name} value={region.id || region.name}>
                                {region.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Comuna</Label>
                        <Select
                          value={shippingCommuneId}
                          onValueChange={setShippingCommuneId}
                          disabled={!selectedRegion}
                        >
                          <SelectTrigger data-testid="checkout-shipping-commune-select">
                            <SelectValue placeholder="Selecciona comuna" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCommunes.map((commune) => (
                              <SelectItem key={commune.id || commune.name} value={commune.id || commune.name}>
                                {commune.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pb-3 border-b border-border">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      Cupón
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setQuote(null);
                        }}
                        placeholder="Ej: FREE"
                        data-testid="coupon-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleApplyCoupon}
                        disabled={quoteLoading}
                        data-testid="apply-coupon-btn"
                      >
                        {quoteLoading ? 'Aplicando...' : 'Aplicar'}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 pb-4 border-b border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span data-testid="checkout-subtotal">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Envío</span>
                      <span>{formatPrice(shipping)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Descuento</span>
                        <span className="text-emerald-600">-{formatPrice(discount)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span data-testid="checkout-total">{formatPrice(finalTotal)}</span>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handlePayment}
                    disabled={loading}
                    data-testid="checkout-pay-btn"
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    {loading ? 'Procesando...' : finalTotal <= 0 ? 'Confirmar Compra' : 'Pagar con MercadoPago'}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    {finalTotal <= 0
                      ? 'Esta compra se validará internamente sin pasarela de pago'
                      : 'Serás redirigido a MercadoPago para completar el pago de forma segura'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
