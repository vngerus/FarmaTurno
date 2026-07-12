import { useState, useEffect, useMemo } from 'react';
import { obtenerFarmacias } from '../services/farmacias.service';
import type { Farmacia } from '../types/farmacias.types';
import { REGION_MAP, REGIONES_ORDEN } from '../types/regiones.constants';

const CACHE_KEY = 'farmaturno_farmacias_cache';
const CACHE_TTL_MS = 10 * 60 * 1000;

function leerCache(): Farmacia[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function guardarCache(data: Farmacia[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
  }
}

export function useFarmacias() {
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedComuna, setSelectedComuna] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const cached = leerCache();
    if (cached) {
      setFarmacias(cached);
      setLoading(false);
      return;
    }

    const fetchFarmacias = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await obtenerFarmacias();
        setFarmacias(data);
        guardarCache(data);
      } catch (err) {
        console.error('Error in useFarmacias hook:', err);
        setError('No se pudo cargar la información de las farmacias. Inténtalo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchFarmacias();
  }, []);

  const regiones = useMemo(() => {
    return REGIONES_ORDEN.map(id => ({ id, nombre: REGION_MAP[id] }));
  }, []);

  const comunas = useMemo(() => {
    if (!selectedRegion) return [];
    
    const regionFarmacias = farmacias.filter(f => f.fk_region === selectedRegion);
    
    const uniqueComunas = new Map<string, string>();
    regionFarmacias.forEach(f => {
      if (f.fk_comuna && f.comuna_nombre) {
        uniqueComunas.set(f.fk_comuna, f.comuna_nombre.trim().toUpperCase());
      }
    });

    return Array.from(uniqueComunas.entries())
      .map(([id, nombre]) => ({
        id,
        nombre: nombre.charAt(0) + nombre.slice(1).toLowerCase()
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [farmacias, selectedRegion]);

  useEffect(() => {
    setSelectedComuna('');
  }, [selectedRegion]);

  const filteredFarmacias = useMemo(() => {
    return farmacias.filter(f => {
      if (selectedRegion && f.fk_region !== selectedRegion) {
        return false;
      }
      if (selectedComuna && f.fk_comuna !== selectedComuna) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesNombre = f.local_nombre?.toLowerCase().includes(query);
        const matchesDireccion = f.local_direccion?.toLowerCase().includes(query);
        const matchesComuna = f.comuna_nombre?.toLowerCase().includes(query);
        return matchesNombre || matchesDireccion || matchesComuna;
      }
      return true;
    });
  }, [farmacias, selectedRegion, selectedComuna, searchQuery]);

  return {
    farmacias,
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
    setSearchQuery
  };
}
