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
import { Building2, CheckCircle2, Eye, Image, Package, Plus, Repeat, Save, Sparkles, TicketPercent, Trash2, User } from 'lucide-react';

const VISIBILITY_ALIASES = {
  visitor: 'visitor',
  visitante: 'visitor',
  person: 'person',
  persona: 'person',
  business: 'business',
  empresa: 'business',
};

const VISIBILITY_OPTIONS = [
  { value: 'visitor', label: 'Visitante + cuentas', icon: Sparkles, help: 'Producto público: lo ve visitante y también cualquier cuenta autenticada.' },
  { value: 'person', label: 'Solo persona', icon: User, help: 'Visible para cuentas persona autenticadas.' },
  { value: 'business', label: 'Solo empresa', icon: Building2, help: 'Visible para cuentas empresa autenticadas.' },
];

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
  visible_to: 'business',
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

const inferVisibleToByCategory = (category) => {
  if (category === 'business') return 'business';
  if (category === 'personal') return 'person';
  return 'visitor';
};

const normalizeVisibleTo = (value, category) => {
  const fallback = inferVisibleToByCategory(category);

  if (Array.isArray(value)) {
    const normalizedItems = [...new Set(
      value
        .map((item) => VISIBILITY_ALIASES[String(item || '').trim().toLowerCase()])
        .filter(Boolean),
    )];

    if (normalizedItems.includes(fallback)) return fallback;
    if (normalizedItems.includes('visitor')) return 'visitor';
    return normalizedItems[0] || fallback;
  }

  const normalized = VISIBILITY_ALIASES[String(value || '').trim().toLowerCase()];
  return normalized || fallback;
};

const visibilityLabel = (value, category) => {
  const visibleTo = normalizeVisibleTo(value, category);
  if (visibleTo === 'visitor') return 'Visitante + cuentas';
  if (visibleTo === 'person') return 'Solo persona';
  if (visibleTo === 'business') return 'Solo empresa';
  return 'Público';
};

