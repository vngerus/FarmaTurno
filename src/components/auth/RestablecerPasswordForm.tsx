import React, { useState, useEffect } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { traducirErrorAuth } from './LoginModal';

export default function RestablecerPasswordForm() {
  const [checked, setChecked] = useState<boolean>(false);
  const [hasSession, setHasSession] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setChecked(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.trim().length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: password.trim() });
      if (updateError) throw updateError;

      window.location.href = '/';
    } catch (err) {
      console.error('Error restableciendo contraseña:', err);
      setError(traducirErrorAuth(err instanceof Error ? err.message : undefined));
      setLoading(false);
    }
  };

  if (!checked) return null;

  if (!hasSession) {
    return (
      <div className="card-surface p-10 md:p-14 text-center max-w-lg mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0f1f19] font-heading mb-3">
          Link inválido
        </h1>
        <p className="text-brand-body text-sm md:text-base leading-relaxed">
          Este link expiró o no es válido. Solicita uno nuevo desde el botón "Iniciar Sesión".
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface p-6 space-y-4 max-w-md mx-auto">
      <h1 className="font-bold text-lg text-[#0f1f19] flex items-center gap-2 font-heading">
        <KeyRound className="w-5 h-5 text-[#065f46]" />
        Restablecer contraseña
      </h1>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl p-3 font-semibold">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nueva contraseña</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-4 pr-10 py-2.5 text-slate-800 text-sm outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Confirmar contraseña</label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-4 pr-10 py-2.5 text-slate-800 text-sm outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wide bg-[#0f1f19] hover:bg-[#e8632c] text-white border-2 border-[#0f1f19] hover:border-[#e8632c] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
      </button>
    </form>
  );
}
