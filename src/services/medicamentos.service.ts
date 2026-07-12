import { supabase } from '../lib/supabaseClient';
import type { Medicamento } from '../types/medicamentos.types';

interface MedicamentoRow {
  id: string;
  nombre: string;
  dosis: string;
  stock_actual: number;
  stock_maximo: number;
  hora_toma: string;
  notas: string | null;
  created_at: string;
}

interface MedicamentoInput {
  nombre: string;
  dosis: string;
  stockActual: number;
  stockMaximo: number;
  horaToma: string;
  notas: string;
}

function mapRow(row: MedicamentoRow): Medicamento {
  return {
    id: row.id,
    nombre: row.nombre,
    dosis: row.dosis,
    stockActual: row.stock_actual,
    stockMaximo: row.stock_maximo,
    horaToma: row.hora_toma,
    notas: row.notas ?? '',
    createdAt: row.created_at
  };
}

export async function obtenerMedicamentos(userId: string): Promise<Medicamento[]> {
  const { data, error } = await supabase
    .from('medicamentos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function crearMedicamento(userId: string, medData: MedicamentoInput): Promise<Medicamento> {
  const { data, error } = await supabase
    .from('medicamentos')
    .insert({
      user_id: userId,
      nombre: medData.nombre,
      dosis: medData.dosis,
      stock_actual: medData.stockActual,
      stock_maximo: medData.stockMaximo,
      hora_toma: medData.horaToma,
      notas: medData.notas
    })
    .select()
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function actualizarMedicamento(id: string, medData: MedicamentoInput): Promise<Medicamento> {
  const { data, error } = await supabase
    .from('medicamentos')
    .update({
      nombre: medData.nombre,
      dosis: medData.dosis,
      stock_actual: medData.stockActual,
      stock_maximo: medData.stockMaximo,
      hora_toma: medData.horaToma,
      notas: medData.notas,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function eliminarMedicamento(id: string): Promise<void> {
  const { error } = await supabase.from('medicamentos').delete().eq('id', id);
  if (error) throw error;
}

export async function tomarDosisMedicamento(id: string, stockActualPrevio: number): Promise<Medicamento> {
  const nuevoStock = Math.max(0, stockActualPrevio - 1);
  const { data, error } = await supabase
    .from('medicamentos')
    .update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapRow(data);
}
