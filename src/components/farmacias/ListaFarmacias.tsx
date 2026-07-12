import React from 'react';
import { Search } from 'lucide-react';
import TarjetaFarmacia from './TarjetaFarmacia';
import type { Farmacia } from '../../types/farmacias.types';
import type { User } from '../../types/auth.types';

interface ListaFarmaciasProps {
  farmacias: Farmacia[];
  selectedFarmaciaId: string | null;
  activeUser: User | null;
  onSelectFarmacia: (localId: string) => void;
  onToggleFavorite: (localId: string) => void;
}

export default function ListaFarmacias({
  farmacias,
  selectedFarmaciaId,
  activeUser,
  onSelectFarmacia,
  onToggleFavorite,
}: ListaFarmaciasProps) {
  if (farmacias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
        <Search className="w-10 h-10 text-slate-400 mb-2" />
        <p className="font-extrabold text-slate-800">No hay turnos coincidentes</p>
        <p className="text-xs text-slate-500 mt-1 max-w-70">
          Intenta cambiar la comuna seleccionada o limpia los términos de búsqueda.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-h-150 overflow-y-auto p-2 -m-2 custom-scrollbar">
      {farmacias.map(farmacia => (
        <TarjetaFarmacia
          key={farmacia.local_id}
          farmacia={farmacia}
          isSelected={selectedFarmaciaId === farmacia.local_id}
          activeUser={activeUser}
          onSelect={() => onSelectFarmacia(farmacia.local_id)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
