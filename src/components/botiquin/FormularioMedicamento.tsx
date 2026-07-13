import React, { useState, useEffect } from 'react';
import { Pill, Shield, X, AlertCircle } from 'lucide-react';
import { sanitizeInput } from '../../utils/sanitizer';
import { validateMedicamentoForm } from '../../zodschemas/medicamento.schema';
import type { Medicamento } from '../../types/medicamentos.types';

interface FormularioMedicamentoProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (medData: {
    nombre: string;
    dosis: string;
    stockActual: number;
    stockMaximo: number;
    horaToma: string;
    notas: string;
  }) => void;
  editingMedicamento: Medicamento | null;
}

export default function FormularioMedicamento({
  isOpen,
  onClose,
  onSave,
  editingMedicamento,
}: FormularioMedicamentoProps) {
  const [nombre, setNombre] = useState<string>('');
  const [dosis, setDosis] = useState<string>('');
  const [stockActual, setStockActual] = useState<string>('30');
  const [stockMaximo, setStockMaximo] = useState<string>('30');
  const [horaToma, setHoraToma] = useState<string>('08:00');
  const [notas, setNotas] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingMedicamento) {
      setNombre(editingMedicamento.nombre);
      setDosis(editingMedicamento.dosis);
      setStockActual(editingMedicamento.stockActual.toString());
      setStockMaximo(editingMedicamento.stockMaximo.toString());
      setHoraToma(editingMedicamento.horaToma);
      setNotas(editingMedicamento.notas || '');
    } else {
      setNombre('');
      setDosis('');
      setStockActual('30');
      setStockMaximo('30');
      setHoraToma('08:00');
      setNotas('');
    }
    setError(null);
  }, [editingMedicamento, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanNombre = sanitizeInput(nombre);
    const cleanDosis = sanitizeInput(dosis);
    const cleanNotas = sanitizeInput(notas);

    const validation = validateMedicamentoForm({
      nombre: cleanNombre,
      dosis: cleanDosis,
      stockActual,
      stockMaximo,
      horaToma,
      notas: cleanNotas,
    });

    if (!validation.success) {
      setError(validation.error);
      return;
    }

    onSave(validation.data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-zoom-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-mint-600" />
            {editingMedicamento ? 'Editar Medicamento' : 'Nuevo Medicamento'}
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
            <span>Validación anti-XSS activa. Los campos serán sanitizados de forma segura.</span>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Nombre Comercial / Compuesto
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Paracetamol, Ibuprofeno..."
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-4 py-2.5 text-slate-800 text-sm outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Dosis recomendada
            </label>
            <input
              type="text"
              required
              placeholder="Ej. 1 tableta de 500mg, 10 ml..."
              value={dosis}
              onChange={e => setDosis(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-4 py-2.5 text-slate-800 text-sm outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Stock Actual
              </label>
              <input
                type="number"
                min="0"
                required
                value={stockActual}
                onChange={e => setStockActual(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-4 py-2.5 text-slate-800 text-sm outline-none transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Stock Máximo
              </label>
              <input
                type="number"
                min="1"
                required
                value={stockMaximo}
                onChange={e => setStockMaximo(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-4 py-2.5 text-slate-800 text-sm outline-none transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Hora de toma diaria
            </label>
            <input
              type="time"
              required
              value={horaToma}
              onChange={e => setHoraToma(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-4 py-2.5 text-slate-800 text-sm outline-none transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Notas / Instrucciones (Opcional)
            </label>
            <textarea
              placeholder="Ej. Tomar con abundante agua..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              className="w-full bg-white border border-slate-200 focus:border-mint-500 focus:ring-1 focus:ring-mint-500 rounded-xl px-4 py-2.5 text-slate-800 text-sm outline-none transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl text-xs font-bold bg-mint-600 hover:bg-mint-500 text-white transition-all cursor-pointer"
            >
              {editingMedicamento ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
