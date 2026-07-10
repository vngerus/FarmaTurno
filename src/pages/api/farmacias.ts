import type { APIRoute } from 'astro';
import { obtenerFarmaciasMinsal } from '../../lib/data/minsal.data';

export const GET: APIRoute = async () => {
  try {
    const farmacias = await obtenerFarmaciasMinsal();

    return new Response(JSON.stringify(farmacias), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error consultando la API del MINSAL:', error instanceof Error ? error.message : error);

    return new Response(
      JSON.stringify({ error: 'No se pudo obtener el listado de farmacias de turno del MINSAL. Inténtalo más tarde.' }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
};
