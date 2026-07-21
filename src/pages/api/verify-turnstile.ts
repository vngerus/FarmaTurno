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
