import React from 'react';
import { Clock, Edit3, Trash2, AlertCircle, AlertTriangle, Check } from 'lucide-react';
import type { Medicamento } from '../../types/medicamentos.types';

interface TarjetaMedicamentoProps {
  medicamento: Medicamento;
  onEdit: () => void;
  onDelete: () => void;
  onTakeDose: () => void;
}

export default function TarjetaMedicamento({
  medicamento,
  onEdit,
  onDelete,
  onTakeDose,
}: TarjetaMedicamentoProps) {
  const pctStock = Math.min(
    100,
    Math.max(0, (medicamento.stockActual / medicamento.stockMaximo) * 100),
  );
  const isLowStock = medicamento.stockActual <= 3 || pctStock <= 20;
  const isNoStock = medicamento.stockActual === 0;

  return (
    <div
      className={`flex flex-col glass-card rounded-2xl p-5 relative group ${
        isNoStock ? 'is-danger' : isLowStock ? 'is-warning' : ''
      }`}
    >
      {isNoStock && (
        <div className="absolute top-0 left-0 w-full h-1 rounded-t-2xl bg-linear-to-r from-red-500 to-rose-600"></div>
      )}
      {!isNoStock && isLowStock && (
        <div className="absolute top-0 left-0 w-full h-1 rounded-t-2xl bg-linear-to-r from-amber-500 to-yellow-600"></div>
      )}

      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="truncate">
          <h3 className="font-extrabold text-slate-800 text-lg truncate group-hover:text-mint-600 transition-colors leading-tight">
            {medicamento.nombre}
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Dosis: {medicamento.dosis}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            title="Editar remedio"
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-all cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            title="Eliminar remedio"
            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 font-semibold">
        <Clock className="w-3.5 h-3.5 text-mint-600" />
        <span>
          Hora programada:{' '}
          <strong className="text-slate-800 font-mono">{medicamento.horaToma}</strong>
        </span>
      </div>

      <div className="space-y-1.5 mb-5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold">Stock disponible:</span>
          <span
            className={`font-mono font-extrabold ${
              isNoStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-mint-600'
            }`}
          >
            {medicamento.stockActual} / {medicamento.stockMaximo}
          </span>
        </div>

        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
          <div
            style={{ width: `${pctStock}%` }}
            className={`h-full rounded-full transition-all duration-500 ${
              isNoStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-mint-600'
            }`}
          ></div>
        </div>
      </div>

      {isNoStock ? (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">¡Agotado! Debes reabastecer a la brevedad.</span>
        </div>
      ) : isLowStock ? (
        <div className="mb-4 bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">¡Stock bajo! Te quedan pocas dosis disponibles.</span>
        </div>
      ) : null}

      {medicamento.notas ? (
        <p className="text-slate-500 text-xs italic line-clamp-2 mb-4 bg-slate-50/50 p-2 rounded-lg border border-slate-200 truncate font-sans">
          "{medicamento.notas}"
        </p>
      ) : null}

      <button
        onClick={onTakeDose}
        disabled={isNoStock}
        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all mt-auto cursor-pointer ${
          isNoStock
            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            : 'bg-mint-50 hover:bg-mint-600 hover:text-white text-mint-600 border border-mint-100 active:scale-[0.98]'
        }`}
      >
        <Check className="w-3.5 h-3.5" />
        Tomar Dosis (-1)
      </button>
    </div>
  );
}
