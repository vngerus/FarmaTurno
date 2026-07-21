import type { APIRoute } from 'astro';
import { ratelimit } from '../../lib/upstash';
import { verifyTurnstileToken } from '../../lib/turnstile';
import { getResendClient } from '../../lib/resend';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  const { success: withinLimit } = await ratelimit.limit(ip);
  if (!withinLimit) {
    return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  const nombre = body?.nombre;
  const email = body?.email;
  const asunto = body?.asunto;
  const mensaje = body?.mensaje;
  const turnstileToken = body?.turnstileToken;

  if (
    !nombre || typeof nombre !== 'string' ||
    !email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !asunto || typeof asunto !== 'string' || asunto.trim().length > 100 ||
    !mensaje || typeof mensaje !== 'string' || mensaje.trim().length < 5
  ) {
    return new Response(JSON.stringify({ error: 'Completa todos los campos correctamente.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const secretKey = import.meta.env.TURNSTILE_SECRET_KEY;
  const turnstileOk = await verifyTurnstileToken(turnstileToken, secretKey);
  if (!turnstileOk) {
    return new Response(JSON.stringify({ error: 'Verificación de seguridad fallida.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const nombreLimpio = nombre.replace(/[\r\n]+/g, ' ').trim();
  const asuntoLimpio = asunto.replace(/[\r\n]+/g, ' ').trim();

  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: 'FarmaTurno Chile <onboarding@resend.dev>',
      to: 'angelsmithlgs@gmail.com',
      replyTo: email,
      subject: `[Contacto FarmaTurno] ${asuntoLimpio}`,
      text: `De: ${nombreLimpio} <${email}>\n\n${mensaje}`,
    });
  } catch (error) {
    console.error('Error enviando mensaje de contacto:', error);
    return new Response(JSON.stringify({ error: 'No se pudo enviar el mensaje. Intenta de nuevo.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
