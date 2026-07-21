import React, { useState, useEffect } from 'react';
import { MapPin, Heart, X } from 'lucide-react';
import { useFarmacias } from '../../hooks/useFarmacias';
import { actualizarZonaFavorita, alternarFavoritoFarmacia } from '../../services/perfil.service';
import type { User } from '../../types/auth.types';

interface ZonaFavoritaFormProps {
  user: User;
  onUpdated: (regionId: string, comunaName: string) => void;
  onFavoritesChanged: (favoritePharmacies: string[]) => void;
}

export default function ZonaFavoritaForm({ user, onUpdated, onFavoritesChanged }: ZonaFavoritaFormProps) {
  const { farmacias, regiones, comunas, selectedRegion, setSelectedRegion, selectedComuna, setSelectedComuna } =
    useFarmacias();
  const [initialized, setInitialized] = useState<boolean>(false);
  const [comunaRestored, setComunaRestored] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialized || !user.favoriteRegion) return;
    setSelectedRegion(user.favoriteRegion);
    setInitialized(true);
  }, [initialized, user.favoriteRegion, setSelectedRegion]);

  useEffect(() => {
    if (comunaRestored || !user.favoriteComuna || comunas.length === 0) return;
    const found = comunas.find(c => c.nombre.toUpperCase() === user.favoriteComuna.toUpperCase());
    if (found) setSelectedComuna(found.id);
    setComunaRestored(true);
  }, [comunaRestored, user.favoriteComuna, comunas, setSelectedComuna]);

  const selectedComunaName = comunas.find(c => c.id === selectedComuna)?.nombre ?? '';
  const isUnchanged =
    selectedRegion === user.favoriteRegion &&
    (selectedComunaName === user.favoriteComuna || (!selectedComuna && !user.favoriteComuna));

  const handleGuardarZona = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await actualizarZonaFavorita(user.id, selectedRegion, selectedComunaName);
      onUpdated(selectedRegion, selectedComunaName);
      setInfo('Zona favorita actualizada.');
    } catch (err) {
      console.error('Error guardando zona favorita:', err);
      setError('No se pudo guardar la zona favorita.');
    } finally {
      setLoading(false);
    }
  };

  const favoritas = farmacias.filter(f => user.favoritePharmacies.includes(f.local_id));

  const handleQuitarFavorita = async (localId: string) => {
    setError(null);
    try {
      await alternarFavoritoFarmacia(user.id, localId, true);
      onFavoritesChanged(user.favoritePharmacies.filter(id => id !== localId));
    } catch (err) {
      console.error('Error quitando favorita:', err);
      setError('No se pudo quitar la farmacia de favoritos.');
    }
  };

  return (
    <div className="card-surface p-6 space-y-4">
      <h2 className="font-bold text-lg text-[#0f1f19] flex items-center gap-2 font-heading">
        <MapPin className="w-5 h-5 text-[#065f46]" />
        Zona favorita
      </h2>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl p-3 font-semibold">
          {error}
        </div>
      )}
      {info && (
        <div className="bg-mint-50 border border-mint-100 text-mint-700 text-xs rounded-xl p-3 font-semibold">
          {info}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Región</label>
          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none transition-all"
          >
            <option value="">Selecciona región</option>
            {regiones.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Comuna</label>
          <select
            value={selectedComuna}
            onChange={e => setSelectedComuna(e.target.value)}
            disabled={!selectedRegion}
            className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Selecciona comuna</option>
            {comunas.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGuardarZona}
        disabled={loading || isUnchanged}
        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wide bg-[#0f1f19] hover:bg-[#e8632c] text-white border-2 border-[#0f1f19] hover:border-[#e8632c] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Guardando…' : 'Guardar zona favorita'}
      </button>

      <div className="pt-2 border-t border-slate-100">
        <h3 className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-500" />
          Farmacias favoritas
        </h3>
        {favoritas.length === 0 ? (
          <p className="text-xs text-slate-500">
            Aún no tienes farmacias favoritas. Márcalas desde el mapa.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {favoritas.map(f => (
              <li
                key={f.local_id}
                className="flex items-center justify-between gap-2 bg-[#faf9f4] border border-slate-100 rounded-lg px-3 py-2"
              >
                <span className="text-xs text-slate-700 font-semibold truncate">
                  {f.local_nombre} — {f.comuna_nombre}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuitarFavorita(f.local_id)}
                  title="Quitar de favoritos"
                  className="text-slate-400 hover:text-rose-600 shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
