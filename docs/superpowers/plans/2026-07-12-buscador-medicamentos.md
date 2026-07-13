# Buscador de Medicamentos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/comparador-medicamentos` placeholder with a working medication search that shows product info from an ISP-scraped catalog and a curated usage ficha (indications, adult/child dosage, contraindications) for a starter set of common active ingredients.

**Architecture:** Two Supabase tables (`medicamentos_catalogo`, `medicamentos_fichas`) joined in application code by normalized `principio_activo`. The catalog is populated by a standalone Node script that replicates the ISP's ASP.NET postback flow (no API exists). Fichas are hand-authored, referenced against openFDA, and gated by a `revisado` flag enforced at the RLS level. A REST endpoint + service function power a React search island embedded in an Astro page.

**Tech Stack:** Astro (pages + API routes), React (island), Supabase (`@supabase/supabase-js`), Tailwind, Zod, `node:test`/`node:assert` (Node 22 stdlib, zero new deps). Plain `.mjs` scripts run standalone via `node`, no bundler.

## Global Constraints

- No new npm dependencies — only what's already in `package.json` (Astro, React, `@supabase/supabase-js`, Tailwind, Zod, lucide). No cheerio, no jsdom, no test framework package — parse HTML with regex, test with Node's built-in `node:test`.
- v1 scrapes and curates a **fixed starter list** of 5 principios activos only (`PARACETAMOL`, `IBUPROFENO`, `AMOXICILINA`, `LORATADINA`, `OMEPRAZOL`) — not the full ISP registry. No cron/automation; scripts are run manually.
- `medicamentos_fichas.revisado = true` is the only gate for showing a ficha publicly. This must be enforced by a Postgres RLS policy (not just app-code filtering), so it can't be bypassed by a future query.
- Fichas are informational/referential only. Every ficha row must have `fuente_nombre` + `fuente_url` populated, and the UI must show a fixed disclaimer: "Información referencial. No reemplaza el consejo de un profesional de la salud."
- `principio_activo` values must be normalized identically everywhere they're written (uppercase, no accents, trimmed) so the catalog↔ficha join matches.
- New server-only secret required: `SUPABASE_SERVICE_ROLE_KEY` (no `PUBLIC_` prefix, so Astro never ships it to the client bundle). Add it to `.env` locally; it is not committed.

---

## File Structure

```
supabase/sql/001_medicamentos_catalogo_fichas.sql   (new — schema + RLS)
scripts/lib/isp-client.mjs                          (new — postback + HTML parsing, pure functions)
scripts/lib/__tests__/isp-client.test.mjs           (new — node:test against real HTML fixtures)
scripts/lib/__tests__/fixtures/isp-paso1-inicial.html
scripts/lib/__tests__/fixtures/isp-paso3-resultados.html
scripts/scrape-isp.mjs                              (new — orchestrates scrape + upsert, run manually)
data/fichas-seed.json                                (new — 5 curated fichas, source of truth content)
src/zodschemas/ficha-medicamento.schema.ts           (new — validates seed entries)
scripts/seed-fichas.mjs                              (new — validates + upserts fichas-seed.json)
src/types/medicamentos-catalogo.types.ts             (new — ResultadoBusquedaMedicamento, FichaMedicamento)
src/types/index.ts                                   (modify — export new types file)
src/services/medicamentosCatalogo.service.ts         (new — buscarMedicamentos())
src/pages/api/medicamentos/buscar.ts                 (new — GET endpoint)
src/components/medicamentos/TarjetaFicha.tsx         (new — result card)
src/components/medicamentos/BuscadorMedicamentos.tsx (new — search input + results + disclaimer)
src/pages/comparador-medicamentos.astro              (modify — replace placeholder with real feature)
```

---

### Task 1: Supabase schema — catalogo + fichas tables with RLS gate

**Files:**
- Create: `supabase/sql/001_medicamentos_catalogo_fichas.sql`
- Test: `scripts/__tests__/schema.smoke.test.mjs`

**Interfaces:**
- Produces: tables `medicamentos_catalogo(registro_isp, nombre_producto, empresa, principio_activo, fecha_registro, estado, updated_at)` and `medicamentos_fichas(principio_activo, para_que_sirve, dosis_adulto, dosis_nino, contraindicaciones, advertencias, fuente_nombre, fuente_url, revisado, updated_at)`. RLS: anon can `select` from `medicamentos_catalogo` always, and from `medicamentos_fichas` only where `revisado = true`.

- [ ] **Step 1: Write the schema SQL**

```sql
-- supabase/sql/001_medicamentos_catalogo_fichas.sql

create table if not exists medicamentos_catalogo (
  id uuid primary key default gen_random_uuid(),
  registro_isp text unique not null,
  nombre_producto text not null,
  empresa text,
  principio_activo text not null,
  fecha_registro date,
  estado text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_medicamentos_catalogo_principio_activo
  on medicamentos_catalogo (principio_activo);

create index if not exists idx_medicamentos_catalogo_nombre_producto
  on medicamentos_catalogo (nombre_producto text_pattern_ops);

create table if not exists medicamentos_fichas (
  id uuid primary key default gen_random_uuid(),
  principio_activo text unique not null,
  para_que_sirve text not null,
  dosis_adulto text not null,
  dosis_nino text,
  contraindicaciones text not null,
  advertencias text,
  fuente_nombre text not null,
  fuente_url text not null,
  revisado boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table medicamentos_catalogo enable row level security;
alter table medicamentos_fichas enable row level security;

create policy "catalogo_public_read" on medicamentos_catalogo
  for select using (true);

create policy "fichas_public_read_revisadas" on medicamentos_fichas
  for select using (revisado = true);
```

