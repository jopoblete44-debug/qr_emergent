import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Download, Play, Pause, Trash2, Edit, ExternalLink, ScanLine, Calendar, Eye } from 'lucide-react';

const SUB_TYPE_CONFIG = {
  medico: { label: 'Médico', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  mascota: { label: 'Mascota', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  vehiculo: { label: 'Vehículo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  nino: { label: 'Niño/Adulto Mayor', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  restaurante: { label: 'Restaurante', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  hotel: { label: 'Hotel', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
  wifi: { label: 'WiFi', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300' },
  tarjeta: { label: 'Tarjeta', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300' },
  catalogo: { label: 'Catálogo', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  turismo: { label: 'Turismo', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
  checkin: { label: 'Check-in', color: 'bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300' },
  encuesta: { label: 'Encuesta', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300' },
  redes: { label: 'Redes Sociales', color: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300' },
  evento: { label: 'Evento', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' },
};

export const QRProfileCard = ({ profile, onDownloadQR, onToggleStatus, onDelete, onEdit, onViewProfile, showActions = true }) => {
  const internalAlias = String(profile.alias || profile.name || '').trim() || `qr-${profile.hash?.slice(0, 6) || profile.id}`;

  const getStatusBadge = (status) => {
    const variants = {
      subscription: 'default',
      indefinite: 'secondary',
      paused: 'destructive',
    };
    const labels = {
      subscription: 'Suscripción',
      indefinite: 'Indefinido',
      paused: 'Pausado',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const config = SUB_TYPE_CONFIG[profile.sub_type] || { label: profile.sub_type, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };

  return (
    <Card className="group hover:shadow-md transition-shadow" data-testid={`qr-profile-card-${profile.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={`/qr/${profile.id}`} className="hover:underline">
              <CardTitle className="font-heading text-lg truncate">{internalAlias}</CardTitle>
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">Alias interno</p>
          </div>
          {getStatusBadge(profile.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.color}`}>
            {config.label}
          </span>
          <Badge variant="outline" className="text-xs">
            {profile.profile_type === 'personal' ? 'Personal' : 'Empresa'}
          </Badge>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1" data-testid={`scan-count-${profile.id}`}>
            <ScanLine className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{profile.scan_count || 0}</span>
            <span>escaneos</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{new Date(profile.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Hash */}
        <div className="bg-muted/50 rounded px-2 py-1.5">
          <span className="font-mono text-xs text-muted-foreground select-all">{profile.hash}</span>
        </div>

        {showActions && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Link to={`/qr/${profile.id}`}>
              <Button size="sm" variant="default" data-testid={`view-detail-btn-${profile.id}`}>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Detalles
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewProfile ? onViewProfile(profile) : window.open(`/profile/${profile.hash}`, '_blank')}
              data-testid={`view-qr-btn-${profile.id}`}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Ver QR
            </Button>
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(profile)}
                data-testid={`edit-qr-btn-${profile.id}`}
              >
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDownloadQR(profile)}
              data-testid={`download-qr-btn-${profile.id}`}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Descargar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onToggleStatus(profile)}
              data-testid={`toggle-status-btn-${profile.id}`}
            >
              {profile.status === 'paused' ? (
                <><Play className="mr-1.5 h-3.5 w-3.5" />Activar</>
              ) : (
                <><Pause className="mr-1.5 h-3.5 w-3.5" />Pausar</>
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(profile)}
              data-testid={`delete-qr-btn-${profile.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
