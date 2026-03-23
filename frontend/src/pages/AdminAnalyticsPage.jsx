import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { fetchAdminAnalytics, fetchAdminQRProfiles } from '../utils/api';
import { toast } from 'sonner';
import { Users, QrCode, ScanLine, DollarSign, TrendingUp, PieChart as PieChartIcon, Inbox, MousePointerClick } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { API_BASE } from '../utils/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export const AdminAnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [typeDistribution, setTypeDistribution] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [dailyScans, setDailyScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [analyticsData, profilesData] = await Promise.all([
        fetchAdminAnalytics(),
        fetchAdminQRProfiles({ limit: 1000, include_deleted: false }),
      ]);
      setAnalytics(analyticsData);

      // Calculate type distribution
      const profiles = profilesData.profiles || [];
      const typeCounts = {};
      const statusCounts = { indefinite: 0, subscription: 0, paused: 0 };

      profiles.forEach(p => {
        const label = p.sub_type || 'otro';
        typeCounts[label] = (typeCounts[label] || 0) + 1;
        if (statusCounts[p.status] !== undefined) statusCounts[p.status]++;
      });

      setTypeDistribution(Object.entries(typeCounts).map(([name, value]) => ({ name, value })));
      setStatusDistribution([
        { name: 'Indefinido', value: statusCounts.indefinite },
        { name: 'Suscripción', value: statusCounts.subscription },
        { name: 'Pausado', value: statusCounts.paused },
      ].filter(d => d.value > 0));

      // Fetch daily scans
      try {
        const scansRes = await fetch(`${API_BASE}/admin/analytics/daily-scans`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (scansRes.ok) {
          const scansData = await scansRes.json();
          setDailyScans(scansData);
        }
      } catch (e) {}

    } catch (error) {
      toast.error('Error al cargar analítica');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute adminOnly>
        <AdminLayout>
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div></div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  const stats = [
    { label: 'Usuarios', value: analytics?.total_users || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Perfiles QR', value: analytics?.total_profiles || 0, icon: QrCode, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Escaneos', value: analytics?.total_scans || 0, icon: ScanLine, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Leads', value: analytics?.total_leads || 0, icon: Inbox, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' },
    { label: 'Clics CTA', value: analytics?.total_action_clicks || 0, icon: MousePointerClick, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { label: 'Órdenes Pagadas', value: analytics?.paid_orders || 0, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Ingresos', value: `$${(analytics?.total_revenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  ];

  const formatShortDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };
  const funnelData = [
    { stage: 'Escaneos', value: analytics?.total_scans || 0 },
    { stage: 'Clics CTA', value: analytics?.total_action_clicks || 0 },
    { stage: 'Leads', value: analytics?.total_leads || 0 },
  ];

  return (
    <ProtectedRoute adminOnly>
      <AdminLayout>
        <div className="p-6 lg:p-8 space-y-6" data-testid="admin-analytics">
          <div>
            <h1 className="font-heading font-bold text-2xl">Analítica</h1>
            <p className="text-muted-foreground text-sm mt-1">Métricas y estadísticas de la plataforma</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold" data-testid={`analytics-${stat.label.toLowerCase()}`}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Embudo Comercial</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tasas de Conversión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <p className="text-sm text-muted-foreground">Escaneo → Clic CTA</p>
                  <p className="font-semibold">{analytics?.cta_conversion_rate ?? 0}%</p>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <p className="text-sm text-muted-foreground">Escaneo → Lead</p>
                  <p className="font-semibold">{analytics?.lead_conversion_rate ?? 0}%</p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <p className="text-sm text-muted-foreground">Clic CTA → Lead</p>
                  <p className="font-semibold">{analytics?.lead_from_click_rate ?? 0}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Scans */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Escaneos - Últimos 30 Días</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64" data-testid="daily-scans-chart">
                  {dailyScans.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyScans}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })} />
                        <Bar dataKey="scans" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sin datos de escaneos</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribución por Tipo de Perfil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64" data-testid="type-distribution-chart">
                  {typeDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {typeDistribution.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sin perfiles</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribución por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64" data-testid="status-distribution-chart">
                  {statusDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          <Cell fill="#10b981" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
};
