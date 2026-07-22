import { obtenerFarmaciasMinsal } from '../lib/data/minsal.data';
import type { Farmacia } from '../types/farmacias.types';

// ponytail: fetch va directo desde el browser (IP del usuario), no vía /api/farmacias.
// MINSAL bloquea con 403 los datacenters cloud (Vercel iad1 y gru1 probados), así que
// proxear server-side no es viable. sessionStorage cache en useFarmacias.ts throttlea
// repeticiones por usuario.
export async function obtenerFarmacias(): Promise<Farmacia[]> {
  return obtenerFarmaciasMinsal();
}
