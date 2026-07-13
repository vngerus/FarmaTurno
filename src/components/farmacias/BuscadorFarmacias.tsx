import React, { useState, useEffect, useMemo } from 'react';
import { useFarmacias } from '../../hooks/useFarmacias';
import { RefreshCw, Map } from 'lucide-react';
import FiltrosBuscador from './FiltrosBuscador';
import ListaFarmacias from './ListaFarmacias';
import { calcularDistanciaKm } from '../../utils/distancia';
import { obtenerUbicacion } from '../../utils/geolocation';
import { supabase } from '../../lib/supabaseClient';
import {
  obtenerUsuarioCompleto,
  actualizarZonaFavorita,
  alternarFavoritoFarmacia,
} from '../../services/perfil.service';
import type { Farmacia } from '../../types/farmacias.types';
import type { User } from '../../types/auth.types';

const COORDS_CACHE_KEY = 'farmaturno_user_coords_cache';
const COORDS_CACHE_TTL_MS = 10 * 60 * 1000;

function leerCoordsCache(): [number, number] | null {
  try {
    const raw = sessionStorage.getItem(COORDS_CACHE_KEY);
    if (!raw) return null;
    const { coords, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > COORDS_CACHE_TTL_MS) return null;
    return coords;
  } catch {
    return null;
  }
}

function guardarCoordsCache(coords: [number, number]) {
  try {
    sessionStorage.setItem(COORDS_CACHE_KEY, JSON.stringify({ coords, timestamp: Date.now() }));
  } catch {}
}

