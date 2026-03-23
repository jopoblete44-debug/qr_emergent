import React, { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import {
  createSubaccount,
  deleteSubaccount,
  fetchMySubaccounts,
  updateMyPassword,
  updateMyProfile,
  updateSubaccount,
  updateSubaccountStatus,
} from '../utils/api';
import { toast } from 'sonner';
import { Edit, PauseCircle, PlayCircle, PlusCircle, Trash2 } from 'lucide-react';

const EMPTY_SUBACCOUNT_FORM = {
  email: '',
  name: '',
  password: '',
  phone: '',
  address: '',
  branch_name: '',
  permissions: {
    view_analytics: true,
    view_locations: true,
    manage_qr_profiles: true,
    manage_subaccounts: false,
  },
};

const cloneEmptySubaccountForm = () => ({
  ...EMPTY_SUBACCOUNT_FORM,
  permissions: { ...EMPTY_SUBACCOUNT_FORM.permissions },
});

export const AccountPage = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    business_name: user?.business_name || '',
  });
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);

  const isMasterBusiness = user?.user_type === 'business' && (user?.account_role === 'master' || !user?.account_role);

  const [subaccounts, setSubaccounts] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [createSubForm, setCreateSubForm] = useState(cloneEmptySubaccountForm);
  const [editSubDialog, setEditSubDialog] = useState(false);
  const [editingSubaccount, setEditingSubaccount] = useState(null);
  const [editSubForm, setEditSubForm] = useState({
    name: '',
    phone: '',
    address: '',
    branch_name: '',
    password: '',
    permissions: {
      view_analytics: true,
      view_locations: true,
      manage_qr_profiles: true,
      manage_subaccounts: false,
    },
  });

  const loadSubaccounts = useCallback(async () => {
    try {
      setSubLoading(true);
      const data = await fetchMySubaccounts();
      setSubaccounts(data || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cargar subcuentas');
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isMasterBusiness) {
      loadSubaccounts();
    }
  }, [isMasterBusiness, loadSubaccounts]);

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      address: user?.address || '',
      business_name: user?.business_name || '',
    });
  }, [user?.name, user?.phone, user?.address, user?.business_name]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateMyProfile(formData);
      toast.success('Perfil actualizado exitosamente');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      await updateMyPassword(passwordData.new_password);
      toast.success('Contraseña actualizada exitosamente');
      setPasswordData({
        new_password: '',
        confirm_password: '',
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubaccount = async () => {
    if (!createSubForm.email || !createSubForm.name || !createSubForm.password) {
      toast.error('Email, nombre y contraseña son obligatorios');
      return;
    }

    try {
      await createSubaccount(createSubForm);
      toast.success('Subcuenta creada');
      setCreateSubForm(cloneEmptySubaccountForm());
      setCreateDialog(false);
      loadSubaccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo crear subcuenta');
    }
  };

  const handleEditSubaccountOpen = (sub) => {
    setEditingSubaccount(sub);
    setEditSubForm({
      name: sub.name || '',
      phone: sub.phone || '',
      address: sub.address || '',
      branch_name: sub.branch_name || sub.business_name || '',
      password: '',
      permissions: {
        view_analytics: sub.permissions?.view_analytics ?? true,
        view_locations: sub.permissions?.view_locations ?? true,
        manage_qr_profiles: sub.permissions?.manage_qr_profiles ?? true,
        manage_subaccounts: false,
      },
    });
    setEditSubDialog(true);
  };

  const handleEditSubaccountSave = async () => {
    if (!editingSubaccount) return;
    try {
      const payload = {
        ...editSubForm,
      };
      if (!payload.password) delete payload.password;
      await updateSubaccount(editingSubaccount.id, payload);
      toast.success('Subcuenta actualizada');
      setEditSubDialog(false);
      loadSubaccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo actualizar subcuenta');
    }
  };

  const handleToggleSubStatus = async (sub) => {
    const next = sub.account_status === 'paused' ? 'active' : 'paused';
    try {
      await updateSubaccountStatus(sub.id, next);
      toast.success(`Subcuenta ${next === 'paused' ? 'pausada' : 'activada'}`);
      loadSubaccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo actualizar estado');
    }
  };

  const handleDeleteSubaccount = async (sub) => {
    const confirmed = window.confirm(`Eliminar subcuenta ${sub.email}?`);
    if (!confirmed) return;
    try {
      await deleteSubaccount(sub.id);
      toast.success('Subcuenta eliminada');
      loadSubaccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo eliminar subcuenta');
    }
  };

  const setPermission = (setter, stateObj, key, value) => {
    setter({
      ...stateObj,
      permissions: {
        ...stateObj.permissions,
        [key]: value === 'true',
      },
    });
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="account-page">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl mb-8">Mi Cuenta</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Información del Perfil</CardTitle>
                <CardDescription>Actualiza tu información personal</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user?.email} disabled className="bg-muted" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  {user?.user_type === 'business' && (
                    <div className="space-y-2">
                      <Label htmlFor="business_name">Nombre de la Empresa</Label>
                      <Input
                        id="business_name"
                        value={formData.business_name}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      />
                    </div>
                  )}

                  <Button type="submit" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cambiar Contraseña</CardTitle>
                <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_password">Nueva Contraseña</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirmar Contraseña</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    />
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información de la Cuenta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo de Cuenta:</span>
                  <span className="font-medium">{user?.user_type === 'business' ? 'Empresa' : 'Personal'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rol:</span>
                  <span className="font-medium">{user?.account_role || (user?.user_type === 'business' ? 'master' : 'standard')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha de Registro:</span>
                  <span className="font-medium">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado:</span>
                  <span className="font-medium text-green-600">{user?.account_status || 'active'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {isMasterBusiness && (
            <Card className="mt-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Subcuentas de Sucursales</CardTitle>
                  <CardDescription>Gestiona usuarios y accesos de tus sucursales</CardDescription>
                </div>
                <Button onClick={() => { setCreateSubForm(cloneEmptySubaccountForm()); setCreateDialog(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear Subcuenta
                </Button>
              </CardHeader>
              <CardContent>
                {subLoading ? (
                  <div className="py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : subaccounts.length === 0 ? (
                  <p className="text-muted-foreground">Aún no hay subcuentas creadas.</p>
                ) : (
                  <div className="space-y-3">
                    {subaccounts.map((sub) => (
                      <div key={sub.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="font-medium">{sub.name}</p>
                          <p className="text-sm text-muted-foreground">{sub.email}</p>
                          <p className="text-xs text-muted-foreground">{sub.branch_name || sub.business_name || 'Sucursal'}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={sub.account_status === 'paused' ? 'secondary' : 'default'}>
                            {sub.account_status === 'paused' ? 'Pausada' : 'Activa'}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => handleEditSubaccountOpen(sub)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleToggleSubStatus(sub)}>
                            {sub.account_status === 'paused' ? (
                              <>
                                <PlayCircle className="h-4 w-4 mr-1" />
                                Activar
                              </>
                            ) : (
                              <>
                                <PauseCircle className="h-4 w-4 mr-1" />
                                Pausar
                              </>
                            )}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteSubaccount(sub)}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Subcuenta</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={createSubForm.name} onChange={(e) => setCreateSubForm({ ...createSubForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={createSubForm.email} onChange={(e) => setCreateSubForm({ ...createSubForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" value={createSubForm.password} onChange={(e) => setCreateSubForm({ ...createSubForm, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Sucursal</Label>
                <Input value={createSubForm.branch_name} onChange={(e) => setCreateSubForm({ ...createSubForm, branch_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ver analíticas</Label>
                  <Select value={String(createSubForm.permissions.view_analytics)} onValueChange={(v) => setPermission(setCreateSubForm, createSubForm, 'view_analytics', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gestionar QRs</Label>
                  <Select value={String(createSubForm.permissions.manage_qr_profiles)} onValueChange={(v) => setPermission(setCreateSubForm, createSubForm, 'manage_qr_profiles', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancelar</Button>
              <Button onClick={handleCreateSubaccount}>Crear</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editSubDialog} onOpenChange={setEditSubDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Subcuenta</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={editSubForm.name} onChange={(e) => setEditSubForm({ ...editSubForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={editSubForm.phone} onChange={(e) => setEditSubForm({ ...editSubForm, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input value={editSubForm.address} onChange={(e) => setEditSubForm({ ...editSubForm, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Sucursal</Label>
                <Input value={editSubForm.branch_name} onChange={(e) => setEditSubForm({ ...editSubForm, branch_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nueva contraseña (opcional)</Label>
                <Input type="password" value={editSubForm.password} onChange={(e) => setEditSubForm({ ...editSubForm, password: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ver analíticas</Label>
                  <Select value={String(editSubForm.permissions.view_analytics)} onValueChange={(v) => setPermission(setEditSubForm, editSubForm, 'view_analytics', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gestionar QRs</Label>
                  <Select value={String(editSubForm.permissions.manage_qr_profiles)} onValueChange={(v) => setPermission(setEditSubForm, editSubForm, 'manage_qr_profiles', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditSubDialog(false)}>Cancelar</Button>
              <Button onClick={handleEditSubaccountSave}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
};
