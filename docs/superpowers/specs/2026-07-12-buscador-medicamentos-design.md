# Buscador de Medicamentos — Design

## Contexto

`/comparador-medicamentos` es hoy un placeholder "próximamente" (comparación de precios entre farmacias). Se descarta esa idea: no existe API pública/gratuita de precios en Chile (retailers sin API, scraping frágil y legalmente gris). Se reemplaza por un **buscador de medicamentos con ficha de uso** (para qué sirve, dosis adulto/niño, contraindicaciones), separado del "Botiquín" existente (que es el tracker personal de stock del usuario).

Investigadas y descartadas como fuente de datos: ISP registrosanitario (sin API, solo scrape HTML, sin dosis), MINSAL FHIR (historial de paciente, no catálogo), CENS Pharma (pago + Docker propio), CENABAST (interno hospitalario), VIDAL Vademecum (enterprise B2B pago, España), DrugBank (comercial, EEUU). openFDA Drug Label API (gratis, pública, JSON, sin key) se usa como *referencia* para redactar fichas, no como fuente en vivo.

## Restricción de stack

Ningún paquete nuevo. Solo lo que ya está en el proyecto: Astro (SSR + islands), React, Supabase (Postgres + `@supabase/supabase-js`), Tailwind, Zod, lucide-react/lucide-astro. Sin librerías de scraping (fetch nativo + parseo manual de HTML), sin ORM nuevo, sin frameworks de testing nuevos si no existen ya en el repo.

## Alcance v1

Entregar **incremental y funcional por partes** (pedido explícito del usuario): cada parte debe andar de punta a punta antes de pasar a la siguiente. No se construye todo el pipeline de golpe.

1. Tabla `medicamentos_catalogo` + script de carga desde ISP (scrape manual, corrido a mano, sin cron todavía).
2. Tabla `medicamentos_fichas` + 20-30 fichas curadas a mano (medicamentos más comunes), redactadas usando openFDA como referencia y citando fuente.
3. Endpoint de búsqueda + servicio.
4. UI: página `/comparador-medicamentos` reemplazada por buscador real, reutilizando estilo `glass-card`.

Fuera de alcance v1: cron automático de actualización, comparación de precios, todas las +500 fichas, edición de fichas desde la UI (se cargan por script/SQL directo).

## Modelo de datos (Supabase)

```sql
medicamentos_catalogo
  id                uuid pk default gen_random_uuid()
  registro_isp      text unique not null   -- ej. "F-26557/21"
  nombre_producto   text not null
  empresa           text
  principio_activo  text not null          -- normalizado (upper, sin acentos) para join
  fecha_registro    date
  estado            text                   -- Vigente / No Vigente / Suspendido
  updated_at        timestamptz default now()

medicamentos_fichas
  id                  uuid pk default gen_random_uuid()
  principio_activo    text unique not null  -- misma normalización que arriba
  para_que_sirve      text not null
  dosis_adulto        text not null
  dosis_nino          text
  contraindicaciones  text not null
  advertencias        text
  fuente_nombre       text not null   -- ej. "FDA Drug Label (openFDA)", "ISP Chile"
  fuente_url          text not null
  revisado            boolean default false  -- gate: solo revisado=true se muestra
  updated_at          timestamptz default now()
```

`principio_activo` es la clave de join entre catálogo (miles de productos comerciales) y fichas (cientos de principios activos). Normalización simple (mayúsculas, sin tildes, trim) para evitar misses por formato.

## Flujo de datos

1. **Scrape ISP → catálogo**: script Node standalone (`scripts/scrape-isp.ts` o similar), hace POST al form de `registrosanitario.ispch.gob.cl` (ASP.NET WebForms, requiere manejar ViewState del postback), parsea la tabla HTML de resultados, upsert por `registro_isp` en Supabase. Corrida manual por ahora — se documenta el comando, no se automatiza en v1.
2. **Redacción de fichas**: proceso manual — se consulta openFDA (`api.fda.gov/drug/label.json?search=openfda.substance_name:X`), se traduce/adapta el texto a español, se valida contra criterio del equipo, se inserta en `medicamentos_fichas` con `fuente_url` apuntando al label de FDA consultado y `revisado=true` solo tras revisión.
3. **Búsqueda**: usuario escribe en el buscador → `GET /api/medicamentos/buscar?q=paracetamol` → busca en `medicamentos_catalogo.nombre_producto` (ilike) → junta con `medicamentos_fichas` por `principio_activo` donde `revisado=true` → devuelve resultado con o sin ficha.
4. **UI**: si hay ficha, se muestra completa (para qué sirve, dosis, contraindicaciones, fuente citada con link). Si no hay ficha (`revisado=false` o inexistente), se muestra solo el dato del catálogo + mensaje "Sin ficha de uso disponible todavía. Consulta a tu farmacéutico o médico."

## Manejo de errores

- Scrape ISP falla o cambia estructura del HTML → el script debe fallar ruidoso (log + exit code ≠0), nunca insertar basura silenciosamente.
- Búsqueda sin resultados → mensaje claro, no error.
- Ficha no revisada → nunca se expone en la API pública (filtro `revisado=true` en la query, no en el cliente).
- Disclaimer legal fijo y visible en la página: "Información referencial. No reemplaza el consejo de un profesional de la salud."

## Testing

- Fixture de HTML guardado de una búsqueda real del ISP → test del parser del scraper contra ese fixture (asegura que el parseo no se rompe silenciosamente si se toca el código).
- Test del endpoint de búsqueda: catálogo con ficha revisada, catálogo sin ficha, ficha no revisada (debe quedar oculta).
- Verificación manual en navegador de la UI (buscar un medicamento con ficha y uno sin ficha).

## Fuera de alcance / decisiones explícitas

- No hay comparación de precios (sin fuente pública/gratuita viable).
- No hay actualización automática del catálogo en v1 (se agrega cron si el proyecto lo justifica).
- No se editan fichas desde la UI en v1 — carga manual vía script/SQL directo en Supabase.