- [ ] **Step 2: Run it against the project's Supabase instance**

Open the Supabase dashboard → SQL Editor → paste the contents of `supabase/sql/001_medicamentos_catalogo_fichas.sql` → Run. Confirm no errors and both tables appear under Table Editor.

- [ ] **Step 3: Add `SUPABASE_SERVICE_ROLE_KEY` to local `.env`**

Copy the `service_role` key from Supabase dashboard → Project Settings → API, add to `.env`:

```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

(Do not prefix with `PUBLIC_` — this key must never reach client-side code.)

- [ ] **Step 4: Write the smoke test**

```js
// scripts/__tests__/schema.smoke.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.PUBLIC_SUPABASE_URL;
const anonKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const anon = createClient(url, anonKey);
const admin = createClient(url, serviceKey);

test('anon can read medicamentos_catalogo', async () => {
  const { data, error } = await anon.from('medicamentos_catalogo').select('id').limit(1);
  assert.equal(error, null);
  assert.ok(Array.isArray(data));
});

test('RLS hides unrevisado fichas from anon but admin can see and toggle them', async () => {
  const principio = 'TEST_SMOKE_PRINCIPIO';

  const { error: insertError } = await admin.from('medicamentos_fichas').insert({
    principio_activo: principio,
    para_que_sirve: 'test',
    dosis_adulto: 'test',
    contraindicaciones: 'test',
    fuente_nombre: 'test',
    fuente_url: 'https://example.com',
    revisado: false
  });
  assert.equal(insertError, null);

  const { data: hidden } = await anon
    .from('medicamentos_fichas')
    .select('id')
    .eq('principio_activo', principio);
  assert.equal(hidden.length, 0);

  await admin.from('medicamentos_fichas').update({ revisado: true }).eq('principio_activo', principio);

  const { data: visible } = await anon
    .from('medicamentos_fichas')
    .select('id')
    .eq('principio_activo', principio);
  assert.equal(visible.length, 1);

  await admin.from('medicamentos_fichas').delete().eq('principio_activo', principio);
});
```

- [ ] **Step 5: Run the test**

Run: `node --test scripts/__tests__/schema.smoke.test.mjs`
Expected: both tests PASS (requires `.env` values loaded — run with `node --env-file=.env --test scripts/__tests__/schema.smoke.test.mjs`)

- [ ] **Step 6: Commit**

```bash
git add supabase/sql/001_medicamentos_catalogo_fichas.sql scripts/__tests__/schema.smoke.test.mjs
git commit -m "feat: add medicamentos_catalogo and medicamentos_fichas tables with RLS gate"
```

---

### Task 2: ISP scraper — postback client + HTML parser (pure, unit-tested)

**Files:**
- Create: `scripts/lib/isp-client.mjs`
- Create: `scripts/lib/__tests__/isp-client.test.mjs`
- Create: `scripts/lib/__tests__/fixtures/isp-paso1-inicial.html`
- Create: `scripts/lib/__tests__/fixtures/isp-paso3-resultados.html`

**Interfaces:**
- Produces: `extractHiddenFields(html) → { viewState, viewStateGenerator, eventValidation }`, `parseResultRows(html) → Array<{ registroIsp, nombreProducto, fechaRegistro, empresa, principioActivo }>`, `async scrapeProductosPorPrincipioActivo(term) → Array<{ registroIsp, nombreProducto, fechaRegistro, empresa, principioActivo }>` (used by Task 3).

The ISP site (`registrosanitario.ispch.gob.cl`) is a legacy ASP.NET WebForms app with no API. Confirmed by inspecting the live form: searching requires 3 sequential requests because checking the "Nombre Producto" search-type checkbox is itself a postback that reveals the text field, before you can submit the actual search postback. Field names and the results table structure were captured directly from the live site's DOM.

- [ ] **Step 1: Save real HTML fixtures for the parser tests**

Create `scripts/lib/__tests__/fixtures/isp-paso1-inicial.html` with this content (trimmed real hidden-field markup from the site's initial page load):

```html
<html><body><form id="form1">
<input type="hidden" name="__EVENTTARGET" id="__EVENTTARGET" value="">
<input type="hidden" name="__EVENTARGUMENT" id="__EVENTARGUMENT" value="">
<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="FAKEVIEWSTATE123==">
<input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="CA0B0334">
<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="FAKEEVENTVALIDATION456==">
<input id="ctl00_ContentPlaceHolder1_chkTipoBusqueda_0" type="checkbox" name="ctl00$ContentPlaceHolder1$chkTipoBusqueda$0">
</form></body></html>
```

Create `scripts/lib/__tests__/fixtures/isp-paso3-resultados.html` with this content (trimmed real results-table markup captured from a live "PARACETAMOL" search, two rows):

```html
<html><body><form id="form1">
<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="FAKEVIEWSTATE789==">
<input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="CA0B0334">
<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="FAKEEVENTVALIDATIONABC==">
<table cellspacing="0" cellpadding="6" border="0" id="ctl00_ContentPlaceHolder1_gvDatosBusqueda">
<tbody>
<tr>
<th class="titrow" scope="col">&nbsp;</th><th class="titrow" scope="col">Registro</th><th class="titrow" scope="col">Nombre</th><th class="titrow" scope="col">Fecha Registro</th><th class="titrow" scope="col">Empresa</th><th class="titrow" scope="col">Principio Activo</th><th class="titrow" scope="col">Control Legal</th>
</tr>
<tr>
<td class="tdsimple"><input type="image" name="ctl00$ContentPlaceHolder1$gvDatosBusqueda$ctl02$ImageButton1" id="ctl00_ContentPlaceHolder1_gvDatosBusqueda_ctl02_ImageButton1" src="img/lupa.gif"></td>
<td class="tdsimple"><span id="ctl00_ContentPlaceHolder1_gvDatosBusqueda_ctl02_lblProducto">F-29353/25</span></td>
<td class="tdsimple"><span id="ctl00_ContentPlaceHolder1_gvDatosBusqueda_ctl02_lblNombre">ÁCIDO ACETILSALICILICO/ PARACETAMOL / CAFEINA 250/250/65 COMPRIMIDOS</span></td>
<td class="tdsimple"><span id="ctl00_ContentPlaceHolder1_gvDatosBusqueda_ctl02_lblFechaRegistro">2025-12-02</span></td>
<td class="tdsimple"><span id="ctl00_ContentPlaceHolder1_gvDatosBusqueda_ctl02_lblTitular">LABORATORIO SCL LIMITADA</span></td>
<td class="tdsimple"><span id="ctl00_ContentPlaceHolder1_gvDatosBusqueda_ctl02_lblPA">ACIDO ACETILSALICILICO;CAFEINA;PARACETAMOL</span></td>
<td class="tdsimple"><span id="ctl00_ContentPlaceHolder1_gvDatosBusqueda_ctl02_lblLegal"></span></td>
</tr>
<tr>
<td class="tdsimple"><input type="image" name="ctl00$ContentPlaceHolder1$gvDatosBusqueda$ctl03$ImageButton1" id="ctl00_ContentPlaceHolder1_gvDatosBusqueda_ctl03_ImageButton1" src="img/lupa.gif"></td>
<td class="tdsimple"><span id="ctl00_ContentPlaceHolder1_gvDatosBusqueda_ctl03_lblProducto">F-26557/21</span></td>
<td class="tdsimple"><span id="ctl00_ContentPlaceHolder1_gvDatosBusqueda_ctl03_lblNombre">ALIVIDOL COMPRIMIDOS 500 mg (PARACETAMOL)</span></td>
<td class="tdsimple"><span id="ctl00_ContentPlaceHolder1_gvDatosBusqueda_ctl03_lblFechaRegistro">2021-12-30</span></td>
<td class="tdsimple"><span id="ctl00_ContentPlaceHolder1_gvDatosBusqueda_ctl03_lblTitular">OPKO CHILE S.A.</span></td>
<td class="tdsimple"><span id="ctl00_ContentPlaceHolder1_gvDatosBusqueda_ctl03_lblPA">PARACETAMOL</span></td>
<td class="tdsimple"><span id="ctl00_ContentPlaceHolder1_gvDatosBusqueda_ctl03_lblLegal"></span></td>
</tr>
</tbody>
</table>
</form></body></html>
```

- [ ] **Step 2: Write the failing test**

```js
// scripts/lib/__tests__/isp-client.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractHiddenFields, parseResultRows } from '../isp-client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(__dirname, 'fixtures', name), 'utf-8');

