import React, { useState } from 'react';
import { X, Shield, Lock, Mail, User as UserIcon } from 'lucide-react';
import { sanitizeInput } from '../../utils/sanitizer';
import { validateAuthForm } from '../../zodschemas/auth.schema';
import { supabase } from '../../lib/supabaseClient';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

function traducirErrorAuth(message?: string): string {
  if (!message) return 'Ocurrió un error al procesar tu solicitud.';
  if (message.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'Ese correo ya está registrado.';
  }
  if (message.includes('Password should be at least'))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (message.includes('Email not confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesión (revisa tu bandeja de entrada).';
  }
  return message;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const cleanUsername = sanitizeInput(username);
    const cleanEmail = sanitizeInput(email);
    const cleanPassword = password.trim();

    const validation = validateAuthForm(isRegister, {
      username: cleanUsername,
      email: cleanEmail,
      password: cleanPassword,
    });

    if (!validation.success) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: { data: { username: cleanUsername } },
        });
        if (signUpError) throw signUpError;

        if (!data.session) {
          setInfo('Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.');
          setLoading(false);
          return;
        }

        if (data.user) {
          window.posthog?.identify(data.user.id, { username: cleanUsername });
          window.posthog?.capture('user_signed_up');
        }
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
        if (signInError) throw signInError;

        if (signInData.user) {
          window.posthog?.identify(signInData.user.id, {
            username: signInData.user.user_metadata?.username,
          });
          window.posthog?.capture('user_logged_in');
        }
      }

      onLoginSuccess();
      onClose();
    } catch (err) {
      console.error('Error durante autenticación:', err);
      window.posthog?.captureException(err instanceof Error ? err : new Error(String(err)));
      setError(traducirErrorAuth(err instanceof Error ? err.message : undefined));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border-2 border-[#0f1f19] w-full max-w-md rounded-2xl overflow-hidden animate-zoom-in shadow-[6px_6px_0_#0f1f19]">
        <div className="flex items-center justify-between p-5 border-b-2 border-[#0f1f19] bg-[#faf9f4]">
          <h3 className="font-bold text-lg text-[#0f1f19] flex items-center gap-2 font-heading">
            <Lock className="w-5 h-5 text-[#065f46]" />
            {isRegister ? 'Crear una Cuenta' : 'Iniciar Sesión'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center gap-2 bg-mint-50/50 border border-mint-100/60 p-2.5 rounded-xl text-[10px] text-slate-600 font-semibold">
            <Shield className="w-3.5 h-3.5 text-mint-600 shrink-0" />
            <span>Tu cuenta y tus datos quedan protegidos con autenticación real (Supabase).</span>
          </div>

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

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Usuario
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm outline-none transition-all"
                />
                <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm outline-none transition-all"
              />
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm outline-none transition-all"
              />
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wide bg-[#0f1f19] hover:bg-[#e8632c] text-white border-2 border-[#0f1f19] hover:border-[#e8632c] transition-all cursor-pointer mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando…' : isRegister ? 'Registrarse' : 'Ingresar'}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
                setInfo(null);
              }}
              className="text-xs text-[#065f46] hover:underline font-bold"
            >
              {isRegister
                ? '¿Ya tienes cuenta? Inicia sesión'
                : '¿No tienes cuenta? Regístrate gratis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
