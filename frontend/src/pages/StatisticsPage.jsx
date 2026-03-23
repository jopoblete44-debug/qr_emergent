import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { fetchUserStatistics, fetchCampaignStatistics, fetchLoyaltySummary, downloadExecutiveReportPdf, redeemLoyaltyPoints } from '../utils/api';
import { toast } from 'sonner';
import { TrendingUp, QrCode, MapPin, Activity, Megaphone, Gift, FileDown, Inbox, MousePointerClick } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const StatisticsPage = () => {
  const [stats, setStats] = useState(null);
  const [campaignStats, setCampaignStats] = useState({ campaigns: [], variants: [], total_tracked_scans: 0 });
  const [loyaltySummary, setLoyaltySummary] = useState(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [data, campaignsData, loyaltyData] = await Promise.all([
        fetchUserStatistics(),
        fetchCampaignStatistics(30),
        fetchLoyaltySummary().catch(() => null),
      ]);
      setStats(data);
      setCampaignStats(campaignsData || { campaigns: [], variants: [], total_tracked_scans: 0 });
      setLoyaltySummary(loyaltyData);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const formatScansPerMonth = () => {
    if (!stats?.recent_scans) return [];
    
    const monthMap = {};
    stats.recent_scans.forEach(scan => {
      const date = new Date(scan.timestamp);
      const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
      monthMap[monthKey] = (monthMap[monthKey] || 0) + 1;
    });
    
    return Object.entries(monthMap).map(([month, count]) => ({
      month,
      escaneos: count
    }));
  };

  const funnelData = [
    { stage: 'Escaneos', value: stats?.total_scans || 0 },
    { stage: 'Clics CTA', value: stats?.total_action_clicks || 0 },
    { stage: 'Leads', value: stats?.total_leads || 0 },
  ];

  const handleDownloadReport = async () => {
    try {
      setDownloadingReport(true);
      const fileBlob = await downloadExecutiveReportPdf(30);
      const url = window.URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-ejecutivo-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte descargado');
    } catch (error) {
      toast.error('No se pudo descargar el reporte');
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleRedeemPoints = async () => {
    try {
      setRedeeming(true);
      await redeemLoyaltyPoints();
      toast.success('Puntos canjeados');
      loadStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo canjear');
    } finally {
      setRedeeming(false);
    }
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

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="statistics-page">
          <div className="flex items-center justify-between gap-4 mb-8">
            <h1 className="font-heading font-bold text-3xl sm:text-4xl">Estadísticas</h1>
            <Button onClick={handleDownloadReport} disabled={downloadingReport} data-testid="download-executive-report-btn">
              <FileDown className="h-4 w-4 mr-2" />
              {downloadingReport ? 'Generando...' : 'Reporte Ejecutivo'}
            </Button>
          </div>

          {/* Cards de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Perfiles</CardTitle>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_profiles || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.active_profiles || 0} activos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Escaneos</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_scans || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Acumulados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Perfiles Activos</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.active_profiles || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">En funcionamiento</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Perfiles Pausados</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.paused_profiles || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Inactivos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Escaneos con Campaña</CardTitle>
                <Megaphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaignStats?.total_tracked_scans || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Últimos 30 días</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Leads Capturados</CardTitle>
                <Inbox className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_leads || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Acumulados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Clics CTA</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_action_clicks || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Acumulados</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Embudo de Conversión</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tasas de Conversión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <p className="text-sm text-muted-foreground">Escaneo → Clic CTA</p>
                  <p className="font-semibold">{stats?.cta_conversion_rate ?? 0}%</p>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <p className="text-sm text-muted-foreground">Escaneo → Lead</p>
                  <p className="font-semibold">{stats?.lead_conversion_rate ?? 0}%</p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <p className="text-sm text-muted-foreground">Clic CTA → Lead</p>
                  <p className="font-semibold">{stats?.lead_from_click_rate ?? 0}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Escaneos por Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formatScansPerMonth()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="escaneos" stroke="#4f46e5" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 5 Perfiles Más Escaneados</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats?.top_profiles || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="scan_count" fill="#4f46e5" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Growth: campañas + fidelización */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Campañas (UTM)</CardTitle>
              </CardHeader>
              <CardContent>
                {campaignStats?.campaigns?.length ? (
                  <div className="space-y-3">
                    {campaignStats.campaigns.slice(0, 8).map((campaign) => (
                      <div key={`${campaign.source}-${campaign.medium}-${campaign.campaign}`} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium text-sm">{campaign.source} / {campaign.medium}</p>
                          <p className="text-xs text-muted-foreground">{campaign.campaign}</p>
                        </div>
                        <p className="font-bold text-sm">{campaign.scans}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin campañas registradas en el período.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Fidelización
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!loyaltySummary?.enabled ? (
                  <p className="text-sm text-muted-foreground">Programa de fidelización deshabilitado.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg border">
                        <p className="text-xs text-muted-foreground">Saldo</p>
                        <p className="text-2xl font-bold">{loyaltySummary?.points_balance || 0}</p>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <p className="text-xs text-muted-foreground">Acumulados</p>
                        <p className="text-2xl font-bold">{loyaltySummary?.points_lifetime || 0}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Umbral de canje: {loyaltySummary?.redeem_threshold || 0} puntos
                    </p>
                    <Button
                      type="button"
                      onClick={handleRedeemPoints}
                      disabled={!loyaltySummary?.can_redeem || redeeming}
                      data-testid="redeem-loyalty-btn"
                    >
                      {redeeming ? 'Canjeando...' : 'Canjear puntos'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Lista de top perfiles */}
          <Card>
            <CardHeader>
              <CardTitle>Perfiles Destacados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.top_profiles?.map((profile, index) => (
                  <div key={profile.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{profile.alias || profile.name}</p>
                        <p className="text-sm text-muted-foreground">{profile.sub_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{profile.scan_count}</p>
                      <p className="text-xs text-muted-foreground">escaneos</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};
