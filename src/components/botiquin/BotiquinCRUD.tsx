import React, { useState, useEffect } from 'react';
import { Plus, Pill, RefreshCw } from 'lucide-react';
import TarjetaMedicamento from './TarjetaMedicamento';
import FormularioMedicamento from './FormularioMedicamento';
import ConfirmacionEliminar from './ConfirmacionEliminar';
import {
  obtenerMedicamentos,
  crearMedicamento,
  actualizarMedicamento,
  eliminarMedicamento,
  tomarDosisMedicamento,
} from '../../services/medicamentos.service';
import type { Medicamento } from '../../types/medicamentos.types';
import type { User } from '../../types/auth.types';

interface BotiquinCRUDProps {
  user: User;
}

export default function BotiquinCRUD({ user }: BotiquinCRUDProps) {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingMedicamento, setEditingMedicamento] = useState<Medicamento | null>(null);

  useEffect(() => {
    obtenerMedicamentos(user.id)
      .then(setMedicamentos)
      .catch(err => {
        console.error('Error cargando el botiquín:', err);
        alert('No se pudo cargar tu botiquín. Inténtalo más tarde.');
      })
      .finally(() => setLoading(false));
  }, [user.id]);

  const handleOpenAdd = () => {
    setEditingMedicamento(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (med: Medicamento) => {
    setEditingMedicamento(med);
    setIsFormOpen(true);
  };

  const handleSaveMedicamento = async (medData: {
    nombre: string;
    dosis: string;
    stockActual: number;
    stockMaximo: number;
    horaToma: string;
    notas: string;
  }) => {
    try {
      if (editingMedicamento) {
        const actualizado = await actualizarMedicamento(editingMedicamento.id, medData);
        setMedicamentos(prev => prev.map(m => (m.id === actualizado.id ? actualizado : m)));
        window.posthog?.capture('medication_updated', {
          stock_actual: medData.stockActual,
          stock_maximo: medData.stockMaximo,
        });
      } else {
        const nuevo = await crearMedicamento(user.id, medData);
        setMedicamentos(prev => [nuevo, ...prev]);
        window.posthog?.capture('medication_added', {
          stock_actual: medData.stockActual,
          stock_maximo: medData.stockMaximo,
        });
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error('Error guardando medicamento:', err);
      window.posthog?.captureException(err instanceof Error ? err : new Error(String(err)));
      alert('No se pudo guardar el medicamento. Inténtalo de nuevo.');
    }
  };

  const handleTakeDose = async (id: string) => {
    const medicamento = medicamentos.find(m => m.id === id);
    if (!medicamento) return;

    try {
      const actualizado = await tomarDosisMedicamento(id, medicamento.stockActual);
      setMedicamentos(prev => prev.map(m => (m.id === id ? actualizado : m)));
      window.posthog?.capture('dose_taken', {
        stock_remaining: actualizado.stockActual,
      });
    } catch (err) {
      console.error('Error registrando la toma de dosis:', err);
      window.posthog?.captureException(err instanceof Error ? err : new Error(String(err)));
      alert('No se pudo actualizar el stock. Inténtalo de nuevo.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await eliminarMedicamento(deletingId);
      setMedicamentos(prev => prev.filter(m => m.id !== deletingId));
      window.posthog?.capture('medication_deleted');
    } catch (err) {
      console.error('Error eliminando medicamento:', err);
      window.posthog?.captureException(err instanceof Error ? err : new Error(String(err)));
      alert('No se pudo eliminar el medicamento. Inténtalo de nuevo.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full bg-white border-2 border-[#0f1f19] rounded-3xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0f1f19] flex items-center gap-2 font-heading">
            <Pill className="w-7 h-7 text-[#065f46]" />
            Mi Botiquín Personal
          </h2>
          <p className="text-brand-body text-sm mt-1 font-semibold">
            Sesión activa: botiquín privado de @{user.username}.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 bg-[#0f1f19] hover:bg-[#e8632c] text-white font-bold font-mono uppercase text-xs tracking-wide px-5 py-3 rounded-xl border-2 border-[#0f1f19] hover:border-[#e8632c] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Añadir Medicamento
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-10 h-10 text-[#065f46] animate-spin" />
          <p className="text-brand-body text-sm font-semibold animate-pulse">
            Cargando tu botiquín...
          </p>
        </div>
      ) : medicamentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-50/50 border border-slate-200 border-dashed rounded-2xl text-center">
          <Pill className="w-12 h-12 text-slate-400 mb-3 animate-pulse" />
          <p className="font-extrabold text-slate-800 text-base">Tu botiquín está vacío</p>
          <p className="text-xs text-slate-500 mt-1 max-w-85">
            No tienes medicamentos registrados. Presiona "Añadir Medicamento" para comenzar a
            gestionar tu stock.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {medicamentos.map(med => (
            <TarjetaMedicamento
              key={med.id}
              medicamento={med}
              onEdit={() => handleOpenEdit(med)}
              onDelete={() => setDeletingId(med.id)}
              onTakeDose={() => handleTakeDose(med.id)}
            />
          ))}
        </div>
      )}

      <FormularioMedicamento
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveMedicamento}
        editingMedicamento={editingMedicamento}
      />

      <ConfirmacionEliminar
        isOpen={!!deletingId}
        onCancel={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
