import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { supabaseAdmin } from '../../lib/supabaseAdminClient';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  if (!token) {
    return new Response(JSON.stringify({ error: 'Debes iniciar sesión de nuevo.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: userData, error: getUserError } = await supabase.auth.getUser(token);
  if (getUserError || !userData.user?.email) {
    return new Response(JSON.stringify({ error: 'Debes iniciar sesión de nuevo.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  const password = body?.password;
  if (!password || typeof password !== 'string') {
    return new Response(JSON.stringify({ error: 'Ingresa tu contraseña.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const reauthClient = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error: signInError } = await reauthClient.auth.signInWithPassword({
    email: userData.user.email,
    password,
  });
  if (signInError) {
    return new Response(JSON.stringify({ error: 'Contraseña incorrecta.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error: favoritosError } = await supabaseAdmin
    .from('favoritos_farmacias')
    .delete()
    .eq('user_id', userData.user.id);
  if (favoritosError) {
    console.error('Error eliminando favoritos:', favoritosError);
    return new Response(JSON.stringify({ error: 'No se pudo eliminar la cuenta. Intenta de nuevo.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', userData.user.id);
  if (profileError) {
    console.error('Error eliminando perfil:', profileError);
    return new Response(JSON.stringify({ error: 'No se pudo eliminar la cuenta. Intenta de nuevo.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    console.error('Error eliminando cuenta:', deleteError);
    return new Response(JSON.stringify({ error: 'No se pudo eliminar la cuenta. Intenta de nuevo.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
