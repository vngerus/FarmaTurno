import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabaseClient';
import { obtenerUsuarioCompleto } from '../services/perfil.service';
import type { User } from '../types/auth.types';

const CACHE_KEY = 'farmaturno_cached_user';

interface AuthStoreState {
  user: User | null;
  checked: boolean;
  loading: boolean;
}

const SERVER_SNAPSHOT: AuthStoreState = {
  user: null,
  checked: false,
  loading: true,
};

let globalState: AuthStoreState = SERVER_SNAPSHOT;

// Restauración sincrónica desde localStorage en el cliente (0ms delay).
// Solo se usa vía getSnapshot (post-hidratación); el server siempre ve SERVER_SNAPSHOT,
// así el primer render del cliente matchea el HTML del servidor (sin error de hidratación #418).
if (typeof window !== 'undefined') {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object' && parsed.id) {
        globalState = {
          user: parsed as User,
          checked: true,
          loading: false,
        };
      }
    }
  } catch {
    // Si falla el parseo, mantenemos el estado por defecto
  }
}

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function setGlobalState(newState: Partial<AuthStoreState>) {
  globalState = { ...globalState, ...newState };

  if (typeof window !== 'undefined') {
    if (globalState.user) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(globalState.user));
      } catch (e) {
        console.warn('No se pudo guardar la sesión en localStorage:', e);
      }
    } else if (globalState.checked) {
      localStorage.removeItem(CACHE_KEY);
    }
  }

  notify();
}

let isInitialized = false;

async function cargarUsuario(userId: string, email: string) {
  try {
    const user = await obtenerUsuarioCompleto(userId, email);
    setGlobalState({ user, checked: true, loading: false });
  } catch (e) {
    console.error('Error cargando perfil:', e);
    setGlobalState({ checked: true, loading: false });
  }
}

function initAuthStore() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user?.email) {
      cargarUsuario(session.user.id, session.user.email);
    } else {
      setGlobalState({ user: null, checked: true, loading: false });
    }
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.email) {
      cargarUsuario(session.user.id, session.user.email);
    } else {
      setGlobalState({ user: null, checked: true, loading: false });
    }
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return globalState;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export function useAuth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    initAuthStore();
  }, []);

  const logout = async () => {
    setGlobalState({ user: null, checked: true, loading: false });
    await supabase.auth.signOut();
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      await cargarUsuario(session.user.id, session.user.email);
    } else {
      setGlobalState({ user: null, checked: true, loading: false });
    }
  };

  return {
    user: state.user,
    checked: state.checked,
    loading: state.loading,
    logout,
    refreshUser,
  };
}
