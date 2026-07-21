// scripts/generar-comunas.mjs
// Ejecutar una sola vez (o cuando haga falta refrescar el dataset): node scripts/generar-comunas.mjs
// Fuente: https://github.com/jromerof/regiones-chile (346 comunas oficiales, confirmado por conteo).
// No se ejecuta en build ni en runtime — MINSAL bloquea fetch desde IPs de datacenter,
// pero este script corre en la máquina del desarrollador, no en Vercel, así que no aplica ahí.
// Esta fuente tampoco es MINSAL, así que no hay riesgo de bloqueo de todos modos.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { dirname } from 'node:path';

const API_URL = 'https://raw.githubusercontent.com/jromerof/regiones-chile/master/regiones.json';

function generarSlug(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

const respuesta = await fetch(API_URL);
if (!respuesta.ok) {
  throw new Error(`No se pudo descargar el dataset: ${respuesta.status}`);
}
const regiones = await respuesta.json();

// Correcciones para typos conocidos en el dataset upstream (jromerof/regiones-chile).
// Las claves son las strings tal como vienen HOY del upstream. Si al regenerar el
// dataset una entrada ya no matchea, es buena señal: el upstream corrigió su typo.
const CORRECCIONES_REGION = {
  'La Araucania': 'La Araucanía',
  'Los Rios': 'Los Ríos',
  'Aysén del General Carlos Ibañez': 'Aysén del General Carlos Ibáñez',
};

const CORRECCIONES_COMUNA = {
  'Vitcarua': 'Vitacura',
  'Couhaique': 'Coyhaique',
  'Vicotira': 'Victoria',
  'yumbel': 'Yumbel',
  'Guateicas': 'Guaitecas',
  "O'higgins": "O'Higgins",
};

const comunas = [];
for (const region of regiones) {
  // Aplicar correcciones de región
  let regionName = region.name;
  if (CORRECCIONES_REGION[regionName]) {
    regionName = CORRECCIONES_REGION[regionName];
  }

  for (const comuna of region.comunas) {
    // Aplicar correcciones de comuna
    let comunaName = comuna.name;
    if (CORRECCIONES_COMUNA[comunaName]) {
      comunaName = CORRECCIONES_COMUNA[comunaName];
    }

    comunas.push({
      region: regionName,
      comuna: comunaName,
      slug: generarSlug(comunaName),
    });
  }
}

if (comunas.length !== 346) {
  throw new Error(`Se esperaban 346 comunas, se obtuvieron ${comunas.length}. Revisa la fuente antes de continuar.`);
}

const slugsUnicos = new Set(comunas.map(c => c.slug));
if (slugsUnicos.size !== comunas.length) {
  throw new Error('Hay slugs duplicados en el dataset generado.');
}

const outputPath = fileURLToPath(new URL('../src/data/comunas-chile.json', import.meta.url));
const outputDir = dirname(outputPath);
mkdirSync(outputDir, { recursive: true });
writeFileSync(
  outputPath,
  JSON.stringify(comunas, null, 2) + '\n',
);

console.log(`Generadas ${comunas.length} comunas en src/data/comunas-chile.json`);
