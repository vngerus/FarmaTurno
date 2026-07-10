import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmacionEliminarProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmacionEliminar({
  isOpen,
  onCancel,
  onConfirm
}: ConfirmacionEliminarProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-lg overflow-hidden animate-zoom-in p-5 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-extrabold text-lg text-slate-900 mb-1">¿Retirar del botiquín?</h3>
        <p className="text-xs text-slate-500 mb-6 font-semibold">
          Esta acción eliminará de forma permanente el medicamento de tus registros locales.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onCancel}
            className="py-2 px-4 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="py-2 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white transition-all cursor-pointer"
          >
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
