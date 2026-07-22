import React, { useState } from 'react';
import UserMenu from './UserMenu';
import LoginModal from './LoginModal';
import { useAuth } from '../../hooks/useAuth';

export default function HeaderAuth() {
  const { user, checked, logout } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

  return (
    <div className="flex items-center gap-3">
      <UserMenu
        user={user}
        loading={!checked}
        onLogout={logout}
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

