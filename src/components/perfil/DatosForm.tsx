import React, { useState } from 'react';
import { UserCircle } from 'lucide-react';
import { validateDatosForm } from '../../zodschemas/perfil.schema';
import { actualizarNombreApellido } from '../../services/perfil.service';
import type { User } from '../../types/auth.types';

interface DatosFormProps {
  user: User;
  onUpdated: (nombre: string, apellido: string) => void;
}

export default function DatosForm({ user, onUpdated }: DatosFormProps) {
  const [initialNombre, setInitialNombre] = useState<string>(user.nombre ?? '');
  const [initialApellido, setInitialApellido] = useState<string>(user.apellido ?? '');
  const [nombre, setNombre] = useState<string>(user.nombre ?? '');
  const [apellido, setApellido] = useState<string>(user.apellido ?? '');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const validation = validateDatosForm({ nombre, apellido });
    if (!validation.success) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    try {
      await actualizarNombreApellido(user.id, validation.data.nombre, validation.data.apellido);
      onUpdated(validation.data.nombre, validation.data.apellido);
      setInitialNombre(validation.data.nombre);
      setInitialApellido(validation.data.apellido);
      setInfo('Datos actualizados.');
    } catch (err) {
      console.error('Error actualizando datos:', err);
      setError('No se pudieron guardar los datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-surface p-6 space-y-4">
      <h2 className="font-bold text-lg text-[#0f1f19] flex items-center gap-2 font-heading">
        <UserCircle className="w-5 h-5 text-[#065f46]" />
        Datos personales
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
        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre</label>
        <input
          type="text"
          required
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-4 py-2.5 text-slate-800 text-sm outline-none transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Apellido</label>
        <input
          type="text"
          required
          value={apellido}
          onChange={e => setApellido(e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-4 py-2.5 text-slate-800 text-sm outline-none transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={loading || (nombre === initialNombre && apellido === initialApellido)}
        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wide bg-[#0f1f19] hover:bg-[#e8632c] text-white border-2 border-[#0f1f19] hover:border-[#e8632c] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Guardando…' : 'Guardar datos'}
      </button>
    </form>
  );
}
