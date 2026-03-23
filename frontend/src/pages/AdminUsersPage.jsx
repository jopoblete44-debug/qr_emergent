import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  fetchAdminUserSubscriptions,
  grantAdminUserSubscription,
  revokeAdminUserSubscription,
  updateAdminUser,
  updateAdminUserStatus
} from '../utils/api';
import { toast } from 'sonner';
import {
  CheckCircle2,
  CreditCard,
  Edit,
  Eye,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  Search,
  Trash2,
  Users,
  XCircle
} from 'lucide-react';

const EMPTY_CREATE_FORM = {
  name: '',
  email: '',
  password: '',
  user_type: 'person',
  phone: '',
  address: '',
  business_name: '',
  is_admin: false,
  account_status: 'active',
  account_role: 'standard',
  parent_account_id: '',
};

const EMPTY_GRANT_FORM = {
  qr_quota_granted: '10',
  subscription_period: 'monthly',
  label: '',
};

const LIMIT = 20;

const SUBSCRIPTION_STATUS_META = {
  active: { label: 'Activa', variant: 'default' },
  expired: { label: 'Vencida', variant: 'destructive' },
  exhausted: { label: 'Agotada', variant: 'secondary' },
};

const formatDateTime = (value) => {
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

const formatPeriodLabel = (period) => (period === 'yearly' ? 'Anual' : 'Mensual');

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [editDialog, setEditDialog] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [detailDialog, setDetailDialog] = useState(false);
  const [detailUser, setDetailUser] = useState(null);

  const [createDialog, setCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);

  const [subscriptionsDialog, setSubscriptionsDialog] = useState(false);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsActionBusy, setSubscriptionsActionBusy] = useState(false);
  const [subscriptionsTargetUser, setSubscriptionsTargetUser] = useState(null);
  const [subscriptionsData, setSubscriptionsData] = useState(null);
  const [grantForm, setGrantForm] = useState(EMPTY_GRANT_FORM);

  const loadUsers = useCallback(async ({ currentPage, currentSearch }) => {
    try {
      setLoading(true);
      const data = await fetchAdminUsers({
        search: currentSearch || undefined,
        skip: currentPage * LIMIT,
        limit: LIMIT,
      });
      const userList = data.users || data || [];
      setUsers(userList);
      setTotal(data.total || userList.length);
    } catch (error) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers({ currentPage: page, currentSearch: search });
  }, [page, search, loadUsers]);

  useEffect(() => {
    const currentIds = new Set(users.map((user) => user.id));
    setSelectedUserIds((prev) => prev.filter((id) => currentIds.has(id)));
  }, [users]);

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedUserIds.includes(user.id)),
    [users, selectedUserIds]
  );

  const selectedCount = selectedUserIds.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const allSelectedOnPage = users.length > 0 && users.every((user) => selectedUserIds.includes(user.id));

  const handleSearch = () => {
    setPage(0);
    loadUsers({ currentPage: 0, currentSearch: search });
  };

  const toggleUserSelection = (userId, checked) => {
    setSelectedUserIds((prev) => {
      if (checked) return prev.includes(userId) ? prev : [...prev, userId];
      return prev.filter((id) => id !== userId);
    });
  };

  const toggleSelectAllOnPage = (checked) => {
    if (!checked) {
      setSelectedUserIds((prev) => prev.filter((id) => !users.some((user) => user.id === id)));
      return;
    }
    setSelectedUserIds((prev) => {
      const merged = new Set(prev);
      users.forEach((user) => merged.add(user.id));
      return Array.from(merged);
    });
  };

  const runBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      toast.error('Selecciona al menos un usuario');
      return;
    }

    if (action === 'delete') {
      const confirmed = window.confirm(`Eliminar ${selectedUsers.length} cuenta(s) seleccionada(s)?`);
      if (!confirmed) return;
    }

    try {
      setBulkBusy(true);
      const outcomes = await Promise.allSettled(
        selectedUsers.map(async (user) => {
          if (action === 'activate') {
            if (user.account_status !== 'active') {
              await updateAdminUserStatus(user.id, 'active');
            }
            return;
          }
          if (action === 'pause') {
            if (user.account_status !== 'paused') {
              await updateAdminUserStatus(user.id, 'paused');
            }
            return;
          }
          await deleteAdminUser(user.id);
        })
      );

      const failed = outcomes.filter((item) => item.status === 'rejected').length;
      const succeeded = outcomes.length - failed;

      if (failed === 0) {
        toast.success(`Acción por lotes completada (${succeeded})`);
      } else {
        toast.error(`Acción parcial: ${succeeded} OK, ${failed} con error`);
      }

      setSelectedUserIds([]);
      await loadUsers({ currentPage: page, currentSearch: search });
    } catch (error) {
      toast.error('No se pudo completar la acción por lotes');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleEdit = (user) => {
    setEditUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      user_type: user.user_type || 'person',
      phone: user.phone || '',
      address: user.address || '',
      business_name: user.business_name || '',
      account_status: user.account_status || 'active',
      account_role: user.account_role || (user.user_type === 'business' ? 'master' : 'standard'),
      parent_account_id: user.parent_account_id || '',
      password: '',
    });
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    try {
      const data = { ...editForm };
      if (!data.password) delete data.password;
      if (!data.parent_account_id) data.parent_account_id = null;
      await updateAdminUser(editUser.id, data);
      toast.success('Usuario actualizado');
      setEditDialog(false);
      loadUsers({ currentPage: page, currentSearch: search });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar usuario');
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error('Nombre, email y contraseña son obligatorios');
      return;
    }

    try {
      const payload = { ...createForm, parent_account_id: createForm.parent_account_id || null };
      await createAdminUser(payload);
      toast.success('Usuario creado');
      setCreateDialog(false);
      setCreateForm(EMPTY_CREATE_FORM);
      loadUsers({ currentPage: page, currentSearch: search });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo crear el usuario');
    }
  };

  const toggleStatus = async (user) => {
    const nextStatus = user.account_status === 'paused' ? 'active' : 'paused';
    try {
      await updateAdminUserStatus(user.id, nextStatus);
      toast.success(`Cuenta ${nextStatus === 'paused' ? 'pausada' : 'activada'}`);
      loadUsers({ currentPage: page, currentSearch: search });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo actualizar el estado');
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(`Eliminar cuenta de ${user.email}?`);
    if (!confirmed) return;

    try {
      await deleteAdminUser(user.id);
      toast.success('Cuenta eliminada');
      loadUsers({ currentPage: page, currentSearch: search });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo eliminar la cuenta');
    }
  };

  const handleViewDetail = (user) => {
    setDetailUser(user);
    setDetailDialog(true);
  };

  const handleOpenSubscriptions = async (user) => {
    try {
      setSubscriptionsDialog(true);
      setSubscriptionsLoading(true);
      setSubscriptionsData(null);
      setSubscriptionsTargetUser(user);
      setGrantForm(EMPTY_GRANT_FORM);
      const data = await fetchAdminUserSubscriptions(user.id);
      setSubscriptionsData(data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo cargar las suscripciones');
      setSubscriptionsDialog(false);
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  const handleGrantSubscription = async () => {
    if (!subscriptionsTargetUser) return;
    const quota = Number(grantForm.qr_quota_granted || 0);
    if (!Number.isFinite(quota) || quota <= 0) {
      toast.error('Ingresa un cupo válido');
      return;
    }

    try {
      setSubscriptionsActionBusy(true);
      const response = await grantAdminUserSubscription(subscriptionsTargetUser.id, {
        qr_quota_granted: quota,
        subscription_period: grantForm.subscription_period,
        label: grantForm.label.trim() || null,
      });
      setSubscriptionsData(response);
      setGrantForm(EMPTY_GRANT_FORM);
      toast.success('Suscripción agregada');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo agregar la suscripción');
    } finally {
      setSubscriptionsActionBusy(false);
    }
  };

  const handleRevokeSubscription = async (bucketId) => {
    if (!subscriptionsTargetUser) return;
    const confirmed = window.confirm('¿Revocar esta suscripción y retirar sus cupos restantes?');
    if (!confirmed) return;

    try {
      setSubscriptionsActionBusy(true);
      const response = await revokeAdminUserSubscription(subscriptionsTargetUser.id, bucketId);
      setSubscriptionsData(response);
      toast.success('Suscripción revocada');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo revocar la suscripción');
    } finally {
      setSubscriptionsActionBusy(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'paused') return <Badge variant="secondary" className="text-xs">Pausada</Badge>;
    if (status === 'deleted') return <Badge variant="destructive" className="text-xs">Eliminada</Badge>;
    return <Badge className="text-xs">Activa</Badge>;
  };

  const getRoleLabel = (user) => {
    if (user.is_admin) return 'Administrador';
    if (user.account_role === 'master') return 'Master';
    if (user.account_role === 'subaccount') return 'Subcuenta';
    return 'Cliente';
  };

  return (
    <ProtectedRoute adminOnly>
      <AdminLayout>
        <div className="p-6 lg:p-8 space-y-6" data-testid="admin-users-page">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="font-heading font-bold text-2xl">Clientes</h1>
              <p className="text-muted-foreground text-sm mt-1">Gestión de usuarios, estados, accesos y suscripciones</p>
            </div>
            <Button onClick={() => setCreateDialog(true)} data-testid="admin-user-create-btn">
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Usuario
            </Button>
          </div>

          <Card>
            <CardContent className="pt-5">
              <div className="flex gap-3">
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="max-w-md"
                  data-testid="admin-user-search"
                />
                <Button onClick={handleSearch} data-testid="admin-user-search-btn">
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{total} usuarios</span>
            </div>
            {selectedCount > 0 && <Badge variant="outline">{selectedCount} seleccionados</Badge>}
          </div>

          {selectedCount > 0 && (
            <Card>
              <CardContent className="pt-5 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => runBulkAction('activate')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Activar seleccionados
                </Button>
                <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => runBulkAction('pause')}>
                  <PauseCircle className="mr-2 h-4 w-4" />
                  Pausar seleccionados
                </Button>
                <Button size="sm" variant="destructive" disabled={bulkBusy} onClick={() => runBulkAction('delete')}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar seleccionados
                </Button>
                <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={() => setSelectedUserIds([])}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Limpiar selección
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No se encontraron usuarios</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <input
                            type="checkbox"
                            checked={allSelectedOnPage}
                            onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                            aria-label="Seleccionar todos"
                          />
                        </TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Registro</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} data-testid={`admin-user-row-${user.id}`}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.id)}
                              onChange={(e) => toggleUserSelection(user.id, e.target.checked)}
                              aria-label={`Seleccionar ${user.email}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-sm">{user.name}</TableCell>
                          <TableCell className="text-sm">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {user.user_type === 'person' ? 'Persona' : 'Empresa'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {getRoleLabel(user)}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(user.account_status)}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString('es-CL') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleViewDetail(user)} title="Ver detalle">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(user)} title="Editar">
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              {user.user_type === 'business' && (
                                <Button size="sm" variant="ghost" onClick={() => handleOpenSubscriptions(user)} title="Gestionar suscripciones">
                                  <CreditCard className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {user.account_status === 'paused' ? (
                                <Button size="sm" variant="ghost" onClick={() => toggleStatus(user)} title="Activar">
                                  <PlayCircle className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" onClick={() => toggleStatus(user)} title="Pausar">
                                  <PauseCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(user)} title="Eliminar">
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {page * LIMIT + 1}-{Math.min((page + 1) * LIMIT, total)} de {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((prev) => Math.max(0, prev - 1))}>
                      Anterior
                    </Button>
                    <span className="text-sm font-medium">{page + 1} / {totalPages}</span>
                    <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}>
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={createForm.user_type} onValueChange={(v) => setCreateForm({ ...createForm, user_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="person">Persona</SelectItem>
                      <SelectItem value="business">Empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={createForm.account_status} onValueChange={(v) => setCreateForm({ ...createForm, account_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="paused">Pausada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={createForm.account_role} onValueChange={(v) => setCreateForm({ ...createForm, account_role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Cliente</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                      <SelectItem value="subaccount">Subcuenta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Es admin</Label>
                  <Select value={createForm.is_admin ? 'true' : 'false'} onValueChange={(v) => setCreateForm({ ...createForm, is_admin: v === 'true' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">No</SelectItem>
                      <SelectItem value="true">Sí</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>ID cuenta master (opcional)</Label>
                <Input value={createForm.parent_account_id} onChange={(e) => setCreateForm({ ...createForm, parent_account_id: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Empresa/Sucursal</Label>
                <Input value={createForm.business_name} onChange={(e) => setCreateForm({ ...createForm, business_name: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancelar</Button>
              <Button onClick={handleCreateUser}>Crear</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={editForm.user_type || 'person'} onValueChange={(v) => setEditForm({ ...editForm, user_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="person">Persona</SelectItem>
                      <SelectItem value="business">Empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={editForm.account_status || 'active'} onValueChange={(v) => setEditForm({ ...editForm, account_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="paused">Pausada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={editForm.account_role || 'standard'} onValueChange={(v) => setEditForm({ ...editForm, account_role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Cliente</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                      <SelectItem value="subaccount">Subcuenta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ID cuenta master</Label>
                  <Input value={editForm.parent_account_id || ''} onChange={(e) => setEditForm({ ...editForm, parent_account_id: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Empresa/Sucursal</Label>
                <Input value={editForm.business_name || ''} onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nueva Contraseña (opcional)</Label>
                <Input type="password" value={editForm.password || ''} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
              <Button onClick={handleSaveEdit}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalle del Usuario</DialogTitle>
            </DialogHeader>
            {detailUser && (
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Nombre:</span>
                  <span className="font-medium">{detailUser.name}</span>
                  <span className="text-muted-foreground">Email:</span>
                  <span>{detailUser.email}</span>
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>{detailUser.user_type === 'person' ? 'Persona' : 'Empresa'}</span>
                  <span className="text-muted-foreground">Rol:</span>
                  <span>{getRoleLabel(detailUser)}</span>
                  <span className="text-muted-foreground">Estado:</span>
                  <span>{detailUser.account_status || 'active'}</span>
                  <span className="text-muted-foreground">Cuenta master:</span>
                  <span className="font-mono text-xs">{detailUser.parent_account_id || '-'}</span>
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono text-xs">{detailUser.id}</span>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialog(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={subscriptionsDialog} onOpenChange={setSubscriptionsDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Gestión de Suscripciones
              </DialogTitle>
            </DialogHeader>

            {subscriptionsLoading ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs uppercase text-muted-foreground">Cupos disponibles</p>
                      <p className="text-xl font-bold mt-1">{subscriptionsData?.available_quota || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs uppercase text-muted-foreground">Suscripciones activas</p>
                      <p className="text-xl font-bold mt-1">{subscriptionsData?.active_subscription_count || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs uppercase text-muted-foreground">Cuenta objetivo</p>
                      <p className="text-sm font-medium mt-1 truncate">{subscriptionsData?.target_user_name || subscriptionsTargetUser?.name || '-'}</p>
                      <p className="text-xs text-muted-foreground truncate">{subscriptionsData?.target_user_email || subscriptionsTargetUser?.email || '-'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs uppercase text-muted-foreground">Cuenta propietaria</p>
                      <p className="text-sm font-medium mt-1 truncate">{subscriptionsData?.owner_name || '-'}</p>
                      <p className="text-xs text-muted-foreground truncate">{subscriptionsData?.owner_email || '-'}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="pt-5 space-y-3">
                    <h3 className="font-semibold text-sm">Otorgar suscripción manual</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Cupos QR</Label>
                        <Input type="number" min="1" value={grantForm.qr_quota_granted} onChange={(e) => setGrantForm((prev) => ({ ...prev, qr_quota_granted: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Periodo</Label>
                        <Select value={grantForm.subscription_period} onValueChange={(value) => setGrantForm((prev) => ({ ...prev, subscription_period: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Mensual</SelectItem>
                            <SelectItem value="yearly">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Etiqueta (opcional)</Label>
                        <Input value={grantForm.label} onChange={(e) => setGrantForm((prev) => ({ ...prev, label: e.target.value }))} placeholder="Renovación manual" />
                      </div>
                    </div>
                    <Button onClick={handleGrantSubscription} disabled={subscriptionsActionBusy}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Agregar suscripción
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-5">
                    <h3 className="font-semibold text-sm mb-3">Suscripciones vigentes e históricas</h3>
                    {(subscriptionsData?.subscriptions || []).length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-6">Sin suscripciones registradas</div>
                    ) : (
                      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                        {(subscriptionsData?.subscriptions || []).map((subscription) => {
                          const statusMeta = SUBSCRIPTION_STATUS_META[subscription.status] || { label: subscription.status, variant: 'secondary' };
                          return (
                            <div key={subscription.id} className="border rounded-lg p-3 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm">{subscription.product_name || 'Suscripción QR'}</p>
                                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                                    <Badge variant="outline">{formatPeriodLabel(subscription.subscription_period)}</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Compra: {formatDateTime(subscription.purchased_at)} · Vence: {formatDateTime(subscription.expires_at)}
                                  </p>
                                </div>
                                <div className="text-sm sm:text-right">
                                  <p className="font-semibold">{subscription.remaining_quota} / {subscription.granted_quota} cupos</p>
                                  <p className="text-xs text-muted-foreground">
                                    {typeof subscription.days_until_expiration === 'number'
                                      ? `${subscription.days_until_expiration} días para vencer`
                                      : 'Sin vencimiento'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <Button size="sm" variant="destructive" disabled={subscriptionsActionBusy} onClick={() => handleRevokeSubscription(subscription.id)}>
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Revocar
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSubscriptionsDialog(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </ProtectedRoute>
  );
};
