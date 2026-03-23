import React, { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { downloadMyLeadsCsv, fetchMyLeads, updateMyLeadStatus } from '../utils/api';
import { toast } from 'sonner';
import { Inbox, Search, Filter, ChevronLeft, ChevronRight, Download } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'closed', label: 'Cerrado' },
  { value: 'spam', label: 'Spam' },
];

export const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    profile_id: '',
    status: '',
    search: '',
  });
  const limit = 20;

  const loadLeads = useCallback(async ({ currentPage, currentFilters }) => {
    try {
      setLoading(true);
      const params = {
        skip: currentPage * limit,
        limit,
      };
      if (currentFilters.profile_id) params.profile_id = currentFilters.profile_id;
      if (currentFilters.status) params.status = currentFilters.status;
      if (currentFilters.search.trim()) params.search = currentFilters.search.trim();

      const data = await fetchMyLeads(params);
      setLeads(data.leads || []);
      setProfiles(data.profiles || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error('Error al cargar leads');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadLeads({ currentPage: page, currentFilters: filters });
  }, [page, filters, loadLeads]);

  const handleApplyFilters = () => {
    setPage(0);
    loadLeads({ currentPage: 0, currentFilters: filters });
  };

  const handleClearFilters = () => {
    const resetFilters = { profile_id: '', status: '', search: '' };
    setFilters(resetFilters);
    setPage(0);
    setTimeout(() => loadLeads({ currentPage: 0, currentFilters: resetFilters }), 0);
  };

  const handleStatusChange = async (leadId, status) => {
    try {
      await updateMyLeadStatus(leadId, status);
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)));
      toast.success('Estado actualizado');
    } catch (error) {
      toast.error('No se pudo actualizar el estado');
    }
  };

  const totalPages = Math.ceil(total / limit);

  const handleExportCsv = async () => {
    try {
      const params = {};
      if (filters.profile_id) params.profile_id = filters.profile_id;
      if (filters.status) params.status = filters.status;
      if (filters.search.trim()) params.search = filters.search.trim();
      const fileBlob = await downloadMyLeadsCsv(params);
      const url = window.URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mis-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV descargado');
    } catch (error) {
      toast.error('No se pudo descargar CSV');
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="leads-page">
          <div className="flex items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <Inbox className="h-7 w-7 text-primary" />
              <h1 className="font-heading font-bold text-3xl sm:text-4xl">Leads</h1>
            </div>
            <Button variant="outline" onClick={handleExportCsv} data-testid="leads-export-csv-btn">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Select value={filters.profile_id || 'all'} onValueChange={(value) => setFilters((prev) => ({ ...prev, profile_id: value === 'all' ? '' : value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los perfiles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los perfiles</SelectItem>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.alias || profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={filters.status || 'all'} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value === 'all' ? '' : value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    placeholder="Buscar lead"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleApplyFilters} className="flex-1">
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                  <Button variant="outline" onClick={handleClearFilters}>Limpiar</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : leads.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No hay leads registrados</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Perfil</TableHead>
                          <TableHead>Contacto</TableHead>
                          <TableHead>Mensaje</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell className="whitespace-nowrap text-xs">
                              {lead.timestamp ? new Date(lead.timestamp).toLocaleString('es-CL') : '-'}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-sm">{lead.profile_alias || lead.profile_name || '-'}</p>
                              <p className="text-xs text-muted-foreground font-mono">{lead.profile_hash || ''}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{lead.name || '-'}</p>
                              <p className="text-xs text-muted-foreground">{lead.phone || lead.email || '-'}</p>
                            </TableCell>
                            <TableCell className="max-w-[320px]">
                              <p className="text-sm truncate">{lead.message || '-'}</p>
                            </TableCell>
                            <TableCell>
                              <Select value={lead.status || 'new'} onValueChange={(value) => handleStatusChange(lead.id, value)}>
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {page * limit + 1}-{Math.min((page + 1) * limit, total)} de {total}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(0, prev - 1))} disabled={page === 0}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium">{page + 1} / {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))} disabled={page >= totalPages - 1}>
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
