# Upstash Rate-Limit/Cache + Turnstile Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proxy the MINSAL farmacias lookup through a rate-limited, cached server endpoint, and require a passed Cloudflare Turnstile challenge before any new Supabase account is created.

**Architecture:** Astro `output: "static"` becomes `output: "hybrid"` via `@astrojs/vercel`, adding two opt-in server routes (`export const prerender = false`) while every existing page stays static. Both new routes and a small `src/lib/upstash.ts` client wrap `@upstash/redis` / `@upstash/ratelimit`; `LoginModal.tsx` gains a Turnstile widget gating the existing `supabase.auth.signUp()` call.

**Tech Stack:** Astro 7, React 19, `@astrojs/vercel`, `@upstash/redis`, `@upstash/ratelimit`, Cloudflare Turnstile (vanilla JS widget, no React wrapper package), pnpm.

## Global Constraints

- Package manager is **pnpm** — every install/run command uses `pnpm`, never `npm`/`yarn`.
- `@astrojs/vercel` requires `astro: ^7.0.0` (confirmed via `pnpm view @astrojs/vercel peerDependencies`); project is on `astro ^7.0.7` — compatible.
- No path aliases configured (`tsconfig.json` has none) — all new imports are relative, matching existing files.
- Astro client-exposed env vars must use the `PUBLIC_` prefix (`import.meta.env.PUBLIC_*`); server-only secrets have no prefix and are only read inside `src/pages/api/*` or `src/lib/*` server modules.
- Project has no TS/Vitest test runner wired (`scripts/__tests__/*.test.mjs` run standalone via `node --test`, not part of `pnpm build` or CI). New API routes and UI are verified manually via `pnpm dev` + `curl`/browser, matching this repo's existing convention — do not add a new test framework for this feature (YAGNI).
- `.env` already contains all 4 new vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`) for local dev. Adding the same 4 to Vercel's project Environment Variables (for production) is a manual dashboard step outside this plan's code tasks — flagged again at the end.
- Follow existing lazy-init `Proxy` pattern from `src/lib/supabaseClient.ts` for any new SDK client so a missing env var throws a clear Spanish error only when the client is actually used, not at import time.

---

### Task 1: Add Vercel adapter, switch to hybrid output

**Files:**
- Modify: `package.json` (add dependency)
- Modify: `astro.config.mjs`

**Interfaces:**
- Produces: `output: "hybrid"` build mode — later tasks' `export const prerender = false` routes depend on this being set.

- [ ] **Step 1: Install the adapter**

```bash
pnpm add @astrojs/vercel
```

- [ ] **Step 2: Update `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://farmaturno-orpin.vercel.app',
  output: 'hybrid',
  adapter: vercel(),
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 3: Verify build still succeeds**

Run: `pnpm build`
Expected: Completes with `[build] Complete!`, same 5 static pages listed as before (`comparador-medicamentos`, `mapa-turnos`, `mi-botiquin`, `politica-de-privacidad`, `index`), no new errors. Output directory changes from a plain static `dist/` to a Vercel-specific `.vercel/output/` — this is expected with the adapter.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml astro.config.mjs
git commit -m "feat: add Vercel adapter, switch to hybrid output"
```

---

### Task 2: Upstash client module

**Files:**
- Create: `src/lib/upstash.ts`

**Interfaces:**
- Consumes: `import.meta.env.UPSTASH_REDIS_REST_URL`, `import.meta.env.UPSTASH_REDIS_REST_TOKEN`
- Produces: `export const redis: Redis` (lazy proxy), `export const ratelimit: Ratelimit` (lazy proxy, sliding window 10 req/60s, prefix `farmaturno:ratelimit`) — Task 3 imports both.

- [ ] **Step 1: Install SDKs**

```bash
pnpm add @upstash/redis @upstash/ratelimit
```

- [ ] **Step 2: Write `src/lib/upstash.ts`**

```ts
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

function getEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Configúrala en .env (local) o en Vercel Environment Variables.`
    );
  }
  return value;
}

let _redis: Redis | null = null;

function getRedisClient(): Redis {
  if (_redis) return _redis;
  _redis = new Redis({
    url: getEnv('UPSTASH_REDIS_REST_URL'),
    token: getEnv('UPSTASH_REDIS_REST_TOKEN'),
  });
  return _redis;
}

export const redis = new Proxy({} as Redis, {
  get(_target, prop, receiver) {
    const client = getRedisClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

let _ratelimit: Ratelimit | null = null;

function getRatelimitInstance(): Ratelimit {
  if (_ratelimit) return _ratelimit;
  _ratelimit = new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    prefix: 'farmaturno:ratelimit',
  });
  return _ratelimit;
}

export const ratelimit = new Proxy({} as Ratelimit, {
  get(_target, prop, receiver) {
    const instance = getRatelimitInstance();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
```

- [ ] **Step 3: Verify it type-checks and builds**

Run: `pnpm build`
Expected: Completes with `[build] Complete!`, no TypeScript errors referencing `src/lib/upstash.ts` (the module isn't imported anywhere yet, so this only confirms syntax/types are valid).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/upstash.ts
git commit -m "feat: add lazy-init Upstash Redis and Ratelimit clients"
```

---

### Task 3: `/api/farmacias` proxy + rate limit + cache route

**Files:**
- Create: `src/pages/api/farmacias.ts`

**Interfaces:**
- Consumes: `redis`, `ratelimit` from `src/lib/upstash.ts` (Task 2); `obtenerFarmaciasMinsal()` from `src/lib/data/minsal.data.ts` (existing, unchanged — returns `Promise<Farmacia[]>`)
- Produces: `GET /api/farmacias` → `200` with `Farmacia[]` JSON body on success, `429` with `{ error: string }` when rate-limited, `502` with `{ error: string }` when MINSAL fails. Task 4 consumes this endpoint.

- [ ] **Step 1: Write the route**

```ts
import type { APIRoute } from 'astro';
import { obtenerFarmaciasMinsal } from '../../lib/data/minsal.data';
import { redis, ratelimit } from '../../lib/upstash';
import type { Farmacia } from '../../types/farmacias.types';

export const prerender = false;

const CACHE_KEY = 'farmacias:turno';
const CACHE_TTL_SECONDS = 300;

export const GET: APIRoute = async ({ request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cached = await redis.get<Farmacia[]>(CACHE_KEY);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const farmacias = await obtenerFarmaciasMinsal();
    await redis.set(CACHE_KEY, farmacias, { ex: CACHE_TTL_SECONDS });
    return new Response(JSON.stringify(farmacias), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en /api/farmacias:', error);
    return new Response(JSON.stringify({ error: 'No se pudieron obtener los datos de las farmacias.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

- [ ] **Step 2: Manual verification — normal request**

Run: `pnpm dev` (leave running), in another terminal:
```bash
curl -s http://localhost:4321/api/farmacias | head -c 300
```
Expected: JSON array starting with `[{"fecha":...` (real MINSAL data). First call is a cache miss (slightly slower); note the response.

- [ ] **Step 3: Manual verification — cache hit**

Run immediately after Step 2:
```bash
curl -s -w "\n%{time_total}s\n" http://localhost:4321/api/farmacias -o /dev/null
```
Expected: `time_total` noticeably lower than the first request (served from Upstash cache, no MINSAL round-trip).

- [ ] **Step 4: Manual verification — rate limit**

```bash
for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/api/farmacias; done
```
Expected: first 10 lines `200`, remaining lines `429` (sliding window of 10 req/60s per IP — all requests come from the same local IP).

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/farmacias.ts
git commit -m "feat: add rate-limited, cached /api/farmacias proxy"
```

---

### Task 4: Point `farmacias.service.ts` at the new route

**Files:**
- Modify: `src/services/farmacias.service.ts`

**Interfaces:**
- Consumes: `GET /api/farmacias` (Task 3)
- Produces: `obtenerFarmacias(): Promise<Farmacia[]>` — unchanged signature, so `src/hooks/useFarmacias.ts` needs **no changes** (it already calls `obtenerFarmacias()` from this service).

- [ ] **Step 1: Replace the direct MINSAL call with a fetch to the proxy**

```ts
import type { Farmacia } from '../types/farmacias.types';

export async function obtenerFarmacias(): Promise<Farmacia[]> {
  const response = await fetch('/api/farmacias');

  if (!response.ok) {
    throw new Error('No se pudieron obtener los datos de las farmacias.');
  }

  return response.json();
}
```

This removes the `obtenerFarmaciasMinsal` import from this file (it's now only used inside `src/pages/api/farmacias.ts`, added in Task 3) — `src/lib/data/minsal.data.ts` itself is untouched.

- [ ] **Step 2: Manual verification in the browser**

Run: `pnpm dev`, open `http://localhost:4321/mapa-turnos` in a browser with DevTools Network tab open.
Expected: a request to `/api/farmacias` (not directly to `midas.minsal.cl`) fires on page load, and the pharmacy list renders as before.

- [ ] **Step 3: Full build check**

Run: `pnpm build`
Expected: `[build] Complete!`, no errors about unused imports or type mismatches.

- [ ] **Step 4: Commit**

```bash
git add src/services/farmacias.service.ts
git commit -m "refactor: route farmacias.service through /api/farmacias proxy"
```

---

### Task 5: Turnstile verify helper + `/api/verify-turnstile` route

**Files:**
- Create: `src/lib/turnstile.ts`
- Create: `src/pages/api/verify-turnstile.ts`

**Interfaces:**
- Produces: `verifyTurnstileToken(token: string, secretKey: string, fetchFn?: typeof fetch): Promise<boolean>` (from `turnstile.ts`); `POST /api/verify-turnstile` → `200 { success: true }` / `403 { success: false }` / `400 { success: false }` (bad request body) — Task 6 consumes this endpoint.

- [ ] **Step 1: Write `src/lib/turnstile.ts`**

```ts
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(
  token: string,
  secretKey: string,
  fetchFn: typeof fetch = fetch
): Promise<boolean> {
  if (!token || !secretKey) return false;

  const body = new URLSearchParams({ secret: secretKey, response: token });

  const res = await fetchFn(VERIFY_URL, { method: 'POST', body });
  if (!res.ok) return false;

  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}
```

- [ ] **Step 2: Write `src/pages/api/verify-turnstile.ts`**

```ts
import type { APIRoute } from 'astro';
import { verifyTurnstileToken } from '../../lib/turnstile';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const token = body?.token;

  if (!token || typeof token !== 'string') {
    return new Response(JSON.stringify({ success: false }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const secretKey = import.meta.env.TURNSTILE_SECRET_KEY;
  const success = await verifyTurnstileToken(token, secretKey);

  return new Response(JSON.stringify({ success }), {
    status: success ? 200 : 403,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

- [ ] **Step 3: Manual verification — missing token**

Run: `pnpm dev`, then:
```bash
curl -s -w "\n%{http_code}\n" -X POST http://localhost:4321/api/verify-turnstile \
  -H "Content-Type: application/json" -d '{}'
```
Expected: `{"success":false}` and `400`.

- [ ] **Step 4: Manual verification — invalid token**

```bash
curl -s -w "\n%{http_code}\n" -X POST http://localhost:4321/api/verify-turnstile \
  -H "Content-Type: application/json" -d '{"token":"not-a-real-token"}'
```
Expected: `{"success":false}` and `403` (Cloudflare's `siteverify` rejects the bogus token).

- [ ] **Step 5: Commit**

```bash
git add src/lib/turnstile.ts src/pages/api/verify-turnstile.ts
git commit -m "feat: add Turnstile server-side verification endpoint"
```

---

### Task 6: Turnstile widget in `LoginModal.tsx` signup flow

**Files:**
- Create: `src/types/turnstile.d.ts`
- Modify: `src/components/auth/LoginModal.tsx`

**Interfaces:**
- Consumes: `POST /api/verify-turnstile` (Task 5); `import.meta.env.PUBLIC_TURNSTILE_SITE_KEY`; global `window.turnstile` (loaded from Cloudflare's script, declared via the new ambient type file)
- Produces: signup (`supabase.auth.signUp`) only runs after a `200 { success: true }` from `/api/verify-turnstile`.

- [ ] **Step 1: Write the ambient type declaration**

```ts
export {};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}
```

Save as `src/types/turnstile.d.ts`.

- [ ] **Step 2: Add imports, state, and refs to `LoginModal.tsx`**

Replace line 1 (`import React, { useState } from 'react';`) with:

```tsx
import React, { useState, useEffect, useRef } from 'react';
```

Add after the existing `const [loading, setLoading] = useState<boolean>(false);` (line 34):

```tsx
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
```

- [ ] **Step 3: Add the widget-loading effect**

Add directly after the refs from Step 2, before `if (!isOpen) return null;`:

```tsx
  useEffect(() => {
    if (!isRegister || !isOpen) return;

    function renderWidget() {
      if (!turnstileContainerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        'error-callback': () => setTurnstileToken(null),
        'expired-callback': () => setTurnstileToken(null),
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.getElementById('turnstile-script');
      if (existingScript) {
        existingScript.addEventListener('load', renderWidget, { once: true });
      } else {
        const script = document.createElement('script');
        script.id = 'turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = undefined;
      }
      setTurnstileToken(null);
    };
  }, [isRegister, isOpen]);
```

- [ ] **Step 4: Gate signup on Turnstile in `handleSubmit`**

In the existing `handleSubmit` (starts at line 38), replace:

```tsx
    setLoading(true);
    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
```

with:

```tsx
    if (isRegister && !turnstileToken) {
      setError('Completa la verificación de seguridad.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const verifyRes = await fetch('/api/verify-turnstile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: turnstileToken }),
        });
        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
          setError('Verificación de seguridad fallida. Intenta de nuevo.');
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
          }
          setTurnstileToken(null);
          setLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
```

(The rest of the `if (isRegister) { ... }` block — `email`, `password`, `options`, `if (signUpError) throw signUpError;`, and the `if (!data.session)` check — stays exactly as-is.)

- [ ] **Step 5: Render the widget container in the JSX**

In the form (after the password field's closing `</div>` around line 176, before the submit `<button>`), add:

```tsx
          {isRegister && (
            <div ref={turnstileContainerRef} className="flex justify-center" />
          )}
```

- [ ] **Step 6: Manual verification in the browser**

Run: `pnpm dev`, open `http://localhost:4321`, open the login modal, click "¿No tienes cuenta? Regístrate gratis".
Expected: a Turnstile widget (checkbox or "Verifying..." spinner) appears below the password field within ~1s. Complete it, then submit the form with valid username/email/password.
Expected: `POST /api/verify-turnstile` fires in the Network tab returning `{"success":true}`, followed by the normal Supabase signup flow (either session created or "revisa tu correo" message — same as before this change).

- [ ] **Step 7: Manual verification — submit without completing widget**

Reopen the modal in register mode, fill the form, but submit immediately without waiting for/completing the Turnstile widget.
Expected: inline error "Completa la verificación de seguridad." — no network request fires, no Supabase call happens.

- [ ] **Step 8: Full build check**

Run: `pnpm build`
Expected: `[build] Complete!`, no TypeScript errors (confirms `src/types/turnstile.d.ts` is picked up correctly).

- [ ] **Step 9: Commit**

```bash
git add src/types/turnstile.d.ts src/components/auth/LoginModal.tsx
git commit -m "feat: require Turnstile verification before signup"
```

---

## Final manual step (outside code)

- [ ] In the Vercel dashboard for this project, add the same 4 env vars from local `.env` (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`) under Settings → Environment Variables, then redeploy. Without this, production builds have the code but the routes will throw the "Falta la variable de entorno..." error at runtime.
