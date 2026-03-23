import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { fetchQRProfileDetails, updateQRStatus, deleteQRProfile, API_BASE } from '../utils/api';
import { toast } from 'sonner';
import {
  ArrowLeft, ExternalLink, Download, Palette, Play, Pause, Trash2, Edit,
  ScanLine, Calendar, MapPin, TrendingUp, Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SUB_TYPE_LABELS = {
  medico: 'Médico', mascota: 'Mascota', vehiculo: 'Vehículo',
  nino: 'Niño/Adulto Mayor', restaurante: 'Restaurante', hotel: 'Hotel',
  wifi: 'WiFi', tarjeta: 'Tarjeta', catalogo: 'Catálogo',
  turismo: 'Turismo', checkin: 'Check-in', encuesta: 'Encuesta',
  redes: 'Redes Sociales', evento: 'Evento',
};

export const QRDetailPage = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrImageUrl, setQrImageUrl] = useState('');

  const loadDetails = useCallback(async () => {
    try {
      const result = await fetchQRProfileDetails(profileId);
      setData(result);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar detalles del perfil');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [profileId, navigate]);

  const loadQRImage = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/qr-profiles/${profileId}/generate-qr`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const blob = await response.blob();
      setQrImageUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error('Error loading QR image');
    }
  }, [profileId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    if (data) loadQRImage();
  }, [data, loadQRImage]);

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(`${API_BASE}/qr-profiles/${profileId}/generate-qr`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${data.profile.hash}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('QR descargado');
    } catch (error) {
      toast.error('Error al descargar QR');
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = data.profile.status === 'paused' ? 'indefinite' : 'paused';
    try {
      await updateQRStatus(profileId, newStatus);
      toast.success(`Perfil ${newStatus === 'paused' ? 'pausado' : 'activado'}`);
      loadDetails();
    } catch (error) {
      toast.error('Error al cambiar estado');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de eliminar este perfil?')) return;
    try {
      await deleteQRProfile(profileId);
      toast.success('Perfil eliminado');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Error al eliminar perfil');
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('es-CL', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatShortDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  const { profile, total_scans, recent_scans, daily_data } = data;
  const statusVariants = { subscription: 'default', indefinite: 'secondary', paused: 'destructive' };
  const statusLabels = { subscription: 'Suscripción', indefinite: 'Indefinido', paused: 'Pausado' };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="qr-detail-container">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} data-testid="back-to-dashboard-btn">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="font-heading font-bold text-3xl" data-testid="qr-detail-name">{profile.name}</h1>
                  {profile.alias && profile.alias !== profile.name && (
                    <p className="text-muted-foreground mt-1">{profile.alias}</p>
                  )}
                </div>
                <Badge variant={statusVariants[profile.status]} className="text-sm">
                  {statusLabels[profile.status]}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <Badge variant="outline">{SUB_TYPE_LABELS[profile.sub_type] || profile.sub_type}</Badge>
                <Badge variant="outline">{profile.profile_type === 'personal' ? 'Personal' : 'Empresa'}</Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <ScanLine className="h-4 w-4 text-primary" />
                      <span className="text-2xl font-bold" data-testid="detail-total-scans">{total_scans}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Escaneos Totales</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-2xl font-bold">
                        {daily_data.reduce((sum, d) => sum + d.scans, 0)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Últimos 30 días</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{formatDate(profile.created_at).split(',')[0]}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Fecha Creación</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {profile.expiration_date ? new Date(profile.expiration_date).toLocaleDateString('es-CL') : 'Nunca'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Expiración</p>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => window.open(`/profile/${profile.hash}`, '_blank')} data-testid="detail-view-public-btn">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver Perfil Público
                </Button>
                <Button variant="outline" onClick={handleDownloadQR} data-testid="detail-download-btn">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar QR
                </Button>
                <Link to={`/qr/${profileId}/customize`}>
                  <Button variant="outline" data-testid="detail-customize-btn">
                    <Palette className="mr-2 h-4 w-4" />
                    Personalizar QR
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => navigate(`/dashboard`)} data-testid="detail-edit-btn">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button variant="outline" onClick={handleToggleStatus} data-testid="detail-toggle-status-btn">
                  {profile.status === 'paused' ? (
                    <><Play className="mr-2 h-4 w-4" />Activar</>
                  ) : (
                    <><Pause className="mr-2 h-4 w-4" />Pausar</>
                  )}
                </Button>
                <Button variant="destructive" onClick={handleDelete} data-testid="detail-delete-btn">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </div>

            {/* QR Preview */}
            <Card className="w-full lg:w-80 shrink-0">
              <CardContent className="pt-6 flex flex-col items-center">
                <img
                  src={qrImageUrl}
                  alt="Código QR"
                  className="w-56 h-56 object-contain mb-3"
                  data-testid="qr-preview-image"
                />
                <p className="font-mono text-sm text-muted-foreground select-all" data-testid="qr-hash-display">
                  {profile.hash}
                </p>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Escanea para ver el perfil público
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base">Escaneos - Últimos 30 días</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64" data-testid="scans-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily_data}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(v) => new Date(v).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                      formatter={(v) => [v, 'Escaneos']}
                    />
                    <Bar dataKey="scans" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Scans */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Escaneos Recientes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recent_scans.length === 0 ? (
                <div className="p-8 text-center">
                  <ScanLine className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Aún no hay escaneos</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>Dispositivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recent_scans.map((scan) => (
                        <TableRow key={scan.id} data-testid={`detail-scan-${scan.id}`}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatDate(scan.timestamp)}
                          </TableCell>
                          <TableCell>
                            {scan.lat && scan.lng ? (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span>{scan.lat.toFixed(4)}, {scan.lng.toFixed(4)}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Sin ubicación</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground truncate max-w-[250px] block">
                              {scan.user_agent ? scan.user_agent.substring(0, 60) : '-'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};
