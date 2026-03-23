import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { fetchAdminAnalytics, fetchAdminUsers, fetchAdminQRProfiles } from '../utils/api';
import { toast } from 'sonner';
import { Users, QrCode, ScanLine, DollarSign, TrendingUp, ArrowRight, Package } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export const AdminDashboardPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentProfiles, setRecentProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [analyticsData, usersData, profilesData] = await Promise.all([
        fetchAdminAnalytics(),
        fetchAdminUsers(),
        fetchAdminQRProfiles({ limit: 5 }),
      ]);
      setAnalytics(analyticsData);
      setRecentUsers((usersData.users || usersData || []).slice(0, 5));
      setRecentProfiles((profilesData.profiles || profilesData || []).slice(0, 5));
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute adminOnly>
        <AdminLayout>
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  const stats = [
    { label: 'Usuarios', value: analytics?.total_users || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Perfiles QR', value: analytics?.total_profiles || 0, icon: QrCode, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Escaneos', value: analytics?.total_scans || 0, icon: ScanLine, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Ingresos', value: `$${(analytics?.total_revenue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ];

  return (
    <ProtectedRoute adminOnly>
      <AdminLayout>
        <div className="p-6 lg:p-8 space-y-6" data-testid="admin-dashboard">
          <div>
            <h1 className="font-heading font-bold text-2xl" data-testid="admin-dashboard-title">Panel de Administración</h1>
            <p className="text-muted-foreground text-sm mt-1">Resumen general de la plataforma</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" data-testid={`stat-${stat.label.toLowerCase()}`}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Clientes Recientes</CardTitle>
                <Link to="/admin/users">
                  <Button variant="ghost" size="sm">
                    Ver todos <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin clientes</p>
                ) : recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between" data-testid={`recent-user-${user.id}`}>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {user.user_type === 'person' ? 'Persona' : 'Empresa'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent QR Profiles */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">QRs Recientes</CardTitle>
                <Link to="/admin/qr-profiles">
                  <Button variant="ghost" size="sm">
                    Ver todos <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentProfiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin perfiles QR</p>
                ) : recentProfiles.map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between" data-testid={`recent-profile-${profile.id}`}>
                    <div>
                      <p className="text-sm font-medium">{profile.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{profile.hash}</p>
                    </div>
                    <Badge variant={profile.status === 'paused' ? 'destructive' : 'secondary'} className="text-xs">
                      {profile.status === 'paused' ? 'Pausado' : profile.status === 'subscription' ? 'Suscripción' : 'Indefinido'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Link to="/admin/qr-profiles"><Button variant="outline" size="sm"><QrCode className="mr-2 h-4 w-4" />Gestionar QRs</Button></Link>
              <Link to="/admin/users"><Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" />Gestionar Clientes</Button></Link>
              <Link to="/admin/profile-editor"><Button variant="outline" size="sm"><TrendingUp className="mr-2 h-4 w-4" />Editor de Perfiles</Button></Link>
              <Link to="/admin/analytics"><Button variant="outline" size="sm"><ScanLine className="mr-2 h-4 w-4" />Ver Analítica</Button></Link>
              <Link to="/admin/store"><Button variant="outline" size="sm"><Package className="mr-2 h-4 w-4" />Tienda</Button></Link>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
};
