import { obtenerFarmaciasMinsal } from '../lib/data/minsal.data';
import type { Farmacia } from '../types/farmacias.types';

export async function obtenerFarmacias(): Promise<Farmacia[]> {
  try {
    return await obtenerFarmaciasMinsal();
  } catch (error) {
    console.error('Error en farmacias.service:', error);
    throw new Error('No se pudieron obtener los datos de las farmacias.');
  }
}
