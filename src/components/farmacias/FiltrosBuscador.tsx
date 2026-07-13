import React from 'react';
import { Filter, Search, Star } from 'lucide-react';
import type { RegionOption, ComunaOption } from '../../types/regiones.types';
import type { User } from '../../types/auth.types';

interface FiltrosBuscadorProps {
  regiones: RegionOption[];
  comunas: ComunaOption[];
  selectedRegion: string;
  selectedComuna: string;
  searchQuery: string;
  activeUser: User | null;
  onRegionChange: (regionId: string) => void;
  onComunaChange: (comunaId: string) => void;
  onSearchChange: (query: string) => void;
  onSaveFavoriteZone: (regionId: string, comunaId: string, comunaName: string) => void;
}

export default function FiltrosBuscador({
  regiones,
  comunas,
  selectedRegion,
  selectedComuna,
  searchQuery,
  activeUser,
  onRegionChange,
  onComunaChange,
  onSearchChange,
  onSaveFavoriteZone,
}: FiltrosBuscadorProps) {
  const selectedComunaName = React.useMemo(() => {
    const com = comunas.find(c => c.id === selectedComuna);
    return com ? com.nombre : '';
  }, [comunas, selectedComuna]);

  const isCurrentComunaFavorite =
    activeUser &&
    activeUser.favoriteRegion === selectedRegion &&
    activeUser.favoriteComuna === selectedComunaName;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 mb-8 items-end">
      <div className="lg:col-span-4 relative">
        <label
          htmlFor="region-select"
          className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
        >
          Región
        </label>
        <div className="relative">
          <select
            id="region-select"
            value={selectedRegion}
            onChange={e => onRegionChange(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 text-slate-800 text-sm outline-none appearance-none cursor-pointer pr-10"
          >
            <option value="">Todas las regiones</option>
            {regiones.map(reg => (
              <option key={reg.id} value={reg.id}>
                {reg.nombre}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
            <Filter className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 relative">
        <label
          htmlFor="comuna-select"
          className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
        >
          Comuna
        </label>
        <div className="relative">
          <select
            id="comuna-select"
            value={selectedComuna}
            onChange={e => onComunaChange(e.target.value)}
            disabled={!selectedRegion}
            className={`w-full glass-input rounded-xl px-4 py-3 text-slate-800 text-sm outline-none appearance-none cursor-pointer pr-10 ${
              !selectedRegion ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''
            }`}
          >
            <option value="">Todas las comunas</option>
            {comunas.map(com => (
              <option key={com.id} value={com.id}>
                {com.nombre}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
            <Filter className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 relative">
        <label
          htmlFor="search-input"
          className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
        >
          Nombre o Dirección
        </label>
        <div className="relative">
          <input
            id="search-input"
            type="text"
            placeholder="Ej. Ahumada, Avenida..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-slate-800 text-sm outline-none"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="lg:col-span-1 flex items-center justify-center lg:justify-end h-11.5 mt-2 lg:mt-0">
        {activeUser && selectedRegion && selectedComuna ? (
          <button
            type="button"
            onClick={() => onSaveFavoriteZone(selectedRegion, selectedComuna, selectedComunaName)}
            title={
              isCurrentComunaFavorite ? 'Esta es tu zona favorita' : 'Guardar comuna como favorita'
            }
            className={`p-3 border rounded-xl transition-all cursor-pointer ${
              isCurrentComunaFavorite
                ? 'bg-mint-50 border-mint-200 text-mint-600'
                : 'bg-slate-50 border-slate-200 hover:border-mint-400 text-slate-500 hover:text-mint-600'
            }`}
          >
            <Star
              className={`w-5 h-5 ${isCurrentComunaFavorite ? 'fill-mint-600 text-mint-600' : ''}`}
            />
          </button>
        ) : (
          <div className="w-5 h-5 hidden lg:block"></div>
        )}
      </div>
    </div>
  );
}