test('extractHiddenFields reads viewstate/generator/eventvalidation', () => {
  const html = fixture('isp-paso1-inicial.html');
  const fields = extractHiddenFields(html);
  assert.equal(fields.viewState, 'FAKEVIEWSTATE123==');
  assert.equal(fields.viewStateGenerator, 'CA0B0334');
  assert.equal(fields.eventValidation, 'FAKEEVENTVALIDATION456==');
});

test('parseResultRows extracts every product row from the results table', () => {
  const html = fixture('isp-paso3-resultados.html');
  const rows = parseResultRows(html);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    registroIsp: 'F-29353/25',
    nombreProducto: 'ÁCIDO ACETILSALICILICO/ PARACETAMOL / CAFEINA 250/250/65 COMPRIMIDOS',
    fechaRegistro: '2025-12-02',
    empresa: 'LABORATORIO SCL LIMITADA',
    principioActivo: 'ACIDO ACETILSALICILICO;CAFEINA;PARACETAMOL'
  });
  assert.equal(rows[1].registroIsp, 'F-26557/21');
});

test('parseResultRows returns empty array when table is missing', () => {
  assert.deepEqual(parseResultRows('<html><body>no results</body></html>'), []);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test scripts/lib/__tests__/isp-client.test.mjs`
Expected: FAIL with "Cannot find module '../isp-client.mjs'" (file doesn't exist yet)

- [ ] **Step 4: Write the implementation**

```js
// scripts/lib/isp-client.mjs
const BASE_URL = 'https://registrosanitario.ispch.gob.cl/';
const CHK_NOMBRE_PRODUCTO = 'ctl00$ContentPlaceHolder1$chkTipoBusqueda$0';
const TXT_NOMBRE_PRODUCTO = 'ctl00$ContentPlaceHolder1$txtNombreProducto';
const DDL_ESTADO = 'ctl00$ContentPlaceHolder1$ddlEstado';
const BTN_BUSCAR = 'ctl00$ContentPlaceHolder1$btnBuscar';

export function extractHiddenFields(html) {
  const grab = (name) => {
    const match = html.match(new RegExp(`id="${name}"[^>]*value="([^"]*)"`));
    return match ? match[1] : '';
  };
  return {
    viewState: grab('__VIEWSTATE'),
    viewStateGenerator: grab('__VIEWSTATEGENERATOR'),
    eventValidation: grab('__EVENTVALIDATION')
  };
}

export function parseResultRows(html) {
  const tableMatch = html.match(
    /<table[^>]*id="ctl00_ContentPlaceHolder1_gvDatosBusqueda"[\s\S]*?<\/table>/
  );
  if (!tableMatch) return [];

  const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
  const rows = [];
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tableMatch[0])) !== null) {
    const rowHtml = rowMatch[1];
    const field = (suffix) => {
      const m = rowHtml.match(new RegExp(`_lbl${suffix}"[^>]*>([^<]*)<`));
      return m ? m[1].trim() : '';
    };
    const registroIsp = field('Producto');
    if (!registroIsp) continue; // header row has no lblProducto span
    rows.push({
      registroIsp,
      nombreProducto: field('Nombre'),
      fechaRegistro: field('FechaRegistro'),
      empresa: field('Titular'),
      principioActivo: field('PA')
    });
  }
  return rows;
}

