import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';
import { API_BASE, getQrDownloadExtension } from '../utils/api';
import { toast } from 'sonner';
import { ArrowLeft, Download, RotateCcw } from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'Clásico', fg: '#000000', bg: '#ffffff' },
  { name: 'Azul Corporativo', fg: '#1e3a5f', bg: '#f0f4f8' },
  { name: 'Rojo Médico', fg: '#9b1c1c', bg: '#fff5f5' },
  { name: 'Verde Natural', fg: '#1a5c2a', bg: '#f0fff4' },
  { name: 'Púrpura', fg: '#553c9a', bg: '#faf5ff' },
  { name: 'Oscuro', fg: '#e2e8f0', bg: '#1a202c' },
  { name: 'Naranja', fg: '#c05621', bg: '#fffaf0' },
  { name: 'Cian', fg: '#086f83', bg: '#e6fffa' },
];

export const QRCustomizePage = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [profileHash, setProfileHash] = useState('');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [boxSize, setBoxSize] = useState(10);
  const [border, setBorder] = useState(4);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/qr-profiles/${profileId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Not found');
      const data = await response.json();
      setProfileHash(data.hash);
    } catch (error) {
      toast.error('Perfil no encontrado');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [profileId, navigate]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updatePreview = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        fg_color: fgColor,
        bg_color: bgColor,
        box_size: boxSize.toString(),
        border: border.toString(),
      });
      const response = await fetch(
        `${API_BASE}/qr-profiles/${profileId}/generate-qr-custom?${params}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      const blob = await response.blob();
      setPreviewBlobUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error('Error loading preview');
    }
  }, [profileId, fgColor, bgColor, boxSize, border]);

  useEffect(() => {
    if (!loading && profileHash) {
      updatePreview();
    }
  }, [loading, profileHash, updatePreview]);

  const handleDownload = async () => {
    try {
      const params = new URLSearchParams({
        fg_color: fgColor,
        bg_color: bgColor,
        box_size: boxSize.toString(),
        border: border.toString(),
      });
      const response = await fetch(
        `${API_BASE}/qr-profiles/${profileId}/generate-qr-custom?${params}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      const blob = await response.blob();
      const extension = getQrDownloadExtension(response.headers.get('content-type'));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${profileHash}-custom.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('QR personalizado descargado');
    } catch (error) {
      toast.error('Error al descargar');
    }
  };

  const handleReset = () => {
    setFgColor('#000000');
    setBgColor('#ffffff');
    setBoxSize(10);
    setBorder(4);
  };

  const applyPreset = (preset) => {
    setFgColor(preset.fg);
    setBgColor(preset.bg);
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="qr-customize-container">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/qr/${profileId}`)} data-testid="back-to-detail-btn">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver al detalle
            </Button>
          </div>

          <h1 className="font-heading font-bold text-3xl mb-8" data-testid="customize-title">
            Personalizar Código QR
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Controls */}
            <div className="space-y-6">
              {/* Color presets */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Temas Predefinidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-lg border hover:border-primary transition-colors"
                        data-testid={`preset-${preset.name.toLowerCase().replace(/\s/g, '-')}`}
                      >
                        <div className="flex gap-1">
                          <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: preset.fg }} />
                          <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: preset.bg }} />
                        </div>
                        <span className="text-xs text-center">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Custom colors */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Colores Personalizados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Color del QR</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer border-0"
                          data-testid="fg-color-picker"
                        />
                        <Input
                          value={fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="font-mono text-sm"
                          data-testid="fg-color-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Color de Fondo</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer border-0"
                          data-testid="bg-color-picker"
                        />
                        <Input
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="font-mono text-sm"
                          data-testid="bg-color-input"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Size options */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tamaño y Borde</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Tamaño del Módulo</Label>
                      <span className="text-sm text-muted-foreground font-mono">{boxSize}px</span>
                    </div>
                    <Slider
                      value={[boxSize]}
                      onValueChange={([v]) => setBoxSize(v)}
                      min={5}
                      max={20}
                      step={1}
                      data-testid="box-size-slider"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Borde</Label>
                      <span className="text-sm text-muted-foreground font-mono">{border}</span>
                    </div>
                    <Slider
                      value={[border]}
                      onValueChange={([v]) => setBorder(v)}
                      min={1}
                      max={10}
                      step={1}
                      data-testid="border-slider"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={handleDownload} className="flex-1" data-testid="download-custom-qr-btn">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar QR Personalizado
                </Button>
                <Button variant="outline" onClick={handleReset} data-testid="reset-btn">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restablecer
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div className="lg:sticky lg:top-24">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-center">Vista Previa</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div
                    className="p-6 rounded-lg border-2 border-dashed mb-4"
                    style={{ backgroundColor: bgColor }}
                  >
                    {previewBlobUrl ? (
                      <img
                        src={previewBlobUrl}
                        alt="QR Preview"
                        className="max-w-full"
                        style={{ maxHeight: '400px' }}
                        data-testid="qr-customize-preview"
                      />
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    )}
                  </div>
                  <p className="font-mono text-sm text-muted-foreground" data-testid="customize-hash-display">
                    ID: {profileHash}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    El QR apunta a: /profile/{profileHash}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};
