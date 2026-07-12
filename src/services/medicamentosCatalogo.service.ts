import { buscarMedicamentosCatalogo } from '../lib/data/medicamentos-catalogo.data';
import type { ResultadoBusquedaMedicamento } from '../types/medicamentos-catalogo.types';

export async function buscarMedicamentos(
  termino: string,
  signal?: AbortSignal
): Promise<ResultadoBusquedaMedicamento[]> {
  try {
    return await buscarMedicamentosCatalogo(termino, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    console.error('Error en medicamentosCatalogo.service:', error);
    throw new Error('No se pudo completar la búsqueda de medicamentos.');
  }
}
