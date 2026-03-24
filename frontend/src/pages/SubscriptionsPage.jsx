import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarClock, CreditCard, RefreshCw, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { deleteMySubscription, fetchMySubscriptions, fetchProductsWithFilters } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_META = {
  active: { label: 'Activa', variant: 'default' },
  expired: { label: 'Vencida', variant: 'destructive' },
  exhausted: { label: 'Agotada', variant: 'secondary' },
};

export const SubscriptionsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscriptionsData, setSubscriptionsData] = useState(null);
  const [subscriptionProducts, setSubscriptionProducts] = useState([]);
  const [renewingKey, setRenewingKey] = useState('');
  const [deletingKey, setDeletingKey] = useState('');

  const isBusiness = user?.user_type === 'business';

  useEffect(() => {
    const run = async () => {
      try {
        const [subs, products] = await Promise.all([
          fetchMySubscriptions(),
          fetchProductsWithFilters({ category: 'business', item_type: 'subscription_service' }),
        ]);
        setSubscriptionsData(subs);
        setSubscriptionProducts(Array.isArray(products) ? products : []);
      } catch (error) {
        toast.error(error.response?.data?.detail || 'No se pudo cargar el detalle de suscripciones');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const sortedProducts = useMemo(
    () => [...subscriptionProducts].sort((a, b) => Number(a.price || 0) - Number(b.price || 0)),
    [subscriptionProducts]
  );

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return value;
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(price || 0));

  const findRenewProduct = (subscription, targetPeriod) => {
    const targetQuota = Number(subscription?.granted_quota || 0);
    if (!targetQuota) return null;
    return sortedProducts.find((product) => (
      product?.active !== false
      && product?.item_type === 'subscription_service'
      && Number(product?.qr_quota_granted || 0) === targetQuota
      && product?.subscription_period === targetPeriod
    ));
  };

  const handleRenew = (subscription, targetPeriod) => {
    if (!subscriptionsData?.is_master_account) {
      toast.error('Solo la cuenta master puede renovar suscripciones');
      return;
    }

    const renewProduct = findRenewProduct(subscription, targetPeriod);
    if (!renewProduct) {
      toast.error('No existe un plan disponible para esta renovación. Configúralo en Admin > Productos y Servicios.');
      return;
    }

    setRenewingKey(`${subscription.id}-${targetPeriod}`);
    navigate(`/checkout?renewal_bucket_id=${encodeURIComponent(subscription.id)}`, {
      state: {
        cart: [{ ...renewProduct, quantity: 1 }],
        renewal_bucket_id: subscription.id,
      },
    });
  };

  const handleDeleteSubscription = async (subscription) => {
    if (!subscriptionsData?.is_master_account) {
      toast.error('Solo la cuenta master puede eliminar suscripciones');
      return;
    }
    if (!window.confirm(`¿Eliminar definitivamente la suscripción "${subscription.product_name || 'Suscripción QR'}"?`)) {
      return;
    }

    try {
      setDeletingKey(subscription.id);
      const updated = await deleteMySubscription(subscription.id);
      setSubscriptionsData(updated);
      toast.success('Suscripción eliminada');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo eliminar la suscripción');
    } finally {
      setDeletingKey('');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="container mx-auto px-4 py-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!isBusiness) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="container mx-auto px-4 py-8">
            <Card>
              <CardHeader>
                <CardTitle>Suscripciones</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Esta sección está disponible solo para cuentas empresa.
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const subscriptions = subscriptionsData?.subscriptions || [];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" data-testid="subscriptions-page">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="font-heading font-bold text-3xl">Suscripciones QR</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Detalle de tus cupos comprados, vigencias y renovaciones.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/shop?category=business&item_type=subscription_service')}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              Ver planes
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs uppercase text-muted-foreground">Cupos disponibles</p>
                <p className="text-2xl font-bold mt-1">{subscriptionsData?.available_quota || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs uppercase text-muted-foreground">Suscripciones activas</p>
                <p className="text-2xl font-bold mt-1">{subscriptionsData?.active_subscription_count || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs uppercase text-muted-foreground">Cupos comprados</p>
                <p className="text-2xl font-bold mt-1">{subscriptionsData?.total_granted_quota || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs uppercase text-muted-foreground">Cuenta propietaria</p>
                <p className="text-sm font-medium mt-1 truncate">{subscriptionsData?.owner_name || '-'}</p>
                <p className="text-xs text-muted-foreground truncate">{subscriptionsData?.owner_email || '-'}</p>
              </CardContent>
            </Card>
          </div>

          {!subscriptionsData?.is_master_account && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="py-4 text-sm text-amber-900 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 mt-0.5" />
                Tu cuenta es subcuenta: puedes usar cupos, pero la renovación la realiza la cuenta master.
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Historial de suscripciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  Aún no tienes suscripciones compradas.
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((subscription) => {
                    const status = STATUS_META[subscription.status] || { label: subscription.status, variant: 'secondary' };
                    const monthlyProduct = findRenewProduct(subscription, 'monthly');
                    const yearlyProduct = findRenewProduct(subscription, 'yearly');
                    return (
                      <div key={subscription.id} className="border rounded-lg p-4 space-y-3" data-testid={`subscription-row-${subscription.id}`}>
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{subscription.product_name || 'Suscripción QR'}</p>
                              <Badge variant={status.variant}>{status.label}</Badge>
                              <Badge variant="outline">{subscription.subscription_period === 'yearly' ? 'Anual' : 'Mensual'}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Compra: {formatDate(subscription.purchased_at)} · Vence: {formatDate(subscription.expires_at)}
                            </p>
                          </div>
                          <div className="text-sm md:text-right">
                            <p className="font-medium">{subscription.remaining_quota} / {subscription.granted_quota} cupos</p>
                            <p className="text-xs text-muted-foreground">
                              {typeof subscription.days_until_expiration === 'number'
                                ? `${subscription.days_until_expiration} días para vencer`
                                : 'Sin fecha de vencimiento'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!subscriptionsData?.is_master_account || !monthlyProduct}
                            onClick={() => handleRenew(subscription, 'monthly')}
                            data-testid={`renew-monthly-${subscription.id}`}
                          >
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Renovar 1 mes
                            {monthlyProduct ? ` · ${formatPrice(monthlyProduct.price)}` : ' · no disponible'}
                          </Button>
                          <Button
                            size="sm"
                            disabled={!subscriptionsData?.is_master_account || !yearlyProduct}
                            onClick={() => handleRenew(subscription, 'yearly')}
                            data-testid={`renew-yearly-${subscription.id}`}
                          >
                            <CreditCard className="mr-2 h-3.5 w-3.5" />
                            Renovar 1 año
                            {yearlyProduct ? ` · ${formatPrice(yearlyProduct.price)}` : ' · no disponible'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={!subscriptionsData?.is_master_account || deletingKey === subscription.id}
                            onClick={() => handleDeleteSubscription(subscription)}
                            data-testid={`delete-subscription-${subscription.id}`}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            {deletingKey === subscription.id ? 'Eliminando...' : 'Eliminar suscripción'}
                          </Button>
                          {renewingKey.startsWith(`${subscription.id}-`) && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              Redirigiendo al checkout...
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};
