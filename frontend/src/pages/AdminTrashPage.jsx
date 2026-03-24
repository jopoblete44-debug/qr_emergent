import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Package, QrCode, RefreshCw, Trash2, UserX } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  deleteAdminTrashProduct,
  deleteAdminTrashQRProfile,
  deleteAdminTrashUser,
  fetchAdminTrash,
} from '../utils/api';

const formatDate = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('es-CL');
  } catch (_) {
    return value;
  }
};

export const AdminTrashPage = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingKey, setDeletingKey] = useState('');
  const [trashData, setTrashData] = useState({
    users: [],
    qr_profiles: [],
    products: [],
    counts: { users: 0, qr_profiles: 0, products: 0 },
  });

  const loadTrash = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const response = await fetchAdminTrash({ include_products: true });
      setTrashData({
        users: Array.isArray(response?.users) ? response.users : [],
        qr_profiles: Array.isArray(response?.qr_profiles) ? response.qr_profiles : [],
        products: Array.isArray(response?.products) ? response.products : [],
        counts: response?.counts || { users: 0, qr_profiles: 0, products: 0 },
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo cargar la papelera');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, []);

  const handlePermanentDelete = async (type, item) => {
    const itemLabel = type === 'users'
      ? `${item.name || item.email || item.id}`
      : type === 'qr_profiles'
        ? `${item.alias || item.name || item.hash || item.id}`
        : `${item.name || item.id}`;
    if (!window.confirm(`¿Eliminar definitivamente "${itemLabel}"?\nEsta acción no se puede deshacer.`)) {
      return;
    }

    const key = `${type}:${item.id}`;
    try {
      setDeletingKey(key);
      if (type === 'users') {
        await deleteAdminTrashUser(item.id);
      } else if (type === 'qr_profiles') {
        await deleteAdminTrashQRProfile(item.id);
      } else {
        await deleteAdminTrashProduct(item.id);
      }
      toast.success('Elemento eliminado definitivamente');
      await loadTrash({ silent: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo eliminar definitivamente');
    } finally {
      setDeletingKey('');
    }
  };

  const renderEmpty = (label) => (
    <div className="rounded-lg border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
      No hay {label} en la papelera.
    </div>
  );

  const users = trashData.users || [];
  const qrProfiles = trashData.qr_profiles || [];
  const products = trashData.products || [];

  return (
    <ProtectedRoute adminOnly>
      <AdminLayout>
        <div className="p-6 lg:p-8 space-y-6" data-testid="admin-trash-page">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
                <Trash2 className="h-6 w-6" />
                Papelera
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Revisa elementos eliminados y bórralos de forma definitiva.
              </p>
            </div>
            <Button variant="outline" onClick={() => loadTrash({ silent: true })} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs uppercase text-muted-foreground">Cuentas eliminadas</p>
                <p className="text-2xl font-bold mt-1">{trashData.counts?.users || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs uppercase text-muted-foreground">QRs eliminados</p>
                <p className="text-2xl font-bold mt-1">{trashData.counts?.qr_profiles || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs uppercase text-muted-foreground">Productos desactivados</p>
                <p className="text-2xl font-bold mt-1">{trashData.counts?.products || 0}</p>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
            </div>
          ) : (
            <Tabs defaultValue="users" className="space-y-4">
              <TabsList>
                <TabsTrigger value="users">Cuentas ({users.length})</TabsTrigger>
                <TabsTrigger value="qrs">QRs ({qrProfiles.length})</TabsTrigger>
                <TabsTrigger value="products">Productos ({products.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-3">
                {users.length === 0 ? renderEmpty('cuentas') : users.map((item) => {
                  const key = `users:${item.id}`;
                  return (
                    <Card key={item.id}>
                      <CardContent className="pt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{item.name || 'Sin nombre'}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.email || '-'}</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge variant="outline">{item.user_type || 'usuario'}</Badge>
                            <Badge variant="outline">{item.account_role || 'sin rol'}</Badge>
                            <Badge variant="secondary">Eliminado: {formatDate(item.deleted_at)}</Badge>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          disabled={deletingKey === key}
                          onClick={() => handlePermanentDelete('users', item)}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          {deletingKey === key ? 'Eliminando...' : 'Eliminar definitivamente'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="qrs" className="space-y-3">
                {qrProfiles.length === 0 ? renderEmpty('QRs') : qrProfiles.map((item) => {
                  const key = `qr_profiles:${item.id}`;
                  return (
                    <Card key={item.id}>
                      <CardContent className="pt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{item.alias || item.name || item.hash || item.id}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.user_name || 'Sin usuario'} · {item.user_email || '-'}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge variant="outline">{item.profile_type || '-'}</Badge>
                            <Badge variant="outline">{item.sub_type || '-'}</Badge>
                            <Badge variant="secondary">Eliminado: {formatDate(item.deleted_at)}</Badge>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          disabled={deletingKey === key}
                          onClick={() => handlePermanentDelete('qr_profiles', item)}
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          {deletingKey === key ? 'Eliminando...' : 'Eliminar definitivamente'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="products" className="space-y-3">
                {products.length === 0 ? renderEmpty('productos') : products.map((item) => {
                  const key = `products:${item.id}`;
                  return (
                    <Card key={item.id}>
                      <CardContent className="pt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{item.name || 'Producto'}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.description || '-'}</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge variant="outline">{item.category || '-'}</Badge>
                            <Badge variant="outline">{item.item_type || '-'}</Badge>
                            <Badge variant="secondary">Última actualización: {formatDate(item.updated_at || item.created_at)}</Badge>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          disabled={deletingKey === key}
                          onClick={() => handlePermanentDelete('products', item)}
                        >
                          <Package className="mr-2 h-4 w-4" />
                          {deletingKey === key ? 'Eliminando...' : 'Eliminar definitivamente'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
};

