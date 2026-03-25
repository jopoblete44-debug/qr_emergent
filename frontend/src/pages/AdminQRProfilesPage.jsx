import React, { useCallback, useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  fetchAdminQRProfiles,
  updateAdminQRProfile,
  deleteAdminQRProfile,
  adminUpdateQRStatus,
  createAdminQRProfile,
  reassignAdminQRProfile,
  fetchAdminUsers,
  fetchProfileTypesConfig,
  API_BASE,
  getQrDownloadExtension,
} from '../utils/api';
import { toast } from 'sonner';
import {
  Search,
  ExternalLink,
  Edit,
  Trash2,
  Play,
  Pause,
  Download,
  ChevronLeft,
  ChevronRight,
  QrCode,
  CheckCircle2,
  XCircle,
  Plus,
  UserPlus
} from 'lucide-react';

const SUB_TYPE_LABELS = {
  medico: 'Médico', mascota: 'Mascota', vehiculo: 'Vehículo', nino: 'Niño/Mayor',
  restaurante: 'Restaurante', hotel: 'Hotel', wifi: 'WiFi', tarjeta: 'Tarjeta',
  catalogo: 'Catálogo', turismo: 'Turismo', checkin: 'Check-in', encuesta: 'Encuesta',
  redes: 'Redes Sociales', evento: 'Evento',
};

const STATUS_LABELS = { indefinite: 'Indefinido', subscription: 'Suscripción', paused: 'Pausado' };
const STATUS_VARIANTS = { indefinite: 'secondary', subscription: 'default', paused: 'destructive' };
const DEFAULT_PUBLIC_SETTINGS = {
  request_location_automatically: false,
  top_profile_photo_enabled: false,
  top_profile_photo_shape: 'circle',
  floating_buttons: [],
};

const FALLBACK_PERSONAL_SUBTYPES = [
  { value: 'medico', label: 'Médico' },
  { value: 'mascota', label: 'Mascota' },
  { value: 'vehiculo', label: 'Vehículo' },
  { value: 'nino', label: 'Niño/Adulto Mayor' },
];

const FALLBACK_BUSINESS_SUBTYPES = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'tarjeta', label: 'Tarjeta de Presentación' },
  { value: 'catalogo', label: 'Catálogo' },
  { value: 'turismo', label: 'Turismo' },
  { value: 'checkin', label: 'Check-in' },
  { value: 'encuesta', label: 'Encuesta' },
  { value: 'redes', label: 'Redes Sociales' },
  { value: 'evento', label: 'Evento' },
];

