import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { validatePasswordForm } from '../../zodschemas/perfil.schema';
import { supabase } from '../../lib/supabaseClient';

interface CambiarPasswordFormProps {
  userEmail: string;
}

export default function CambiarPasswordForm({ userEmail }: CambiarPasswordFormProps) {
  const [passwordActual, setPasswordActual] = useState<string>('');
  const [passwordNueva, setPasswordNueva] = useState<string>('');
  const [showActual, setShowActual] = useState<boolean>(false);
  const [showNueva, setShowNueva] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const validation = validatePasswordForm({ passwordActual, passwordNueva });
    if (!validation.success) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: validation.data.passwordActual,
      });
      if (signInError) {
        setError('Contraseña actual incorrecta.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: validation.data.passwordNueva,
      });
      if (updateError) throw updateError;

      setInfo('Contraseña actualizada.');
      setPasswordActual('');
      setPasswordNueva('');
    } catch (err) {
      console.error('Error cambiando contraseña:', err);
      setError('No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-surface p-6 space-y-4">
      <h2 className="font-bold text-lg text-[#0f1f19] flex items-center gap-2 font-heading">
        <KeyRound className="w-5 h-5 text-[#065f46]" />
        Cambiar contraseña
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

      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contraseña actual</label>
        <div className="relative">
          <input
            type={showActual ? 'text' : 'password'}
            required
            value={passwordActual}
            onChange={e => setPasswordActual(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-4 pr-10 py-2.5 text-slate-800 text-sm outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => setShowActual(!showActual)}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            tabIndex={-1}
          >
            {showActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nueva contraseña</label>
        <div className="relative">
          <input
            type={showNueva ? 'text' : 'password'}
            required
            value={passwordNueva}
            onChange={e => setPasswordNueva(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-4 pr-10 py-2.5 text-slate-800 text-sm outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => setShowNueva(!showNueva)}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            tabIndex={-1}
          >
            {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !passwordNueva.trim()}
        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wide bg-[#0f1f19] hover:bg-[#e8632c] text-white border-2 border-[#0f1f19] hover:border-[#e8632c] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Actualizando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}
