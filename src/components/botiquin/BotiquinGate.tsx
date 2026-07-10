import React, { useState, useEffect } from 'react';
import { Lock, UserPlus } from 'lucide-react';
import BotiquinCRUD from './BotiquinCRUD';
import { supabase } from '../../lib/supabaseClient';
import { obtenerUsuarioCompleto } from '../../services/perfil.service';
import type { User } from '../../types';

export default function BotiquinGate() {
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [checked, setChecked] = useState<boolean>(false);

  useEffect(() => {
    const cargarUsuario = async (userId: string, email: string) => {
      try {
        const user = await obtenerUsuarioCompleto(userId, email);
        setActiveUser(user);
      } catch (e) {
        console.error('Error cargando perfil:', e);
      } finally {
        setChecked(true);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        cargarUsuario(session.user.id, session.user.email);
      } else {
        setChecked(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        cargarUsuario(session.user.id, session.user.email);
      } else {
        setActiveUser(null);
        setChecked(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!checked) return null;

  if (!activeUser) {
    return (
      <div className="card-surface p-10 md:p-14 text-center max-w-lg mx-auto">
        <div className="bg-[#faf9f4] border-2 border-[#0f1f19] w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Lock className="w-6 h-6 text-[#065f46]" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0f1f19] font-heading mb-3">
          Mi Botiquín es privado
        </h1>
        <p className="text-[#33443d] text-sm md:text-base leading-relaxed mb-6">
          Inicia sesión para ver y gestionar tu botiquín personal. Usa el botón "Iniciar Sesión" en la parte superior de la página.
        </p>
        <div className="inline-flex items-center gap-2 text-xs font-bold font-mono uppercase text-[#065f46]">
          <UserPlus className="w-4 h-4" />
          Sin sesión, sin botiquín
        </div>
      </div>
    );
  }

  return <BotiquinCRUD user={activeUser} />;
}
