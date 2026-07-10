import { supabase } from '../lib/supabaseClient';
import type { User } from '../types';

export async function obtenerUsuarioCompleto(userId: string, email: string): Promise<User> {
  const [{ data: profile, error: profileError }, { data: favoritos, error: favoritosError }] = await Promise.all([
    supabase.from('profiles').select('username, favorite_region, favorite_comuna').eq('id', userId).single(),
    supabase.from('favoritos_farmacias').select('local_id').eq('user_id', userId)
  ]);

  if (profileError) throw profileError;
  if (favoritosError) throw favoritosError;

  return {
    id: userId,
    username: profile?.username ?? email.split('@')[0],
    email,
    favoriteRegion: profile?.favorite_region ?? '',
    favoriteComuna: profile?.favorite_comuna ?? '',
    favoritePharmacies: (favoritos ?? []).map(f => f.local_id)
  };
}

export async function actualizarZonaFavorita(userId: string, regionId: string, comunaName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ favorite_region: regionId, favorite_comuna: comunaName })
    .eq('id', userId);

  if (error) throw error;
}

export async function alternarFavoritoFarmacia(userId: string, localId: string, esFavorito: boolean): Promise<void> {
  if (esFavorito) {
    const { error } = await supabase
      .from('favoritos_farmacias')
      .delete()
      .eq('user_id', userId)
      .eq('local_id', localId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('favoritos_farmacias')
      .insert({ user_id: userId, local_id: localId });
    if (error) throw error;
  }
}
