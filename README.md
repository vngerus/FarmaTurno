# FarmaTurno Chile

SPA en React (islas de Astro) para encontrar farmacias de turno en Chile y buscar información referencial de medicamentos.

> **Proyecto didáctico.** Desarrollado como evidencia evaluativa para la Unidad 3 (Desarrollo de Aplicaciones Web SPA con React) de INACAP. No es un producto médico ni farmacéutico oficial — la información de medicamentos es referencial (ver disclaimer en la app) y no reemplaza a un profesional de salud.

## Stack

- **Astro 7** (build estático) + **React 19** (islas interactivas)
- **Supabase** (Postgres + Auth + Row-Level Security)
- **Tailwind CSS 4**
- **Zod** (validación de formularios)
- **Leaflet / react-leaflet** (mapa de farmacias)

## Arquitectura de datos

```
Componente React → services/*.service.ts → fuente de datos
```

Dos fuentes, sin proxy intermedio (API routes) porque ninguna lo necesita:

- **MINSAL** (farmacias de turno): API pública con CORS abierto, se consume directo desde el navegador. La lógica de fetch vive en `src/lib/data/minsal.data.ts`.
- **Supabase** (medicamentos, botiquín, perfil): el cliente de Supabase se llama directo desde `services/`, sin pasar por un backend propio.

## Estructura de carpetas

```
src/
├── components/       # Componentes React, agrupados por dominio
│   ├── auth/         # Login, menú de usuario
│   ├── botiquin/     # CRUD del botiquín personal
│   ├── farmacias/    # Buscador, mapa, filtros de farmacias de turno
│   └── medicamentos/ # Buscador de medicamentos + ficha
├── services/         # *.service.ts — contrato que consume cada componente
├── lib/
│   ├── data/          # *.data.ts — lecturas (GET) a fuentes externas: MINSAL
│   └── supabaseClient.ts
├── hooks/            # Hooks reutilizables (ej. useFarmacias)
├── pages/            # Rutas Astro (.astro) — cada archivo es una página
├── types/            # Interfaces TypeScript por dominio (*.types.ts)
├── zodschemas/        # Validación de formularios con Zod
├── utils/            # Funciones puras (distancia, geolocalización, sanitizado)
└── styles/           # CSS global (Tailwind)

data/                 # Seeds de origen para poblar Supabase (no se sube al repo)
supabase/sql/         # Migraciones SQL (schema, RLS, índices)
scripts/              # Scripts de seed (no se suben al repo — ver .gitignore)
```

Convención de capas: `Componente → services/ (contrato + manejo de errores) → lib/data/ o Supabase directo`. Ver sección de arquitectura arriba.

## CRUD: por qué Supabase y no Local Storage

El CRUD de la app (botiquín personal de medicamentos, perfil de usuario, catálogo de medicamentos) se gestiona **completo mediante Supabase**, no con Local Storage.

Razón: Local Storage es por navegador y por dispositivo — el usuario perdería su botiquín al cambiar de equipo o borrar caché. Supabase da persistencia real, multi-dispositivo, y protege los datos con **Row-Level Security** (cada usuario solo puede leer/escribir sus propios registros; el catálogo de medicamentos es de lectura pública). El CRUD completo (crear, leer, actualizar, eliminar) está implementado en `src/services/medicamentos.service.ts` y `src/services/perfil.service.ts`.

## Uso de IA en el desarrollo

Se usó Claude (Anthropic) durante todo el desarrollo, principalmente en dos etapas:

1. **Planificación e implementación**: diseño de la arquitectura de datos (dos fuentes externas, capas `services/` y `lib/data/`), definición del esquema de Supabase con RLS, y generación de componentes React siguiendo el patrón de composición ya establecido en el proyecto.
2. **Corrección de errores y revisión técnica**: detección y arreglo de bugs reales encontrados durante el desarrollo — build de producción roto por falta de adapter, una ruta API que congelaba datos en tiempo de build en vez de servirlos en vivo, índices de base de datos que no aceleraban las consultas reales, race conditions en búsquedas rápidas, y capas de arquitectura sin justificación (barrels, proxies innecesarios) que se simplificaron tras auditar el código contra buenas prácticas de React, Supabase/Postgres y Astro.

## Desarrollo

```bash
pnpm install
pnpm dev
```

Variables de entorno requeridas (`.env`):

```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

> solo para auth

## Contribuciones y Desarrollo Colaborativo

Proyecto licenciado bajo **MIT** — abierto a que cualquiera lo use, modifique o aprenda de él. Si quieres aportar (corregir un bug, mejorar la interfaz, agregar funciones):

1. Lee nuestra [Guía de Contribución](CONTRIBUTING.md) para conocer las pautas de estilo de código, la convención de ramas y el flujo de desarrollo local.
2. Verifica que tus cambios compilen con éxito en tu entorno local ejecutando `pnpm run build`.
3. Al abrir un Pull Request, completa la información requerida mediante la plantilla predeterminada del repositorio. Todos los cambios enviados hacia `main` serán evaluados automáticamente por nuestro flujo de Integración Continua (CI).

Al ser un trabajo académico, no hay compromiso de mantenimiento activo ni tiempos de respuesta garantizados — pero toda contribución constructiva que mejore el proyecto es bienvenida.
