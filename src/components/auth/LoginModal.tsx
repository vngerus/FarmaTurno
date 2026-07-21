import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Lock, Mail, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { sanitizeInput } from '../../utils/sanitizer';
import { validateAuthForm } from '../../zodschemas/auth.schema';
import { supabase } from '../../lib/supabaseClient';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export function traducirErrorAuth(message?: string): string {
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
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (mode !== 'register' || !isOpen) return;

    function renderWidget() {
      if (!turnstileContainerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        'error-callback': () => setTurnstileToken(null),
        'expired-callback': () => setTurnstileToken(null),
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.getElementById('turnstile-script');
      if (existingScript) {
        existingScript.addEventListener('load', renderWidget, { once: true });
      } else {
        const script = document.createElement('script');
        script.id = 'turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = undefined;
      }
      setTurnstileToken(null);
    };
  }, [mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const cleanUsername = sanitizeInput(username);
    const cleanEmail = sanitizeInput(email);
    const cleanPassword = password.trim();

    const validation = validateAuthForm(mode === 'register', {
      username: cleanUsername,
      email: cleanEmail,
      password: cleanPassword,
    });

    if (!validation.success) {
      setError(validation.error);
      return;
    }

    if (mode === 'register' && !turnstileToken) {
      setError('Completa la verificación de seguridad.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const verifyRes = await fetch('/api/verify-turnstile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: turnstileToken }),
        });
        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
          setError('Verificación de seguridad fallida. Intenta de nuevo.');
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
          }
          setTurnstileToken(null);
          setLoading(false);
          return;
        }

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
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
        if (signInError) throw signInError;
      }

      onLoginSuccess();
      onClose();
    } catch (err) {
      console.error('Error durante autenticación:', err);
      setError(traducirErrorAuth(err instanceof Error ? err.message : undefined));
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const cleanEmail = sanitizeInput(email);
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Por favor, ingresa un correo electrónico válido.');
      return;
    }

    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/restablecer-password`,
      });
      setInfo('Si el correo existe, te enviamos un link para restablecer tu contraseña.');
    } catch (err) {
      console.error('Error solicitando recuperación:', err);
      setInfo('Si el correo existe, te enviamos un link para restablecer tu contraseña.');
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
            {mode === 'register' ? 'Crear una Cuenta' : mode === 'recover' ? 'Recuperar Contraseña' : 'Iniciar Sesión'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'recover' ? (
          <form onSubmit={handleRecoverSubmit} className="p-5 space-y-4">
            <div className="flex items-center gap-2 bg-mint-50/50 border border-mint-100/60 p-2.5 rounded-xl text-[10px] text-slate-600 font-semibold">
              <Shield className="w-3.5 h-3.5 text-mint-600 shrink-0" />
              <span>Te enviaremos un link para restablecer tu contraseña.</span>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wide bg-[#0f1f19] hover:bg-[#e8632c] text-white border-2 border-[#0f1f19] hover:border-[#e8632c] transition-all cursor-pointer mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando…' : 'Enviar link'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setInfo(null); }}
                className="text-xs text-[#065f46] hover:underline font-bold"
              >
                Volver a iniciar sesión
              </button>
            </div>
          </form>
        ) : (
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

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Usuario
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={15}
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl pl-10 pr-10 py-2.5 text-slate-800 text-sm outline-none transition-all"
                />
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div ref={turnstileContainerRef} className="flex justify-center" />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wide bg-[#0f1f19] hover:bg-[#e8632c] text-white border-2 border-[#0f1f19] hover:border-[#e8632c] transition-all cursor-pointer mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando…' : mode === 'register' ? 'Registrarse' : 'Ingresar'}
            </button>

            {mode === 'login' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode('recover'); setError(null); setInfo(null); }}
                  className="text-xs text-slate-500 hover:underline font-semibold"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'register' ? 'login' : 'register');
                  setError(null);
                  setInfo(null);
                }}
                className="text-xs text-[#065f46] hover:underline font-bold"
              >
                {mode === 'register'
                  ? '¿Ya tienes cuenta? Inicia sesión'
                  : '¿No tienes cuenta? Regístrate gratis'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
