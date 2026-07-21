import React, { useState } from 'react';
import DatosForm from './DatosForm';
import CambiarPasswordForm from './CambiarPasswordForm';
import ZonaFavoritaForm from './ZonaFavoritaForm';
import EliminarCuentaZone from './EliminarCuentaZone';
import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../types/auth.types';

interface PerfilCRUDProps {
  user: User;
}

export default function PerfilCRUD({ user }: PerfilCRUDProps) {
  const [currentUser, setCurrentUser] = useState<User>(user);
  const { refreshUser } = useAuth();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <div className="space-y-6">
        <DatosForm
          user={currentUser}
          onUpdated={(nombre, apellido) => {
            setCurrentUser({ ...currentUser, nombre, apellido });
            refreshUser();
          }}
        />
        <CambiarPasswordForm userEmail={currentUser.email} />
      </div>
      <div className="space-y-6">
        <ZonaFavoritaForm
          user={currentUser}
          onUpdated={(regionId, comunaName) => {
            setCurrentUser({ ...currentUser, favoriteRegion: regionId, favoriteComuna: comunaName });
            refreshUser();
          }}
          onFavoritesChanged={favoritePharmacies => {
            setCurrentUser({ ...currentUser, favoritePharmacies });
            refreshUser();
          }}
        />
        <EliminarCuentaZone />
      </div>
    </div>
  );
}
