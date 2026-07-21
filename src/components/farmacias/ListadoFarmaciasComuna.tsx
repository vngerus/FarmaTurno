import React, { useState } from 'react';
import { RefreshCw, MapPin } from 'lucide-react';
import { useFarmaciasComuna } from '../../hooks/useFarmaciasComuna';
import { useAuth } from '../../hooks/useAuth';
import { alternarFavoritoFarmacia } from '../../services/perfil.service';
import ListaFarmacias from './ListaFarmacias';

interface ListadoFarmaciasComunaProps {
  comunaNombre: string;
}

export default function ListadoFarmaciasComuna({ comunaNombre }: ListadoFarmaciasComunaProps) {
  const { farmacias, loading, error } = useFarmaciasComuna(comunaNombre);
  const { user, refreshUser } = useAuth();
  const [selectedFarmaciaId, setSelectedFarmaciaId] = useState<string | null>(null);

  const handleToggleFavorite = async (localId: string) => {
    if (!user) return;
    const esFavorito = user.favoritePharmacies.includes(localId);
    try {
      await alternarFavoritoFarmacia(user.id, localId, esFavorito);
      await refreshUser();
    } catch (e) {
      console.error('Error actualizando favoritos:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <RefreshCw className="w-8 h-8 text-mint-600 animate-spin" />
        <p className="text-slate-500 text-sm font-semibold">Consultando turnos en tiempo real...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
        <p className="text-red-700 text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (farmacias.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center">
        <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="font-bold text-slate-800">
          No hay farmacia de turno registrada en {comunaNombre} en este momento.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Los turnos rotan por calendario. Revisa el{' '}
          <a href="/mapa-turnos" className="text-mint-600 font-bold underline">
            mapa completo de turnos
          </a>{' '}
          para ver comunas vecinas.
        </p>
      </div>
    );
  }

  return (
    <ListaFarmacias
      farmacias={farmacias}
      selectedFarmaciaId={selectedFarmaciaId}
      activeUser={user}
      onSelectFarmacia={setSelectedFarmaciaId}
      onToggleFavorite={handleToggleFavorite}
    />
  );
}
