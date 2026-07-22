import React, { useState, useEffect, useRef } from 'react';
import { Mail, User as UserIcon, MessageSquare } from 'lucide-react';

export default function ContactoForm() {
  const [nombre, setNombre] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [asunto, setAsunto] = useState<string>('');
  const [mensaje, setMensaje] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
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
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!nombre.trim() || !email.trim() || !asunto.trim() || !mensaje.trim()) {
      setError('Completa todos los campos.');
      return;
    }
    if (!turnstileToken) {
      setError('Completa la verificación de seguridad.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, asunto, mensaje, turnstileToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'No se pudo enviar el mensaje.');
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
        setTurnstileToken(null);
        setLoading(false);
        return;
      }

      setInfo('Mensaje enviado. Te responderemos a la brevedad.');
      setNombre('');
      setEmail('');
      setAsunto('');
      setMensaje('');
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      setTurnstileToken(null);
    } catch (err) {
      console.error('Error enviando mensaje de contacto:', err);
      setError('No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-surface p-6 space-y-4 max-w-xl mx-auto">
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
        <label htmlFor="contacto-nombre" className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre</label>
        <div className="relative">
          <input
            id="contacto-nombre"
            type="text"
            required
            placeholder="Tu nombre"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm outline-none transition-all"
          />
          <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        </div>
      </div>

      <div>
        <label htmlFor="contacto-email" className="block text-xs font-bold text-slate-600 uppercase mb-1">Correo Electrónico</label>
        <div className="relative">
          <input
            id="contacto-email"
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
        <label htmlFor="contacto-asunto" className="block text-xs font-bold text-slate-600 uppercase mb-1">Asunto</label>
        <input
          id="contacto-asunto"
          type="text"
          required
          maxLength={100}
          placeholder="¿En qué te podemos ayudar?"
          value={asunto}
          onChange={e => setAsunto(e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-4 py-2.5 text-slate-800 text-sm outline-none transition-all"
        />
      </div>

      <div>
        <label htmlFor="contacto-mensaje" className="block text-xs font-bold text-slate-600 uppercase mb-1">Mensaje</label>
        <div className="relative">
          <textarea
            id="contacto-mensaje"
            required
            rows={5}
            placeholder="Escribe tu mensaje aquí..."
            value={mensaje}
            onChange={e => setMensaje(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm outline-none transition-all resize-none"
          />
          <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        </div>
      </div>

      <div ref={turnstileContainerRef} className="flex justify-center" />

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wide bg-[#0f1f19] hover:bg-[#e8632c] text-white border-2 border-[#0f1f19] hover:border-[#e8632c] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Enviando…' : 'Enviar mensaje'}
      </button>
    </form>
  );
}
