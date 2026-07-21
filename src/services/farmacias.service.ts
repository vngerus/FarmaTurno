import type { Farmacia } from '../types/farmacias.types';

export async function obtenerFarmacias(): Promise<Farmacia[]> {
  const response = await fetch('/api/farmacias');

  if (!response.ok) {
    throw new Error('No se pudieron obtener los datos de las farmacias.');
  }

  return response.json();
}
