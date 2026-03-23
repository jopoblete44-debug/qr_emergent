import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { fetchAdminUsers, fetchAdminQRProfiles, fetchAdminAnalytics, adminUpdateQRStatus, updateAdminQRProfile, deleteAdminQRProfile } from '../utils/api';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Eye, Download, Edit, Trash2, Play, Pause, Search, Filter, ExternalLink } from 'lucide-react';
import { API_BASE } from '../utils/api';

export const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  
  // Edición
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [profiles, searchQuery, statusFilter, typeFilter, includeDeleted]);

  const loadData = async () => {
    try {
      const [usersData, profilesData, analyticsData] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminQRProfiles({ include_deleted: true }),
        fetchAdminAnalytics(),
      ]);
      setUsers(usersData.users || usersData || []);
      setProfiles(profilesData.profiles || profilesData || []);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...profiles];

    // Filtro de búsqueda
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.alias?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.hash?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      if (statusFilter === 'deleted') {
        filtered = filtered.filter(p => p.deleted_at !== null);
      } else {
        filtered = filtered.filter(p => p.status === statusFilter && !p.deleted_at);
      }
    }

    // Filtro por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.profile_type === typeFilter);
    }

    // Incluir/Excluir eliminados
    if (!includeDeleted) {
      filtered = filtered.filter(p => !p.deleted_at);
    }

    setFilteredProfiles(filtered);
  };

  const handleUpdateStatus = async (profileId, newStatus) => {
    try {
      await adminUpdateQRStatus(profileId, newStatus);
      toast.success('Estado actualizado');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar estado');
    }
  };

  const handleEditProfile = (profile) => {
    setEditingProfile(profile);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateAdminQRProfile(editingProfile.id, {
        name: editingProfile.name,
        alias: editingProfile.alias,
        status: editingProfile.status,
        expiration_date: editingProfile.expiration_date,
      });
      toast.success('Perfil actualizado');
      setShowEditDialog(false);
      setEditingProfile(null);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar perfil');
    }
  };

  const handleDeleteProfile = async (profileId) => {
    if (!window.confirm('¿Estás seguro de eliminar este perfil?')) return;
    
    try {
      await deleteAdminQRProfile(profileId);
      toast.success('Perfil eliminado');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar perfil');
    }
  };

  const handleDownloadQR = async (profile) => {
    try {
      const response = await fetch(`${API_BASE}/qr-profiles/${profile.id}/generate-qr`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${profile.hash}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('QR descargado');
    } catch (error) {
      console.error(error);
      toast.error('Error al descargar QR');
    }
  };

  const handleViewProfile = (hash) => {
    window.open(`/profile/${hash}`, '_blank');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(price);
  };

  const getStatusBadge = (profile) => {
    if (profile.deleted_at) {
      return <Badge variant="destructive">Eliminado</Badge>;
    }
    
    const variants = {
      subscription: 'default',
      indefinite: 'secondary',
      paused: 'outline',
    };
    const labels = {
      subscription: 'Suscripción',
      indefinite: 'Indefinido',
      paused: 'Pausado',
    };
    return <Badge variant={variants[profile.status]}>{labels[profile.status]}</Badge>;
  };

  const getExpirationDate = (profile) => {
    if (profile.status === 'indefinite') return 'Nunca';
    if (!profile.expiration_date) return 'N/A';
    return new Date(profile.expiration_date).toLocaleDateString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </Layout>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="admin-container">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl mb-8" data-testid="admin-title">
            Panel de Administración
          </h1>

          {/* Tabs */}
          <Tabs defaultValue="profiles" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profiles" data-testid="admin-tab-profiles">Perfiles QR</TabsTrigger>
              <TabsTrigger value="users" data-testid="admin-tab-users">Usuarios</TabsTrigger>
              <TabsTrigger value="analytics" data-testid="admin-tab-analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Perfiles QR Tab */}
            <TabsContent value="profiles">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Gestión de Perfiles QR</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {filteredProfiles.length} de {profiles.length} perfiles
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Filtros */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="search">Búsqueda</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search"
                          placeholder="Buscar por alias, nombre o hash"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8"
                          data-testid="admin-search-input"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status-filter">Estado</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger id="status-filter" data-testid="admin-status-filter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="indefinite">Indefinido</SelectItem>
                          <SelectItem value="subscription">Suscripción</SelectItem>
                          <SelectItem value="paused">Pausado</SelectItem>
                          <SelectItem value="deleted">Eliminado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type-filter">Tipo</Label>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger id="type-filter" data-testid="admin-type-filter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="business">Empresarial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 flex items-end">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeDeleted}
                          onChange={(e) => setIncludeDeleted(e.target.checked)}
                          className="rounded border-gray-300"
                          data-testid="admin-include-deleted-checkbox"
                        />
                        <span className="text-sm">Mostrar eliminados</span>
                      </label>
                    </div>
                  </div>

                  {/* Tabla */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium">Alias</th>
                          <th className="text-left py-3 px-2 font-medium">Hash</th>
                          <th className="text-left py-3 px-2 font-medium">Estado</th>
                          <th className="text-left py-3 px-2 font-medium">Escaneos</th>
                          <th className="text-left py-3 px-2 font-medium">Fecha Creación</th>
                          <th className="text-left py-3 px-2 font-medium">Tipo Cliente</th>
                          <th className="text-left py-3 px-2 font-medium">Expiración</th>
                          <th className="text-left py-3 px-2 font-medium">Perfil</th>
                          <th className="text-left py-3 px-2 font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProfiles.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="text-center py-8 text-muted-foreground">
                              No se encontraron perfiles
                            </td>
                          </tr>
                        ) : (
                          filteredProfiles.map(profile => (
                            <tr key={profile.id} className="border-b hover:bg-muted/50" data-testid={`admin-profile-row-${profile.id}`}>
                              <td className="py-3 px-2">
                                <div>
                                  <p className="font-medium">{profile.alias || profile.name}</p>
                                  {profile.user_info && (
                                    <p className="text-xs text-muted-foreground">{profile.user_info.email}</p>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-2 font-mono text-xs">{profile.hash}</td>
                              <td className="py-3 px-2">{getStatusBadge(profile)}</td>
                              <td className="py-3 px-2 text-center font-semibold">{profile.scan_count || 0}</td>
                              <td className="py-3 px-2 text-sm">
                                {new Date(profile.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-2">
                                <Badge variant={profile.user_info?.user_type === 'business' ? 'default' : 'secondary'}>
                                  {profile.user_info?.user_type === 'business' ? 'Empresa' : 'Personal'}
                                </Badge>
                              </td>
                              <td className="py-3 px-2 text-sm">{getExpirationDate(profile)}</td>
                              <td className="py-3 px-2">
                                <Badge variant="outline">{profile.sub_type}</Badge>
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewProfile(profile.hash)}
                                    data-testid={`admin-view-profile-${profile.id}`}
                                    title="Ver perfil público"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    Ver
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditProfile(profile)}
                                    data-testid={`admin-edit-profile-${profile.id}`}
                                    title="Editar"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDownloadQR(profile)}
                                    data-testid={`admin-download-qr-${profile.id}`}
                                    title="Descargar QR"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  {!profile.deleted_at && (
                                    <>
                                      {profile.status !== 'paused' ? (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleUpdateStatus(profile.id, 'paused')}
                                          data-testid={`admin-pause-profile-${profile.id}`}
                                        >
                                          <Pause className="h-4 w-4" />
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleUpdateStatus(profile.id, 'indefinite')}
                                          data-testid={`admin-activate-profile-${profile.id}`}
                                        >
                                          <Play className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteProfile(profile.id)}
                                        data-testid={`admin-delete-profile-${profile.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Usuarios Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">Nombre</th>
                          <th className="text-left py-3 px-2">Email</th>
                          <th className="text-left py-3 px-2">Tipo</th>
                          <th className="text-left py-3 px-2">Fecha Registro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => (
                          <tr key={user.id} className="border-b hover:bg-muted/50" data-testid={`admin-user-row-${user.id}`}>
                            <td className="py-3 px-2">{user.name}</td>
                            <td className="py-3 px-2">{user.email}</td>
                            <td className="py-3 px-2">
                              <Badge variant={user.user_type === 'person' ? 'default' : 'secondary'}>
                                {user.user_type === 'person' ? 'Personal' : 'Empresa'}
                              </Badge>
                            </td>
                            <td className="py-3 px-2 text-sm text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="admin-stat-users">{analytics.total_users}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Total Perfiles QR</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="admin-stat-profiles">{analytics.total_profiles}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Total Escaneos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="admin-stat-scans">{analytics.total_scans}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Órdenes Pagadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="admin-stat-orders">
                        {analytics.paid_orders}/{analytics.total_orders}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold" data-testid="admin-stat-revenue">
                        {formatPrice(analytics.total_revenue)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Edit Dialog */}
          {editingProfile && (
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent data-testid="admin-edit-profile-dialog">
                <DialogHeader>
                  <DialogTitle>Editar Perfil QR</DialogTitle>
                  <DialogDescription>
                    Edita la información del perfil QR
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nombre</Label>
                    <Input
                      id="edit-name"
                      value={editingProfile.name}
                      onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-alias">Alias</Label>
                    <Input
                      id="edit-alias"
                      value={editingProfile.alias || ''}
                      onChange={(e) => setEditingProfile({ ...editingProfile, alias: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Estado</Label>
                    <Select
                      value={editingProfile.status}
                      onValueChange={(value) => setEditingProfile({ ...editingProfile, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indefinite">Indefinido</SelectItem>
                        <SelectItem value="subscription">Suscripción</SelectItem>
                        <SelectItem value="paused">Pausado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-expiration">Fecha de Expiración</Label>
                    <Input
                      id="edit-expiration"
                      type="date"
                      value={editingProfile.expiration_date || ''}
                      onChange={(e) => setEditingProfile({ ...editingProfile, expiration_date: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveEdit} data-testid="admin-confirm-edit-btn">
                    Guardar Cambios
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
};
