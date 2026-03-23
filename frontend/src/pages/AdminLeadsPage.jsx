import React, { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { downloadAdminLeadsCsv, fetchAdminLeads, updateAdminLeadStatus } from '../utils/api';
import { toast } from 'sonner';
import { Inbox, Search, Filter, ChevronLeft, ChevronRight, Download } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'closed', label: 'Cerrado' },
  { value: 'spam', label: 'Spam' },
];

export const AdminLeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const limit = 25;

  const loadLeads = useCallback(async ({ currentPage, currentFilters }) => {
    try {
      setLoading(true);
      const params = {
        skip: currentPage * limit,
        limit,
      };
      if (currentFilters.status) params.status = currentFilters.status;
      if (currentFilters.search.trim()) params.search = currentFilters.search.trim();

      const data = await fetchAdminLeads(params);
      setLeads(data.leads || []);
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
    loadLeads({
      currentPage: 0,
      currentFilters: filters,
    });
  };

  const handleClearFilters = () => {
    const resetFilters = { status: '', search: '' };
    setFilters(resetFilters);
    setPage(0);
    setTimeout(() => loadLeads({ currentPage: 0, currentFilters: resetFilters }), 0);
  };

  const handleStatusChange = async (leadId, status) => {
    try {
      await updateAdminLeadStatus(leadId, status);
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)));
      toast.success('Estado actualizado');
    } catch (error) {
      toast.error('No se pudo actualizar estado');
    }
  };

  const totalPages = Math.ceil(total / limit);

  const handleExportCsv = async () => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.search.trim()) params.search = filters.search.trim();
      const fileBlob = await downloadAdminLeadsCsv(params);
      const url = window.URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV descargado');
    } catch (error) {
      toast.error('No se pudo descargar CSV');
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <AdminLayout>
        <div className="p-6 lg:p-8 space-y-6" data-testid="admin-leads-page">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Inbox className="h-6 w-6" />
              <h1 className="font-heading font-bold text-2xl">Leads</h1>
            </div>
            <Button variant="outline" onClick={handleExportCsv} data-testid="admin-leads-export-csv-btn">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <Input
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder="Buscar por nombre/email/mensaje"
                />

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
                <div className="p-8 text-center text-muted-foreground">No hay leads</div>
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
                          <TableHead>Campaña</TableHead>
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
                              <p className="text-sm font-medium">{lead.profile_alias || lead.profile_name || '-'}</p>
                              <p className="text-xs text-muted-foreground font-mono">{lead.qr_hash || '-'}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{lead.name || '-'}</p>
                              <p className="text-xs text-muted-foreground">{lead.phone || lead.email || '-'}</p>
                            </TableCell>
                            <TableCell className="max-w-[260px]">
                              <p className="text-sm truncate">{lead.message || '-'}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-xs">{lead.campaign_source || 'direct'}</p>
                              <p className="text-xs text-muted-foreground">{lead.campaign_name || '(none)'}</p>
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
      </AdminLayout>
    </ProtectedRoute>
  );
};