const sameVisibility = (left, right, category) => normalizeVisibleTo(left, category) === normalizeVisibleTo(right, category);

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

  useEffect(() => { loadData(); }, []);
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
      setProducts(productsResult.status === 'fulfilled'
        ? (productsResult.value || []).map((product) => ({ ...product, visible_to: normalizeVisibleTo(product.visible_to, product.category) }))
        : []);
      setCoupons(couponsResult.status === 'fulfilled' ? (couponsResult.value || []) : []);
      if (productsResult.status !== 'fulfilled') toast.error('No se pudo cargar el listado de productos');
      if (couponsResult.status !== 'fulfilled') toast.error('No se pudo cargar el listado de cupones');
    } catch (_) {
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
    const visibleTo = normalizeVisibleTo(productForm.visible_to, productForm.category);
    try {
      setSavingProduct(true);
      const effectiveItemType = productForm.category === 'business' ? 'subscription_service' : productForm.item_type;
      const payload = {
        ...productForm,
        visible_to: visibleTo,
        item_type: effectiveItemType,
        price: Number(productForm.price || 0),
        stock: Number(productForm.stock || 0),
        subscription_period: effectiveItemType === 'subscription_service' ? (productForm.subscription_period || 'monthly') : null,
        qr_quota_granted: effectiveItemType === 'subscription_service' ? Number(productForm.qr_quota_granted || 0) : 0,
      };
      if (editingProductId) {
        await updateAdminStoreProduct(editingProductId, payload);
        toast.success('Item actualizado');
      } else {
        const created = await createAdminStoreProduct(payload);
        if (created?.id && !sameVisibility(created.visible_to, visibleTo, productForm.category)) {
          try { await updateAdminStoreProduct(created.id, { visible_to: visibleTo }); }
          catch (_) { toast.error('El item se creó; revisá la visibilidad antes de publicarlo'); }
        }
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
    setProductForm({ ...EMPTY_PRODUCT, ...product, visible_to: normalizeVisibleTo(product.visible_to, product.category), subscription_period: product.subscription_period || 'monthly' });
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

  const handleCategoryChange = (value) => {
    setProductForm((prev) => {
      const previousDefault = inferVisibleToByCategory(prev.category);
      const nextDefault = inferVisibleToByCategory(value);
      const nextVisibleTo = normalizeVisibleTo(prev.visible_to, prev.category) === previousDefault
        ? nextDefault
        : normalizeVisibleTo(prev.visible_to, value);

      return {
        ...prev,
        category: value,
        item_type: value === 'business' ? 'subscription_service' : prev.item_type,
        auto_qr_profile_type: value === 'business' ? 'business' : prev.auto_qr_profile_type,
        visible_to: nextVisibleTo,
      };
    });
  };

  const toggleProductSelection = (productId, checked) => {
    setSelectedProductIds((prev) => checked ? (prev.includes(productId) ? prev : [...prev, productId]) : prev.filter((id) => id !== productId));
  };
  const toggleSelectAllProducts = (checked) => setSelectedProductIds(checked ? products.map((product) => product.id) : []);

  const bulkAction = async (mode) => {
    if (selectedProductIds.length === 0) return toast.error('Selecciona al menos un producto');
    const selected = products.filter((product) => selectedProductIds.includes(product.id));
    let targets = selected;
    if (mode === 'activate') targets = selected.filter((product) => !product.active);
    if (mode === 'deactivate') targets = selected.filter((product) => product.active);
    if (targets.length === 0) return toast.error(mode === 'activate' ? 'Solo puedes activar productos inactivos' : 'Solo puedes desactivar productos activos');
    const confirmed = window.confirm(mode === 'delete'
      ? `¿Eliminar definitivamente ${targets.length} producto(s) seleccionados?`
      : `¿${mode === 'activate' ? 'Activar' : 'Desactivar'} ${targets.length} producto(s) seleccionados?`);
    if (!confirmed) return;
    try {
      setBulkProcessingProducts(true);
      const outcomes = await Promise.allSettled(targets.map((product) => (
        mode === 'activate'
          ? updateAdminStoreProduct(product.id, { active: true })
          : mode === 'deactivate'
            ? deleteAdminStoreProduct(product.id)
            : deleteAdminStoreProduct(product.id, true)
      )));
      const failed = outcomes.filter((item) => item.status === 'rejected').length;
      const succeeded = outcomes.length - failed;
      failed === 0
        ? toast.success(`${mode === 'activate' ? 'Productos activados' : mode === 'deactivate' ? 'Productos desactivados' : 'Productos eliminados'} (${succeeded})`)
        : toast.error(`Proceso parcial: ${succeeded} OK, ${failed} con error`);
      setSelectedProductIds([]);
      loadData();
    } catch (_) {
      toast.error('No se pudo ejecutar la acción por lotes');
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
    } catch (_) {
      toast.error('No se pudo actualizar cupón');
    }
  };

  const handleDeleteCoupon = async (coupon) => {
    if (!window.confirm(`¿Eliminar cupón ${coupon.code}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteAdminCoupon(coupon.code);
      toast.success(`Cupón ${coupon.code} eliminado`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo eliminar cupón');
    }
  };

  const totalProducts = products.length;
  const activeProducts = products.filter((product) => product.active).length;
  const selectedCount = selectedProductIds.length;
  const allSelected = totalProducts > 0 && selectedCount === totalProducts;
  const currentVisibility = normalizeVisibleTo(productForm.visible_to, productForm.category);
  const effectiveItemType = productForm.category === 'business' ? 'subscription_service' : productForm.item_type;

  if (loading) {
    return <ProtectedRoute adminOnly><AdminLayout><div className="p-8 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div></div></AdminLayout></ProtectedRoute>;
  }

  return (
    <ProtectedRoute adminOnly>
      <AdminLayout>
        <div className="p-6 lg:p-8 space-y-6" data-testid="admin-store-page">
          <div className="space-y-3">
            <div>
              <h1 className="font-heading font-bold text-2xl flex items-center gap-2"><Package className="h-6 w-6" />Tienda y Suscripciones</h1>
              <p className="text-muted-foreground text-sm mt-1">Gestioná productos, servicios y la audiencia de publicación con el mismo contrato literal que espera backend.</p>
            </div>
            <Card className="border-primary/20 bg-primary/5"><CardContent className="p-4 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Tip:</span> <code className="rounded bg-background px-1 py-0.5 text-xs">visible_to</code> ahora se guarda como un único literal: <code className="rounded bg-background px-1 py-0.5 text-xs">visitor</code>, <code className="rounded bg-background px-1 py-0.5 text-xs">person</code> o <code className="rounded bg-background px-1 py-0.5 text-xs">business</code>.</CardContent></Card>
          </div>

          <Tabs defaultValue="items">
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="items">Items y Suscripciones</TabsTrigger><TabsTrigger value="coupons">Cupones</TabsTrigger></TabsList>

            <TabsContent value="items" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card><CardContent className="pt-5"><p className="text-xs uppercase text-muted-foreground">Total</p><p className="text-2xl font-bold mt-1">{totalProducts}</p></CardContent></Card>
                <Card><CardContent className="pt-5"><p className="text-xs uppercase text-muted-foreground">Activos</p><p className="text-2xl font-bold mt-1">{activeProducts}</p></CardContent></Card>
                <Card><CardContent className="pt-5"><p className="text-xs uppercase text-muted-foreground">Seleccionados</p><p className="text-2xl font-bold mt-1">{selectedCount}</p></CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Catálogo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => { setEditingProductId(null); setProductForm(EMPTY_PRODUCT); setProductDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Crear Item</Button>
                    <Button variant="outline" onClick={() => toggleSelectAllProducts(!allSelected)}>{allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}</Button>
                    <Button variant="outline" disabled={bulkProcessingProducts || selectedCount === 0} onClick={() => bulkAction('activate')}><CheckCircle2 className="mr-2 h-4 w-4" />Activar ({selectedCount})</Button>
                    <Button variant="destructive" disabled={bulkProcessingProducts || selectedCount === 0} onClick={() => bulkAction('deactivate')}>Desactivar ({selectedCount})</Button>
                    <Button variant="destructive" disabled={bulkProcessingProducts || selectedCount === 0} onClick={() => bulkAction('delete')}><Trash2 className="mr-2 h-4 w-4" />Borrar ({selectedCount})</Button>
                  </div>

                  {products.length === 0 ? <p className="text-sm text-muted-foreground">No hay productos</p> : products.map((product) => (
                    <div key={product.id} className="border rounded-2xl p-4 flex flex-col gap-3 lg:flex-row lg:justify-between">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={selectedProductIds.includes(product.id)} onChange={(e) => toggleProductSelection(product.id, e.target.checked)} className="mt-1" />
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2 items-center">
                            <p className="font-medium">{product.name}</p>
                            <Badge variant={product.item_type === 'subscription_service' ? 'secondary' : 'outline'}>{product.item_type === 'subscription_service' ? 'Suscripción' : 'Producto'}</Badge>
                            <Badge variant="outline">{product.category === 'business' ? 'Empresa' : 'Personal'}</Badge>
                            <Badge variant="outline">{visibilityLabel(product.visible_to, product.category)}</Badge>
                            {!product.active && <Badge variant="destructive">Inactivo</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">${Number(product.price || 0).toLocaleString('es-CL')} · stock {product.stock}</p>
                          {product.description && <p className="text-sm text-muted-foreground max-w-2xl">{product.description}</p>}
                          {product.item_type === 'subscription_service' && <p className="text-xs text-emerald-700">Cupos QR: {Number(product.qr_quota_granted || 0)} · {product.subscription_period === 'yearly' ? 'Anual' : 'Mensual'}</p>}
                          {product.image_url && <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-xl object-cover border" />}
                        </div>
                      </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditProduct(product)}>Editar</Button>
                          {product.active ? <Button size="sm" variant="destructive" onClick={async () => {
                            try {
                              await deleteAdminStoreProduct(product.id);
                              toast.success('Producto desactivado');
                              loadData();
                            } catch (_) {
                              toast.error('No se pudo desactivar');
                            }
                          }}>Desactivar</Button> : <Button size="sm" variant="outline" onClick={async () => {
                            try {
                              await updateAdminStoreProduct(product.id, { active: true });
                              toast.success('Producto activado');
                              loadData();
                            } catch (_) {
                              toast.error('No se pudo activar');
                            }
                          }}>Activar</Button>}
                        </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="coupons" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><TicketPercent className="h-4 w-4" />Crear Cupón</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Código</Label><Input value={couponForm.code} onChange={(e) => setCouponForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} placeholder="FREE" /></div>
                    <div className="space-y-2"><Label>Tipo de descuento</Label><Select value={couponForm.discount_type} onValueChange={(value) => setCouponForm((prev) => ({ ...prev, discount_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Porcentaje</SelectItem><SelectItem value="fixed">Monto fijo</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2"><Label>Valor</Label><Input type="number" value={couponForm.discount_value} onChange={(e) => setCouponForm((prev) => ({ ...prev, discount_value: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Máx. usos</Label><Input type="number" value={couponForm.max_uses} onChange={(e) => setCouponForm((prev) => ({ ...prev, max_uses: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Aplica a</Label><Select value={couponForm.applies_to} onValueChange={(value) => setCouponForm((prev) => ({ ...prev, applies_to: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todo</SelectItem><SelectItem value="product">Solo productos</SelectItem><SelectItem value="subscription_service">Solo servicios</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label>Descripción</Label><Input value={couponForm.description} onChange={(e) => setCouponForm((prev) => ({ ...prev, description: e.target.value }))} /></div>
                  <div className="flex items-center justify-between border rounded-lg p-3"><div><Label>Envío gratis</Label><p className="text-xs text-muted-foreground">Si se activa, envío con costo cero</p></div><Switch checked={couponForm.free_shipping} onCheckedChange={(value) => setCouponForm((prev) => ({ ...prev, free_shipping: value }))} /></div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateCoupon} disabled={savingCoupon}><Plus className="mr-2 h-4 w-4" />{savingCoupon ? 'Guardando...' : 'Crear Cupón'}</Button>
                    <Button variant="outline" onClick={() => seedFreeCouponFromSettings().then(() => { toast.success('Cupón FREE listo'); loadData(); }).catch(() => toast.error('No se pudo preparar FREE'))}><Repeat className="mr-2 h-4 w-4" />Crear/Verificar FREE</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Cupones existentes</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {coupons.length === 0 ? <p className="text-sm text-muted-foreground">No hay cupones</p> : coupons.map((coupon) => (
                    <div key={coupon.code} className="border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2"><p className="font-medium">{coupon.code}</p><Badge variant={coupon.active ? 'secondary' : 'destructive'}>{coupon.active ? 'Activo' : 'Inactivo'}</Badge></div>
                        <p className="text-xs text-muted-foreground mt-1">{coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `$${coupon.discount_value}`}{coupon.free_shipping ? ' + envío gratis' : ''}{coupon.max_uses ? ` / max ${coupon.max_uses}` : ''}{` / usos ${coupon.usage_count || 0}`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleCoupon(coupon)}>{coupon.active ? 'Desactivar' : 'Activar'}</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteCoupon(coupon)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Dialog open={productDialogOpen} onOpenChange={(open) => !open ? resetProductForm() : setProductDialogOpen(true)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>{editingProductId ? 'Editar Item' : 'Crear Item'}</DialogTitle></DialogHeader>
              <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">Edición guiada</p>
                  Definí primero qué vendés, después a quién se le muestra y por último cómo se entrega.
                </div>

                <div className="rounded-2xl border p-4 space-y-3">
                  <p className="font-semibold">1. Oferta</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Nombre</Label><Input value={productForm.name} onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Categoría</Label><Select value={productForm.category} onValueChange={handleCategoryChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="personal">Personal</SelectItem><SelectItem value="business">Empresa</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label>Descripción</Label><Textarea rows={3} value={productForm.description} onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))} /></div>
                </div>

                <div className="rounded-2xl border p-4 space-y-3">
                  <p className="font-semibold">2. Publicación y audiencia</p>
                  <div className="flex items-center justify-between rounded-xl border p-3"><div><Label>Activo</Label><p className="text-xs text-muted-foreground">Control general de publicación.</p></div><Switch checked={productForm.active} onCheckedChange={(value) => setProductForm((prev) => ({ ...prev, active: value }))} /></div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium"><Eye className="h-4 w-4 text-primary" />Audiencia publicada</div>
                    <p className="text-xs text-muted-foreground">Elegí un único literal compatible con backend. Si llega un array legacy, lo normalizamos de forma defensiva al editar.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {VISIBILITY_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const enabled = currentVisibility === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setProductForm((prev) => ({ ...prev, visible_to: option.value }))}
                            className={`rounded-xl border p-3 text-left transition ${enabled ? 'border-primary/40 bg-primary/5' : 'hover:border-primary/30'}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 font-medium">{option.label}</div>
                                <p className="text-xs text-muted-foreground mt-1">{option.help}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{visibilityLabel(currentVisibility, productForm.category)}</Badge>
                      <Badge variant="secondary">Se enviará como: {currentVisibility}</Badge>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border p-4 space-y-3">
                  <p className="font-semibold">3. Precio, delivery e imagen</p>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="space-y-2"><Label>Tipo</Label><Select value={effectiveItemType} disabled={productForm.category === 'business'} onValueChange={(value) => setProductForm((prev) => ({ ...prev, item_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="product">Producto</SelectItem><SelectItem value="subscription_service">Suscripción</SelectItem></SelectContent></Select></div>
                    {effectiveItemType === 'subscription_service' && <div className="space-y-2"><Label>Periodo</Label><Select value={productForm.subscription_period || 'monthly'} onValueChange={(value) => setProductForm((prev) => ({ ...prev, subscription_period: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Mensual</SelectItem><SelectItem value="yearly">Anual</SelectItem></SelectContent></Select></div>}
                    {effectiveItemType === 'subscription_service' && <div className="space-y-2"><Label>Cupos QR</Label><Input type="number" min="0" value={productForm.qr_quota_granted ?? 0} onChange={(e) => setProductForm((prev) => ({ ...prev, qr_quota_granted: e.target.value }))} /></div>}
                    <div className="space-y-2"><Label>Precio</Label><Input type="number" value={productForm.price} onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Stock</Label><Input type="number" value={productForm.stock} onChange={(e) => setProductForm((prev) => ({ ...prev, stock: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-medium text-sm"><Image className="h-4 w-4 text-primary" />Imagen del producto</div>
                    <Input type="file" accept="image/*" onChange={(e) => handleUploadProductImage(e.target.files?.[0])} />
                    <p className="text-xs text-muted-foreground">Solo archivos subidos desde el dispositivo.</p>
                    {uploadingProductImage && <p className="text-xs text-muted-foreground">Subiendo imagen...</p>}
                    {productForm.image_url && <img src={productForm.image_url} alt="Preview producto" className="w-24 h-24 rounded-md object-cover border" />}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetProductForm}>Cancelar</Button>
                <Button onClick={handleSaveProduct} disabled={savingProduct}><Save className="mr-2 h-4 w-4" />{savingProduct ? 'Guardando...' : editingProductId ? 'Actualizar' : 'Crear'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
};
