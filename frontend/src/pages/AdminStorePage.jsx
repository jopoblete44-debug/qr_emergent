import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import {
  fetchAdminStoreProducts, createAdminStoreProduct, updateAdminStoreProduct, deleteAdminStoreProduct,
  fetchAdminCoupons, createAdminCoupon, updateAdminCoupon, deleteAdminCoupon, seedFreeCouponFromSettings, uploadImageFile
} from '../utils/api';
import { toast } from 'sonner';
import { Package, Repeat, Save, TicketPercent, Plus, CheckCircle2, Trash2 } from 'lucide-react';

const EMPTY_PRODUCT = {
  name: '',
  description: '',
  price: 0,
  category: 'business',
  image_url: '',
  stock: 9999,
  item_type: 'subscription_service',
  subscription_period: 'monthly',
  qr_quota_granted: 10,
  active: true,
  auto_generate_qr: false,
  auto_qr_profile_type: 'business',
  auto_qr_sub_type: 'tarjeta',
};

const EMPTY_COUPON = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 100,
  free_shipping: true,
  active: true,
  max_uses: '',
  applies_to: 'all',
};

export const AdminStorePage = () => {
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [bulkProcessingProducts, setBulkProcessingProducts] = useState(false);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [couponForm, setCouponForm] = useState(EMPTY_COUPON);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const currentIds = new Set(products.map((product) => product.id));
    setSelectedProductIds((prev) => prev.filter((id) => currentIds.has(id)));
  }, [products]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsResult, couponsResult] = await Promise.allSettled([
        fetchAdminStoreProducts({ include_inactive: true }),
        fetchAdminCoupons({ include_inactive: true }),
      ]);

      if (productsResult.status === 'fulfilled') {
        setProducts(productsResult.value || []);
      } else {
        setProducts([]);
        toast.error('No se pudo cargar el listado de productos');
      }

      if (couponsResult.status === 'fulfilled') {
        setCoupons(couponsResult.value || []);
      } else {
        setCoupons([]);
        toast.error('No se pudo cargar el listado de cupones');
      }
    } catch (error) {
      toast.error('Error al cargar tienda');
    } finally {
      setLoading(false);
    }
  };

  const resetProductForm = () => {
    setProductForm(EMPTY_PRODUCT);
    setEditingProductId(null);
    setProductDialogOpen(false);
  };

  const handleSaveProduct = async () => {
    try {
      setSavingProduct(true);
      const effectiveItemType = productForm.category === 'business' ? 'subscription_service' : productForm.item_type;
      const payload = {
        ...productForm,
        item_type: effectiveItemType,
        price: Number(productForm.price || 0),
        stock: Number(productForm.stock || 0),
        subscription_period: effectiveItemType === 'subscription_service'
          ? productForm.subscription_period || 'monthly'
          : null,
        qr_quota_granted: effectiveItemType === 'subscription_service'
          ? Number(productForm.qr_quota_granted || 0)
          : 0,
      };
      if (editingProductId) {
        await updateAdminStoreProduct(editingProductId, payload);
        toast.success('Item actualizado');
      } else {
        await createAdminStoreProduct(payload);
        toast.success('Item creado');
      }
      resetProductForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo guardar');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProductId(product.id);
    setProductForm({
      ...EMPTY_PRODUCT,
      ...product,
      subscription_period: product.subscription_period || null,
    });
    setProductDialogOpen(true);
  };

  const handleDeactivateProduct = async (productId) => {
    try {
      await deleteAdminStoreProduct(productId);
      toast.success('Producto desactivado');
      setSelectedProductIds((prev) => prev.filter((id) => id !== productId));
      loadData();
    } catch (error) {
      toast.error('No se pudo desactivar');
    }
  };

  const handleActivateProduct = async (productId) => {
    try {
      await updateAdminStoreProduct(productId, { active: true });
      toast.success('Producto activado');
      loadData();
    } catch (error) {
      toast.error('No se pudo activar');
    }
  };

  const handleHardDeleteProduct = async (productId) => {
    const confirmed = window.confirm('¿Eliminar definitivamente este producto? Esta acción no se puede deshacer.');
    if (!confirmed) return;
    try {
      await deleteAdminStoreProduct(productId, true);
      toast.success('Producto eliminado definitivamente');
      setSelectedProductIds((prev) => prev.filter((id) => id !== productId));
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo eliminar definitivamente');
    }
  };

  const openCreateProductDialog = () => {
    setEditingProductId(null);
    setProductForm(EMPTY_PRODUCT);
    setProductDialogOpen(true);
  };

  const handleUploadProductImage = async (file) => {
    if (!file) return;
    try {
      setUploadingProductImage(true);
      const response = await uploadImageFile(file, 'store-products');
      if (!response?.url) throw new Error('Upload sin URL');
      setProductForm((prev) => ({ ...prev, image_url: response.url }));
      toast.success('Imagen del producto subida');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo subir la imagen');
    } finally {
      setUploadingProductImage(false);
    }
  };

  const toggleProductSelection = (productId, checked) => {
    setSelectedProductIds((prev) => {
      if (checked) return prev.includes(productId) ? prev : [...prev, productId];
      return prev.filter((id) => id !== productId);
    });
  };

  const toggleSelectAllProducts = (checked) => {
    if (!checked) {
      setSelectedProductIds([]);
      return;
    }
    setSelectedProductIds(products.map((product) => product.id));
  };

  const handleBulkDeactivateProducts = async () => {
    if (selectedProductIds.length === 0) {
      toast.error('Selecciona al menos un producto');
      return;
    }

    const selectedProducts = products.filter((product) => selectedProductIds.includes(product.id));
    const activeProducts = selectedProducts.filter((product) => product.active);
    if (activeProducts.length === 0) {
      toast.error('Solo puedes desactivar productos activos');
      return;
    }

    const confirmed = window.confirm(`¿Desactivar ${activeProducts.length} producto(s) seleccionados?`);
    if (!confirmed) return;

    try {
      setBulkProcessingProducts(true);
      const outcomes = await Promise.allSettled(activeProducts.map((product) => deleteAdminStoreProduct(product.id)));
      const failed = outcomes.filter((item) => item.status === 'rejected').length;
      const succeeded = outcomes.length - failed;

      if (failed === 0) {
        toast.success(`Productos desactivados (${succeeded})`);
      } else {
        toast.error(`Desactivación parcial: ${succeeded} OK, ${failed} con error`);
      }

      setSelectedProductIds([]);
      loadData();
    } catch (error) {
      toast.error('No se pudo ejecutar la desactivación por lotes');
    } finally {
      setBulkProcessingProducts(false);
    }
  };

  const handleBulkActivateProducts = async () => {
    if (selectedProductIds.length === 0) {
      toast.error('Selecciona al menos un producto');
      return;
    }

    const selectedProducts = products.filter((product) => selectedProductIds.includes(product.id));
    const inactiveProducts = selectedProducts.filter((product) => !product.active);
    if (inactiveProducts.length === 0) {
      toast.error('Solo puedes activar productos inactivos');
      return;
    }

    try {
      setBulkProcessingProducts(true);
      const outcomes = await Promise.allSettled(
        inactiveProducts.map((product) => updateAdminStoreProduct(product.id, { active: true }))
      );
      const failed = outcomes.filter((item) => item.status === 'rejected').length;
      const succeeded = outcomes.length - failed;
      if (failed === 0) {
        toast.success(`Productos activados (${succeeded})`);
      } else {
        toast.error(`Activación parcial: ${succeeded} OK, ${failed} con error`);
      }
      setSelectedProductIds([]);
      loadData();
    } catch (error) {
      toast.error('No se pudo ejecutar la activación por lotes');
    } finally {
      setBulkProcessingProducts(false);
    }
  };

  const handleBulkHardDeleteProducts = async () => {
    if (selectedProductIds.length === 0) {
      toast.error('Selecciona al menos un producto');
      return;
    }

    const confirmed = window.confirm(`¿Eliminar definitivamente ${selectedProductIds.length} producto(s) seleccionados?`);
    if (!confirmed) return;

    const selectedProducts = products.filter((product) => selectedProductIds.includes(product.id));
    try {
      setBulkProcessingProducts(true);
      const outcomes = await Promise.allSettled(selectedProducts.map((product) => deleteAdminStoreProduct(product.id, true)));
      const failed = outcomes.filter((item) => item.status === 'rejected').length;
      const succeeded = outcomes.length - failed;
      if (failed === 0) {
        toast.success(`Productos eliminados (${succeeded})`);
      } else {
        toast.error(`Eliminación parcial: ${succeeded} OK, ${failed} con error`);
      }
      setSelectedProductIds([]);
      loadData();
    } catch (error) {
      toast.error('No se pudo ejecutar la eliminación por lotes');
    } finally {
      setBulkProcessingProducts(false);
    }
  };

  const handleCreateCoupon = async () => {
    try {
      setSavingCoupon(true);
      await createAdminCoupon({
        ...couponForm,
        discount_value: Number(couponForm.discount_value || 0),
        max_uses: couponForm.max_uses === '' ? null : Number(couponForm.max_uses),
      });
      toast.success('Cupón creado');
      setCouponForm(EMPTY_COUPON);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo crear cupón');
    } finally {
      setSavingCoupon(false);
    }
  };

  const toggleCoupon = async (coupon) => {
    try {
      await updateAdminCoupon(coupon.code, { active: !coupon.active });
      toast.success(`Cupón ${coupon.code} ${coupon.active ? 'desactivado' : 'activado'}`);
      loadData();
    } catch (error) {
      toast.error('No se pudo actualizar cupón');
    }
  };

  const handleDeleteCoupon = async (coupon) => {
    const confirmed = window.confirm(`¿Eliminar cupón ${coupon.code}? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    try {
      await deleteAdminCoupon(coupon.code);
      toast.success(`Cupón ${coupon.code} eliminado`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo eliminar cupón');
    }
  };

  const ensureFreeCoupon = async () => {
    try {
      await seedFreeCouponFromSettings();
      toast.success('Cupón FREE listo');
      loadData();
    } catch (error) {
      toast.error('No se pudo preparar FREE');
    }
  };

  const totalProducts = products.length;
  const activeProducts = products.filter((product) => product.active).length;
  const subscriptionProducts = products.filter((product) => product.item_type === 'subscription_service').length;
  const selectedProductsCount = selectedProductIds.length;
  const allProductsSelected = totalProducts > 0 && selectedProductsCount === totalProducts;

  if (loading) {
    return (
      <ProtectedRoute adminOnly>
        <AdminLayout>
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute adminOnly>
      <AdminLayout>
        <div className="p-6 lg:p-8 space-y-6" data-testid="admin-store-page">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <Package className="h-6 w-6" />
              Tienda y Suscripciones
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gestiona productos personales, suscripciones empresariales y cupones</p>
          </div>

          <Tabs defaultValue="items">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="items">Items y Suscripciones</TabsTrigger>
              <TabsTrigger value="coupons">Cupones</TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs uppercase text-muted-foreground">Total items</p>
                    <p className="text-2xl font-bold mt-1">{totalProducts}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs uppercase text-muted-foreground">Items activos</p>
                    <p className="text-2xl font-bold mt-1">{activeProducts}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs uppercase text-muted-foreground">Planes de suscripción</p>
                    <p className="text-2xl font-bold mt-1">{subscriptionProducts}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Catálogo de productos y servicios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={openCreateProductDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Item
                    </Button>
                    <Button variant="outline" onClick={() => toggleSelectAllProducts(!allProductsSelected)}>
                      {allProductsSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleBulkActivateProducts}
                      disabled={bulkProcessingProducts || selectedProductsCount === 0}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Activar seleccionados ({selectedProductsCount})
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleBulkDeactivateProducts}
                      disabled={bulkProcessingProducts || selectedProductsCount === 0}
                    >
                      Desactivar seleccionados ({selectedProductsCount})
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleBulkHardDeleteProducts}
                      disabled={bulkProcessingProducts || selectedProductsCount === 0}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Borrar seleccionados ({selectedProductsCount})
                    </Button>
                  </div>

                  {products.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay productos</p>
                  ) : products.map((product) => (
                    <div key={product.id} className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={(e) => toggleProductSelection(product.id, e.target.checked)}
                          aria-label={`Seleccionar ${product.name}`}
                          className="mt-1"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{product.name}</p>
                            <Badge variant={product.item_type === 'subscription_service' ? 'secondary' : 'outline'}>
                              {product.item_type === 'subscription_service' ? 'Suscripción' : 'Producto'}
                            </Badge>
                            {!product.active && <Badge variant="destructive">Inactivo</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            ${Number(product.price || 0).toLocaleString('es-CL')} - stock {product.stock}
                          </p>
                          {product.item_type === 'subscription_service' && (
                            <p className="text-xs text-emerald-700 mt-1">
                              Cupos QR: {Number(product.qr_quota_granted || 0)} ({product.subscription_period === 'yearly' ? 'Anual' : 'Mensual'})
                            </p>
                          )}
                          {product.auto_generate_qr && (
                            <p className="text-xs text-emerald-600 mt-1">Auto QR: {product.auto_qr_profile_type}/{product.auto_qr_sub_type}</p>
                          )}
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="mt-2 w-14 h-14 rounded object-cover border"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditProduct(product)}>Editar</Button>
                        {product.active
                          ? <Button size="sm" variant="destructive" onClick={() => handleDeactivateProduct(product.id)}>Desactivar</Button>
                          : <Button size="sm" variant="outline" onClick={() => handleActivateProduct(product.id)}>Activar</Button>}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleHardDeleteProduct(product.id)}>
                          Borrar
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="coupons" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TicketPercent className="h-4 w-4" />
                    Crear Cupón
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Código</Label>
                      <Input value={couponForm.code} onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))} placeholder="FREE" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de descuento</Label>
                      <Select value={couponForm.discount_type} onValueChange={(v) => setCouponForm(prev => ({ ...prev, discount_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Porcentaje</SelectItem>
                          <SelectItem value="fixed">Monto fijo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Valor</Label>
                      <Input type="number" value={couponForm.discount_value} onChange={(e) => setCouponForm(prev => ({ ...prev, discount_value: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Máx. usos (opcional)</Label>
                      <Input type="number" value={couponForm.max_uses} onChange={(e) => setCouponForm(prev => ({ ...prev, max_uses: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Aplica a</Label>
                      <Select value={couponForm.applies_to} onValueChange={(v) => setCouponForm(prev => ({ ...prev, applies_to: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todo</SelectItem>
                          <SelectItem value="product">Solo productos</SelectItem>
                          <SelectItem value="subscription_service">Solo servicios</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Input value={couponForm.description} onChange={(e) => setCouponForm(prev => ({ ...prev, description: e.target.value }))} />
                  </div>
                  <div className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <Label>Envío gratis</Label>
                      <p className="text-xs text-muted-foreground">Si se activa, envío con costo cero</p>
                    </div>
                    <Switch checked={couponForm.free_shipping} onCheckedChange={(v) => setCouponForm(prev => ({ ...prev, free_shipping: v }))} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateCoupon} disabled={savingCoupon}>
                      <Plus className="mr-2 h-4 w-4" />
                      {savingCoupon ? 'Guardando...' : 'Crear Cupón'}
                    </Button>
                    <Button variant="outline" onClick={ensureFreeCoupon}>
                      <Repeat className="mr-2 h-4 w-4" />
                      Crear/Verificar FREE
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Cupones existentes</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {coupons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay cupones</p>
                  ) : coupons.map((coupon) => (
                    <div key={coupon.code} className="border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{coupon.code}</p>
                          <Badge variant={coupon.active ? 'secondary' : 'destructive'}>
                            {coupon.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `$${coupon.discount_value}`}
                          {coupon.free_shipping ? ' + envío gratis' : ''}
                          {coupon.max_uses ? ` / max ${coupon.max_uses}` : ''}
                          {` / usos ${coupon.usage_count || 0}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleCoupon(coupon)}>
                          {coupon.active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteCoupon(coupon)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Dialog
            open={productDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                resetProductForm();
                return;
              }
              setProductDialogOpen(true);
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingProductId ? 'Editar Item' : 'Crear Item'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={productForm.name} onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={productForm.category} onValueChange={(v) => setProductForm((prev) => ({
                      ...prev,
                      category: v,
                      item_type: v === 'business' ? 'subscription_service' : prev.item_type,
                      subscription_period: v === 'business' ? (prev.subscription_period || 'monthly') : prev.subscription_period,
                      auto_qr_profile_type: v === 'business' ? 'business' : prev.auto_qr_profile_type,
                      stock: v === 'business' ? Number(prev.stock || 9999) : prev.stock,
                    }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="business">Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea value={productForm.description} onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={productForm.category === 'business' ? 'subscription_service' : productForm.item_type}
                      onValueChange={(v) => setProductForm((prev) => ({ ...prev, item_type: v }))}
                      disabled={productForm.category === 'business'}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Producto</SelectItem>
                        <SelectItem value="subscription_service">Suscripción</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(productForm.item_type === 'subscription_service' || productForm.category === 'business') && (
                    <div className="space-y-2">
                      <Label>Periodo</Label>
                      <Select value={productForm.subscription_period || 'monthly'} onValueChange={(v) => setProductForm((prev) => ({ ...prev, subscription_period: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensual</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {(productForm.item_type === 'subscription_service' || productForm.category === 'business') && (
                    <div className="space-y-2">
                      <Label>Cupos QR</Label>
                      <Input
                        type="number"
                        min="0"
                        value={productForm.qr_quota_granted ?? 0}
                        onChange={(e) => setProductForm((prev) => ({ ...prev, qr_quota_granted: e.target.value }))}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Precio</Label>
                    <Input type="number" value={productForm.price} onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock</Label>
                    <Input type="number" value={productForm.stock} onChange={(e) => setProductForm((prev) => ({ ...prev, stock: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Imagen del producto</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadProductImage(e.target.files?.[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    Solo se permiten imágenes subidas desde el dispositivo.
                  </p>
                  {uploadingProductImage && (
                    <p className="text-xs text-muted-foreground">Subiendo imagen...</p>
                  )}
                  {productForm.image_url && (
                    <div className="space-y-2">
                      <img
                        src={productForm.image_url}
                        alt="Preview producto"
                        className="w-24 h-24 rounded-md object-cover border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setProductForm((prev) => ({ ...prev, image_url: '' }))}
                      >
                        Quitar imagen
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Activo</Label>
                      <p className="text-xs text-muted-foreground">Visible para clientes</p>
                    </div>
                    <Switch checked={productForm.active} onCheckedChange={(v) => setProductForm((prev) => ({ ...prev, active: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-generar QR al pagar</Label>
                      <p className="text-xs text-muted-foreground">Crea perfil QR automáticamente</p>
                    </div>
                    <Switch checked={productForm.auto_generate_qr} onCheckedChange={(v) => setProductForm((prev) => ({ ...prev, auto_generate_qr: v }))} />
                  </div>
                </div>

                {productForm.auto_generate_qr && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Tipo de perfil QR</Label>
                      <Select value={productForm.auto_qr_profile_type || 'business'} onValueChange={(v) => setProductForm((prev) => ({ ...prev, auto_qr_profile_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="business">Empresa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subtipo QR</Label>
                      <Input value={productForm.auto_qr_sub_type || ''} onChange={(e) => setProductForm((prev) => ({ ...prev, auto_qr_sub_type: e.target.value }))} placeholder="Ej: mascota, tarjeta, restaurante..." />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetProductForm}>Cancelar</Button>
                <Button onClick={handleSaveProduct} disabled={savingProduct}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingProduct ? 'Guardando...' : editingProductId ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
};
