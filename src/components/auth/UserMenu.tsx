import React, { useState } from 'react';
import { User as UserIcon, LogOut, Heart, MapPin, UserCheck, Pill } from 'lucide-react';
import type { User } from '../../types';

interface UserMenuProps {
  user: User | null;
  onLogout: () => void;
  onOpenLogin: () => void;
}

export default function UserMenu({ user, onLogout, onOpenLogin }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  if (!user) {
    return (
      <button
        onClick={onOpenLogin}
        className="inline-flex items-center gap-2 bg-[#faf9f4] hover:bg-[#0f1f19] border-2 border-[#0f1f19] text-[#0f1f19] hover:text-[#faf9f4] text-xs font-bold font-mono uppercase px-4 py-2 rounded-xl transition-all cursor-pointer"
      >
        <UserIcon className="w-4 h-4" />
        Iniciar Sesión
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 bg-[#faf9f4] hover:bg-white border-2 border-[#0f1f19] text-[#0f1f19] text-xs font-bold font-mono uppercase px-4 py-2.5 rounded-xl transition-all cursor-pointer"
      >
        <UserCheck className="w-4 h-4 text-[#065f46]" />
        <span>Hola, {user.username}</span>
      </button>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-transparent"
          ></div>

          <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-[#0f1f19] rounded-xl shadow-[4px_4px_0_#0f1f19] z-50 py-2 divide-y divide-slate-100 animate-zoom-in">
            <div className="px-4 py-2.5">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tu Cuenta</p>
              <p className="text-sm font-bold text-slate-800 truncate">{user.username}</p>
              <p className="text-[10px] text-slate-500 font-semibold truncate">{user.email}</p>
            </div>

            <div className="px-2 py-1.5 space-y-1">
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-mint-600 flex-shrink-0" />
                <span className="truncate">
                  {user.favoriteComuna
                    ? `Zona: ${user.favoriteComuna}`
                    : 'Sin comuna favorita'}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 font-semibold">
                <Heart className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                <span>Favoritos: {user.favoritePharmacies?.length || 0} locales</span>
              </div>
            </div>

            <div className="px-2 py-1.5">
              <a
                href="/mi-botiquin"
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#0f1f19] hover:bg-[#faf9f4] rounded-lg transition-all font-bold"
              >
                <Pill className="w-3.5 h-3.5 text-[#065f46]" />
                Mi Botiquín
              </a>
            </div>

            <div className="px-2 pt-1.5">
              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
