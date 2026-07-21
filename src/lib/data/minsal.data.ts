import type { Farmacia } from '../../types/farmacias.types';

const MINSAL_URL = 'https://midas.minsal.cl/farmacia_v2/WS/getLocalesTurnos.php';
const TIMEOUT_MS = 7000;

export async function obtenerFarmaciasMinsal(): Promise<Farmacia[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(MINSAL_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json,*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`MINSAL respondió con status ${response.status}`);
    }

    const body = await response.json();

    if (!body || (!Array.isArray(body) && typeof body !== 'object')) {
      throw new Error('Respuesta inválida o vacía de la API del MINSAL');
    }

    const data = Array.isArray(body) ? body : Object.values(body);

    return (data as Farmacia[]).filter((item) => item && item.local_nombre && item.local_direccion);
  } finally {
    clearTimeout(timeoutId);
  }
}
