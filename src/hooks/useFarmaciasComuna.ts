import { useEffect, useState } from 'react';
import { obtenerFarmacias } from '../services/farmacias.service';
import { normalizarComuna } from '../utils/texto';
import type { Farmacia } from '../types/farmacias.types';

export function filtrarFarmaciasPorComuna(farmacias: Farmacia[], comunaNombre: string): Farmacia[] {
  const objetivo = normalizarComuna(comunaNombre);
  return farmacias.filter(f => normalizarComuna(f.comuna_nombre ?? '') === objetivo);
}

export function useFarmaciasComuna(comunaNombre: string) {
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    setLoading(true);
    setError(null);

    obtenerFarmacias()
      .then(todas => {
        if (cancelado) return;
        setFarmacias(filtrarFarmaciasPorComuna(todas, comunaNombre));
      })
      .catch(() => {
        if (!cancelado) setError('No se pudo cargar la información de las farmacias.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [comunaNombre]);

  return { farmacias, loading, error };
}
