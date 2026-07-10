import React, { useState, useEffect } from 'react';
import UserMenu from './UserMenu';
import LoginModal from './LoginModal';
import { supabase } from '../../lib/supabaseClient';
import { obtenerUsuarioCompleto } from '../../services/perfil.service';
import type { User } from '../../types';

export default function HeaderAuth() {
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

  useEffect(() => {
    const cargarUsuario = async (userId: string, email: string) => {
      try {
        const user = await obtenerUsuarioCompleto(userId, email);
        setActiveUser(user);
      } catch (e) {
        console.error('Error cargando perfil:', e);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) cargarUsuario(session.user.id, session.user.email);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        cargarUsuario(session.user.id, session.user.email);
      } else {
        setActiveUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = () => {
    supabase.auth.signOut();
  };

  return (
    <div className="flex items-center gap-3">
      <UserMenu
        user={activeUser}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginOpen(true)}
      />
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={() => setIsLoginOpen(false)}
      />
    </div>
  );
}