export default function BuscadorFarmacias() {
  const {
    filteredFarmacias,
    loading,
    error,
    regiones,
    comunas,
    selectedRegion,
    setSelectedRegion,
    selectedComuna,
    setSelectedComuna,
    searchQuery,
    setSearchQuery,
  } = useFarmacias();

  const [activeUser, setActiveUser] = useState<User | null>(null);

  const [selectedFarmaciaId, setSelectedFarmaciaId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);

  const [MapaComponent, setMapaComponent] = useState<React.ComponentType<{
    farmacias: Farmacia[];
    selectedFarmaciaId?: string | null;
    userCoords: [number, number] | null;
    onLocateUser: (coords: [number, number]) => void;
  }> | null>(null);

  useEffect(() => {
    import('./MapaFarmacias')
      .then(mod => setMapaComponent(() => mod.default))
      .catch(err => console.error('Error cargando MapaFarmacias:', err));

    const cachedCoords = leerCoordsCache();
    if (cachedCoords) {
      setUserCoords(cachedCoords);
    } else {
      obtenerUbicacion()
        .then(coords => {
          setUserCoords(coords);
          guardarCoordsCache(coords);
        })
        .catch(err => console.warn('Geolocalización automática no disponible:', err.message));
    }
  }, []);

  useEffect(() => {
    const cargarUsuario = async (userId: string, email: string) => {
      try {
        const user = await obtenerUsuarioCompleto(userId, email);
        setActiveUser(user);

        if (user.favoriteRegion) {
          setSelectedRegion(user.favoriteRegion);
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('load-favorite-comuna', { detail: user.favoriteComuna }),
            );
          }, 400);
        }
      } catch (e) {
        console.error('Error cargando sesión inicial:', e);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) cargarUsuario(session.user.id, session.user.email);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        cargarUsuario(session.user.id, session.user.email);
      } else {
        setActiveUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleRestoreComuna = (e: any) => {
      const favComunaName = e.detail;
      if (favComunaName && comunas.length > 0) {
        const found = comunas.find(c => c.nombre.toUpperCase() === favComunaName.toUpperCase());
        if (found) {
          setSelectedComuna(found.id);
        }
      }
    };
    window.addEventListener('load-favorite-comuna', handleRestoreComuna);
    return () => window.removeEventListener('load-favorite-comuna', handleRestoreComuna);
  }, [comunas]);

  const handleSaveFavoriteZone = async (regionId: string, comunaId: string, comunaName: string) => {
    if (!activeUser) return;

    try {
      await actualizarZonaFavorita(activeUser.id, regionId, comunaName);
      setActiveUser({ ...activeUser, favoriteRegion: regionId, favoriteComuna: comunaName });
    } catch (e) {
      console.error('Error guardando zona favorita:', e);
      alert('No se pudo guardar tu zona favorita.');
    }
  };

  const handleToggleFavoritePharmacy = async (localId: string) => {
    if (!activeUser) return;

    const esFavorito = activeUser.favoritePharmacies.includes(localId);
    try {
      await alternarFavoritoFarmacia(activeUser.id, localId, esFavorito);
      const favoritePharmacies = esFavorito
        ? activeUser.favoritePharmacies.filter(id => id !== localId)
        : [...activeUser.favoritePharmacies, localId];
      setActiveUser({ ...activeUser, favoritePharmacies });
    } catch (e) {
      console.error('Error actualizando favoritos:', e);
      alert('No se pudo actualizar tus favoritos.');
    }
  };

  const handleLocateUser = (coords: [number, number]) => {
    setSelectedFarmaciaId(null);
    setUserCoords(coords);
    guardarCoordsCache(coords);
  };

  const farmaciasConDistancia = useMemo(() => {
    if (!userCoords) return filteredFarmacias;

    const [userLat, userLng] = userCoords;
    return [...filteredFarmacias]
      .map(f => {
        const lat = parseFloat(f.local_lat);
        const lng = parseFloat(f.local_lng);
        if (isNaN(lat) || isNaN(lng)) return f;
        return { ...f, distanciaKm: calcularDistanciaKm(userLat, userLng, lat, lng) };
      })
      .sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity));
  }, [filteredFarmacias, userCoords]);

  const handleSelectFarmacia = (localId: string) => {
    setSelectedFarmaciaId(localId);

    const mapElement = document.getElementById('map-container');
    if (mapElement && window.innerWidth < 1024) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="w-full bg-white border-2 border-[#0f1f19] rounded-3xl p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#0f1f19] pb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0f1f19] font-heading">
            Buscador de Farmacias de Turno
          </h2>
          <p className="text-brand-body text-sm mt-1 font-medium">
            Información oficial del MINSAL con filtros inteligentes y trazado de rutas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex w-2.5 h-2.5 rounded-full bg-[#065f46] animate-pulse"></span>
          <span className="text-xs text-[#065f46] font-mono font-bold uppercase tracking-wider">
            SERVICIO ACTIVO
          </span>
        </div>
      </div>

      <FiltrosBuscador
        regiones={regiones}
        comunas={comunas}
        selectedRegion={selectedRegion}
        selectedComuna={selectedComuna}
        searchQuery={searchQuery}
        activeUser={activeUser}
        onRegionChange={setSelectedRegion}
        onComunaChange={setSelectedComuna}
        onSearchChange={setSearchQuery}
        onSaveFavoriteZone={handleSaveFavoriteZone}
      />

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-10 h-10 text-mint-600 animate-spin" />
          <p className="text-slate-500 text-sm font-semibold animate-pulse">
            Consultando turnos en tiempo real...
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Farmacias de Turno en Comuna</span>
              <span className="bg-mint-50 border border-mint-100 text-mint-600 px-2.5 py-0.5 rounded-full font-mono font-extrabold">
                {filteredFarmacias.length}
              </span>
            </div>

            <ListaFarmacias
              farmacias={farmaciasConDistancia}
              selectedFarmaciaId={selectedFarmaciaId}
              activeUser={activeUser}
              onSelectFarmacia={handleSelectFarmacia}
              onToggleFavorite={handleToggleFavoritePharmacy}
            />
          </div>

          <div id="map-container" className="lg:col-span-7 flex flex-col gap-4 min-h-100">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Map className="w-4 h-4 text-mint-600" />
                Mapa de Ruteo e Indicadores
              </span>
              {selectedFarmaciaId && (
                <button
                  onClick={() => setSelectedFarmaciaId(null)}
                  className="text-[10px] text-slate-400 hover:text-mint-600 font-mono font-bold uppercase transition-colors"
                >
                  Limpiar enfoque
                </button>
              )}
            </div>

            {MapaComponent ? (
              <MapaComponent
                farmacias={farmaciasConDistancia}
                selectedFarmaciaId={selectedFarmaciaId}
                userCoords={userCoords}
                onLocateUser={handleLocateUser}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-100 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-center animate-pulse">
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mb-2" />
                <p className="text-sm font-semibold">Iniciando mapa interactivo...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