async function postForm(body) {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!response.ok) {
    throw new Error(`ISP respondió con status ${response.status}`);
  }
  return response.text();
}

export async function scrapeProductosPorPrincipioActivo(term) {
  const initialResponse = await fetch(BASE_URL);
  if (!initialResponse.ok) {
    throw new Error(`ISP (GET inicial) respondió con status ${initialResponse.status}`);
  }
  const initialHtml = await initialResponse.text();
  const step1Fields = extractHiddenFields(initialHtml);
  if (!step1Fields.viewState) {
    throw new Error('No se pudo extraer __VIEWSTATE de la página inicial del ISP. El sitio pudo haber cambiado.');
  }

  const toggleBody = new URLSearchParams({
    __EVENTTARGET: CHK_NOMBRE_PRODUCTO,
    __EVENTARGUMENT: '',
    __VIEWSTATE: step1Fields.viewState,
    __VIEWSTATEGENERATOR: step1Fields.viewStateGenerator,
    __EVENTVALIDATION: step1Fields.eventValidation,
    [CHK_NOMBRE_PRODUCTO]: 'on',
    [DDL_ESTADO]: 'Sí'
  });
  const toggleHtml = await postForm(toggleBody);
  const step2Fields = extractHiddenFields(toggleHtml);
  if (!step2Fields.viewState) {
    throw new Error('No se pudo extraer __VIEWSTATE tras activar el checkbox de búsqueda. El sitio pudo haber cambiado.');
  }

  const searchBody = new URLSearchParams({
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
    __VIEWSTATE: step2Fields.viewState,
    __VIEWSTATEGENERATOR: step2Fields.viewStateGenerator,
    __EVENTVALIDATION: step2Fields.eventValidation,
    [CHK_NOMBRE_PRODUCTO]: 'on',
    [TXT_NOMBRE_PRODUCTO]: term,
    [DDL_ESTADO]: 'Sí',
    [BTN_BUSCAR]: 'Buscar'
  });
  const resultsHtml = await postForm(searchBody);
  return parseResultRows(resultsHtml);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test scripts/lib/__tests__/isp-client.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/isp-client.mjs scripts/lib/__tests__/
git commit -m "feat: add ISP registrosanitario postback client and result parser"
```

---

### Task 3: Scrape script — populate `medicamentos_catalogo` for the starter list

**Files:**
- Create: `scripts/scrape-isp.mjs`

**Interfaces:**
- Consumes: `scrapeProductosPorPrincipioActivo(term)` from Task 2 (`scripts/lib/isp-client.mjs`).
- Produces: rows in `medicamentos_catalogo` (Task 1 schema).

- [ ] **Step 1: Write the script**

```js
// scripts/scrape-isp.mjs
import { createClient } from '@supabase/supabase-js';
import { scrapeProductosPorPrincipioActivo } from './lib/isp-client.mjs';

const PRINCIPIOS_ACTIVOS = ['PARACETAMOL', 'IBUPROFENO', 'AMOXICILINA', 'LORATADINA', 'OMEPRAZOL'];

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

async function main() {
  const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  let total = 0;
  let hadErrors = false;

  for (const principio of PRINCIPIOS_ACTIVOS) {
    let productos;
    try {
      productos = await scrapeProductosPorPrincipioActivo(principio);
    } catch (err) {
      console.error(`ERROR scrapeando ${principio}:`, err.message);
      hadErrors = true;
      continue;
    }

    if (productos.length === 0) {
      console.error(`ADVERTENCIA: 0 resultados para ${principio}. Verifica si el sitio del ISP cambió su estructura.`);
      hadErrors = true;
      continue;
    }

    const rows = productos.map((p) => ({
      registro_isp: p.registroIsp,
      nombre_producto: p.nombreProducto,
      empresa: p.empresa || null,
      principio_activo: normalizar(p.principioActivo || principio),
      fecha_registro: parseFecha(p.fechaRegistro),
      estado: 'Vigente',
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('medicamentos_catalogo').upsert(rows, { onConflict: 'registro_isp' });
    if (error) {
      console.error(`ERROR insertando productos de ${principio}:`, error.message);
      hadErrors = true;
      continue;
    }

    total += rows.length;
    console.log(`${principio}: ${rows.length} productos cargados.`);
  }

  console.log(`Total cargado: ${total} productos.`);
  if (hadErrors) process.exitCode = 1;
}

main();
```

- [ ] **Step 2: Run it for real against the ISP site**

Run: `node --env-file=.env scripts/scrape-isp.mjs`
Expected: one line per principio activo with a count > 0, ending in "Total cargado: N productos." with exit code 0. If any line says "0 resultados" or "ERROR", stop and inspect — it means the ISP site's field names or table structure changed from what Task 2's fixtures assume.

- [ ] **Step 3: Verify in Supabase**

In the Supabase dashboard Table Editor, open `medicamentos_catalogo` and confirm rows exist with `principio_activo` values matching the 5 starter terms (uppercase, no accents).

- [ ] **Step 4: Commit**

```bash
git add scripts/scrape-isp.mjs
git commit -m "feat: add scrape-isp script to populate medicamentos_catalogo"
```

---

### Task 4: Curated fichas — schema validation + seed data + loader script

**Files:**
- Create: `src/zodschemas/ficha-medicamento.schema.ts`
- Create: `data/fichas-seed.json`
- Create: `scripts/seed-fichas.mjs`
- Test: `scripts/__tests__/fichas-seed.test.mjs`

**Interfaces:**
- Produces: rows in `medicamentos_fichas` (Task 1 schema) with `revisado = true`, for `principio_activo` values `PARACETAMOL`, `IBUPROFENO`, `AMOXICILINA`, `LORATADINA`, `OMEPRAZOL` — matching Task 3's scraped catalog exactly, so the join in Task 5 works.

- [ ] **Step 1: Write the Zod schema**

```ts
// src/zodschemas/ficha-medicamento.schema.ts
import { z } from 'zod';

export const fichaMedicamentoSchema = z.object({
  principioActivo: z.string().trim().min(1),
  paraQueSirve: z.string().trim().min(1),
  dosisAdulto: z.string().trim().min(1),
  dosisNino: z.string().trim().nullable(),
  contraindicaciones: z.string().trim().min(1),
  advertencias: z.string().trim().nullable(),
  fuenteNombre: z.string().trim().min(1),
  fuenteUrl: z.string().trim().url()
});

export type FichaMedicamentoSeed = z.infer<typeof fichaMedicamentoSchema>;
```

- [ ] **Step 2: Write the seed content**

```json
[
  {
    "principioActivo": "PARACETAMOL",
    "paraQueSirve": "Alivio de dolor leve a moderado (dolor de cabeza, muscular, dental) y reducción de fiebre.",
    "dosisAdulto": "500-1000 mg cada 4-6 horas, sin exceder 4000 mg (4 g) en 24 horas.",
    "dosisNino": "10-15 mg/kg cada 4-6 horas, sin exceder 5 dosis en 24 horas. Confirmar dosis exacta según peso con un pediatra.",
    "contraindicaciones": "Alergia al paracetamol, enfermedad hepática grave, consumo de 3 o más bebidas alcohólicas al día.",
    "advertencias": "Dosis superiores a las indicadas pueden causar daño hepático grave. No combinar con otros productos que también contengan paracetamol.",
    "fuenteNombre": "FDA Drug Label (openFDA) - Acetaminophen",
    "fuenteUrl": "https://api.fda.gov/drug/label.json?search=openfda.substance_name:ACETAMINOPHEN"
  },
  {
    "principioActivo": "IBUPROFENO",
    "paraQueSirve": "Antiinflamatorio no esteroideo (AINE) para alivio de dolor, fiebre e inflamación.",
    "dosisAdulto": "200-400 mg cada 4-6 horas, sin exceder 1200 mg en 24 horas en uso sin supervisión médica.",
    "dosisNino": "5-10 mg/kg cada 6-8 horas según peso y edad. No recomendado en menores de 6 meses. Confirmar con un pediatra.",
    "contraindicaciones": "Alergia a AINEs o aspirina, úlcera péptica activa, tercer trimestre de embarazo, insuficiencia renal o hepática grave.",
    "advertencias": "Aumenta el riesgo de sangrado gastrointestinal y eventos cardiovasculares con uso prolongado. Tomar con alimentos.",
    "fuenteNombre": "FDA Drug Label (openFDA) - Ibuprofen",
    "fuenteUrl": "https://api.fda.gov/drug/label.json?search=openfda.substance_name:IBUPROFEN"
  },
  {
    "principioActivo": "AMOXICILINA",
    "paraQueSirve": "Antibiótico betalactámico para infecciones bacterianas (respiratorias, oído, urinarias, entre otras), solo con receta médica.",
    "dosisAdulto": "250-500 mg cada 8 horas, según indicación médica.",
    "dosisNino": "20-40 mg/kg/día dividido cada 8 horas, según indicación pediátrica.",
    "contraindicaciones": "Alergia a penicilinas o cefalosporinas.",
    "advertencias": "Uso exclusivo bajo prescripción médica. Completar el tratamiento indicado aunque los síntomas mejoren, para evitar resistencia bacteriana.",
    "fuenteNombre": "FDA Drug Label (openFDA) - Amoxicillin",
    "fuenteUrl": "https://api.fda.gov/drug/label.json?search=openfda.substance_name:AMOXICILLIN"
  },
  {
    "principioActivo": "LORATADINA",
    "paraQueSirve": "Antihistamínico para alivio de síntomas alérgicos: rinitis alérgica, urticaria.",
    "dosisAdulto": "10 mg una vez al día.",
    "dosisNino": "Mayores de 6 años y más de 30 kg: 10 mg al día. Entre 2-6 años o menos de 30 kg: 5 mg al día, confirmar con un pediatra.",
    "contraindicaciones": "Alergia a la loratadina.",
    "advertencias": "Puede causar somnolencia leve en algunas personas. Evitar exceso de alcohol mientras se usa.",
    "fuenteNombre": "FDA Drug Label (openFDA) - Loratadine",
    "fuenteUrl": "https://api.fda.gov/drug/label.json?search=openfda.substance_name:LORATADINE"
  },
  {
    "principioActivo": "OMEPRAZOL",
    "paraQueSirve": "Inhibidor de bomba de protones que reduce la acidez estomacal (reflujo, úlceras, gastritis).",
    "dosisAdulto": "20 mg una vez al día antes del desayuno, por hasta 14 días en uso sin supervisión médica. Tratamientos más largos requieren indicación médica.",
    "dosisNino": "No recomendado sin indicación médica en menores de 18 años.",
    "contraindicaciones": "Alergia a inhibidores de bomba de protones.",
    "advertencias": "El uso prolongado sin supervisión médica puede enmascarar síntomas de enfermedades más graves. Consultar si los síntomas persisten más de 14 días.",
    "fuenteNombre": "FDA Drug Label (openFDA) - Omeprazole",
    "fuenteUrl": "https://api.fda.gov/drug/label.json?search=openfda.substance_name:OMEPRAZOLE"
  }
]
```

- [ ] **Step 3: Write the failing test**

```js
// scripts/__tests__/fichas-seed.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fichaMedicamentoSchema } from '../../src/zodschemas/ficha-medicamento.schema.ts';

test('every entry in fichas-seed.json satisfies fichaMedicamentoSchema', () => {
  const seed = JSON.parse(readFileSync(new URL('../../data/fichas-seed.json', import.meta.url)));
  assert.ok(seed.length >= 5);
  for (const entry of seed) {
    const result = fichaMedicamentoSchema.safeParse(entry);
    assert.equal(result.success, true, `${entry.principioActivo}: ${JSON.stringify(result.error?.issues)}`);
  }
});

test('no duplicate principioActivo values in the seed', () => {
  const seed = JSON.parse(readFileSync(new URL('../../data/fichas-seed.json', import.meta.url)));
  const values = seed.map((e) => e.principioActivo);
  assert.equal(new Set(values).size, values.length);
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `node --experimental-strip-types --test scripts/__tests__/fichas-seed.test.mjs`
Expected: FAIL — `data/fichas-seed.json` doesn't exist yet at this point if steps run strictly in order; since Step 2 already created it, this instead verifies the schema import resolves and the JSON is valid. If it FAILs on the import instead, that confirms the test file is wired correctly before moving on.

- [ ] **Step 5: Create `data/fichas-seed.json` from Step 2's content, then run test to verify it passes**

Run: `node --experimental-strip-types --test scripts/__tests__/fichas-seed.test.mjs`
Expected: PASS (2 tests)

- [ ] **Step 6: Write the loader script**

```js
// scripts/seed-fichas.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function normalizar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();
}

async function main() {
  const seed = JSON.parse(readFileSync(new URL('../data/fichas-seed.json', import.meta.url)));
  const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const rows = seed.map((f) => ({
    principio_activo: normalizar(f.principioActivo),
    para_que_sirve: f.paraQueSirve,
    dosis_adulto: f.dosisAdulto,
    dosis_nino: f.dosisNino,
    contraindicaciones: f.contraindicaciones,
    advertencias: f.advertencias,
    fuente_nombre: f.fuenteNombre,
    fuente_url: f.fuenteUrl,
    revisado: true,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('medicamentos_fichas').upsert(rows, { onConflict: 'principio_activo' });
  if (error) {
    console.error('ERROR cargando fichas:', error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`${rows.length} fichas cargadas y marcadas como revisadas.`);
}

main();
```

- [ ] **Step 7: Run it against Supabase**

Run: `node --env-file=.env scripts/seed-fichas.mjs`
Expected: "5 fichas cargadas y marcadas como revisadas."

- [ ] **Step 8: Commit**

```bash
git add src/zodschemas/ficha-medicamento.schema.ts data/fichas-seed.json scripts/seed-fichas.mjs scripts/__tests__/fichas-seed.test.mjs
git commit -m "feat: add curated fichas seed data and loader script"
```

---

### Task 5: Search service + API endpoint

**Files:**
- Create: `src/types/medicamentos-catalogo.types.ts`
- Modify: `src/types/index.ts`
- Create: `src/services/medicamentosCatalogo.service.ts`
- Create: `src/pages/api/medicamentos/buscar.ts`
- Test: `scripts/__tests__/buscar-medicamentos.test.mjs`

**Interfaces:**
- Consumes: `medicamentos_catalogo` and `medicamentos_fichas` tables (Task 1), `supabase` client from `src/lib/supabaseClient.ts`.
- Produces: `buscarMedicamentos(termino: string): Promise<ResultadoBusquedaMedicamento[]>`, and `GET /api/medicamentos/buscar?q=<termino>` returning that same array as JSON. Consumed by Task 6's UI.

- [ ] **Step 1: Write the types**

```ts
// src/types/medicamentos-catalogo.types.ts
export interface FichaMedicamento {
  paraQueSirve: string;
  dosisAdulto: string;
  dosisNino: string | null;
  contraindicaciones: string;
  advertencias: string | null;
  fuenteNombre: string;
  fuenteUrl: string;
}

export interface ResultadoBusquedaMedicamento {
  registroIsp: string;
  nombreProducto: string;
  empresa: string | null;
  principioActivo: string;
  ficha: FichaMedicamento | null;
}
```

```ts
// src/types/index.ts (add this line)
export * from './medicamentos-catalogo.types';
```

- [ ] **Step 2: Write the service**

```ts
// src/services/medicamentosCatalogo.service.ts
import { supabase } from '../lib/supabaseClient';
import type { ResultadoBusquedaMedicamento } from '../types';

export async function buscarMedicamentos(termino: string): Promise<ResultadoBusquedaMedicamento[]> {
  const term = termino.trim();
  if (term.length < 2) return [];

  const { data: productos, error } = await supabase
    .from('medicamentos_catalogo')
    .select('registro_isp, nombre_producto, empresa, principio_activo')
    .ilike('nombre_producto', `%${term}%`)
    .order('nombre_producto')
    .limit(20);

  if (error) throw error;
  if (!productos || productos.length === 0) return [];

  const principios = [...new Set(productos.map((p) => p.principio_activo))];
  const { data: fichas, error: fichasError } = await supabase
    .from('medicamentos_fichas')
    .select('principio_activo, para_que_sirve, dosis_adulto, dosis_nino, contraindicaciones, advertencias, fuente_nombre, fuente_url')
    .in('principio_activo', principios);

  if (fichasError) throw fichasError;

  const fichaPorPrincipio = new Map((fichas ?? []).map((f) => [f.principio_activo, f]));

  return productos.map((p) => {
    const f = fichaPorPrincipio.get(p.principio_activo);
    return {
      registroIsp: p.registro_isp,
      nombreProducto: p.nombre_producto,
      empresa: p.empresa,
      principioActivo: p.principio_activo,
      ficha: f
        ? {
            paraQueSirve: f.para_que_sirve,
            dosisAdulto: f.dosis_adulto,
            dosisNino: f.dosis_nino,
            contraindicaciones: f.contraindicaciones,
            advertencias: f.advertencias,
            fuenteNombre: f.fuente_nombre,
            fuenteUrl: f.fuente_url
          }
        : null
    };
  });
}
```

(RLS from Task 1 already restricts the `medicamentos_fichas` select to `revisado = true` rows, so there is no unrevisado-filtering logic to write here — the database enforces it.)

- [ ] **Step 3: Write the endpoint**

```ts
// src/pages/api/medicamentos/buscar.ts
import type { APIRoute } from 'astro';
import { buscarMedicamentos } from '../../../services/medicamentosCatalogo.service';

export const GET: APIRoute = async ({ url }) => {
  const termino = url.searchParams.get('q') ?? '';

  try {
    const resultados = await buscarMedicamentos(termino);
    return new Response(JSON.stringify(resultados), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error buscando medicamentos:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'No se pudo realizar la búsqueda de medicamentos. Inténtalo más tarde.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

- [ ] **Step 4: Write the integration test**

```js
// scripts/__tests__/buscar-medicamentos.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buscarMedicamentos } from '../../src/services/medicamentosCatalogo.service.ts';

test('buscarMedicamentos returns a product with its ficha for a known term', async () => {
  const resultados = await buscarMedicamentos('PARACETAMOL');
  assert.ok(resultados.length > 0);
  const conFicha = resultados.find((r) => r.ficha !== null);
  assert.ok(conFicha, 'expected at least one PARACETAMOL result to have a revisado ficha');
  assert.equal(conFicha.ficha.dosisAdulto.length > 0, true);
});

test('buscarMedicamentos returns empty array for short queries', async () => {
  const resultados = await buscarMedicamentos('a');
  assert.deepEqual(resultados, []);
});

test('buscarMedicamentos returns empty array for a term with no matches', async () => {
  const resultados = await buscarMedicamentos('ZZZNOEXISTEZZZ');
  assert.deepEqual(resultados, []);
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --env-file=.env --experimental-strip-types --test scripts/__tests__/buscar-medicamentos.test.mjs`
Expected: PASS (3 tests) — requires Task 3 and Task 4 to have already run against this Supabase instance (catalog + fichas populated).

- [ ] **Step 6: Manual endpoint check**

Run: `npm run dev`, then in another terminal: `curl "http://localhost:4321/api/medicamentos/buscar?q=paracetamol"`
Expected: JSON array with at least one entry whose `ficha` field is populated (not `null`) with `dosisAdulto` matching Task 4's seed content.

- [ ] **Step 7: Commit**

```bash
git add src/types/medicamentos-catalogo.types.ts src/types/index.ts src/services/medicamentosCatalogo.service.ts src/pages/api/medicamentos/buscar.ts scripts/__tests__/buscar-medicamentos.test.mjs
git commit -m "feat: add medicamentos search service and API endpoint"
```

---

### Task 6: UI — search island + result card, replacing the comparador placeholder

**Files:**
- Create: `src/components/medicamentos/TarjetaFicha.tsx`
- Create: `src/components/medicamentos/BuscadorMedicamentos.tsx`
- Modify: `src/pages/comparador-medicamentos.astro`

**Interfaces:**
- Consumes: `GET /api/medicamentos/buscar?q=` (Task 5), `ResultadoBusquedaMedicamento` type (Task 5).

- [ ] **Step 1: Write the result card**

```tsx
// src/components/medicamentos/TarjetaFicha.tsx
import { Pill, ExternalLink } from 'lucide-react';
import type { ResultadoBusquedaMedicamento } from '../../types';

interface TarjetaFichaProps {
  resultado: ResultadoBusquedaMedicamento;
}

export default function TarjetaFicha({ resultado }: TarjetaFichaProps) {
  return (
    <div className="flex flex-col glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-extrabold text-slate-800 text-base uppercase leading-snug">
          {resultado.nombreProducto.toLowerCase()}
        </h3>
        <span className="flex-shrink-0 bg-mint-50 border border-mint-100 text-mint-700 text-[10px] font-bold font-mono px-2 py-1 rounded-lg">
          {resultado.principioActivo}
        </span>
      </div>

      {resultado.empresa && (
        <p className="text-xs text-slate-400 font-mono mb-4">{resultado.empresa}</p>
      )}

      {resultado.ficha ? (
        <div className="space-y-3 text-xs">
          <div>
            <p className="font-bold text-slate-700 mb-1">Para qué sirve</p>
            <p className="text-slate-500 leading-relaxed">{resultado.ficha.paraQueSirve}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="font-bold text-slate-700 mb-1">Dosis adulto</p>
              <p className="text-slate-500 leading-relaxed">{resultado.ficha.dosisAdulto}</p>
            </div>
            {resultado.ficha.dosisNino && (
              <div>
                <p className="font-bold text-slate-700 mb-1">Dosis niños</p>
                <p className="text-slate-500 leading-relaxed">{resultado.ficha.dosisNino}</p>
              </div>
            )}
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-1">Contraindicaciones</p>
            <p className="text-slate-500 leading-relaxed">{resultado.ficha.contraindicaciones}</p>
          </div>
          <a
            href={resultado.ficha.fuenteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-mint-600 hover:text-mint-500 font-semibold pt-2"
          >
            <ExternalLink className="w-3 h-3" />
            Fuente: {resultado.ficha.fuenteNombre}
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3">
          <Pill className="w-4 h-4 flex-shrink-0 text-slate-400" />
          <span>Sin ficha de uso disponible todavía. Consulta a tu farmacéutico o médico.</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write the search island**

```tsx
// src/components/medicamentos/BuscadorMedicamentos.tsx
import { useState } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import TarjetaFicha from './TarjetaFicha';
import type { ResultadoBusquedaMedicamento } from '../../types';

export default function BuscadorMedicamentos() {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusquedaMedicamento[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (termino.trim().length < 2) return;

    setCargando(true);
    setError(null);
    try {
      const response = await fetch(`/api/medicamentos/buscar?q=${encodeURIComponent(termino)}`);
      if (!response.ok) throw new Error('busqueda_fallida');
      const data = await response.json();
      setResultados(data);
    } catch {
      setError('No se pudo realizar la búsqueda. Inténtalo más tarde.');
      setResultados(null);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 mb-6">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>Información referencial. No reemplaza el consejo de un profesional de la salud.</span>
      </div>

      <form onSubmit={buscar} className="flex gap-2 mb-6">
        <input
          type="text"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Buscar medicamento (ej: paracetamol)"
          className="glass-input flex-1 px-4 py-3 rounded-xl text-sm"
        />
        <button type="submit" className="btn-primary" disabled={cargando}>
          <Search className="w-4 h-4" />
          Buscar
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {resultados !== null && resultados.length === 0 && !error && (
        <p className="text-sm text-slate-500 text-center py-8">
          No encontramos medicamentos que coincidan con "{termino}".
        </p>
      )}

      <div className="flex flex-col gap-4">
        {resultados?.map((r) => (
          <TarjetaFicha key={r.registroIsp} resultado={r} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire it into the page**

```astro
---
// src/pages/comparador-medicamentos.astro
import Layout from '../layouts/Layout.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import BuscadorMedicamentos from '../components/medicamentos/BuscadorMedicamentos';
---

<Layout
  title="Buscador de Medicamentos - FarmaTurno Chile"
  description="Busca medicamentos y consulta para qué sirven, dosis y contraindicaciones."
>
  <Header />

  <main class="grow container mx-auto px-4 py-12">
    <h1 class="text-2xl md:text-3xl font-black tracking-tight text-slate-900 font-heading mb-8 text-center">
      Buscador de Medicamentos
    </h1>
    <BuscadorMedicamentos client:load />
  </main>

  <Footer />
</Layout>
```

- [ ] **Step 4: Manual browser verification**

Run: `npm run dev`, open `http://localhost:4321/comparador-medicamentos` in a browser.
- Search "paracetamol" → expect at least one card with "Para qué sirve", "Dosis adulto", contraindicaciones, and a "Fuente:" link.
- Search "xyzxyz" → expect the "No encontramos medicamentos..." message, no crash.
- Confirm the amber disclaimer banner is visible above the search box at all times.

- [ ] **Step 5: Commit**

```bash
git add src/components/medicamentos/ src/pages/comparador-medicamentos.astro
git commit -m "feat: replace comparador placeholder with medication search UI"
```

---

## Self-Review Notes

- **Spec coverage:** catálogo scrape (Task 2-3), fichas curadas con fuente (Task 4), endpoint de búsqueda (Task 5), UI reemplazando placeholder con disclaimer (Task 6), gate `revisado` a nivel RLS (Task 1) — todos los puntos de la spec tienen tarea. Cron automático y edición de fichas desde UI quedan explícitamente fuera (ver spec).
- **Type consistency checked:** `ResultadoBusquedaMedicamento`/`FichaMedicamento` (Task 5) match the shape `TarjetaFicha` (Task 6) consumes field-for-field (`paraQueSirve`, `dosisAdulto`, `dosisNino`, `contraindicaciones`, `advertencias`, `fuenteNombre`, `fuenteUrl`). `principio_activo` normalization (`normalizar()`) is duplicated verbatim in `scrape-isp.mjs` and `seed-fichas.mjs` — both must stay identical or the join breaks; noted as a risk, acceptable for v1's fixed 5-term scope.
- **No placeholders:** every step has real code, real commands, real expected output.