export const AdminQRProfilesPage = () => {
  const [profiles, setProfiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [selectedProfileIds, setSelectedProfileIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const limit = 20;

  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editProfile, setEditProfile] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [createDialog, setCreateDialog] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [subTypeOptions, setSubTypeOptions] = useState({
    personal: FALLBACK_PERSONAL_SUBTYPES,
    business: FALLBACK_BUSINESS_SUBTYPES,
  });
  const [subTypeLabels, setSubTypeLabels] = useState(SUB_TYPE_LABELS);
  const [createForm, setCreateForm] = useState({
    user_id: '',
    name: '',
    alias: '',
    profile_type: 'personal',
    sub_type: FALLBACK_PERSONAL_SUBTYPES[0].value,
    status: 'indefinite',
  });
  const [reassignDialog, setReassignDialog] = useState(false);
  const [reassignBusy, setReassignBusy] = useState(false);
  const [reassignProfile, setReassignProfile] = useState(null);
  const [reassignUserId, setReassignUserId] = useState('');

  const loadProfiles = useCallback(async ({ currentPage, currentSearch, currentStatusFilter, currentTypeFilter, currentIncludeDeleted }) => {
    try {
      setLoading(true);
      const params = { skip: currentPage * limit, limit };
      if (currentSearch) params.search = currentSearch;
      if (currentStatusFilter !== 'all') params.status = currentStatusFilter;
      if (currentTypeFilter !== 'all') params.profile_type = currentTypeFilter;
      params.include_deleted = currentIncludeDeleted;

      const data = await fetchAdminQRProfiles(params);
      setProfiles(data.profiles || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error('Error al cargar perfiles');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadProfiles({
      currentPage: page,
      currentSearch: search,
      currentStatusFilter: statusFilter,
      currentTypeFilter: typeFilter,
      currentIncludeDeleted: includeDeleted,
    });
  }, [page, search, statusFilter, typeFilter, includeDeleted, loadProfiles]);

  useEffect(() => {
    const profileIds = new Set(profiles.map((profile) => profile.id));
    setSelectedProfileIds((prev) => prev.filter((id) => profileIds.has(id)));
  }, [profiles]);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [usersResponse, profileTypes] = await Promise.all([
          fetchAdminUsers({ limit: 500, include_deleted: false }),
          fetchProfileTypesConfig().catch(() => null),
        ]);
        const users = Array.isArray(usersResponse?.users) ? usersResponse.users : [];
        setAssignableUsers(users);

        if (users.length > 0) {
          setCreateForm((prev) => ({
            ...prev,
            user_id: prev.user_id || users[0].id,
          }));
        }

        if (profileTypes && typeof profileTypes === 'object') {
          const mapCategory = (category, fallback) => {
            const templates = Array.isArray(profileTypes?.[category]) ? profileTypes[category] : [];
            const enabled = templates
              .filter((template) => template?.enabled !== false && template?.key)
              .map((template) => ({ value: template.key, label: template.label || template.key }));
            return enabled.length > 0 ? enabled : fallback;
          };
          const personal = mapCategory('personal', FALLBACK_PERSONAL_SUBTYPES);
          const business = mapCategory('business', FALLBACK_BUSINESS_SUBTYPES);
          setSubTypeOptions({ personal, business });

          const labels = {};
          [...personal, ...business].forEach((item) => {
            labels[item.value] = item.label;
          });
          setSubTypeLabels((prev) => ({ ...prev, ...labels }));
          setCreateForm((prev) => ({
            ...prev,
            sub_type: prev.profile_type === 'personal' ? personal[0]?.value || prev.sub_type : business[0]?.value || prev.sub_type,
          }));
        }
      } catch (error) {
        // Mantener fallback local.
      }
    };
    loadMetadata();
  }, []);

  const handleSearch = () => {
    setPage(0);
    loadProfiles({
      currentPage: 0,
      currentSearch: search,
      currentStatusFilter: statusFilter,
      currentTypeFilter: typeFilter,
      currentIncludeDeleted: includeDeleted,
    });
  };

  const allSelectedOnPage = profiles.length > 0 && profiles.every((profile) => selectedProfileIds.includes(profile.id));
  const selectedCount = selectedProfileIds.length;

  const toggleProfileSelection = (profileId, checked) => {
    setSelectedProfileIds((prev) => {
      if (checked) return prev.includes(profileId) ? prev : [...prev, profileId];
      return prev.filter((id) => id !== profileId);
    });
  };

  const toggleSelectAllOnPage = (checked) => {
    if (!checked) {
      setSelectedProfileIds((prev) => prev.filter((id) => !profiles.some((profile) => profile.id === id)));
      return;
    }
    setSelectedProfileIds((prev) => {
      const merged = new Set(prev);
      profiles.forEach((profile) => merged.add(profile.id));
      return Array.from(merged);
    });
  };

  const runBulkAction = async (action) => {
    if (selectedProfileIds.length === 0) {
      toast.error('Selecciona al menos un perfil');
      return;
    }

    if (action === 'delete') {
      const confirmed = window.confirm(`¿Eliminar ${selectedProfileIds.length} perfil(es) seleccionado(s)?`);
      if (!confirmed) return;
    }

    const selectedProfiles = profiles.filter((profile) => selectedProfileIds.includes(profile.id));

    try {
      setBulkBusy(true);
      const outcomes = await Promise.allSettled(
        selectedProfiles.map(async (profile) => {
          if (action === 'activate') {
            if (profile.status !== 'indefinite') {
              await adminUpdateQRStatus(profile.id, 'indefinite');
            }
            return;
          }
          if (action === 'pause') {
            if (profile.status !== 'paused') {
              await adminUpdateQRStatus(profile.id, 'paused');
            }
            return;
          }
          await deleteAdminQRProfile(profile.id);
        })
      );

      const failed = outcomes.filter((item) => item.status === 'rejected').length;
      const succeeded = outcomes.length - failed;

      if (failed === 0) {
        toast.success(`Acción por lotes completada (${succeeded})`);
      } else {
        toast.error(`Acción parcial: ${succeeded} OK, ${failed} con error`);
      }

      setSelectedProfileIds([]);
      loadProfiles({
        currentPage: page,
        currentSearch: search,
        currentStatusFilter: statusFilter,
        currentTypeFilter: typeFilter,
        currentIncludeDeleted: includeDeleted,
      });
    } catch (error) {
      toast.error('No se pudo completar la acción por lotes');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleEdit = (profile) => {
    setEditProfile(profile);
    setEditForm({ name: profile.name, alias: profile.alias || '', status: profile.status });
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateAdminQRProfile(editProfile.id, editForm);
      toast.success('Perfil actualizado');
      setEditDialog(false);
      loadProfiles({
        currentPage: page,
        currentSearch: search,
        currentStatusFilter: statusFilter,
        currentTypeFilter: typeFilter,
        currentIncludeDeleted: includeDeleted,
      });
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const handleCreateProfile = async () => {
    if (!createForm.user_id || !createForm.name || !createForm.sub_type) {
      toast.error('Completa usuario, nombre y categoría');
      return;
    }
    try {
      setCreateBusy(true);
      await createAdminQRProfile({
        user_id: createForm.user_id,
        name: createForm.name,
        alias: createForm.alias || createForm.name,
        profile_type: createForm.profile_type,
        sub_type: createForm.sub_type,
        status: createForm.status,
        data: {},
        public_settings: DEFAULT_PUBLIC_SETTINGS,
        public_settings_customized: false,
        expiration_date: null,
      });
      toast.success('Perfil QR creado');
      setCreateDialog(false);
      setCreateForm((prev) => ({
        ...prev,
        name: '',
        alias: '',
      }));
      loadProfiles({
        currentPage: page,
        currentSearch: search,
        currentStatusFilter: statusFilter,
        currentTypeFilter: typeFilter,
        currentIncludeDeleted: includeDeleted,
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo crear el perfil');
    } finally {
      setCreateBusy(false);
    }
  };

  const openReassignDialog = (profile) => {
    setReassignProfile(profile);
    setReassignUserId(profile.user_id || '');
    setReassignDialog(true);
  };

  const handleReassign = async () => {
    if (!reassignProfile || !reassignUserId) {
      toast.error('Selecciona un usuario destino');
      return;
    }
    try {
      setReassignBusy(true);
      await reassignAdminQRProfile(reassignProfile.id, reassignUserId);
      toast.success('Perfil reasignado');
      setReassignDialog(false);
      setReassignProfile(null);
      loadProfiles({
        currentPage: page,
        currentSearch: search,
        currentStatusFilter: statusFilter,
        currentTypeFilter: typeFilter,
        currentIncludeDeleted: includeDeleted,
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo reasignar el perfil');
    } finally {
      setReassignBusy(false);
    }
  };

  const handleToggleStatus = async (profile) => {
    const newStatus = profile.status === 'paused' ? 'indefinite' : 'paused';
    try {
      await adminUpdateQRStatus(profile.id, newStatus);
      toast.success(`Perfil ${newStatus === 'paused' ? 'pausado' : 'activado'}`);
      loadProfiles({
        currentPage: page,
        currentSearch: search,
        currentStatusFilter: statusFilter,
        currentTypeFilter: typeFilter,
        currentIncludeDeleted: includeDeleted,
      });
    } catch (error) {
      toast.error('Error al cambiar estado');
    }
  };

  const handleDelete = async (profile) => {
    if (!window.confirm(`¿Eliminar el perfil "${profile.name}"?`)) return;
    try {
      await deleteAdminQRProfile(profile.id);
      toast.success('Perfil eliminado');
      loadProfiles({
        currentPage: page,
        currentSearch: search,
        currentStatusFilter: statusFilter,
        currentTypeFilter: typeFilter,
        currentIncludeDeleted: includeDeleted,
      });
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleDownloadQR = async (profile) => {
    try {
      const response = await fetch(`${API_BASE}/admin/qr-profiles/${profile.id}/download-qr`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed');
      const blob = await response.blob();
      const extension = getQrDownloadExtension(response.headers.get('content-type'));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${profile.hash}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Error al descargar QR');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <ProtectedRoute adminOnly>
      <AdminLayout>
        <div className="p-6 lg:p-8 space-y-6" data-testid="admin-qr-profiles">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-heading font-bold text-2xl">Códigos QR</h1>
              <p className="text-muted-foreground text-sm mt-1">Gestión de todos los perfiles QR de la plataforma</p>
            </div>
            <Button onClick={() => setCreateDialog(true)} data-testid="admin-create-qr-btn">
              <Plus className="mr-2 h-4 w-4" />
              Crear QR
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <Input
                  placeholder="Buscar por nombre, alias o hash..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  data-testid="admin-qr-search"
                />
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                  <SelectTrigger data-testid="admin-qr-status-filter">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="indefinite">Indefinido</SelectItem>
                    <SelectItem value="subscription">Suscripción</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                    <SelectItem value="deleted">Eliminado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
                  <SelectTrigger data-testid="admin-qr-type-filter">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="business">Empresa</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeDeleted}
                    onChange={(e) => setIncludeDeleted(e.target.checked)}
                    className="rounded"
                  />
                  Incluir eliminados
                </label>
                <Button onClick={handleSearch} data-testid="admin-qr-search-btn">
                  <Search className="mr-2 h-4 w-4" />Buscar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              <span>{total} perfiles encontrados</span>
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
                  <Pause className="mr-2 h-4 w-4" />
                  Pausar seleccionados
                </Button>
                <Button size="sm" variant="destructive" disabled={bulkBusy} onClick={() => runBulkAction('delete')}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar seleccionados
                </Button>
                <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={() => setSelectedProfileIds([])}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Limpiar selección
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>
              ) : profiles.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No se encontraron perfiles</div>
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
                        <TableHead>Nombre / Alias</TableHead>
                        <TableHead>Hash</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Subtipo</TableHead>
                        <TableHead>Escaneos</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Creación</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.map((p) => (
                        <TableRow key={p.id} data-testid={`admin-qr-row-${p.id}`}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedProfileIds.includes(p.id)}
                              onChange={(e) => toggleProfileSelection(p.id, e.target.checked)}
                              aria-label={`Seleccionar perfil ${p.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{p.name}</p>
                              {p.alias && <p className="text-xs text-muted-foreground">{p.alias}</p>}
                            </div>
                          </TableCell>
                          <TableCell><span className="font-mono text-xs">{p.hash}</span></TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANTS[p.status]} className="text-xs">
                              {STATUS_LABELS[p.status] || p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{p.profile_type === 'personal' ? 'Personal' : 'Empresa'}</TableCell>
                          <TableCell className="text-xs">{subTypeLabels[p.sub_type] || p.sub_type}</TableCell>
                          <TableCell className="font-medium">{p.scan_count || 0}</TableCell>
                          <TableCell>
                            {p.user_info ? (
                              <div>
                                <p className="text-xs font-medium">{p.user_info.name}</p>
                                <p className="text-xs text-muted-foreground">{p.user_info.email}</p>
                              </div>
                            ) : <span className="text-xs text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(p.created_at).toLocaleDateString('es-CL')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => window.open(`/profile/${p.hash}`, '_blank')} title="Ver público" data-testid={`admin-view-${p.id}`}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(p)} title="Editar" data-testid={`admin-edit-${p.id}`}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDownloadQR(p)} title="Descargar QR" data-testid={`admin-download-${p.id}`}>
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openReassignDialog(p)} title="Reasignar QR">
                                <UserPlus className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(p)} title={p.status === 'paused' ? 'Activar' : 'Pausar'}>
                                {p.status === 'paused' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(p)} title="Eliminar">
                                <Trash2 className="h-3.5 w-3.5" />
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
                  <span className="text-sm text-muted-foreground">{page * limit + 1}-{Math.min((page + 1) * limit, total)} de {total}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium flex items-center">{page + 1} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
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
              <DialogTitle>Crear Perfil QR (Admin)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={createForm.user_id} onValueChange={(value) => setCreateForm((prev) => ({ ...prev, user_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} · {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Perfil principal sucursal"
                />
              </div>
              <div className="space-y-2">
                <Label>Alias</Label>
                <Input
                  value={createForm.alias}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, alias: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={createForm.profile_type}
                    onValueChange={(value) => {
                      const options = value === 'personal' ? subTypeOptions.personal : subTypeOptions.business;
                      setCreateForm((prev) => ({
                        ...prev,
                        profile_type: value,
                        sub_type: options[0]?.value || '',
                      }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="business">Empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={createForm.sub_type}
                    onValueChange={(value) => setCreateForm((prev) => ({ ...prev, sub_type: value }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(createForm.profile_type === 'personal' ? subTypeOptions.personal : subTypeOptions.business).map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={createForm.status} onValueChange={(value) => setCreateForm((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indefinite">Indefinido</SelectItem>
                    <SelectItem value="subscription">Suscripción</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancelar</Button>
              <Button onClick={handleCreateProfile} disabled={createBusy}>
                {createBusy ? 'Creando...' : 'Crear QR'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={reassignDialog} onOpenChange={setReassignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reasignar Perfil QR</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Perfil: <span className="font-medium text-foreground">{reassignProfile?.name || '-'}</span>
              </p>
              <div className="space-y-2">
                <Label>Nuevo usuario propietario</Label>
                <Select value={reassignUserId} onValueChange={setReassignUserId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar usuario" /></SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} · {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReassignDialog(false)}>Cancelar</Button>
              <Button onClick={handleReassign} disabled={reassignBusy}>
                {reassignBusy ? 'Reasignando...' : 'Confirmar reasignación'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Perfil QR</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="edit-name-input" />
              </div>
              <div className="space-y-2">
                <Label>Alias</Label>
                <Input value={editForm.alias || ''} onChange={(e) => setEditForm({ ...editForm, alias: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indefinite">Indefinido</SelectItem>
                    <SelectItem value="subscription">Suscripción</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} data-testid="save-edit-btn">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </ProtectedRoute>
  );
};
