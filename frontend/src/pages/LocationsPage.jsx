import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { fetchMyQRProfiles, fetchProfileLocations } from '../utils/api';
import { toast } from 'sonner';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const getLocationKey = (location, index) => location.id || `${location.timestamp || 'ts'}-${index}`;

const MapFocusController = ({ selectedLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (!selectedLocation) return;
    map.setView([selectedLocation.lat, selectedLocation.lng], Math.max(map.getZoom(), 13), {
      animate: true,
    });
  }, [map, selectedLocation]);

  return null;
};

export const LocationsPage = () => {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocationKey, setSelectedLocationKey] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfiles = useCallback(async () => {
    try {
      const data = await fetchMyQRProfiles();
      setProfiles(data);
      if (data.length > 0) {
        setSelectedProfile(data[0].id);
      }
    } catch (error) {
      toast.error('Error al cargar perfiles');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    try {
      const data = await fetchProfileLocations(selectedProfile);
      const sorted = [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setLocations(sorted);
      if (sorted.length > 0) {
        setSelectedLocationKey(getLocationKey(sorted[0], 0));
      } else {
        setSelectedLocationKey(null);
      }
    } catch (error) {
      toast.error('Error al cargar ubicaciones');
    }
  }, [selectedProfile]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (selectedProfile) {
      loadLocations();
    }
  }, [selectedProfile, loadLocations]);

  const selectedLocation = useMemo(() => {
    if (!selectedLocationKey) return locations[0] || null;
    const found = locations.find((loc, index) => getLocationKey(loc, index) === selectedLocationKey);
    return found || locations[0] || null;
  }, [locations, selectedLocationKey]);

  const center = selectedLocation
    ? [selectedLocation.lat, selectedLocation.lng]
    : [-33.4489, -70.6693];

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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="locations-page">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl mb-8">Ubicaciones de Escaneos</h1>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Seleccionar Perfil QR</label>
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="Selecciona un perfil" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.alias || profile.name} ({profile.scan_count} escaneos)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Mapa de Escaneos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[500px] rounded-lg overflow-hidden relative z-0">
                  <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapFocusController selectedLocation={selectedLocation} />
                    {locations.map((location, index) => {
                      const locationKey = getLocationKey(location, index);
                      return (
                        <Marker key={locationKey} position={[location.lat, location.lng]}>
                          <Popup>
                            <div>
                              <p className="font-semibold">Escaneo #{index + 1}</p>
                              <p className="text-sm">{new Date(location.timestamp).toLocaleString()}</p>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historial ({locations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {locations.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No hay escaneos registrados</p>
                  ) : (
                    locations.map((location, index) => {
                      const locationKey = getLocationKey(location, index);
                      const isSelected = selectedLocationKey === locationKey;
                      return (
                        <button
                          type="button"
                          key={locationKey}
                          onClick={() => setSelectedLocationKey(locationKey)}
                          className={`w-full text-left p-3 border rounded-lg transition-colors ${
                            isSelected ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'
                          }`}
                          data-testid={`location-history-item-${index}`}
                        >
                          <p className="font-semibold text-sm">Escaneo #{index + 1}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(location.timestamp).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};
