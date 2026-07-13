#!/usr/bin/env node

/**
 * Scrape ISP Pharmacy Registry and populate medicamentos_catalogo
 *
 * Usage: node --env-file=.env scripts/scrape-isp.mjs
 * Exit code: 0 if all succeed, 1 if any error
 */

import { createClient } from '@supabase/supabase-js';
import { scrapeProductosPorPrincipioActivo } from './lib/isp-client.mjs';

// Normalization functions from Task 3 brief
function normalizar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();
}

function parseFecha(fecha) {
  const match = fecha.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

// Initialize Supabase client
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// 5 starter principios activos
const PRINCIPIOS_ACTIVOS = [
  'PARACETAMOL',
  'IBUPROFENO',
  'AMOXICILINA',
  'LORATADINA',
  'OMEPRAZOL',
];

async function main() {
  let totalCargado = 0;
  let hasErrors = false;

  for (const principioActivo of PRINCIPIOS_ACTIVOS) {
    try {
      // Scrape from ISP
      const productos = await scrapeProductosPorPrincipioActivo(principioActivo);

      if (!productos || productos.length === 0) {
        console.error(`${principioActivo}: No se encontraron productos`);
        hasErrors = true;
        continue;
      }

      // Prepare rows for upsert
      const rows = productos.map((producto) => ({
        registro_isp: producto.registroIsp,
        nombre_producto: producto.nombreProducto,
        empresa: producto.empresa || null,
        principio_activo: normalizar(producto.principioActivo || principioActivo),
        fecha_registro: parseFecha(producto.fechaRegistro),
        estado: 'Vigente',
        updated_at: new Date().toISOString(),
      }));

      // Upsert to Supabase
      const { error } = await supabase
        .from('medicamentos_catalogo')
        .upsert(rows, { onConflict: 'registro_isp' });

      if (error) {
        console.error(`${principioActivo}: Error al insertar - ${error.message}`);
        hasErrors = true;
      } else {
        console.log(`${principioActivo}: ${productos.length} productos cargados.`);
        totalCargado += productos.length;
      }
    } catch (error) {
      console.error(`${principioActivo}: Error al scraping - ${error.message}`);
      hasErrors = true;
    }
  }

  console.log(`Total cargado: ${totalCargado} productos.`);
  process.exit(hasErrors ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
