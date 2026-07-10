import axios from 'axios';
import type { Farmacia } from '../types';

export async function obtenerFarmacias(): Promise<Farmacia[]> {
  try {
    const response = await axios.get<Farmacia[]>('/api/farmacias');
    return response.data || [];
  } catch (error) {
    console.error('Error en farmacias.service:', error);
    throw new Error('No se pudieron obtener los datos de las farmacias.');
  }
}
