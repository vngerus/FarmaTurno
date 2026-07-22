import { Resend } from 'resend';

function getEnv(): string {
  const key = import.meta.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      'Falta la variable de entorno RESEND_API_KEY. Configúrala en .env (local) o en Vercel Environment Variables.'
    );
  }
  return key;
}

let _resend: Resend | null = null;

export function getResendClient(): Resend {
  if (_resend) return _resend;
  _resend = new Resend(getEnv());
  return _resend;
}
