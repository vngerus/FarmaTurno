import { supabase } from '../supabaseClient';
import type { ResultadoBusquedaMedicamento, FichaMedicamento } from '../../types/medicamentos-catalogo.types';

interface CatalogoRow {
  registro_isp: string;
  nombre_producto: string;
  empresa: string;
  principio_activo: string;
}

export async function buscarMedicamentosCatalogo(
  termino: string,
  signal?: AbortSignal
): Promise<ResultadoBusquedaMedicamento[]> {
  const term = termino.trim();
  if (term.length < 2) return [];

  // Search medicamentos_catalogo by nombre_producto OR principio_activo OR empresa (ilike)
  let productosQuery = supabase
    .from('medicamentos_catalogo')
    .select('registro_isp, nombre_producto, empresa, principio_activo')
    .or(`nombre_producto.ilike.%${term}%,principio_activo.ilike.%${term}%,empresa.ilike.%${term}%`)
    .order('nombre_producto')
    .limit(20);
  if (signal) productosQuery = productosQuery.abortSignal(signal);

  const { data: productos, error: productosError } = await productosQuery;
  if (productosError) throw productosError;
  if (!productos?.length) return [];

  // Get fichas for each principio_activo (only revisado=true via RLS)
  const principios = [...new Set((productos as CatalogoRow[]).map(p => p.principio_activo))];

  let fichasQuery = supabase
    .from('medicamentos_fichas')
    .select('principio_activo, para_que_sirve, dosis_adulto, dosis_nino, contraindicaciones, advertencias, fuente_nombre, fuente_url')
    .in('principio_activo', principios);
  if (signal) fichasQuery = fichasQuery.abortSignal(signal);

  const { data: fichas, error: fichasError } = await fichasQuery;
  if (fichasError) throw fichasError;

  // Join results
  const fichaPorPrincipio = new Map<string, FichaMedicamento>(
    (fichas ?? []).map(f => [f.principio_activo, f as FichaMedicamento])
  );

  return (productos as CatalogoRow[]).map(p => ({
    registroIsp: p.registro_isp,
    nombreProducto: p.nombre_producto,
    empresa: p.empresa,
    principioActivo: p.principio_activo,
    ficha: fichaPorPrincipio.get(p.principio_activo) || null
  }));
}
