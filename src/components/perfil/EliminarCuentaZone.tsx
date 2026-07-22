import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function EliminarCuentaZone() {
  const [confirming, setConfirming] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError('Ingresa tu contraseña.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Debes iniciar sesión de nuevo.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/eliminar-cuenta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'No se pudo eliminar la cuenta.');
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Error eliminando cuenta:', err);
      setError('No se pudo eliminar la cuenta. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-rose-200 bg-rose-50/50 rounded-2xl p-6 space-y-4">
      <h2 className="font-bold text-lg text-rose-700 flex items-center gap-2 font-heading">
        <AlertTriangle className="w-5 h-5" />
        Zona de peligro
      </h2>
      <p className="text-sm text-rose-700/80">
        Eliminar tu cuenta es una acción permanente. Se borrarán tu perfil, favoritos y todos tus datos.
      </p>

      {error && (
        <div className="bg-rose-100 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 font-semibold">
          {error}
        </div>
      )}

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wide bg-rose-600 hover:bg-rose-700 text-white border-2 border-rose-600 hover:border-rose-700 transition-all cursor-pointer"
        >
          Eliminar cuenta
        </button>
      ) : (
        <form onSubmit={handleDelete} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-rose-700 uppercase mb-1">
              Confirma tu contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white border border-rose-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-4 py-2.5 text-slate-800 text-sm outline-none transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wide bg-rose-600 hover:bg-rose-700 text-white border-2 border-rose-600 hover:border-rose-700 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Eliminando…' : 'Confirmar eliminación'}
            </button>
            <button
              type="button"
              onClick={() => { setConfirming(false); setPassword(''); setError(null); }}
              className="py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wide bg-white hover:bg-slate-50 text-slate-600 border-2 border-slate-200 transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
