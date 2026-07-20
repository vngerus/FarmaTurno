import React from 'react';
import { MapPin, Phone, Clock, Navigation, Heart, ExternalLink } from 'lucide-react';
import type { Farmacia } from '../../types/farmacias.types';
import type { User } from '../../types/auth.types';

interface TarjetaFarmaciaProps {
  farmacia: Farmacia;
  isSelected: boolean;
  activeUser: User | null;
  onSelect: () => void;
  onToggleFavorite: (localId: string) => void;
}

export default function TarjetaFarmacia({
  farmacia,
  isSelected,
  activeUser,
  onSelect,
  onToggleFavorite,
}: TarjetaFarmaciaProps) {
  const isFavorite = activeUser && activeUser.favoritePharmacies?.includes(farmacia.local_id);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${farmacia.local_lat},${farmacia.local_lng}`;

  const handleSelect = () => {
    onSelect();
    window.posthog?.capture('pharmacy_selected', {
      local_id: farmacia.local_id,
      local_nombre: farmacia.local_nombre,
      comuna_nombre: farmacia.comuna_nombre,
    });
  };

  return (
    <div
      onClick={handleSelect}
      className={`flex flex-col p-5 glass-card rounded-2xl cursor-pointer group ${
        isSelected ? 'is-selected ring-1 ring-mint-500/20' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-extrabold text-slate-800 group-hover:text-mint-600 transition-colors text-base uppercase leading-snug truncate">
          {farmacia.local_nombre.toLowerCase()}
        </h3>

        {typeof farmacia.distanciaKm === 'number' && (
          <span className="shrink-0 bg-mint-50 border border-mint-100 text-mint-700 text-[10px] font-bold font-mono px-2 py-1 rounded-lg">
            {farmacia.distanciaKm.toFixed(1)} km
          </span>
        )}

        {activeUser && (
          <button
            onClick={e => {
              e.stopPropagation();
              onToggleFavorite(farmacia.local_id);
            }}
            title={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-500 transition-all shrink-0"
          >
            <Heart
              className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`}
            />
          </button>
        )}
      </div>

      <div className="flex items-start gap-2.5 text-xs text-slate-500 mb-4 leading-relaxed">
        <MapPin className="w-4 h-4 text-mint-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-slate-800 font-semibold">{farmacia.local_direccion}</p>
          <p className="text-slate-400 font-mono text-[10px]">
            {farmacia.comuna_nombre}{' '}
            {farmacia.localidad_nombre ? `(${farmacia.localidad_nombre})` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs mb-3">
        <div className="flex items-center gap-1.5 text-slate-500 font-mono">
          <Clock className="w-3.5 h-3.5 text-mint-600" />
          <span className="font-semibold">
            {farmacia.funcionamiento_hora_apertura.slice(0, 5)} -{' '}
            {farmacia.funcionamiento_hora_cierre.slice(0, 5)}
          </span>
        </div>
        {farmacia.local_telefono && (
          <a
            href={`tel:${farmacia.local_telefono.replace(/\s+/g, '')}`}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 text-mint-600 hover:text-mint-500 font-bold transition-colors justify-end font-mono"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="truncate">{farmacia.local_telefono}</span>
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-auto">
        <button
          onClick={e => {
            e.stopPropagation();
            handleSelect();
          }}
          className="py-2 px-3 bg-slate-50 border border-slate-200 hover:border-mint-500/30 text-slate-700 hover:text-mint-600 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5 text-mint-600" />
          Ubicación
        </button>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => {
            e.stopPropagation();
            window.posthog?.capture('pharmacy_directions_opened', {
              local_id: farmacia.local_id,
              local_nombre: farmacia.local_nombre,
              comuna_nombre: farmacia.comuna_nombre,
            });
          }}
          className="py-2 px-3 bg-mint-50 hover:bg-mint-600 text-mint-600 hover:text-white border border-mint-100 hover:border-transparent rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Cómo llegar
        </a>
      </div>
    </div>
  );
}
