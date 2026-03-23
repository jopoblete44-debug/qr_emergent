import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { fetchScanHistory } from '../utils/api';
import { toast } from 'sonner';
import { History, MapPin, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export const ScanHistoryPage = () => {
  const [scans, setScans] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    profile_id: '',
    start_date: '',
    end_date: '',
  });
  const limit = 20;

  const loadScans = useCallback(async ({ currentPage, currentFilters }) => {
    try {
      setLoading(true);
      const params = { skip: currentPage * limit, limit };
      if (currentFilters.profile_id) params.profile_id = currentFilters.profile_id;
      if (currentFilters.start_date) params.start_date = currentFilters.start_date;
      if (currentFilters.end_date) params.end_date = currentFilters.end_date;

      const data = await fetchScanHistory(params);
      setScans(data.scans);
      setTotal(data.total);
      if (data.profiles) setProfiles(data.profiles);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar historial de escaneos');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadScans({ currentPage: page, currentFilters: filters });
  }, [page, filters, loadScans]);

  const handleApplyFilters = () => {
    setPage(0);
    loadScans({ currentPage: 0, currentFilters: filters });
  };

  const handleClearFilters = () => {
    const resetFilters = { profile_id: '', start_date: '', end_date: '' };
    setFilters(resetFilters);
    setPage(0);
    setTimeout(() => loadScans({ currentPage: 0, currentFilters: resetFilters }), 0);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSubTypeName = (subType) => {
    const names = {
      medico: 'Médico', mascota: 'Mascota', vehiculo: 'Vehículo',
      nino: 'Niño/Adulto Mayor', restaurante: 'Restaurante', hotel: 'Hotel',
      wifi: 'WiFi', tarjeta: 'Tarjeta', catalogo: 'Catálogo',
      turismo: 'Turismo', checkin: 'Check-in', encuesta: 'Encuesta',
      redes: 'Redes Sociales', evento: 'Evento',
    };
    return names[subType] || subType;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="scan-history-container">
          <div className="flex items-center gap-3 mb-8">
            <History className="h-8 w-8 text-primary" />
            <h1 className="font-heading font-bold text-3xl sm:text-4xl" data-testid="scan-history-title">
              Historial de Escaneos
            </h1>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block text-muted-foreground">Perfil QR</label>
                  <Select
                    value={filters.profile_id}
                    onValueChange={(value) => setFilters({ ...filters, profile_id: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger data-testid="filter-profile-select">
                      <SelectValue placeholder="Todos los perfiles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los perfiles</SelectItem>
                      {profiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.alias || p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-muted-foreground">Fecha Inicio</label>
                  <Input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                    data-testid="filter-start-date"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-muted-foreground">Fecha Fin</label>
                  <Input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                    data-testid="filter-end-date"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleApplyFilters} className="flex-1" data-testid="apply-filters-btn">
                    <Search className="mr-2 h-4 w-4" />
                    Buscar
                  </Button>
                  <Button variant="outline" onClick={handleClearFilters} data-testid="clear-filters-btn">
                    Limpiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold" data-testid="total-scans-count">{total}</p>
                  <p className="text-sm text-muted-foreground">Escaneos Totales</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold" data-testid="profiles-count">{profiles.length}</p>
                  <p className="text-sm text-muted-foreground">Perfiles Activos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold" data-testid="today-scans-count">
                    {scans.filter(s => {
                      const today = new Date().toISOString().split('T')[0];
                      return s.timestamp && s.timestamp.startsWith(today);
                    }).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Escaneos Hoy</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Cargando...</p>
                </div>
              ) : scans.length === 0 ? (
                <div className="p-8 text-center">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">No hay escaneos registrados</p>
                  <p className="text-sm text-muted-foreground mt-1">Los escaneos aparecerán aquí cuando alguien escanee tus códigos QR</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Perfil</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Ubicación</TableHead>
                          <TableHead>Dispositivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scans.map((scan) => (
                          <TableRow key={scan.id} data-testid={`scan-row-${scan.id}`}>
                            <TableCell className="whitespace-nowrap text-sm">
                              {formatDate(scan.timestamp)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{scan.profile_name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{scan.profile_hash}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {getSubTypeName(scan.profile_sub_type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {scan.lat && scan.lng ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs">{scan.lat.toFixed(4)}, {scan.lng.toFixed(4)}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Sin ubicación</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                                {scan.user_agent ? scan.user_agent.substring(0, 50) + '...' : '-'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {page * limit + 1}-{Math.min((page + 1) * limit, total)} de {total}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(0, p - 1))}
                          disabled={page === 0}
                          data-testid="prev-page-btn"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium">
                          {page + 1} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={page >= totalPages - 1}
                          data-testid="next-page-btn"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};
