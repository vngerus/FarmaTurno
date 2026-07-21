# Upstash (rate limit + cache) y Cloudflare Turnstile — Diseño

## Contexto

FarmaTurno es un sitio Astro `output: "static"` desplegado en Vercel. Dos problemas sin resolver:

1. `useFarmacias.ts` pega directo desde el browser a la API pública de MINSAL (`obtenerFarmaciasMinsal` en `src/lib/data/minsal.data.ts`), sin rate limit ni cache — expuesto a scraping/abuso y a llamadas redundantes a MINSAL.
2. `LoginModal.tsx` permite `supabase.auth.signUp()` sin ninguna fricción anti-bot — expuesto a registro masivo automatizado.

`mi-botiquin` (CRUD de medicamentos, `BotiquinCRUD.tsx`) queda **fuera de alcance**: ya está gateado por auth + RLS de Supabase, un captcha ahí no aporta.

## Objetivo

- Proxyear y cachear la consulta a MINSAL con rate limit por IP, usando Upstash Redis.
- Agregar Cloudflare Turnstile al flujo de registro (signup) en `LoginModal.tsx`, verificado server-side antes de crear la cuenta en Supabase.

## Arquitectura

- Agregar adapter `@astrojs/vercel`, cambiar `output: 'hybrid'` en `astro.config.mjs`. Páginas existentes se mantienen estáticas por defecto; solo las rutas nuevas bajo `src/pages/api/` se marcan `export const prerender = false`.
- Dos rutas API nuevas:
  - `src/pages/api/farmacias.ts`
  - `src/pages/api/verify-turnstile.ts`

## Componente 1: `/api/farmacias` (proxy + rate limit + cache)

Flujo por request (GET):

1. Extraer IP del cliente de `request.headers.get('x-forwarded-for')`.
2. Rate limit con Upstash `Ratelimit.slidingWindow(10, "60 s")`, keyed por IP. Si excede → `429`.
3. Buscar cache Upstash (`GET farmacias:turno`). Si hit → devolver directo (JSON).
4. Si miss → llamar `obtenerFarmaciasMinsal()` (reutiliza función existente sin cambios), guardar resultado en cache con TTL 300s (`SET farmacias:turno ... EX 300`), devolver.

`useFarmacias.ts` cambia su fetch de MINSAL directo a `fetch('/api/farmacias')`. `farmacias.service.ts` y `minsal.data.ts` no cambian.

## Componente 2: Turnstile en signup

- `LoginModal.tsx`: cargar script Turnstile (`https://challenges.cloudflare.com/turnstile/v0/api.js`) y renderizar el widget solo en modo registro (no en login).
- `onSuccess` del widget guarda el token en state del componente.
- Al submit en modo signup: el token se envía a `POST /api/verify-turnstile` antes de llamar `supabase.auth.signUp()`.
- `/api/verify-turnstile`: recibe `{ token }`, llama a Cloudflare `siteverify` con `TURNSTILE_SECRET_KEY`, responde `{ success: boolean }`.
- Si `success: false` → error en el form, no se llama `signUp()`. Si `success: true` → sigue el flujo normal de registro.

## Variables de entorno nuevas

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

`PUBLIC_TURNSTILE_SITE_KEY` es pública (prefijo `PUBLIC_`, se usa en el widget cliente). El resto son server-only.

## Setup manual (usuario, fuera del código)

1. **Upstash**: crear cuenta en console.upstash.com → Create Database → Redis → copiar REST URL y REST Token.
2. **Turnstile**: dash.cloudflare.com → Turnstile → Add Site → dominio de producción + `localhost` para dev → widget mode "Managed" → copiar Site Key y Secret Key.
3. Pegar credenciales en `.env` local y en las env vars del proyecto en Vercel (para producción).

## Fuera de alcance

- Turnstile en `mi-botiquin` / `FormularioMedicamento.tsx` (ya gateado por auth).
- Cambiar `output` a SSR completo (se descartó, hybrid alcanza).
- Rate limit en otras rutas o servicios además de `/api/farmacias`.

## Testing

- `/api/farmacias`: request normal devuelve datos; 11ma request en 60s desde misma IP devuelve 429; segunda request dentro de TTL de cache no debería pegarle a MINSAL (verificable con log o mock).
- `/api/verify-turnstile`: token inválido/vacío devuelve `success: false`; signup no se ejecuta si Turnstile falla.
- Build (`pnpm build`) debe completar sin errores con el adapter hybrid.
