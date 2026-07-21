import type { APIRoute } from 'astro';
import { obtenerFarmaciasMinsal } from '../../lib/data/minsal.data';
import { redis, ratelimit } from '../../lib/upstash';
import type { Farmacia } from '../../types/farmacias.types';

export const prerender = false;

const CACHE_KEY = 'farmacias:turno';
const CACHE_TTL_SECONDS = 300;

export const GET: APIRoute = async ({ request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  try {
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
